//mac http://192.168.1.127:4000
//http://192.168.0.203:4000/
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [studentsDashboard, setStudentsDashboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pickedCSV, setPickedCSV] = useState(null);
  const [csvFileName, setCsvFileName] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualSelect, setManualSelect] = useState(false); // track if user clicked

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

  const startScan = () => router.push("scanner");

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
    <SafeAreaView style={styles.container}>
      {/* Hamburger Menu */}
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
            uri: "https://nlsggkzpooovjifqcbig.supabase.co/storage/v1/object/public/image_storage/kumon/logo.png",
          }}
          style={styles.logo}
        />
        <Text style={styles.welcomeText}>Welcome to Kumon Punggol Plaza</Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push("/scanner")}
        >
          <Text style={styles.scanText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 10,
    fontSize: 16,
    color: "#004A7C",
  },

  dropdownMenu: {
    position: "absolute",
    top: 50,
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
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#1F3C88",
    backgroundColor: "#EAF0FA",
  },
  welcomeText: {
    fontSize: 24,
    marginTop: 20,
    fontFamily: "Pacifico-Regular", // or Dancing Script / Great Vibes
    color: "#1F3C88",
    textAlign: "center",
  },
  scanButton: {
    marginTop: 30,
    backgroundColor: "#F2E9E4",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#1F3C88",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  scanText: {
    fontSize: 18,
    color: "#1F3C88",
    fontWeight: "600",
    letterSpacing: 1,
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
    fontFamily: "Pacifico-Regular",
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
    fontFamily: "Courier",
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
    fontWeight: "bold",
    fontSize: 20,
    fontFamily: "Pacifico-Regular",
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
    fontFamily: "Pacifico-Regular",
  },
  studentParentLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F3C88",
    marginTop: 4,
    fontFamily: "Courier",
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
    fontFamily: "Courier",
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
    fontFamily: "Pacifico-Regular",
    fontSize: 18,
  },
});
