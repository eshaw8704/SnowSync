import type { TripSummary } from '@snowsync/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { PARTICIPATION_LABELS, ParticipationBadge } from '../../components/ParticipationBadge';
import { Text } from '../../components/Text';
import { TRIP_STATE_LABELS, TripStateBadge } from '../../components/TripStateBadge';
import { spacing } from '../../theme';
import { formatTimeRange, formatTripDate } from '../trips/tripFormat';
import { nextStepText } from './nextStepText';

/** Props for {@link HomeTripCard}. */
export interface HomeTripCardProps {
  trip: TripSummary;
  onOpen: () => void;
  now?: Date;
}

//One of my trips on Home: name, date, the two separate badges and the next step in words.
//The spoken label repeats the date and both badges, because one label on the whole card replaces
//the text inside it for screen readers
export function HomeTripCard({ trip, onOpen, now }: HomeTripCardProps) {
  const step = nextStepText(trip, now);
  const date = formatTripDate(trip.startsAt, trip.resortTimeZone);
  const label =
    `${trip.name}. ${date}. Trip: ${TRIP_STATE_LABELS[trip.state]}. ` +
    `You: ${PARTICIPATION_LABELS[trip.myParticipation]}. ${step}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onOpen}>
      <Card style={styles.card}>
        <Text variant="bodyStrong">{trip.name}</Text>
        <Text variant="caption" color="textMuted">
          {date} · {formatTimeRange(trip.startsAt, trip.endsAt, trip.resortTimeZone)}
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
