import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import HomeScreen from '../app/(tabs)/index';
import InboxScreen from '../app/(tabs)/inbox';
import TabLayout from '../app/(tabs)/_layout';
import ProfileScreen from '../app/(tabs)/profile';
import TripsScreen from '../app/(tabs)/trips';

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