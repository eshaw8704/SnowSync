import type { TripSummary } from '@snowsync/shared';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ParticipationBadge } from '../../components/ParticipationBadge';
import { Text } from '../../components/Text';
import { TripStateBadge } from '../../components/TripStateBadge';
import { spacing } from '../../theme';
import { formatCost, formatTimeRange, formatTripDate, spotsLeftText } from './tripFormat';

//Props for {@link TripListCard}.
export interface TripListCardProps {
  trip: TripSummary;
  onOpen: () => void;
}

//One trip in the Trips tab (Figma catalog 08): resort, date and time, cost and spots, then the
//trip phase and my own status as two separate badges, and one Open button.
export function TripListCard({ trip, onOpen }: TripListCardProps) {
  return (
    <Card style={styles.card}>
      <Text variant="section">{trip.name}</Text>
      <Text color="textMuted">
        {trip.resortName} · {formatTripDate(trip.startsAt, trip.resortTimeZone)} ·{' '}
        {formatTimeRange(trip.startsAt, trip.endsAt, trip.resortTimeZone)}
      </Text>
      <Text color="textMuted">
        {formatCost(trip.costCents)} per member ·{' '}
        {spotsLeftText(trip.capacity, trip.registeredCount)}
      </Text>
      <View style={styles.badges}>
        <TripStateBadge state={trip.state} />
        <ParticipationBadge participation={trip.myParticipation} />
      </View>
      <Button label="Open" onPress={onOpen} accessibilityHint={`Opens ${trip.name}`} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
