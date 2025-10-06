import Constants from "expo-constants";
import { createAudioPlayer, useAudioPlayer } from "expo-audio";
const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
import { useRef } from "react";
import { useState, useEffect } from "react";
import {
  Dimensions,
  Alert,
  Vibration,
  TouchableOpacity,
  Animated,
  Pressable,
} from "react-native";
import { Camera, CameraView, CameraType } from "expo-camera";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
  console.log("querying th efucking shit:", API + path);
  console.log("TEOKEN:", accessToken);
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

  const [notification, setNotification] = useState<{
    visible: boolean;
    studentName?: string;
  }>({ visible: false });
  const slideAnim = useRef(new Animated.Value(300)).current; // Off-screen initially

  const [successNotification, setSuccessNotification] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });
  const successSlideAnim = useRef(new Animated.Value(300)).current; // off-screen left

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
    console.log("NOTIICIAITI:", notification);
  }, [notification]);

  useEffect(() => {
    console.log("suceNOTIICIAITI:", successNotification);
  }, [successNotification]);

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

  const sendWhatsappMessage = async (name: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        Alert.alert("Error", "No access token found. Please log in again.");
        return;
      }

      const res = await postJSON("api/db/sendMessage", { name }, accessToken);

      if (res.error) {
        Alert.alert("Error", `Failed to send message: ${res.error}`);
      } else {
        // Optional: show success notification
        setSuccessNotification({
          visible: true,
          message: `Message sent successfully to ${name}'s parents!`,
        });

        // Slide-in animation for notification
        Animated.timing(successSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Auto-hide after 5 seconds
        setTimeout(() => {
          Animated.timing(successSlideAnim, {
            toValue: 300,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setSuccessNotification({ visible: false }));
        }, 5000);
      }
    } catch (err) {
      console.error("sendWhatsappMessage error:", err);
      Alert.alert("Error", "Something went wrong while sending the message.");
    }
  };

  const handleCheckOut = async (name: string) => {
    console.log("CHEKCING OUT NAME:", name);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    const { error } = await postJSON("api/db/checkout", { name }, accessToken);

    if (error) {
      Alert.alert("Error", error);
    } else {
      // Show success notification
      // setSuccessNotification({
      //   visible: true,
      //   message: `${name} checked out successfully!`,
      // });
      // // Animate slide in
      // Animated.timing(successSlideAnim, {
      //   toValue: 0,
      //   duration: 300,
      //   useNativeDriver: true,
      // }).start(() => {
      //   // Hide after 3 seconds
      //   setTimeout(() => {
      //     Animated.timing(successSlideAnim, {
      //       toValue: -300,
      //       duration: 300,
      //       useNativeDriver: true,
      //     }).start(() => setSuccessNotification({ visible: false }));
      //   }, 3000);
      // });
    }
  };

  const handleCheckIn = async (name: string) => {
    router.push("/");
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

      const name = data.trim();

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
              onPress: async () => {
                await handleCheckIn(name);
              },
            },
          ]
        );
      } else {
        console.log("HANDLING CHCKOUT WITH NAME:", name);
        handleCheckOut(name);
        setNotification({ visible: true, studentName: name });

        Animated.timing(slideAnim, {
          toValue: 0, // slide in
          duration: 300,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          hideNotification();
        }, 10000);
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

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: 300, // slide out
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification({ visible: false });
    });
  };

  const hideSuccessNotification = () => {
    Animated.timing(successSlideAnim, {
      toValue: 300, // slide out
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSuccessNotification({ visible: false });
    });
  };

  const goToSettings = () => {
    Linking.openSettings();
  };

  if (hasCameraPermission && hasAudioPermission) {
    return (
      <>
        <CameraView
          ref={cameraRef}
          facing={facing}
          onBarcodeScanned={handleBarCodeScanned}
          animateShutter={true}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
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
            <Text style={styles.backButtonText}>⬅ Back</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.text}>Flip Camera</Text>
            </TouchableOpacity>
          </View>
        </CameraView>

        {notification.visible && (
          <Animated.View
            style={[
              styles.notification,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <Text style={styles.notificationText}>
              Notify {notification.studentName}'s parents?
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={async () => {
                  if (notification.studentName) {
                    await sendWhatsappMessage(notification.studentName);
                  }
                  hideNotification();
                }}
                style={styles.yesButton}
              >
                <Text style={styles.yesText}>Yes</Text>
              </Pressable>
              <Pressable onPress={hideNotification} style={styles.noButton}>
                <Text style={styles.noText}>No</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {successNotification.visible && (
          <Animated.View
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 280,
              backgroundColor: "#D4EDDA",
              borderColor: "#155724",
              borderWidth: 2,
              borderRadius: 12,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              transform: [{ translateX: successSlideAnim }],
              zIndex: 99999,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Courier-Bold",
                color: "#155724",
              }}
            >
              {successNotification.message}
            </Text>
          </Animated.View>
        )}
      </>
    );
  }
};

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#1F3C88",
    backgroundColor: "#F2E9E4",
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  backButtonText: {
    color: "#004A7C",
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

  notification: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 280,
    backgroundColor: "#FFF5E4",
    borderColor: "#1F3C88",
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 99999,
  },

  notificationText: {
    fontSize: 18,
    fontFamily: "Courier-Bold",
    color: "#1F3C88",
    marginBottom: 12,
  },

  yesButton: {
    backgroundColor: "#004A7C",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  yesText: { color: "#FFFACD", fontFamily: "Courier-Bold" },

  noButton: {
    backgroundColor: "#FEC260",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  noText: { color: "#3B185F", fontFamily: "Courier-Bold" },
});

export default QRScanner;
