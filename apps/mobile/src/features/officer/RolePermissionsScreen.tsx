import {
  CONFIGURABLE_ROLES,
  PERMISSION_KEYS,
  PERMISSIONS,
  ROLE_LABELS,
  type ConfigurableRole,
  type PermissionMap,
  type RolePermissionsResponse,
} from '@snowsync/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ApiClientError } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Dialog } from '../../components/Dialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { TextField } from '../../components/TextField';
import { ToggleRow } from '../../components/ToggleRow';
import { selectIsExecutive, useAuthStore } from '../../state/authStore';
import { colors, radii, sizes, spacing } from '../../theme';
import { fetchRolePermissions, updateRolePermissions } from './rolePermissionsApi';

const CURRENT_SPRINT = 2;
const MAX_REASON_LENGTH = 500;

type LoadState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'loaded'; data: RolePermissionsResponse };

/**
 * Executive-only screen where the Treasurer, Vice President or President
 * choose what Members and Officers may do.
 * Saving requires a reason, which is written to the audit log by the server.
 */
export function RolePermissionsScreen() {
  const isExecutive = useAuthStore(selectIsExecutive);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [role, setRole] = useState<ConfigurableRole>('OFFICER');
  const [draft, setDraft] = useState<PermissionMap | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string>();

  // Prevent overlapping saves before React updates the saving state.
  const savingRef = useRef(false);

  const request = useCallback(() => {
    fetchRolePermissions().then(
      (data) => setState({ kind: 'loaded', data }),
      () => setState({ kind: 'failed' }),
    );
  }, []);

  useEffect(() => {
    if (isExecutive) request();
  }, [isExecutive, request]);

  const saved = state.kind === 'loaded' ? state.data.roles[role] : null;
  const current = draft ?? saved;

  const changed = useMemo(
    () => !!draft && !!saved && PERMISSION_KEYS.some((key) => draft[key] !== saved[key]),
    [draft, saved],
  );

  const switchRole = (next: ConfigurableRole) => {
    if (savingRef.current || saving || confirming) return;

    setRole(next);
    setDraft(null);
    setReason('');
    setReasonError(undefined);
    setSavedMessage(undefined);
  };

  const closeConfirmation = () => {
    if (savingRef.current || saving) return;

    setConfirming(false);
    setReasonError(undefined);
  };

  const save = async () => {
    if (savingRef.current || saving || !changed || !current) return;

    const trimmedReason = reason.trim();

    if (trimmedReason.length < 3) {
      setReasonError('Say why you are changing these permissions.');
      return;
    }

    if (trimmedReason.length > MAX_REASON_LENGTH) {
      setReasonError('Reason must be 500 characters or fewer.');
      return;
    }

    // Capture the role and permissions being saved.
    const savingRole = role;
    const savingPermissions = { ...current };

    savingRef.current = true;
    setSaving(true);
    setReasonError(undefined);

    try {
      const data = await updateRolePermissions({
        role: savingRole,
        permissions: savingPermissions,
        reason: trimmedReason,
      });

      setState({ kind: 'loaded', data });
      setDraft(null);
      setConfirming(false);
      setReason('');
      setSavedMessage(
        `${ROLE_LABELS[savingRole]} permissions saved. They apply on each person's next request.`,
      );
    } catch (error) {
      setReasonError(
        error instanceof ApiClientError ? error.message : 'Could not save. Try again.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!isExecutive) {
    return (
      <Screen>
        <ErrorState
          variant="forbidden"
          message="Only the Treasurer, Vice President and President can change role permissions."
          actionLabel="Back to Profile"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (state.kind === 'loading') {
    return (
      <Screen>
        <LoadingSkeleton lines={4} accessibilityLabel="Loading role permissions" />
      </Screen>
    );
  }

  if (state.kind === 'failed' || !current) {
    return (
      <Screen>
        <ErrorState
          variant="network"
          onAction={() => {
            setState({ kind: 'loading' });
            request();
          }}
        />
      </Screen>
    );
  }

  const locked = state.data.locked[role];

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Role permissions
      </Text>

      <Text color="textMuted">
        Treasurer, Vice President and President always have every permission. Choose what Members
        and Officers can do.
      </Text>

      <View style={styles.tabs} accessibilityRole="tablist">
        {CONFIGURABLE_ROLES.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{
              selected: role === option,
              disabled: saving || confirming,
            }}
            disabled={saving || confirming}
            onPress={() => switchRole(option)}
            style={[
              styles.tab,
              role === option && styles.tabSelected,
              (saving || confirming) && styles.disabled,
            ]}
          >
            <Text variant="label" color={role === option ? 'textOnBrand' : 'textPrimary'}>
              {ROLE_LABELS[option]}
            </Text>
          </Pressable>
        ))}
      </View>

      {savedMessage ? (
        <Card>
          <Text color="brandGreen">{savedMessage}</Text>
        </Card>
      ) : null}

      <Card>
        {PERMISSION_KEYS.map((key) => {
          const isLocked = locked.includes(key);
          const { enforcedFrom } = PERMISSIONS[key];

          return (
            <ToggleRow
              key={key}
              label={PERMISSIONS[key].label}
              description={PERMISSIONS[key].description}
              note={
                isLocked
                  ? 'Always on for safety'
                  : enforcedFrom > CURRENT_SPRINT
                    ? `Takes effect in Sprint ${enforcedFrom}`
                    : undefined
              }
              value={current[key]}
              disabled={isLocked || saving || confirming}
              onValueChange={(value) => {
                if (savingRef.current || saving || confirming) return;

                setSavedMessage(undefined);
                setDraft({ ...current, [key]: value });
              }}
            />
          );
        })}
      </Card>

      <Button
        label="Save changes"
        onPress={() => {
          if (!savingRef.current && !saving && changed) {
            setConfirming(true);
          }
        }}
        disabled={!changed || saving || confirming}
      />

      <Dialog
        visible={confirming}
        title={`Change ${ROLE_LABELS[role]} permissions?`}
        message="This changes what every person with this role can do. The change and your reason are recorded in the audit log."
        primaryLabel="Save permissions"
        onPrimary={() => void save()}
        primaryLoading={saving}
        secondaryLabel="Cancel"
        onSecondary={closeConfirmation}
        onDismiss={closeConfirmation}
      >
        <TextField
          label="Reason for change"
          value={reason}
          onChangeText={(value) => {
            if (savingRef.current || saving) return;

            setReason(value.slice(0, MAX_REASON_LENGTH));
            setReasonError(undefined);
          }}
          error={reasonError}
        />

        <Text variant="caption" color="textMuted">
          {reason.length} / {MAX_REASON_LENGTH} characters
        </Text>
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: sizes.minTouchTargetAndroid,
    borderRadius: radii.field,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  tabSelected: {
    backgroundColor: colors.brandGreen,
    borderColor: colors.brandGreen,
  },
  disabled: {
    opacity: 0.6,
  },
});
