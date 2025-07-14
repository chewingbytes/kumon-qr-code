import { useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "../../../lib/supabase";
import { router } from "expo-router";

export default function AuthCallbackScreen() {
  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) Alert.alert("Verification failed", error.message);
        else router.replace("/"); // navigate to home screen
      }
    })();
  }, []);

  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <ActivityIndicator size="large" />
      <Text>Verifying your email…</Text>
    </View>
  );
}
