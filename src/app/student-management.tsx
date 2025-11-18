// MyStudentsScreen.js
import { useEffect, useState } from "react";
import { toast } from 'sonner-native';
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;

export default function MyStudentsScreen() {
  const [studentsDashboard, setStudentsDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [parentNumber, setParentNumber] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  /** FETCH STUDENTS */
  const fetchStudents = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const res = await fetch(API + "api/db/all-students", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setStudentsDashboard(json.students || []);
    } catch (error) {
      console.error("Error fetching students:", error.message);
      setStudentsDashboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  /** OPEN EDIT POPUP */
  const openEditModal = async (student) => {
    console.log("TRIGGER OPEN EDIT MODEL");
    try {
      setEditingStudent({ ...student });
      setShowEditModal(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      // Fetch parent number
      const res = await fetch(API + "api/db/get-parent-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          student_name: student.name,
          parent_id: student.parent_id,
        }),
      });

      const json = await res.json();
      console.log("JSON:", json);

      if (json.error) {
        console.error(json.error);
        setParentNumber("");
        return;
      }

      // Put the fetched parent number into the field
      setParentNumber(json.parent_number || "");
    } catch (err) {
      console.error("Error fetching parent number:", err.message);
    }
  };

  /** SAVE EDITED STUDENT */
  const saveEditedStudent = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      // Send updated student info to backend
      const res = await fetch(API + "api/db/update-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: editingStudent.id,
          parent_id: editingStudent.parent_id,
          name: editingStudent.name,
          parent_number: parentNumber, // send the updated parent number
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Update local student list
      setStudentsDashboard((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? { ...s, name: editingStudent.name, parent_number: parentNumber }
            : s
        )
      );

      toast(`Updated ${editingStudent.name}!`)
      setShowEditModal(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  /** OPEN DELETE POPUP */
  const askDeleteStudent = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  /** DELETE STUDENT CONFIRM */
  const deleteStudent = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const res = await fetch(
        API + "api/db/delete-student/" + studentToDelete.id,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setStudentsDashboard((prev) =>
        prev.filter((s) => s.id !== studentToDelete.id)
      );

      setShowDeleteModal(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loading}
        edges={["top", "bottom", "left", "right"]}
      >
        <ActivityIndicator size="large" color="#004A7C" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        {/* BACK */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Your Students</Text>

            <TextInput
              placeholder="Search students..."
              placeholderTextColor="#1F3C88"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.studentList}>
              {studentsDashboard
                .filter((s) =>
                  s.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((student) => (
                  <View style={styles.studentCard} key={student.id}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentTitle}>{student.name}</Text>

                      <View style={styles.subInfoGroup}>
                        <Text style={styles.subLabel}>Parent Id</Text>
                        <Text style={styles.subValue}>
                          {student.parent_id || "N/A"}
                        </Text>
                      </View>
                    </View>

                    {/* ACTION BUTTONS */}
                    <View style={styles.actionBox}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(student)}
                      >
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => askDeleteStudent(student)}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      {/* EDIT MODAL */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Student</Text>

            <TextInput
              style={styles.input}
              value={editingStudent?.name}
              onChangeText={(txt) =>
                setEditingStudent((prev) => ({ ...prev, name: txt }))
              }
            />
            <TextInput
              style={styles.input}
              value={parentNumber}
              onChangeText={setParentNumber}
              placeholder="Parent Number"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={saveEditedStudent}
            >
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteBox}>
            <Text style={styles.deleteTitle}>Delete Student?</Text>
            <Text style={styles.deleteText}>This action cannot be undone.</Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.cancelButtonSmall}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelSmallText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButtonRed}
                onPress={deleteStudent}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#A7C7E7",
  },

  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingLeft: 20,
  },

  container: {
    flex: 1,
    padding: 20,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F8FF",
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
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  card: {
    width: "100%",
    backgroundColor: "#F2E9E4",
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: "#1F3C88",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  title: {
    fontSize: 32,
    color: "#1F3C88",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  searchInput: {
    borderWidth: 3,
    borderColor: "#1F3C88",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 20,
    marginBottom: 16,
    backgroundColor: "#ADC5CE",
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  studentList: {
    flex: 1,
    marginTop: 4,
    width: "100%",
  },

  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ADC5CE",
    padding: 18,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#1F3C88",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  studentTitle: {
    fontSize: 28,
    color: "#1F3C88",
    marginBottom: 10,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },

  subInfoGroup: {
    marginTop: 2,
  },
  subLabel: {
    fontSize: 18,
    color: "#1F3C88",
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
  },
  subValue: { fontSize: 18, color: "#1F3C88", fontFamily: "Courier" },

  // Right-side edit/delete buttons
  actionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 10,
  },

  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E7F0FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A8C7FF",
  },
  editText: {
    color: "#1F3C88",
    fontSize: 14,
    fontWeight: "600",
  },

  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFEAEA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFB5B5",
  },
  deleteText: {
    color: "#B30000",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal overlay background
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 20,
  },

  modalBox: {
    width: "100%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 14,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#002766",
    marginBottom: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#AFC8FF",
    backgroundColor: "#F5F9FF",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    color: "#002766",
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: "#1F3C88",
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  cancelButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E8ECF7",
  },
  cancelButtonText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#1F3C88",
  },

  // Delete modal box
  deleteBox: {
    width: "100%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 14,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#B30000",
    marginBottom: 6,
  },
  deleteActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  cancelButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#E8ECF7",
    borderRadius: 8,
  },
  cancelSmallText: {
    color: "#1F3C88",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButtonRed: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FF4D4D",
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  pageTitle: {
    flex: 1,
    fontSize: 28,
    fontFamily: "DynaPuff_400Regular", // or Dancing Script / Great Vibes
    color: "#1F3C88",
    textAlign: "center",
    marginRight: 40, // ensures back button doesn't overlap
  },
});
