import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRideById, updateRide } from '../api/rides';
import CustomDateTimePicker from './CustomDateTimePicker';

export default function RideEditForm() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  // Feature flag for custom picker - set to false to revert to native picker
  const USE_CUSTOM_PICKER = true;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if form has been submitted

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Fetch existing ride
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const response = await getRideById(rideId);
        const r = response.data;
        setForm({
          startLocation: r.startLocation,
          endLocation: r.endLocation,
          departureTime: r.recurring 
            ? '' 
            : new Date(r.departureTime).toISOString().slice(0,16),
          recurring: !!r.recurring,
          recurringDays: r.recurring?.days || [],
          recurringHour: r.recurring?.hour?.toString() || '',
          recurringMinute: r.recurring?.minute?.toString() || ''
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load ride');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRide();
  }, [rideId]);

  // Enhanced validation function
  const validate = () => {
    const errs = {};
    
    // Check required fields
    if (!form.startLocation.trim()) {
      errs.startLocation = 'Start location is required';
    }
    if (!form.endLocation.trim()) {
      errs.endLocation = 'End location is required';
    }
    
    // Check departure time for one-time rides
    if (!form.recurring) {
      if (!form.departureTime) {
        errs.departureTime = 'Departure time is required for one-time rides';
      }
      // Removed client-side time validation - server will handle this
    }
    
    // Check recurring ride requirements
    if (form.recurring) {
      if (form.recurringDays.length === 0) {
        errs.recurringDays = 'Select at least one recurring day';
      }
      if (!form.recurringHour || !form.recurringMinute) {
        errs.recurringTime = 'Recurring time is required';
      }
    }
    
    return errs;
  };

  // Set departure time to current time + 5 minutes (ASAP)
  const setAsapTime = () => {
    const now = new Date();
    const asapTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    setForm(prev => ({ ...prev, departureTime: asapTime.toISOString() }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setHasSubmitted(true); // Mark that form has been submitted
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    
    const payload = form.recurring
      ? {
          startLocation: form.startLocation.trim(),
          endLocation: form.endLocation.trim(),
          recurring: {
            days: form.recurringDays,
            hour: Number(form.recurringHour),
            minute: Number(form.recurringMinute),
            frequency: 'weekly'
          }
        }
      : {
          startLocation: form.startLocation.trim(),
          endLocation: form.endLocation.trim(),
          departureTime: form.departureTime
        };
    
    try {
      await updateRide(rideId, payload);
      alert('Ride updated successfully');
      navigate('/myrides');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  const toggleDay = day => {
    setForm(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter(d=>d!==day)
        : [...prev.recurringDays, day]
    }));
  };

  // Clear departure time when switching to recurring
  const handleRecurringToggle = (isRecurring) => {
    setForm(prev => ({
      ...prev,
      recurring: isRecurring,
      departureTime: isRecurring ? '' : prev.departureTime
    }));
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded shadow space-y-4 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Ride</h2>
      
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Location *</label>
        <input
          type="text"
          value={form.startLocation}
          onChange={e => setForm(f => ({...f, startLocation: e.target.value}))}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
        {hasSubmitted && errors.startLocation && <p className="text-red-600 dark:text-red-400">{errors.startLocation}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Location *</label>
        <input
          type="text"
          value={form.endLocation}
          onChange={e => setForm(f => ({...f, endLocation: e.target.value}))}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
        {hasSubmitted && errors.endLocation && <p className="text-red-600 dark:text-red-400">{errors.endLocation}</p>}
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="recurring"
          checked={form.recurring}
          onChange={(e) => handleRecurringToggle(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="recurring" className="text-gray-700 dark:text-gray-300">
          Recurring Ride?
        </label>
      </div>
      
      {!form.recurring ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departure Time *</label>
          
          {/* ASAP Button */}
          <div className="mb-2">
            <button
              type="button"
              onClick={setAsapTime}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              🚀 ASAP (5 min from now)
            </button>
          </div>
          
          {USE_CUSTOM_PICKER ? (
            <CustomDateTimePicker
              value={form.departureTime}
              onChange={(value) => setForm(f => ({...f, departureTime: value}))}
              placeholder="Select departure date and time"
            />
          ) : (
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={e => setForm(f => ({...f, departureTime: e.target.value}))}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)} // 5 minutes from now
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          )}
          {hasSubmitted && errors.departureTime && <p className="text-red-600 dark:text-red-400">{errors.departureTime}</p>}
        </div>
      ) : null}

      {form.recurring && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Days *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {days.map(day=>(
                <label key={day} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.recurringDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  <span className="ml-2">{day.slice(0,3)}</span>
                </label>
              ))}
            </div>
            {hasSubmitted && errors.recurringDays && <p className="text-red-600 dark:text-red-400">{errors.recurringDays}</p>}
          </div>
          <div className="flex space-x-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hour *</label>
              <input
                type="number"
                min="0"
                max="23"
                value={form.recurringHour}
                onChange={e => setForm(f => ({...f, recurringHour: e.target.value}))}
                className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minute *</label>
              <input
                type="number"
                min="0"
                max="59"
                value={form.recurringMinute}
                onChange={e => setForm(f => ({...f, recurringMinute: e.target.value}))}
                className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {hasSubmitted && errors.recurringTime && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.recurringTime}</p>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Updating...' : 'Save Changes'}
      </button>
    </form>
  );
}
