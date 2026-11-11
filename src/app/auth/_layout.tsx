import { Stack } from 'expo-router';

export default function AuthRoutesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090A0C' } }}>
      <Stack.Screen name="callback" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
