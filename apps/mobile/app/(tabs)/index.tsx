import { StyleSheet, Text, View } from 'react-native';

// Home tab placeholder. Real content arrives in a later sprint.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});