import type { TripSummary } from '@snowsync/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { Text } from '../../components/Text';
import { TripStateBadge } from '../../components/TripStateBadge';
import { spacing } from '../../theme';
import { formatTimeRange, formatTripDate } from '../trips/tripFormat';
import { nextStepText } from './nextStepText';

/** Props for {@link HomeTripCard}. */
export interface HomeTripCardProps {
  trip: TripSummary;
  onOpen: () => void;
  now?: Date;
}

//One of my trips on Home: name, date, the two separate badges and the next step in words
export function HomeTripCard({ trip, onOpen, now }: HomeTripCardProps) {
  const step = nextStepText(trip, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}. ${step}`}
      onPress={onOpen}
    >
      <Card style={styles.card}>
        <Text variant="bodyStrong">{trip.name}</Text>
        <Text variant="caption" color="textMuted">
          {formatTripDate(trip.startsAt, trip.resortTimeZone)} ·{' '}
          {formatTimeRange(trip.startsAt, trip.endsAt, trip.resortTimeZone)}
        </Text>
        <View style={styles.badges}>
          <TripStateBadge state={trip.state} />
          <ParticipationBadge participation={trip.myParticipation} />
        </View>
        <Text color="brandGreen" variant="label">
          {step}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
