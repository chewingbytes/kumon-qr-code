//mac http://192.168.1.127:4000
//http://192.168.0.203:4000/
import { useFonts } from "@expo-google-fonts/dynapuff/useFonts";
import { DynaPuff_400Regular } from "@expo-google-fonts/dynapuff/400Regular";
import { DynaPuff_500Medium } from "@expo-google-fonts/dynapuff/500Medium";
import { DynaPuff_600SemiBold } from "@expo-google-fonts/dynapuff/600SemiBold";
import { DynaPuff_700Bold } from "@expo-google-fonts/dynapuff/700Bold";

import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import Constants from "expo-constants";
const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successNotifications, setSuccessNotifications] = useState<
    { id: number; message: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [studentsDashboard, setStudentsDashboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pickedCSV, setPickedCSV] = useState(null);
  const [csvFileName, setCsvFileName] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualSelect, setManualSelect] = useState(false); // track if user clicked

  let [fontsLoaded] = useFonts({
    DynaPuff_400Regular,
    DynaPuff_500Medium,
    DynaPuff_600SemiBold,
    DynaPuff_700Bold,
  });

  if (!fontsLoaded) {
    console.log("FONT NOT LAODING");
  }

  useEffect(() => {
    if (studentsDashboard.length > 0 && !manualSelect) {
      setSelectedStudent(studentsDashboard[studentsDashboard.length - 1]);
    }
  }, [studentsDashboard, manualSelect]);

  const handlePickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === "android" ? "*/*" : "text/csv",
        copyToCacheDirectory: true,
      });

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const fileAsset = result.assets[0];

        const file = {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType || "text/csv",
        };

        setPickedCSV(file); // Set your local file state
        setCsvFileName(file.name); // Optional: for display
      }
    } catch (err) {
      Alert.alert("Pick Error", err.message);
    }
  };

  const uploadPickedCSV = async () => {
    if (!pickedCSV)
      return Alert.alert("No file", "Please pick a CSV file first.");

    setUploading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const formData = new FormData();
      // @ts-ignore
      formData.append("file", pickedCSV);

      const response = await fetch(API + "api/db/upload-csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const json = await response.json();
      setUploading(false);
      setPickedCSV(null);
      setCsvFileName(null);

      if (json.error) {
        Alert.alert("Upload Error", json.error);
      } else {
        Alert.alert("Success", "CSV uploaded and processed!");
        fetchStudents();
        setModalVisible(false);
      }
    } catch (err) {
      setUploading(false);
      Alert.alert("Error", err.message);
    }
  };

  const postJSON = async (path: string, accessToken: string) => {
    const res = await fetch(API + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.json();
  };

  const postJSONWithBody = async (
    path: string,
    body: object,
    accessToken: string
  ) => {
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

  const fetchStudents = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const res = await fetch(API + "api/db/students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setStudentsDashboard(json.students);
    } catch (error) {
      console.error("Error fetching students:", error.message);
    }
  };

  let notificationId = 0; // outside component, or use useRef for persistent ID

  const showSuccessNotification = (studentName: string, result: boolean) => {
    const id = notificationId++;
    const message =
      result === true
        ? `Message sent successfully to ${studentName}'s parents!`
        : "An error occurred";

    setSuccessNotifications((prev) => [...prev, { id, message }]);

    // auto-hide after 3 seconds
    setTimeout(() => {
      setSuccessNotifications((prev) =>
        prev.filter((notif) => notif.id !== id)
      );
    }, 3000);
  };

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

      const res = await postJSONWithBody(
        "api/db/sendMessage",
        { name },
        accessToken
      );
      console.log("REESS:", res);

      if (res === false) {
        return false;
      } else if (res === true) {
        return true;
      }
    } catch (err) {
      console.error("sendWhatsappMessage error:", err);
      Alert.alert("Error", "Something went wrong while sending the message.");
      return false;
    }
  };

  const addStudent = () => {
    const name = studentName.trim();
    const number = parentNumber.trim();

    if (!name || !number) {
      return Alert.alert("Missing Fields", "Please fill all fields.");
    }

    const phoneRegex = /^\d{8}$/; // exactly 8 digits
    if (!phoneRegex.test(parentNumber)) {
      return Alert.alert(
        "Invalid Number",
        "Please enter a valid 8-digit Singapore phone number."
      );
    }

    setStudents((prev) => [...prev, { name: studentName, parentNumber }]);
    setStudentName("");
    setParentNumber("");
  };

  const submitStudents = async () => {
    if (!students.length) return Alert.alert("No students to submit");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const res = await fetch(API + "api/db/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ students }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      Alert.alert("Success", json.message || "All students added.");
      setStudents([]);
      setModalVisible(false);
      fetchStudents();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const finishDay = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    const res = await postJSON("api/db/finish-day", accessToken);
    if (res?.error) Alert.alert("Error", res.error);
    else Alert.alert("Done", "Day finished and report sent.");
    setDropdownVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [])
  );

  const dashboardScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (dashboardScrollRef.current) {
      dashboardScrollRef.current.scrollToEnd({ animated: true });
    }
  }, [studentsDashboard]);

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.topBar}>
          <View style={styles.barContainer}>
            <View style={styles.leftGroup}>
              <Image
                source={{
                  uri: "https://nlsggkzpooovjifqcbig.supabase.co/storage/v1/object/public/image_storage//kumi-logo%20(1).png",
                }}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text style={styles.header}>Kumi</Text>
            </View>

            <TouchableOpacity
              onPress={() => setDropdownVisible(!dropdownVisible)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <TextInput
            placeholder="Search student..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
            placeholderTextColor="#888"
          />

          <View style={[styles.dashboardListContainer]}>
            <ScrollView
              ref={dashboardScrollRef}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {studentsDashboard && studentsDashboard.length > 0 ? (
                studentsDashboard
                  .filter((e) =>
                    e.student_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((entry, idx) => {
                    const isCheckedIn = entry.status === "checked_in";
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.card,
                          isCheckedIn ? styles.in : styles.out,
                        ]}
=======
    <SafeAreaView style={styles.container}>
      <View style={styles.rowLayout}>
        <View style={styles.leftList}>
          <Text style={[styles.infoTitle, { fontSize: 30 }]}>Student List</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {loading ? (
              <Text style={styles.noDataText}>Refreshing...</Text>
            ) : studentsDashboard && studentsDashboard.length > 0 ? (
              studentsDashboard.map((entry, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.miniCard,
                    entry.status === "checked_in" ? styles.in : styles.out,
                  ]}
                >
                  {/* Student Name with tick */}
                  <Text style={styles.miniCardName}>
                    {entry.student_name}{" "}
                    {entry.parent_notified && (
                      <Text
                        style={{
                          marginLeft: 8,
                          color: "green",
                          fontSize: 18,
                        }}
>>>>>>> my-fix
                      >
                        ✅
                      </Text>
                    )}
                  </Text>

                  {/* Status */}
                  <Text
                    style={[
                      styles.statusText,
                      entry.status === "checked_in"
                        ? styles.checkedIn
                        : styles.checkedOut,
                    ]}
                  >
                    {entry.status === "checked_in"
                      ? "Checked In"
                      : "Checked Out"}
                  </Text>

                  {/* Notify / Notify Again Button */}
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { marginTop: 10, paddingVertical: 8 },
                    ]}
                    onPress={async () => {
                      const result = await sendWhatsappMessage(
                        entry.student_name
                      );
                      if (result) {
                        showSuccessNotification(entry.student_name, result);
                        await fetchStudents(); // refresh dashboard to update parent_notified
                      } else {
                        Alert.alert(
                          "Error",
                          `Failed to send message to ${entry.student_name}'s parents.`
                        );
                      }
                    }}
                  >
                    <Text style={styles.text}>
                      {entry.parent_notified ? "Notify Again" : "Notify"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <SafeAreaView style={styles.loadingSafeArea}>
                <ActivityIndicator size="large" color="#004A7C" />
              </SafeAreaView>
            )}
          </ScrollView>
        </View>

        {/* Hamburger Menu */}
        <View style={styles.rightContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>

          {/* Center Content */}
          <View style={styles.centerContent}>
            <Image
              source={{
                uri: "https://nlsggkzpooovjifqcbig.supabase.co/storage/v1/object/public/image_storage/kumon/kumon-vector-logo.png",
              }}
              style={styles.logo}
            />
            <Text style={styles.welcomeText}>
              Welcome to Kumon Punggol Plaza
            </Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push("/scanner")}
          >
            <Text style={styles.scanText}>Scan QR Code</Text>
          </TouchableOpacity>
          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <Pressable onPress={() => router.push("/profile")}>
                <Text style={styles.dropdownItem}>My Profile</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/my-students")}>
                <Text style={styles.dropdownItem}>My Students</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setModalVisible(true);
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownItem}>Add Students</Text>
              </Pressable>
<<<<<<< HEAD
            </ScrollView>
          </SafeAreaView>
        </Modal>
        {dropdownVisible && (
          <View style={styles.dropdownMenu}>
            <Pressable onPress={() => router.push("/profile")}>
              <Text style={styles.dropdownItem}>My Profile</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/my-students")}>
              <Text style={styles.dropdownItem}>My Students</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setModalVisible(true);
                setDropdownVisible(false);
              }}
            >
              <Text style={styles.dropdownItem}>Add Students</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Are you sure?",
                  "This will finish the day and email the attendance Excel report.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Yes, proceed",
                      onPress: () => finishDay(),
                    },
                  ]
                );
                setDropdownVisible(false);
              }}
            >
              <Text style={styles.dropdownItem}>Finish the Day</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
=======
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Are you sure?",
                    "This will finish the day and email the attendance Excel report.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Yes, proceed",
                        onPress: () => finishDay(),
                      },
                    ]
                  );
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownItem}>Finish the Day</Text>
              </Pressable>
            </View>
          )}

          {/* Modal */}
          <Modal visible={modalVisible} animationType="slide">
            <SafeAreaView style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Students</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView contentContainerStyle={styles.modalContent}>
                <TextInput
                  style={styles.input}
                  placeholder="Student Name"
                  value={studentName}
                  onChangeText={setStudentName}
                  placeholderTextColor="#1F3C88"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Parent's Number"
                  value={parentNumber}
                  onChangeText={setParentNumber}
                  placeholderTextColor="#1F3C88"
                />

                <Pressable style={styles.addButton} onPress={addStudent}>
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>

                {/* Students List */}
                {students.length > 0 &&
                  students.map((s, i) => (
                    <View key={i} style={styles.studentItem}>
                      <View style={styles.studentRow}>
                        <View>
                          <Text style={styles.studentName}>{s.name}</Text>
                          <Text style={styles.studentParentLabel}>
                            Number: {s.parentNumber}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() =>
                            setStudents((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                {/* CSV & Submit Buttons */}
                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.uploadCSVButton, { flex: 1 }]}
                    onPress={pickedCSV ? uploadPickedCSV : handlePickCSV}
                    disabled={uploading}
                  >
                    <Text style={styles.uploadCsvText}>
                      {uploading
                        ? "Uploading..."
                        : pickedCSV
                        ? `Upload: ${csvFileName}`
                        : "Import CSV"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={submitStudents}
                  >
                    <Text style={styles.primaryButtonText}>Submit</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <Pressable onPress={() => router.push("/student-list")}>
                <Text style={styles.dropdownItem}>Student List</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/profile")}>
                <Text style={styles.dropdownItem}>My Profile</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/my-students")}>
                <Text style={styles.dropdownItem}>My Students</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setModalVisible(true);
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownItem}>Add Students</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Are you sure?",
                    "This will finish the day and email the attendance Excel report.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Yes, proceed",
                        onPress: () => finishDay(),
                      },
                    ]
                  );
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownItem}>Finish the Day</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 99999,
        }}
      >
        {successNotifications.map((notif, index) => (
          <Animated.View
            key={index}
            style={{
              marginTop: index * 10, // stack them vertically
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
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
                color: "#155724",
              }}
            >
              {notif.message}
            </Text>
          </Animated.View>
        ))}
      </View>
>>>>>>> my-fix
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A7C7E7", // retro blue base
    alignItems: "center",
    justifyContent: "center",
  },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 4,
    padding: 10,
    marginBottom: 16,
  },
  dropdownItem: {
<<<<<<< HEAD
    paddingVertical: 10,
    fontSize: 16,
    color: "#004A7C",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#004A7C" },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  addButton: {
    backgroundColor: "#FF6B6B",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  studentPreview: { marginTop: 8, color: "#004A7C" },
  content: {
    flex: 1, // fills available space
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    borderColor: "#004A7C", // a nice deep blue to match your theme
    borderWidth: 2, // visible border
    borderRadius: 12, // rounded corners
    backgroundColor: "#ffffff", // white background for contrast
    margin: 20, // keep it away from screen edges
  },
  dashboardListContainer: {
    flex: 1, // Makes list fill remaining space
  },
  footer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#f0f9ff",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  barContainer: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
    width: "100%",
  },
  logoIcon: {
    width: 35,
    height: 35,
  },

  hamburgerIcon: {
    fontSize: 28,
    fontWeight: "bold",
=======
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    paddingVertical: 15,
    fontSize: 25,
>>>>>>> my-fix
    color: "#004A7C",
  },

  dropdownMenu: {
    position: "absolute",
    top: 60,
    right: 30,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  // Top-right hamburger
  menuButton: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  hamburgerIcon: {
    fontSize: 28,
    color: "#1F3C88", // darker retro navy
  },

  // Center elements
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 350,
    height: 350,
    borderRadius: 300,
    borderColor: "#1F3C88",
    backgroundColor: "#EAF0FA",
  },
  welcomeText: {
    fontSize: 50,
    marginTop: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    color: "#1F3C88",
    textAlign: "center",
  },
  scanButton: {
    marginTop: 50,
    backgroundColor: "#F2E9E4",
    width: "90%",
    paddingVertical: 150,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#1F3C88",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  scanText: {
    fontSize: 25,
    color: "#1F3C88",
    fontWeight: "600",
    letterSpacing: 1,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    textAlign: "center",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#68AEB8", // golden retro background
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 4,
    borderBottomColor: "#1F3C88",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1F3C88",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  modalContent: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  input: {
    borderWidth: 3,
    borderColor: "#1F3C88",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#ADC5CE",
    fontSize: 18,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    color: "#1F3C88",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addButton: {
    backgroundColor: "#d4dffd",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  addButtonText: {
    color: "#1F3C88",
    fontSize: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  studentItem: {
    backgroundColor: "#FFFACD",
    borderWidth: 3,
    borderColor: "#1F3C88",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  studentParentLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F3C88",
    marginTop: 4,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1F3C88",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
    columnGap: 16,
  },
  uploadCSVButton: {
    backgroundColor: "#FFFACD",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#1F3C88",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  uploadCsvText: {
    color: "#1F3C88",
    fontWeight: "bold",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  primaryButton: {
    backgroundColor: "#1F3C88",
    paddingVertical: 12,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    fontSize: 18,
  },
  rowLayout: {
    flexDirection: "row",
    flex: 1,
    borderWidth: 4,
    width: "100%",
  },

  leftList: {
    width: "25%",
    backgroundColor: "#F2E9E4",
    borderRightWidth: 4,
    borderColor: "#1F3C88",
    padding: 20,
    justifyContent: "flex-start",
  },

  listTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    marginBottom: 20,
    textAlign: "left",
  },

  listItem: {
    backgroundColor: "#FFFACD",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#1F3C88",
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },

  listName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  listNumber: {
    fontSize: 16,
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  noStudents: {
    color: "#1F3C88",
    fontSize: 18,
    textAlign: "left",
    marginTop: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  rightContent: {
    width: "75%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A7C7E7", // matches your base color
    position: "relative",
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F3C88",
    marginBottom: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  infoLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  infoValue: {
    fontSize: 22,
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  noDataText: {
    fontSize: 18,
    color: "#1F3C88",
    marginTop: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  statusText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  checkedIn: { color: "#59C1BD" },
  checkedOut: { color: "#C147E9" },

  in: {
    backgroundColor: "#CFF5E7",
    borderColor: "#59C1BD",
  },

  out: {
    backgroundColor: "#F7C8E0",
    borderColor: "#C147E9",
  },

  miniCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    backgroundColor: "#FFF5E4",
    borderColor: "#1F3C88",
  },
  miniCardName: {
    fontWeight: "bold",
    fontSize: 20,
    color: "#3B185F",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  button: {
    backgroundColor: "#33B5E5",
    borderRadius: 30,
    elevation: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  loadingSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
