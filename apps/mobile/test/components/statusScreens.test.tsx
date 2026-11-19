import { render, screen, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { DetailCard } from '../../src/components/DetailCard';
import { StatusHero } from '../../src/components/StatusHero';
import { StatusLayout } from '../../src/components/StatusLayout';
import { Text } from '../../src/components/Text';

describe('StatusHero', () => {
  it('shows the chip word, caption, title, subtitle and number tiles', () => {
    render(
      <StatusHero
        chip="OPEN"
        tone="green"
        caption="Registration open"
        title="Heavenly club day"
        subtitle="Sat Jan 30 · 8:00 AM–4:00 PM"
        stats={[
          { label: 'Price', value: '$50' },
          { label: 'Spots', value: '8 left' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Status: OPEN')).toBeTruthy();
    expect(screen.getByText('Registration open')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Heavenly club day' })).toBeTruthy();
    expect(screen.getByText('Sat Jan 30 · 8:00 AM–4:00 PM')).toBeTruthy();
    expect(screen.getByLabelText('Price: $50')).toBeTruthy();
    expect(screen.getByLabelText('Spots: 8 left')).toBeTruthy();
  });

  it('leaves out what is not given', () => {
    render(<StatusHero chip="FULL" tone="neutral" title="This trip is full" />);
    expect(screen.getByLabelText('Status: FULL')).toBeTruthy();
    expect(screen.queryByLabelText(/Price/)).toBeNull();
  });
});

describe('DetailCard', () => {
  it('reads each row as one label and value, then the note', () => {
    render(
      <DetailCard
        title="Trip details"
        rows={[
          { label: 'Trip', value: 'Heavenly' },
          { label: 'Price', value: '$50' },
        ]}
        note="Confirming reserves a spot."
      />,
    );
    expect(screen.getByRole('header', { name: 'Trip details' })).toBeTruthy();
    expect(screen.getByLabelText('Trip: Heavenly')).toBeTruthy();
    expect(screen.getByLabelText('Price: $50')).toBeTruthy();
    expect(screen.getByText('Confirming reserves a spot.')).toBeTruthy();
  });
});

describe('StatusLayout', () => {
  it('shows the content and keeps the footer outside the scroll area', () => {
    render(
      <StatusLayout footer={<Text>Confirm registration</Text>}>
        <Text>Reserve your spot?</Text>
      </StatusLayout>,
    );

    const scrollView = screen.UNSAFE_getByType(ScrollView);

    expect(within(scrollView).getByText('Reserve your spot?')).toBeTruthy();
    expect(screen.getByText('Confirm registration')).toBeTruthy();
    expect(within(scrollView).queryByText('Confirm registration')).toBeNull();
  });
});
