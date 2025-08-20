// client/src/components/RideOfferForm.jsx
import { useState } from 'react';
import { createRideOffer, createRecurringRides } from '../api/rides';
import LocationAutocomplete from './LocationAutocomplete';

export default function RideOfferForm() {
  const [form, setForm] = useState({
    startLocation: '',
    endLocation: '',
    departureTime: '',
    recurring: false,
    recurringDays: [],
    recurringHour: '8',
    recurringMinute: '0',
    availableSeats: '1'
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const validate = () => {
    const newErrors = {};
    if (!form.startLocation) newErrors.startLocation = "Start location is required";
    if (!form.endLocation) newErrors.endLocation = "End location is required";
    if (!form.departureTime && !form.recurring) newErrors.departureTime = "Departure time is required for one-time rides";
    if (form.recurring && form.recurringDays.length === 0) newErrors.recurringDays = "Select at least one recurring day";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess(null);
    setLoading(true);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    const userId = sessionStorage.getItem('userId');

    try {
      if (form.recurring) {
        // Create recurring rides
        const payload = {
          riderId: userId,
          startLocation: form.startLocation,
          endLocation: form.endLocation,
          recurring: {
            days: form.recurringDays,
            hour: parseInt(form.recurringHour) || 8,
            minute: parseInt(form.recurringMinute) || 0,
            frequency: 'weekly'
          },
          availableSeats: parseInt(form.availableSeats) || 1
        };

        await createRecurringRides(payload);
      } else {
        // Create one-time ride
        const payload = {
          riderId: userId,
          startLocation: form.startLocation,
          endLocation: form.endLocation,
          departureTime: form.departureTime,
          availableSeats: parseInt(form.availableSeats) || 1
        };

        await createRideOffer(payload);
      }

      setSuccess("Ride offer submitted successfully");
      setForm({
        startLocation: '',
        endLocation: '',
        departureTime: '',
        recurring: false,
        recurringDays: [],
        recurringHour: '8',
        recurringMinute: '0',
        availableSeats: '1'
      });
    } catch (err) {
      console.error(err);
      setErrors({ api: err.response?.data?.error || 'API error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (day) => {
    setForm((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d => d !== day)
        : [...prev.recurringDays, day]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white dark:bg-gray-800 shadow-md p-6 rounded-md space-y-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Offer a Ride</h2>

      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          {success}
        </div>
      )}

      {errors.api && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {errors.api}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Start Location
        </label>
        <LocationAutocomplete
          value={form.startLocation}
          onChange={(value) => setForm({ ...form, startLocation: value })}
          placeholder="e.g., Gulshan, Dhaka"
          disabled={loading}
        />
        {errors.startLocation && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.startLocation}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          End Location
        </label>
        <LocationAutocomplete
          value={form.endLocation}
          onChange={(value) => setForm({ ...form, endLocation: value })}
          placeholder="e.g., Banani, Dhaka"
          disabled={loading}
        />
        {errors.endLocation && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.endLocation}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="recurring"
          checked={form.recurring}
          onChange={() => setForm(prev => ({ ...prev, recurring: !prev.recurring }))}
          className="rounded"
        />
        <label htmlFor="recurring" className="text-gray-700 dark:text-gray-300">
          Recurring Ride?
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Available Seats
        </label>
        <input
          type="number"
          min="1"
          value={form.availableSeats}
          onChange={e => setForm({ ...form, availableSeats: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>

      {!form.recurring ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Departure Time
          </label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            value={form.departureTime}
            onChange={e => setForm({ ...form, departureTime: e.target.value })}
          />
          {errors.departureTime && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.departureTime}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Days
            </label>
            <div className="grid grid-cols-2 gap-2">
              {days.map(day => (
                <label key={day} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.recurringDays.includes(day)}
                    onChange={() => handleCheckboxChange(day)}
                    className="rounded"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
            {errors.recurringDays && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.recurringDays}</p>
            )}
          </div>

          <div className="flex space-x-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hour (0-23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                value={form.recurringHour}
                onChange={e => setForm({ ...form, recurringHour: e.target.value })}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minute (0-59)
              </label>
              <input
                type="number"
                min="0"
                max="59"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                value={form.recurringMinute}
                onChange={e => setForm({ ...form, recurringMinute: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Ride Offer'}
      </button>
    </form>
  );
}