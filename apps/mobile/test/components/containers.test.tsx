import { render, screen } from '@testing-library/react-native';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';

describe('Card', () => {
  it('renders children on a white, bordered, rounded surface', () => {
    render(
      <Card testID="card">
        <Text>Inside</Text>
      </Card>,
    );
    expect(screen.getByText('Inside')).toBeTruthy();
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#DCE5DF',
      padding: 16,
    });
  });
});

describe('Screen', () => {
  it('renders children with and without scrolling', () => {
    const { rerender } = render(
      <Screen testID="screen">
        <Text>Static</Text>
      </Screen>,
    );
    expect(screen.getByText('Static')).toBeTruthy();
    rerender(
      <Screen scroll testID="screen">
        <Text>Scrolling</Text>
      </Screen>,
    );
    expect(screen.getByText('Scrolling')).toBeTruthy();
  });
});