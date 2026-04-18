import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RideOfferForm from '../../components/RideOfferForm';

vi.mock('../../api/rides', () => ({
  createRideOffer: vi.fn().mockResolvedValue({ data: { success: true } }),
  createRecurringRides: vi.fn().mockResolvedValue({ data: { success: true } })
}));

vi.mock('../../components/LocationAutocomplete', () => ({
  default: ({ value = '', placeholder = 'location', onLocationSelect }) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={(e) => onLocationSelect(e.target.value)}
    />
  )
}));

vi.mock('../../components/CustomDateTimePicker', () => ({
  default: ({ value = '', onChange }) => (
    <input
      aria-label="Departure Time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('RideOfferForm', () => {
  it('renders core form controls', () => {
    render(<RideOfferForm />);
    expect(screen.getByText(/start location/i)).toBeInTheDocument();
    expect(screen.getByText(/end location/i)).toBeInTheDocument();
    expect(screen.getByText(/available seats/i)).toBeInTheDocument();
  });

  it('toggles recurring mode', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    const recurringToggle = screen.getByRole('checkbox');
    await user.click(recurringToggle);

    expect(screen.getByText(/select days/i)).toBeInTheDocument();
  });
});
