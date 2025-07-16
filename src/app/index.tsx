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
  const [studentParent, setStudentParent] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [studentsDashboard, setStudentsDashboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pickedCSV, setPickedCSV] = useState(null);
  const [csvFileName, setCsvFileName] = useState(null);

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
    if (!studentName || !studentParent || !parentEmail) {
      return Alert.alert("Missing Fields", "Please fill all fields.");
    }
    setStudents((prev) => [
      ...prev,
      { name: studentName, parent: studentParent, parentEmail },
    ]);
    setStudentName("");
    setStudentParent("");
    setParentEmail("");
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
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
                      >
                        <Text style={styles.cardTitle}>
                          🧒 {entry.student_name || entry.students?.name}
                        </Text>
                        <Text style={styles.cardDetail}>
                          Date:{" "}
                          {new Date(entry.checkin_time).toLocaleDateString(
                            "en-SG"
                          )}
                        </Text>
                        <Text style={styles.cardDetail}>
                          Check In:{" "}
                          {new Date(entry.checkin_time).toLocaleTimeString(
                            "en-SG"
                          )}
                        </Text>
                        {entry.checkout_time && (
                          <Text style={styles.cardDetail}>
                            Check Out:{" "}
                            {new Date(entry.checkout_time).toLocaleTimeString(
                              "en-SG"
                            )}
                          </Text>
                        )}
                        <Text style={styles.cardDetail}>
                          📩 Parent Notified:{" "}
                          <Text
                            style={{
                              fontWeight: "bold",
                              color: entry.parent_notified ? "green" : "red",
                            }}
                          >
                            {entry.parent_notified ? "Yes" : "No"}
                          </Text>
                        </Text>
                      </View>
                    );
                  })
              ) : (
                <SafeAreaView style={styles.loadingSafeArea}>
                  <ActivityIndicator size="large" color="#004A7C" />
                </SafeAreaView>
              )}
            </ScrollView>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={startScan}>
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </Pressable>
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
                placeholder="Parent Name"
                value={studentParent}
                onChangeText={setStudentParent}
                placeholderTextColor="gray"
              />
              <TextInput
                style={styles.input}
                placeholder="Parent Email"
                value={parentEmail}
                onChangeText={setParentEmail}
                placeholderTextColor="gray"
              />

              <Pressable style={styles.addButton} onPress={addStudent}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>

              {students.length > 0 &&
                students.map((s, i) => (
                  <View key={i} style={styles.studentItem}>
                    <Text style={styles.studentName}>{s.name}</Text>
                    <Text style={styles.studentParentLabel}>
                      Parent: {s.parent}
                    </Text>
                    <Text style={styles.studentParentLabel}>
                      Email: {s.parentEmail}
                    </Text>
                  </View>
                ))}

              <View style={{ flexDirection: "row", marginTop: 20 }}>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginRight: 6 }]}
                  onPress={submitStudents}
                >
                  <Text style={styles.primaryButtonText}>Submit</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { flex: 1, marginLeft: 6 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.primaryButton, { marginTop: 10 }]}
                onPress={pickedCSV ? uploadPickedCSV : handlePickCSV}
                disabled={uploading}
              >
                <Text style={styles.primaryButtonText}>
                  {uploading
                    ? "Uploading..."
                    : pickedCSV
                    ? `Upload: ${csvFileName}`
                    : "Import CSV"}
                </Text>
              </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { flex: 1 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#004A7C",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  card: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  in: { backgroundColor: "#e0f7fa", borderColor: "#00796b" },
  out: { backgroundColor: "#fce4ec", borderColor: "#c2185b" },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: "#004A7C" },
  cardDetail: { fontSize: 14, marginTop: 4 },
  primaryButton: {
    backgroundColor: "#004A7C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold" },
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
    elevation: 5,
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
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ccc",
    elevation: 2,
  },

  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 4,
  },

  studentParentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginTop: 4,
  },

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
});
