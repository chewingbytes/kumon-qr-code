import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendPasswordReset() {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "kumi://auth/callback", // your app deep link
    });

    if (error) {
      Alert.alert("Reset failed", error.message);
    } else {
      Alert.alert(
        "Check your inbox",
        "If an account with that email exists, a password reset link has been sent."
      );
      router.replace("/login");
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={sendPasswordReset}
            disabled={loading}
            loading={loading}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            Send Reset Link
          </Button>

          <Button
            mode="text"
            onPress={() => {
              router.push("/");
            }}
            style={styles.linkButton}
            labelStyle={styles.linkButtonText}
          >
            Remember Your Password?
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f9ff" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#004A7C",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#004A7C",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 16,
    alignSelf: "stretch",
  },
  primaryButton: {
    backgroundColor: "#004A7C",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "stretch",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 12,
    alignSelf: "center", // center the button itself
  },

  linkButtonText: {
    color: "#004A7C",
    fontWeight: "bold",
  },
});
