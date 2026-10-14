import { StyleSheet, Text, View } from 'react-native';

// Trips tab placeholder. Real content arrives in a later sprint.
export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Trips</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});