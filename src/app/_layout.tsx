import { Stack } from "expo-router";

const Layout: React.FC = () => (
  <Stack>
    <Stack.Screen
      name="index"
      options={{
        title: "Home",
      }}
    />
    <Stack.Screen
      name="dashboard"
      options={{
        title: "Dashboard",
      }}
    />
    <Stack.Screen
      name="scanner"
      options={{
        title: "Scan a QR Code",
      }}
    />
  </Stack>
);

export default Layout;
