import { StyleSheet, Text, View } from 'react-native';

// Profile tab placeholder. Real content arrives in a later sprint.
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
