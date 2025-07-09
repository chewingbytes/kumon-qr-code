import { View, Pressable, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { router } from "expo-router";

const Home: React.FC = () => {
  const startScan = () => {
    router.push("scanner");

  };

  return (
    <View style={styles.container}>
      <Link style={styles.button} href="/dashboard">
        <Text style={styles.text}>Dashboard</Text>
      </Link>
      <Pressable style={styles.button} onPress={startScan}>
        <Text style={styles.text}>Scan QR code</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 4,
    elevation: 3,
    backgroundColor: "black",
    marginVertical: 5,
  },
  text: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
    color: "white",
  },
});

export default Home;
