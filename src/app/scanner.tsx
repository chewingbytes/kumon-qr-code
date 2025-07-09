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

interface QRData {
  name: string;
  parent_number: string;
}

const QRScanner: React.FC = () => {
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

  const handleCheckOut = async (name) => {
    try {
      const singaporeTime = new Date().toLocaleString("en-SG", {
        timeZone: "Asia/Singapore",
      });

      const { error } = await supabase
        .from("students_checkin")
        .update({ checked_out: singaporeTime })
        .eq("name", name);

      if (error) {
        Alert.alert("Error", "Failed to check out. Please try again.");
        console.error("Error updating data: ", error);
      } else {
        Alert.alert("Success", `${name} successfully checked out!`);
        console.log(`${name} successfully checked out`);
      }
    } catch (error) {
      console.error("error:", error);
      Alert.alert("Error", "An error occurred while checking out.");
    }
  };

  const handleCheckIn = async (name, parent_number) => {
    const singaporeTime = new Date().toLocaleString("en-SG", {
      timeZone: "Asia/Singapore",
    });

    const { error } = await supabase.from("students_checkin").insert([
      {
        name: name,
        parent_number: parent_number,
        checked_in: singaporeTime,
      },
    ]);

    if (error) {
      Alert.alert("Error", "Failed to check in. Please try again.");
      console.error("Error inserting data: ", error);
    } else {
      Alert.alert("Success", `${name} successfully checked in!`);
      console.log(`${name} successfully inserted`);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    try {
      const timestamp = Date.now();

      if (scanned || timestamp - lastScannedTimeStampRef.current < 2000) {
        return;
      }

      lastScannedTimeStampRef.current = timestamp;

      const compressedData = Buffer.from(data, "hex");
      const decompressedData = pako.inflate(compressedData, { to: "string" });
      const parsedData = JSON.parse(decompressedData);

      console.log(parsedData);

      const { name, parent_number } = parsedData;

      const { data: existingCheckin, error: fetchError } = await supabase
        .from("students_checkin")
        .select("*")
        .eq("name", name)
        .single();

      if (fetchError) {
        handleCheckIn(name, parent_number);
      }

      if (existingCheckin) {
        Alert.alert(
          "Already Checked In",
          `${name} is already checked in. Would you like to check out?`,
          [
            {
              text: "No",
              onPress: () => {},
            },
            {
              text: "Yes",
              onPress: async () => handleCheckOut(name),
            },
          ]
        );
      }
    } catch (error) {
      console.error("error:", error);
      Alert.alert("Invalid QR Code", "Unable to process the QR code.");
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
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});

export default QRScanner;
