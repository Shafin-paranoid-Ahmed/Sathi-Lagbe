import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRideById, updateRide } from '../api/rides';

export default function RideEditForm() {
  const { rideId } = useParams();
  const navigate = useNavigate();

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

  const validate = () => {
    const errs = {};
    if (!form.startLocation) errs.startLocation = 'Required';
    if (!form.endLocation) errs.endLocation = 'Required';
    if (!form.recurring && !form.departureTime)
      errs.departureTime = 'Required for one-time rides';
    if (form.recurring && form.recurringDays.length === 0)
      errs.recurringDays = 'Select at least one day';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = form.recurring
      ? {
          startLocation: form.startLocation,
          endLocation: form.endLocation,
          recurring: {
            days: form.recurringDays,
            hour: Number(form.recurringHour),
            minute: Number(form.recurringMinute),
            frequency: 'weekly'
          }
        }
      : {
          startLocation: form.startLocation,
          endLocation: form.endLocation,
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

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-semibold">Edit Ride</h2>

      <div>
        <label className="block font-medium">Start Location</label>
        <input
          type="text"
          value={form.startLocation}
          onChange={e=>setForm(f=>({...f, startLocation:e.target.value}))}
          className="mt-1 w-full border rounded p-2"
        />
        {errors.startLocation && <p className="text-red-600">{errors.startLocation}</p>}
      </div>

      <div>
        <label className="block font-medium">End Location</label>
        <input
          type="text"
          value={form.endLocation}
          onChange={e=>setForm(f=>({...f, endLocation:e.target.value}))}
          className="mt-1 w-full border rounded p-2"
        />
        {errors.endLocation && <p className="text-red-600">{errors.endLocation}</p>}
      </div>

      {!form.recurring ? (
        <div>
          <label className="block font-medium">Departure Time</label>
          <input
            type="datetime-local"
            value={form.departureTime}
            onChange={e=>setForm(f=>({...f, departureTime:e.target.value}))}
            className="mt-1 w-full border rounded p-2"
          />
          {errors.departureTime && <p className="text-red-600">{errors.departureTime}</p>}
        </div>
      ) : null}

      <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={()=>setForm(f=>({...f, recurring:!f.recurring}))}
          />
          <span className="ml-2">Recurring</span>
        </label>
      </div>

      {form.recurring && (
        <>
          <div>
            <label className="block font-medium">Days</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {days.map(day=>(
                <label key={day} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.recurringDays.includes(day)}
                    onChange={()=>toggleDay(day)}
                  />
                  <span className="ml-2">{day.slice(0,3)}</span>
                </label>
              ))}
            </div>
            {errors.recurringDays && <p className="text-red-600">{errors.recurringDays}</p>}
          </div>
          <div className="flex space-x-2">
            <div>
              <label className="block font-medium">Hour</label>
              <input
                type="number"
                min="0"
                max="23"
                value={form.recurringHour}
                onChange={e=>setForm(f=>({...f, recurringHour:e.target.value}))}
                className="mt-1 w-20 border rounded p-2"
              />
            </div>
            <div>
              <label className="block font-medium">Minute</label>
              <input
                type="number"
                min="0"
                max="59"
                value={form.recurringMinute}
                onChange={e=>setForm(f=>({...f, recurringMinute:e.target.value}))}
                className="mt-1 w-20 border rounded p-2"
              />
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save Changes
      </button>
    </form>
  );
}
