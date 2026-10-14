import { StyleSheet, Text, View } from 'react-native';

// Inbox tab placeholder. Real content arrives in a later sprint.
export default function InboxScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Inbox</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});