import { StyleSheet, Text, View } from 'react-native';

export default function Index(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>B787 Calculator</Text>
      <Text style={styles.subtitle}>Phase B setup placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
});
