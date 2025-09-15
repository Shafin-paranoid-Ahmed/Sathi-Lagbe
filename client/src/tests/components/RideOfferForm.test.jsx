import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RideOfferForm from '../../components/RideOfferForm';

// Mock the API functions
jest.mock('../../api/rides', () => ({
  createRideOffer: jest.fn(),
  createRecurringRides: jest.fn()
}));

// Mock the child components
jest.mock('../../components/LocationAutocomplete', () => {
  return function MockLocationAutocomplete({ onLocationSelect, placeholder, value }) {
    return (
      <input
        data-testid={`location-${placeholder.toLowerCase().replace(/\s+/g, '-')}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onLocationSelect && onLocationSelect(e.target.value)}
      />
    );
  };
});

jest.mock('../../components/CustomDateTimePicker', () => {
  return function MockCustomDateTimePicker({ value, onChange }) {
    return (
      <input
        data-testid="departure-time"
        type="datetime-local"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
    );
  };
});

describe('RideOfferForm', () => {
  const mockCreateRideOffer = require('../../api/rides').createRideOffer;
  const mockCreateRecurringRides = require('../../api/rides').createRecurringRides;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRideOffer.mockResolvedValue({ data: { success: true, ride: { _id: '123' } } });
    mockCreateRecurringRides.mockResolvedValue({ data: { success: true, rides: [{ _id: '123' }] } });
  });

  it('renders the form with all required fields', () => {
    render(<RideOfferForm />);

    expect(screen.getByTestId('location-start-location')).toBeInTheDocument();
    expect(screen.getByTestId('location-end-location')).toBeInTheDocument();
    expect(screen.getByTestId('departure-time')).toBeInTheDocument();
    expect(screen.getByLabelText(/available seats/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /offer ride/i })).toBeInTheDocument();
  });

  it('toggles between one-time and recurring rides', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    const recurringToggle = screen.getByRole('checkbox', { name: /recurring/i });
    
    // Initially should be one-time
    expect(screen.getByTestId('departure-time')).toBeInTheDocument();
    expect(screen.queryByText(/select days/i)).not.toBeInTheDocument();

    // Toggle to recurring
    await user.click(recurringToggle);
    
    await waitFor(() => {
      expect(screen.getByText(/select days/i)).toBeInTheDocument();
      expect(screen.getByText(/time/i)).toBeInTheDocument();
    });

    // Toggle back to one-time
    await user.click(recurringToggle);
    
    await waitFor(() => {
      expect(screen.getByTestId('departure-time')).toBeInTheDocument();
      expect(screen.queryByText(/select days/i)).not.toBeInTheDocument();
    });
  });

  it('validates required fields for one-time rides', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/start location is required/i)).toBeInTheDocument();
      expect(screen.getByText(/end location is required/i)).toBeInTheDocument();
      expect(screen.getByText(/departure time is required/i)).toBeInTheDocument();
    });

    expect(mockCreateRideOffer).not.toHaveBeenCalled();
  });

  it('validates required fields for recurring rides', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Toggle to recurring
    const recurringToggle = screen.getByRole('checkbox', { name: /recurring/i });
    await user.click(recurringToggle);

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/start location is required/i)).toBeInTheDocument();
      expect(screen.getByText(/end location is required/i)).toBeInTheDocument();
      expect(screen.getByText(/select at least one day/i)).toBeInTheDocument();
    });

    expect(mockCreateRecurringRides).not.toHaveBeenCalled();
  });

  it('submits one-time ride successfully', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const departureTimeInput = screen.getByTestId('departure-time');
    const seatsInput = screen.getByLabelText(/available seats/i);

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.type(departureTimeInput, '2024-12-31T08:00');
    await user.clear(seatsInput);
    await user.type(seatsInput, '3');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateRideOffer).toHaveBeenCalledWith({
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        departureTime: '2024-12-31T08:00',
        availableSeats: 3,
        schedule: 'One-time'
      });
    });

    expect(screen.getByText(/ride offered successfully/i)).toBeInTheDocument();
  });

  it('submits recurring ride successfully', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Toggle to recurring
    const recurringToggle = screen.getByRole('checkbox', { name: /recurring/i });
    await user.click(recurringToggle);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const seatsInput = screen.getByLabelText(/available seats/i);

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.clear(seatsInput);
    await user.type(seatsInput, '2');

    // Select days
    const mondayCheckbox = screen.getByLabelText(/monday/i);
    const wednesdayCheckbox = screen.getByLabelText(/wednesday/i);
    await user.click(mondayCheckbox);
    await user.click(wednesdayCheckbox);

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateRecurringRides).toHaveBeenCalledWith({
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 2,
        schedule: 'Recurring',
        recurring: {
          days: ['Monday', 'Wednesday'],
          frequency: 'weekly'
        }
      });
    });

    expect(screen.getByText(/recurring rides created successfully/i)).toBeInTheDocument();
  });

  it('handles API errors for one-time rides', async () => {
    const user = userEvent.setup();
    mockCreateRideOffer.mockRejectedValue(new Error('API Error'));

    render(<RideOfferForm />);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const departureTimeInput = screen.getByTestId('departure-time');

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.type(departureTimeInput, '2024-12-31T08:00');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error offering ride/i)).toBeInTheDocument();
    });
  });

  it('handles API errors for recurring rides', async () => {
    const user = userEvent.setup();
    mockCreateRecurringRides.mockRejectedValue(new Error('API Error'));

    render(<RideOfferForm />);

    // Toggle to recurring
    const recurringToggle = screen.getByRole('checkbox', { name: /recurring/i });
    await user.click(recurringToggle);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');

    // Select a day
    const mondayCheckbox = screen.getByLabelText(/monday/i);
    await user.click(mondayCheckbox);

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error creating recurring rides/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Make the API call take some time
    mockCreateRideOffer.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<RideOfferForm />);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const departureTimeInput = screen.getByTestId('departure-time');

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.type(departureTimeInput, '2024-12-31T08:00');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/offering ride/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/ride offered successfully/i)).toBeInTheDocument();
    });
  });

  it('validates seat count', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    const seatsInput = screen.getByLabelText(/available seats/i);
    await user.clear(seatsInput);
    await user.type(seatsInput, '0');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 1 seat required/i)).toBeInTheDocument();
    });

    expect(mockCreateRideOffer).not.toHaveBeenCalled();
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const departureTimeInput = screen.getByTestId('departure-time');

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.type(departureTimeInput, '2024-12-31T08:00');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ride offered successfully/i)).toBeInTheDocument();
    });

    // Form should be cleared
    expect(startLocationInput.value).toBe('');
    expect(endLocationInput.value).toBe('');
    expect(departureTimeInput.value).toBe('');
  });

  it('allows selecting multiple days for recurring rides', async () => {
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Toggle to recurring
    const recurringToggle = screen.getByRole('checkbox', { name: /recurring/i });
    await user.click(recurringToggle);

    // Select multiple days
    const mondayCheckbox = screen.getByLabelText(/monday/i);
    const tuesdayCheckbox = screen.getByLabelText(/tuesday/i);
    const wednesdayCheckbox = screen.getByLabelText(/wednesday/i);

    await user.click(mondayCheckbox);
    await user.click(tuesdayCheckbox);
    await user.click(wednesdayCheckbox);

    expect(mondayCheckbox).toBeChecked();
    expect(tuesdayCheckbox).toBeChecked();
    expect(wednesdayCheckbox).toBeChecked();
  });

  it('shows success message and hides it after timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    render(<RideOfferForm />);

    // Fill in the form
    const startLocationInput = screen.getByTestId('location-start-location');
    const endLocationInput = screen.getByTestId('location-end-location');
    const departureTimeInput = screen.getByTestId('departure-time');

    await user.type(startLocationInput, 'BRAC University');
    await user.type(endLocationInput, 'Dhanmondi');
    await user.type(departureTimeInput, '2024-12-31T08:00');

    const submitButton = screen.getByRole('button', { name: /offer ride/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ride offered successfully/i)).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText(/ride offered successfully/i)).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});