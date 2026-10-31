import { DEFAULT_ROLE_PERMISSIONS, type MeResponse } from '@snowsync/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RolePermissionsScreen } from '../../../src/features/officer/RolePermissionsScreen';
import {
  fetchRolePermissions,
  updateRolePermissions,
} from '../../../src/features/officer/rolePermissionsApi';
import { resetAuthStore, useAuthStore } from '../../../src/state/authStore';

jest.mock('../../../src/features/officer/rolePermissionsApi', () => ({
  fetchRolePermissions: jest.fn(),
  updateRolePermissions: jest.fn(),
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const data = {
  roles: DEFAULT_ROLE_PERMISSIONS,
  locked: { MEMBER: [], OFFICER: ['MONITOR_TRIPS' as const] },
};

function signInAs(role: MeResponse['role']) {
  useAuthStore.getState().sessionStarted({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshToken: 'test-refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  useAuthStore.getState().userLoaded({
    id: 'u1',
    email: 'p@example.com',
    displayName: 'Paula',
    role,
    membershipStatus: 'APPROVED',
    onboardingCompleted: true,
    permissions: [],
  });
}

describe('RolePermissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthStore();
    jest.mocked(fetchRolePermissions).mockResolvedValue(data);
  });

  it('is forbidden for non-executives and never loads data', () => {
    signInAs('OFFICER');
    render(<RolePermissionsScreen />);
    expect(
      screen.getByText(
        'Only the Treasurer, Vice President and President can change role permissions.',
      ),
    ).toBeTruthy();
    expect(fetchRolePermissions).not.toHaveBeenCalled();
  });

  it('shows locked and future permissions for officers', async () => {
    signInAs('PRESIDENT');
    render(<RolePermissionsScreen />);
    expect(await screen.findByText('Always on for safety')).toBeTruthy();
    expect(screen.getByLabelText('Monitor live trips')).toBeDisabled();
    expect(screen.getAllByText('Takes effect in Sprint 3').length).toBeGreaterThan(0);
  });

  it('saves a member permission with a required reason', async () => {
    signInAs('TREASURER');
    jest
      .mocked(updateRolePermissions)
      .mockImplementation((request) =>
        Promise.resolve({ ...data, roles: { ...data.roles, [request.role]: request.permissions } }),
      );

    render(<RolePermissionsScreen />);
    fireEvent.press(await screen.findByRole('tab', { name: 'Member' }));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent(screen.getByLabelText('Review membership requests'), 'valueChange', true);
    fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save permissions' }));
    expect(await screen.findByText('Say why you are changing these permissions.')).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText('Reason for change'),
      'Trip leads help with approvals',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Save permissions' }));
    await waitFor(() =>
      expect(updateRolePermissions).toHaveBeenCalledWith({
        role: 'MEMBER',
        permissions: { ...DEFAULT_ROLE_PERMISSIONS.MEMBER, REVIEW_MEMBERSHIPS: true },
        reason: 'Trip leads help with approvals',
      }),
    );
    expect(
      await screen.findByText(
        "Member permissions saved. They apply on each person's next request.",
      ),
    ).toBeTruthy();
  });
});
