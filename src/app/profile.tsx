import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Logout failed", error.message);
          } else {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error.message);
      } else {
        setUser(user);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#004A7C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>My Profile</Text>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.value}>{user.id}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Created At</Text>
            <Text style={styles.value}>
              {new Date(user.created_at).toLocaleString()}
            </Text>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 6,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 30,
    alignSelf: "center",
  },
  infoGroup: {
    marginBottom: 24,
    width: "100%",
  },
  label: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    color: "#333",
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  backButton: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#004A7C",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 30,
    alignSelf: "flex-start",
    elevation: 4,
  },
  backButtonText: {
    color: "#004A7C",
    fontSize: 22,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
});
