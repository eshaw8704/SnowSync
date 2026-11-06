import { fireEvent, render, screen } from '@testing-library/react-native';
import { BasicsStep, withDay, withTime } from '../../../src/features/tripCreation/steps/BasicsStep';
import { geofenceLabel, ResortStep } from '../../../src/features/tripCreation/steps/ResortStep';
import { RegistrationStep } from '../../../src/features/tripCreation/steps/RegistrationStep';
import { EMPTY_DRAFT } from '../../../src/features/tripCreation/tripDraft';

describe('wizard steps 1 to 3', () => {
  it('Basics edits the name and shows field errors', () => {
    const onChange = jest.fn();
    render(
      <BasicsStep
        value={EMPTY_DRAFT}
        onChange={onChange}
        errors={{ name: 'Use at least 3 characters.' }}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Trip name'), 'Sugar Bowl club day');
    expect(onChange).toHaveBeenCalledWith({ name: 'Sugar Bowl club day' });
    expect(screen.getByText('Use at least 3 characters.')).toBeTruthy();
    expect(
      screen.getByText('You can edit the date and time up until the trip goes ACTIVE.'),
    ).toBeTruthy();
  });

  it('keeps the time when the day changes, and the day when the time changes', () => {
    const start = new Date(2027, 1, 6, 8, 0).toISOString();
    expect(new Date(withDay(start, new Date(2027, 1, 13), 9)).getHours()).toBe(8);
    expect(new Date(withDay(start, new Date(2027, 1, 13), 9)).getDate()).toBe(13);
    expect(new Date(withDay(null, new Date(2027, 1, 13), 16)).getHours()).toBe(16);
    const later = new Date(withTime(start, new Date(2000, 0, 1, 9, 30)));
    expect([later.getDate(), later.getHours(), later.getMinutes()]).toEqual([6, 9, 30]);
  });

  it('Resort lists the five resorts and labels the geofence', () => {
    const onChange = jest.fn();
    render(
      <ResortStep
        value={{ ...EMPTY_DRAFT, resortName: 'Sugar Bowl' }}
        onChange={onChange}
        errors={{}}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Sugar Bowl' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'Heavenly' }));
    expect(onChange).toHaveBeenCalledWith({ resortName: 'Heavenly' });
    expect(screen.getByText('Resort boundary · 500 m around base lodge')).toBeTruthy();
    expect(geofenceLabel(750, 'base lodge')).toBe('Resort boundary · 750 m around base lodge');
  });

  it('Registration shows capacity and cost errors on their fields', () => {
    render(
      <RegistrationStep
        value={EMPTY_DRAFT}
        onChange={jest.fn()}
        errors={{
          capacityText: 'Enter how many members can join.',
          registrationClosesAt: 'The deadline must be after registration opens.',
        }}
      />,
    );
    expect(screen.getByText('Enter how many members can join.')).toBeTruthy();
    expect(screen.getByText('The deadline must be after registration opens.')).toBeTruthy();
  });
});
