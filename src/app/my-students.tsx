import { useEffect, useState } from "react";
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
} from "react-native";
import { supabase } from "../../lib/supabase";
import Constants from "expo-constants";

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;

export default function MyStudentsScreen() {
  const [studentsDashboard, setStudentsDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStudents = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      const res = await fetch(API + "api/db/all-students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loading} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#004A7C" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.card}>
            <Text style={styles.title}>Your Students</Text>

            <TextInput
              placeholder="Search students..."
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {studentsDashboard.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-start",
                  alignItems: "center",
                  padding: 20,
                }}
              >
                <Image
                  source={{
                    uri: "https://nlsggkzpooovjifqcbig.supabase.co/storage/v1/object/public/image_storage//cat-thumbs-up.png",
                  }}
                  style={{ width: 200, height: 200, marginBottom: 20 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 12,
                    color: "#333",
                    textAlign: "center"
                  }}
                >
                You have no students yet, go add your first student!
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/")}
                  style={{
                    backgroundColor: "#004A7C",
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}
                  >
                    Go to Dashboard
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.studentList}>
                {studentsDashboard
                  .filter((s) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((student, index) => (
                    <View style={styles.studentCard} key={index}>
                      <Text style={styles.studentTitle}>{student.name}</Text>

                      <View style={styles.subInfoGroup}>
                        <Text style={styles.subLabel}>Parent Name</Text>
                        <Text style={styles.subValue}>
                          {student.parents?.name || "N/A"}
                        </Text>
                      </View>

                      <View style={styles.subInfoGroup}>
                        <Text style={styles.subLabel}>Parent Email</Text>
                        <Text style={styles.subValue}>
                          {student.parents?.email || "N/A"}
                        </Text>
                      </View>
                    </View>
                  ))}
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 20,
    textAlign: "center",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
    color: "#333",
  },
  studentList: {
    flex: 1,
  },
  studentCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ccc",
    elevation: 2,
  },
  studentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 10,
  },
  subInfoGroup: {
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
  },
  subValue: {
    fontSize: 15,
    color: "#333",
  },

  backButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20, // space below the button so card is pushed down
  },
  backButtonText: {
    color: "#004A7C",
    fontSize: 16,
    fontWeight: "bold",
  },
});
