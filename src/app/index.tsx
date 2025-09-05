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
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
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

        <View style={styles.mainRow}>
          {/* Left: Students Dashboard */}
          <View style={styles.leftPanel}>
            <TextInput
              placeholder="Search student..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.input}
              placeholderTextColor="#888"
            />

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
                      <Pressable
                        key={idx}
                        style={[
                          styles.card,
                          isCheckedIn ? styles.in : styles.out,
                        ]}
                        onPress={() => {
                          setSelectedStudent(entry);
                          setManualSelect(true); // prevent auto-switching to latest
                        }}
                      >
                        <View style={styles.cardRow}>
                          <Text style={styles.cardTitle}>
                            {entry.student_name || entry.students?.name}
                          </Text>
                          <Text
                            style={[
                              styles.statusText,
                              isCheckedIn
                                ? styles.checkedIn
                                : styles.checkedOut,
                            ]}
                          >
                            {isCheckedIn ? "Checked In" : "Checked Out"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
              ) : (
                <SafeAreaView style={styles.loadingSafeArea}>
                  <ActivityIndicator size="large" color="#004A7C" />
                </SafeAreaView>
              )}
            </ScrollView>
          </View>

          {/* Right: Action Panel */}
          {/* Right: Action Panel */}
          <View style={styles.rightPanel}>
            {selectedStudent ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Info Card</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>
                    {selectedStudent.student_name}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedStudent.checkin_time).toLocaleDateString(
                      "en-SG"
                    )}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Checked In:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedStudent.checkin_time).toLocaleTimeString(
                      "en-SG"
                    )}
                  </Text>
                </View>

                {selectedStudent.checkout_time && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Checked Out:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(
                        selectedStudent.checkout_time
                      ).toLocaleTimeString("en-SG")}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noDataText}>
                Select a student to see details
              </Text>
            )}

            <Pressable style={styles.scanButton} onPress={startScan}>
              <Text style={styles.scanButtonText}>Scan QR Code</Text>
            </Pressable>
          </View>
        </View>

        {/* Modal */}
        <Modal visible={modalVisible} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Students</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Student Name"
                value={studentName}
                onChangeText={setStudentName}
                placeholderTextColor="gray"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent's Number"
                value={parentNumber}
                onChangeText={setParentNumber}
                placeholderTextColor="gray"
              />

              <Pressable style={styles.addButton} onPress={addStudent}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>

              {students.length > 0 &&
                students.map((s, i) => (
                  <View key={i} style={styles.studentItem}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <Text style={styles.studentName}>{s.name}</Text>
                        <Text style={styles.studentParentLabel}>
                          Number: {s.parentNumber}
                        </Text>
                      </View>

                      {/* X Button */}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => {
                          setStudents((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          );
                        }}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

              <View
                style={{ flexDirection: "row", marginTop: 20, columnGap: 20 }}
              >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { flex: 1 },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#004A7C",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
    fontSize: 21,
  },
  card: {
    padding: 24, // was 14
    borderRadius: 14, // slightly bigger
    marginBottom: 16,
    borderWidth: 2,
  },
  in: { backgroundColor: "#e0f7fa", borderColor: "#00796b" },
  out: { backgroundColor: "#fce4ec", borderColor: "#c2185b" },
  cardTitle: { fontWeight: "bold", fontSize: 30, color: "#004A7C" }, // was 16
  cardDetail: { fontSize: 18, marginTop: 6 }, // was 14
  primaryButton: {
    backgroundColor: "#004A7C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  uploadCSVButton: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#004A7C",
    alignItems: "center",
    marginVertical: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold" },
  uploadCsvText: { color: "#004A7C", fontWeight: "bold" },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#004A7C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  secondaryButtonText: { color: "#004A7C", fontWeight: "bold" },
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
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
    marginBottom: 16,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 20 },
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
    fontSize: 40,
    fontWeight: "bold",
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
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10, // if not supported, use marginRight on logo
  },
  studentItem: {
    marginBottom: 20,
    padding: 20, // was 14
    borderRadius: 14, // was 10
    backgroundColor: "#ffffff",
    borderWidth: 2, // was 1
    borderColor: "#ccc",
    elevation: 3,
  },
  studentName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 6,
  }, // was 18
  studentParentLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
    marginTop: 6,
  }, // was 14
  studentParent: {
    fontSize: 16,
    color: "#333",
    marginTop: 2,
  },
  loadingSafeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainRow: {
    flex: 1,
    flexDirection: "row",
    padding: 20,
    gap: 20, // if not supported, use marginRight on leftPanel
  },

  leftPanel: {
    flex: 7,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#004A7C",
    padding: 16,
  },

  scanButtonText: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "bold",
  },

  scanButton: {
    flex: 1, // takes 1/4 of right panel
    width: "100%",
    backgroundColor: "#004A7C",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 20,
  },
  rightPanel: {
    flex: 3,
    flexDirection: "column",
    justifyContent: "center", // center vertically
    alignItems: "center", // center horizontally
  },

  infoCard: {
    width: "100%",
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
  },

  infoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 20,
  },

  infoRow: {
    marginBottom: 16,
    width: "100%",
  },

  infoLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#004A7C",
  },

  infoValue: {
    fontSize: 23,
    color: "#333333",
  },

  noDataText: {
    fontSize: 20, // bigger
    color: "#555555",
    marginTop: 12,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },

  checkedIn: {
    color: "#00796b", // greenish for checked in
  },

  checkedOut: {
    color: "#c2185b", // reddish for checked out
  },
  removeButton: {
    marginBottom: 50,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },

  removeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
