import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

export default function MainLayout(): ReactNode {
  return <Stack screenOptions={{ headerShown: false }} />;
}
