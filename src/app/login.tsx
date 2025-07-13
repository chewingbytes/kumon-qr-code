import { useState, useEffect } from "react";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      router.replace("/");
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
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Password"
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={signInWithEmail}
        disabled={loading}
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>
      <Button
        mode="text"
        onPress={() => router.push("/signup")}
        style={styles.button}
      >
        Don't have an account? Sign up
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
    marginTop: 12,
  },
});
