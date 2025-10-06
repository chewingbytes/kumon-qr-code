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

export default function StudentListScreen() {
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
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.backButtonText}>⬅ Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Student List</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainRow}>
          {/* Left Panel */}
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
              style={{ flex: 1 }}
            >
              {studentsDashboard && studentsDashboard.length > 0 ? (
                studentsDashboard
                  .filter((e) =>
                    e.student_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((entry, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.card,
                        entry.status === "checked_in" ? styles.in : styles.out,
                      ]}
                      onPress={() => {
                        setSelectedStudent(entry);
                        setManualSelect(true);
                      }}
                    >
                      <Text style={styles.cardTitle}>
                        {entry.student_name || entry.students?.name}
                      </Text>
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
                    </Pressable>
                  ))
              ) : (
                <SafeAreaView style={styles.loadingSafeArea}>
                  <ActivityIndicator size="large" color="#004A7C" />
                </SafeAreaView>
              )}
            </ScrollView>
          </View>

          {/* Right Panel */}
          <View style={styles.rightPanel}>
            {selectedStudent ? (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <Text style={styles.infoTitle}>Info Card</Text>
                <View>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>
                    {selectedStudent.student_name}
                  </Text>
                </View>
                <View>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedStudent.checkin_time).toLocaleDateString(
                      "en-SG"
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.infoLabel}>Checked In:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedStudent.checkin_time).toLocaleTimeString(
                      "en-SG"
                    )}
                  </Text>
                </View>
                {selectedStudent.checkout_time && (
                  <View>
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
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#A7C7E7",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#A7C7E7",
  },
  container: {
    padding: 20,
  },

  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingLeft: 20,
  },
  backButton: {
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "Pacifico-Regular",
  },
  pageTitle: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Pacifico-Regular",
    fontWeight: "bold",
    color: "#1F3C88",
    textAlign: "center",
    marginRight: 40, // ensures back button doesn't overlap
  },

  input: {
    borderWidth: 2,
    borderColor: "#1F3C88",
    borderRadius: 10,
    padding: 18,
    marginBottom: 18,
    backgroundColor: "#FFF5E4",
    fontSize: 20,
    color: "#3B185F",
    fontFamily: "Courier",
  },

  card: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  in: {
    backgroundColor: "#CFF5E7",
    borderColor: "#59C1BD",
  },

  out: {
    backgroundColor: "#F7C8E0",
    borderColor: "#C147E9",
  },

  cardTitle: {
    fontWeight: "bold",
    fontSize: 28,
    color: "#3B185F",
    fontFamily: "Courier-Bold",
  },

  cardDetail: {
    fontSize: 18,
    marginTop: 6,
    color: "#3B185F",
    fontFamily: "Courier",
  },

  primaryButton: {
    backgroundColor: "#3B185F",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#FEC260",
  },

  primaryButtonText: {
    color: "#FEC260",
    fontWeight: "bold",
    fontFamily: "Courier-Bold",
    textTransform: "uppercase",
  },

  uploadCSVButton: {
    backgroundColor: "#FFF5E4",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3B185F",
    alignItems: "center",
    marginVertical: 10,
  },

  uploadCsvText: {
    color: "#3B185F",
    fontWeight: "bold",
    fontFamily: "Courier",
  },

  secondaryButton: {
    backgroundColor: "#FDEEDC",
    borderWidth: 2,
    borderColor: "#3B185F",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },

  secondaryButtonText: {
    color: "#3B185F",
    fontWeight: "bold",
    fontFamily: "Courier",
  },

  dropdown: {
    backgroundColor: "#FFF5E4",
    borderRadius: 12,
    elevation: 6,
    padding: 12,
    borderWidth: 2,
    borderColor: "#3B185F",
  },

  dropdownItem: {
    paddingVertical: 12,
    fontSize: 18,
    color: "#3B185F",
    fontFamily: "Courier",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF5E4",
    padding: 20,
    borderTopWidth: 4,
    borderColor: "#3B185F",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3B185F",
    fontFamily: "Courier-Bold",
  },

  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEC260",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCloseText: {
    color: "#3B185F",
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Courier-Bold",
  },

  addButton: {
    backgroundColor: "#59C1BD",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#3B185F",
  },

  addButtonText: {
    color: "#FFF5E4",
    fontWeight: "bold",
    fontSize: 20,
    fontFamily: "Courier-Bold",
  },

  studentItem: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#FFF5E4",
    borderWidth: 3,
    borderColor: "#3B185F",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  studentName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3B185F",
    marginBottom: 6,
    fontFamily: "Courier-Bold",
  },

  studentParentLabel: {
    fontSize: 16,
    color: "#3B185F",
    fontFamily: "Courier",
  },

  mainRow: {
    flex: 1,
    flexDirection: "row",
    padding: 20,
    gap: 20,
  },

  leftPanel: {
    flex: 7,
    backgroundColor: "#FFF5E4",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#1F3C88",
    padding: 16,
  },

  rightPanel: {
    flex: 3,
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#FFF5E4",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#1F3C88",
    padding: 20,
  },

  infoCard: {
    width: "100%",
    height: "100%",
    padding: 24,
    backgroundColor: "#FFF5E4",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#1F3C88",
  },

  infoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F3C88",
    marginBottom: 20,
    textDecorationLine: "underline",
    fontFamily: "Courier-Bold",
  },

  infoLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "Courier",
  },

  infoValue: {
    fontSize: 22,
    color: "#1F3C88",
    fontFamily: "Courier",
  },

  noDataText: {
    fontSize: 18,
    color: "#1F3C88",
    marginTop: 20,
    fontFamily: "Courier",
  },

  statusText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F3C88",
    fontFamily: "Courier",
  },

  checkedIn: { color: "#59C1BD" },
  checkedOut: { color: "#C147E9" },

  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C147E9",
    justifyContent: "center",
    alignItems: "center",
  },

  removeButtonText: {
    color: "#FFF5E4",
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Courier-Bold",
  },
});
