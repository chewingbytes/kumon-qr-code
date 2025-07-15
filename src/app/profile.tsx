import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Button } from "react-native-paper";
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
      <SafeAreaView style={localStyles.loadingSafeArea}>
        <ActivityIndicator size="large" color="#004A7C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <View style={localStyles.container}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={() => router.push("/")}
        >
          <Text style={localStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <View style={localStyles.card}>
            <Text style={localStyles.title}>My Profile</Text>

            <View style={localStyles.infoGroup}>
              <Text style={localStyles.label}>Email</Text>
              <Text style={localStyles.value}>{user.email}</Text>
            </View>

            <View style={localStyles.infoGroup}>
              <Text style={localStyles.label}>User ID</Text>
              <Text style={localStyles.value}>{user.id}</Text>
            </View>

            <View style={localStyles.infoGroup}>
              <Text style={localStyles.label}>Created At</Text>
              <Text style={localStyles.value}>
                {new Date(user.created_at).toLocaleString()}
              </Text>
            </View>

            <Pressable onPress={() => handleLogout()}>
              <Text style={localStyles.dropdownItem}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f0f9ff"
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#004A7C",
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 20,
    textAlign: "center",
  },
  infoGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: "#004A7C",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dropdownItem: {
    paddingVertical: 20,
    fontSize: 16,
    color: "#004A7C",
    textAlign: "center",
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
  buttoncontainer: {
    padding: 20,
  },
});
