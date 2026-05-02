/**
 * Reanimated Jest setup. Substitutes the worklet runtime with the
 * synchronous mock shipped by react-native-reanimated, so that components
 * using `useAnimatedStyle` / `withTiming` / `useSharedValue` render in
 * jsdom without crashing on UI-thread calls.
 *
 * `jest.mock` here applies globally because this file is listed in
 * `jest.config.js#setupFilesAfterEnv`.
 */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
