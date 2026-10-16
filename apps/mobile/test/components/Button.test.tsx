import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../../src/components/Button';

describe('Button', () => {
  it('fires onPress once per press', () => {
    const onPress = jest.fn();
    render(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and reports the disabled state', () => {
    const onPress = jest.fn();
    render(<Button label="Continue" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('does not fire while loading and reports busy', () => {
    const onPress = jest.fn();
    render(<Button label="Continue" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });

  it('is at least 52 pt tall', () => {
    render(<Button label="Continue" onPress={() => {}} />);
    expect(screen.getByRole('button')).toHaveStyle({ minHeight: 52 });
  });
});
