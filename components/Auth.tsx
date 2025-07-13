import React, { useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, View, AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, TextInput } from "react-native-paper";

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

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
      Alert.alert(error.message);
    } else if (session) {
      // If user is signed in immediately (no email confirmation required)
      router.replace("/");
    } else {
      // If email confirmation is required
      Alert.alert("Check your inbox to confirm your email before logging in.");
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@address.com"
          autoCapitalize="none"
          mode="outlined"
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
          mode="outlined"
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          mode="contained"
          disabled={loading}
          loading={loading}
          onPress={signInWithEmail}
        >
          Sign in
        </Button>
      </View>
      <View style={styles.verticallySpaced}>
        <Button mode="outlined" disabled={loading} onPress={signUpWithEmail}>
          Sign up
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
});
