import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="complete-profile" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
