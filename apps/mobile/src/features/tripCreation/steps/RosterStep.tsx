import { ROLE_LABELS, type MemberSearchResult } from '@snowsync/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Text } from '../../../components/Text';
import { TextField } from '../../../components/TextField';
import { spacing } from '../../../theme';
import { searchMembers } from '../tripCreationApi';
import type { StepProps } from './stepProps';

/** Wait this long after the last keystroke before searching, so typing does not flood the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Step 5 · Initial roster (Figma catalog 09): search approved members (SS-130) and add or remove
 * them. Roster members are saved as REGISTERED when the trip is created.
 */
export function RosterStep({ value, onChange }: StepProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchMembers(query).then(
        (members) => {
          if (!cancelled) {
            setResults(members);
            setFailed(false);
          }
        },
        () => {
          if (!cancelled) setFailed(true);
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const added = new Set(value.roster.map((member) => member.id));
  const add = (member: MemberSearchResult) => onChange({ roster: [...value.roster, member] });
  const remove = (id: string) =>
    onChange({ roster: value.roster.filter((member) => member.id !== id) });

  return (
    <View style={{ gap: spacing.md }}>
      {value.roster.length > 0 ? (
        <Card>
          {value.roster.map((member) => (
            <View key={member.id} style={styles.row}>
              <View style={styles.who}>
                <Text variant="bodyStrong">{member.displayName}</Text>
                <Text variant="caption" color="textMuted">
                  {ROLE_LABELS[member.role]} · REGISTERED
                </Text>
              </View>
              <View style={styles.action}>
                <Button
                  label="Remove"
                  variant="secondary"
                  onPress={() => remove(member.id)}
                  accessibilityHint={`Removes ${member.displayName} from the roster`}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <TextField
        label="Add from club directory"
        value={query}
        onChangeText={setQuery}
        placeholder="Search name or email"
        autoCapitalize="none"
        helperText="Only approved club members; no user-created groups."
        testID="roster-search"
      />
      {failed ? (
        <Text color="emergency">
          Could not search members. Check your connection and try again.
        </Text>
      ) : null}
      {results
        .filter((member) => !added.has(member.id))
        .map((member) => (
          <View key={member.id} style={styles.row}>
            <View style={styles.who}>
              <Text variant="bodyStrong">{member.displayName}</Text>
              <Text variant="caption" color="textMuted">
                {member.email}
              </Text>
            </View>
            <View style={styles.action}>
              <Button
                label="Add"
                variant="secondary"
                onPress={() => add(member)}
                accessibilityHint={`Adds ${member.displayName} as REGISTERED`}
              />
            </View>
          </View>
        ))}
      <Card>
        <Text variant="caption" color="textMuted">
          Roster members are pre-added as REGISTERED. Participation is tracked independently per
          trip once check-in begins.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  who: { flex: 1, gap: 2 },
  action: { width: 120 },
});
