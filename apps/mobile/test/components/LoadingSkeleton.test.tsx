import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces itself as loading and busy', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<LoadingSkeleton accessibilityLabel="Loading server status" />);
    const skeleton = await screen.findByLabelText('Loading server status');
    expect(skeleton).toBeBusy();
  });

  it('defaults its label to "Loading"', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    render(<LoadingSkeleton />);
    expect(await screen.findByLabelText('Loading')).toBeTruthy();
  });
});
