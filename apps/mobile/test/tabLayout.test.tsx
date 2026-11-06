import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import HomeScreen from '../app/(tabs)/index';
import InboxScreen from '../app/(tabs)/inbox';
import TabLayout from '../app/(tabs)/_layout';
import ProfileScreen from '../app/(tabs)/profile';
import TripsScreen from '../app/(tabs)/trips';

//Home and Trips load trips from the server; this smoke test only checks the tab bar, so the
//requests never answer.
jest.mock('../src/features/trips/tripsApi', () => ({
  listTrips: jest.fn(() => new Promise(() => {})),
  getTrip: jest.fn(() => new Promise(() => {})),
}));

describe('tab layout', () => {
  it('renders the four member tabs with accessible labels', async () => {
    renderRouter(
      {
        '(tabs)/_layout': TabLayout,
        '(tabs)/index': HomeScreen,
        '(tabs)/trips': TripsScreen,
        '(tabs)/inbox': InboxScreen,
        '(tabs)/profile': ProfileScreen,
      },
      { initialUrl: '/' },
    );

    for (const title of ['Home', 'Trips', 'Inbox', 'Profile']) {
      expect(await screen.findByLabelText(`${title} tab`)).toBeTruthy();
    }
  });
});
