module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin must be listed last; required by
    // react-native-reanimated 4.x (which is used internally by expo-router
    // for screen transitions). Without it the JS bundle crashes on launch.
    plugins: ['react-native-worklets/plugin'],
  };
};
