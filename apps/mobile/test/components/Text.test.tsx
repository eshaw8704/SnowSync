import { render, screen } from '@testing-library/react-native';
import { Text } from '../../src/components/Text';

describe('Text', () => {
  it('defaults to the body style in charcoal', () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 23,
      color: '#182B27',
    });
  });

  it('applies a variant and a color token', () => {
    render(
      <Text variant="title" color="brandGreen">
        Trips
      </Text>,
    );
    expect(screen.getByText('Trips')).toHaveStyle({
      fontFamily: 'Inter_700Bold',
      fontSize: 28,
      color: '#00573D',
    });
  });

  it('always scales with the device text size', () => {
    render(<Text allowFontScaling={false}>Scaled</Text>);
    expect(screen.getByText('Scaled').props.allowFontScaling).toBe(true);
  });
});
