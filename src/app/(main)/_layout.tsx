import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * Stack layout for the main flow (menu, crosswind, settings, about).
 * Routes are file-system based and auto-registered by expo-router; the
 * explicit `<Stack.Screen>` entries below pin per-route options without
 * relying on defaults.
 */
export default function MainLayout(): ReactNode {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="menu" />
      <Stack.Screen name="crosswind" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
