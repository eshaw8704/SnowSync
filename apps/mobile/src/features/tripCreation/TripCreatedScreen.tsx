import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TripStateBadge } from '../../components/TripStateBadge';
import { colors, radii, spacing } from '../../theme';

/**
 * "Trip created." (Figma catalog 10, Created state). Shown once after the wizard saves the trip;
 * the trip stays invisible to members until registration opens.
 */
export function TripCreatedScreen() {
  const { tripId, resortName } = useLocalSearchParams<{ tripId?: string; resortName?: string }>();
  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.check}>
          <MaterialCommunityIcons name="check" size={44} color={colors.textOnBrand} />
        </View>
        <TripStateBadge state="CREATED" showPrefix={false} />
        <Text variant="title" accessibilityRole="header">
          Trip created.
        </Text>
        <Text color="textMuted">{resortName ?? 'Your trip'} is saved in CREATED state.</Text>
      </View>
      <Card>
        <Text variant="bodyStrong">What happens next</Text>
        <Text color="textMuted">
          Not open yet: members cannot register until registration opens on schedule or an officer
          opens it manually.
        </Text>
        <Text color="textMuted">
          You can edit the full trip configuration before the trip goes ACTIVE.
        </Text>
      </Card>
      {tripId ? (
        <Button label="View trip" onPress={() => router.replace(`/trip/${tripId}`)} />
      ) : null}
      <Button label="Back to Trips" variant="secondary" onPress={() => router.replace('/trips')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  check: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
