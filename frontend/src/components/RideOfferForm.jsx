import React, { useState } from 'react';
import axios from 'axios';

const RideOfferForm = () => {
  const [form, setForm] = useState({
    startLocation: '',
    endLocation: '',
    departureTime: '',
    recurring: false,
    recurringDays: [],
    recurringHour: '',
    recurringMinute: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);

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

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const token = localStorage.getItem('token'); // assumed stored after login

    const payload = form.recurring
      ? {
          riderId: 'REPLACE_WITH_LOGGED_IN_USER_ID',
          startLocation: form.startLocation,
          endLocation: form.endLocation,
          recurring: {
            days: form.recurringDays,
            hour: form.recurringHour || 8,
            minute: form.recurringMinute || 0,
            frequency: 'weekly'
          }
        }
      : {
          riderId: 'REPLACE_WITH_LOGGED_IN_USER_ID',
          startLocation: form.startLocation,
          endLocation: form.endLocation,
          departureTime: form.departureTime
        };

    const endpoint = form.recurring
      ? `${import.meta.env.VITE_API_URL}/rides/recurring`
      : `${import.meta.env.VITE_API_URL}/rides/offer`;

    try {
      await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess("Ride offer submitted successfully");
      setForm({
        startLocation: '',
        endLocation: '',
        departureTime: '',
        recurring: false,
        recurringDays: [],
        recurringHour: '',
        recurringMinute: ''
      });
    } catch (err) {
      console.error(err);
      setErrors({ api: err.response?.data?.error || 'API error' });
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
<form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white shadow-md p-6 rounded-md space-y-4">
  <h2 className="text-xl font-semibold mb-2">Offer a Ride</h2>

  <input
    type="text"
    placeholder="Start Location"
    className="input-field"
    value={form.startLocation}
    onChange={e => setForm({ ...form, startLocation: e.target.value })}
  />
  {errors.startLocation && <p className="text-red-500 text-sm">{errors.startLocation}</p>}

  <input
    type="text"
    placeholder="End Location"
    className="input-field"
    value={form.endLocation}
    onChange={e => setForm({ ...form, endLocation: e.target.value })}
  />
  {errors.endLocation && <p className="text-red-500 text-sm">{errors.endLocation}</p>}

  {!form.recurring && (
    <>
      <label className="block font-medium">Departure Time:</label>
      <input
        type="datetime-local"
        className="input-field"
        value={form.departureTime}
        onChange={e => setForm({ ...form, departureTime: e.target.value })}
      />
      {errors.departureTime && <p className="text-red-500 text-sm">{errors.departureTime}</p>}
    </>
  )}

  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={form.recurring}
      onChange={() => setForm(prev => ({ ...prev, recurring: !prev.recurring }))}
    />
    <span>Recurring Ride?</span>
  </label>

  {form.recurring && (
    <>
      <div>
        <label className="block font-medium mb-1">Select Days:</label>
        <div className="grid grid-cols-2 gap-2">
          {days.map(day => (
            <label key={day} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.recurringDays.includes(day)}
                onChange={() => handleCheckboxChange(day)}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
        {errors.recurringDays && <p className="text-red-500 text-sm">{errors.recurringDays}</p>}
      </div>

      <div className="flex space-x-2 mt-2">
        <input
          type="number"
          min="0"
          max="23"
          placeholder="Hour"
          className="w-1/2 input-field"
          value={form.recurringHour}
          onChange={e => setForm({ ...form, recurringHour: e.target.value })}
        />
        <input
          type="number"
          min="0"
          max="59"
          placeholder="Minute"
          className="w-1/2 input-field"
          value={form.recurringMinute}
          onChange={e => setForm({ ...form, recurringMinute: e.target.value })}
        />
      </div>
    </>
  )}

  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Submit Ride Offer
  </button>

  {errors.api && <p className="text-red-500">{errors.api}</p>}
  {success && <p className="text-green-600">{success}</p>}
</form>

  );
};

export default RideOfferForm;
