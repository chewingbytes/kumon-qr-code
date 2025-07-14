import Constants from "expo-constants";
import { createAudioPlayer, useAudioPlayer } from "expo-audio";
const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
import { useRef } from "react";
import { useState, useEffect } from "react";
import { Dimensions, Alert, Vibration, TouchableOpacity } from "react-native";
import { Camera, CameraView, CameraType } from "expo-camera";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import pako from "pako";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;
import { supabase } from "../../lib/supabase";

const audioSource = {
  uri: "http://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a",
};

console.log("API:", API);
const postJSON = async (path: string, body: object, accessToken: string) => {
  console.log("querying:", path);
  console.log("with body:", body);
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
};

const getJSON = async (path: string, accessToken: string) => {
  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.json();
};

interface QRData {
  name: string;
  parent_number: string;
}

const QRScanner: React.FC = () => {
  const player = useAudioPlayer(audioSource);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [hasCameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [hasAudioPermission, setAudioPermission] = useState<boolean | null>(
    null
  );

  const [facing, setFacing] = useState<CameraType>("front");

  const cameraRef = useRef<CameraView | null>(null);

  const [scanned, setScanned] = useState(false);

  const lastScannedTimeStampRef = useRef(0);

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  useEffect(() => {
    const requestPermissions = async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();

      setCameraPermission(cameraPermission.status === "granted");
      setAudioPermission(audioPermission.status === "granted");
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (hasCameraPermission !== null && hasAudioPermission !== null) {
      // Check permissions and execute logic when both permissions are set
      if (!hasCameraPermission || !hasAudioPermission) {
        Alert.alert(
          "Camera Permissions Required",
          "You must grant access to your camera to scan QR codes",
          [
            { text: "Go to settings", onPress: goToSettings },
            {
              text: "Cancel",
              onPress: () => {
                router.dismissAll();
              },
              style: "cancel",
            },
          ]
        );
      }
    }
  }, [hasCameraPermission, hasAudioPermission]);

  const handleCheckOut = async (name: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    const { error } = await postJSON("api/db/checkout", { name }, accessToken);
    if (error) Alert.alert("Error", error);
  };

  const handleCheckIn = async (name: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    const { error } = await postJSON("api/db/checkin", { name }, accessToken);
    if (error) Alert.alert("Error", error);
  };

  const handleBarCodeScanned = async ({ data }) => {
    try {
      const timestamp = Date.now();

      if (scanned || timestamp - lastScannedTimeStampRef.current < 2000) {
        return;
      }

      setScanned(true); // Prevent further scans immediately

      lastScannedTimeStampRef.current = timestamp;

      const compressedData = Buffer.from(data, "hex");
      const decompressedData = pako.inflate(compressedData, { to: "string" });
      const parsedData = JSON.parse(decompressedData);

      console.log(parsedData);

      const { name } = parsedData;

      player.seekTo(0);
      player.play();

      setSuccessMessage(`Scanned: ${name}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const status = await getJSON(
        `api/db/status/${encodeURIComponent(name)}`,
        accessToken
      );

      console.log("STATUS:", status);

      if (!status.found) {
        return handleCheckIn(name);
      }

      if (status.record.status === "checked_out") {
        Alert.alert(
          "Already Checked Out",
          `${name} is already checked out. Check in again?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Check In",
              onPress: () => handleCheckIn(name),
            },
          ]
        );
      } else {
        await handleCheckOut(name);
      }
    } catch (error) {
      console.error("error:", error);
      Alert.alert("Invalid QR Code", "Unable to process the QR code.");
    } finally {
      // Wait 2 seconds before re-enabling scanning
      setTimeout(() => {
        setScanned(false);
      }, 7000);
    }
  };

  const goToSettings = () => {
    Linking.openSettings();
  };

  if (hasCameraPermission && hasAudioPermission) {
    return (
      <CameraView
        ref={cameraRef}
        facing={facing}
        onBarcodeScanned={handleBarCodeScanned}
        animateShutter={true}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={{ height: Dimensions.get("window").height }}
      >
        {successMessage && (
          <View style={styles.popup}>
            <Text style={styles.popupText}>{successMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  }
};

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(0, 74, 124, 0.7)", // semi-transparent deep blue
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    zIndex: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#33C1FF", // Kumon Red
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  popup: {
    position: "absolute",
    top: "70%",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    zIndex: 999,
  },
  popupText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default QRScanner;
