// app/auth/callback.tsx
import { useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "../../../lib/supabase";
import { router } from "expo-router";

export default function AuthCallbackScreen() {
  useEffect(() => {
    (async () => {
      const incoming = await Linking.getInitialURL();
      if (!incoming) return Alert.alert("Error", "No URL to process.");

      // Handle hash fragment converted to query:
      const cleaned = incoming.replace("#", "?");
      const urlObj = Linking.parse(cleaned);
      const { access_token, refresh_token, type } = urlObj.queryParams || {};

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) return Alert.alert("Session error", error.message);
      }

      // Handle event types:
      if (type === "recovery") {
        router.replace("/reset-password");
      } else {
        router.replace("/");
      }
    })();
  }, []);

  return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <ActivityIndicator size="large"/>
      <Text>Processing…</Text>
    </View>
  );
}
