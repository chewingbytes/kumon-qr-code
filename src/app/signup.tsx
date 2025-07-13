import { useState } from "react";
import { Alert, StyleSheet, View, AppState } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);

    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Signup failed", error.message);
    } else if (session) {
      router.replace("/");
    } else {
      Alert.alert("Check your inbox to confirm your email before logging in.");
      router.replace("/login");
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        label="Password"
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={signUpWithEmail}
        disabled={loading}
        loading={loading}
        style={styles.button}
      >
        Sign up
      </Button>
      <Button
        mode="text"
        onPress={() => router.push("/login")}
      >
        Already have an account? Log in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
});
