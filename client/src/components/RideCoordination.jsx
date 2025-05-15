
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { InboxIcon, UserCheckIcon, TrashIcon, EditIcon } from 'lucide-react';

export default function RideCoordination() {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingInputs, setRatingInputs] = useState({});
  const [ratingStatus, setRatingStatus] = useState({});
  const [actionsDisabled, setActionsDisabled] = useState({}); // track disabled per userId
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/rides/${rideId}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        setRide(res.data);
      } catch (e) {
        console.error('🛑 fetchRide error:', e);
        setError(e.response?.data?.error || e.message || 'Failed to load ride');
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId, token]);

  const handleConfirm = async (userId) => {
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/rides/confirm`,
        { rideId, userId },
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      const confirmedUser = ride.requestedRiders.find(u => u._id === userId);
      if (!confirmedUser) return;
      setRide(prev => ({
        ...prev,
        requestedRiders: prev.requestedRiders.filter(u => u._id !== userId),
        confirmedRiders: [...prev.confirmedRiders, confirmedUser]
      }));
    } catch (e) {
      alert(e.response?.data?.error || 'Could not confirm');
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeny = async (userId) => {
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/rides/deny`,
        { rideId, userId },
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      setRide(prev => ({
        ...prev,
        requestedRiders: prev.requestedRiders.filter(u => u._id !== userId)
      }));
    } catch (e) {
      alert(e.response?.data?.error || 'Could not deny');
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRatingChange = (userId, field, value) => {
    setRatingInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
    setRatingStatus(prev => ({ ...prev, [userId]: '' }));
  };

  const submitRating = async (userId) => {
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    const { score = '', comment = '' } = ratingInputs[userId] || {};
    if (!score || score < 1 || score > 5) {
      setRatingStatus(prev => ({ ...prev, [userId]: 'Please select a score (1–5)' }));
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
      return;
    }
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/rides/rate`,
        { rideId, riderId: userId, score: Number(score), comment },
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      setRatingStatus(prev => ({ ...prev, [userId]: 'Rating submitted!' }));
      setRatingInputs(prev => ({ ...prev, [userId]: {} }));
    } catch (e) {
      setRatingStatus(prev => ({ ...prev, [userId]: e.response?.data?.error || 'Failed to submit rating' }));
    } finally {
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) return <div className="p-4">Loading ride...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-semibold">Manage Ride</h2>

      {/* Ride details */}
      <div className="space-y-1">
        <p><strong>From:</strong> {ride.startLocation}</p>
        <p><strong>To:</strong> {ride.endLocation}</p>
        <p><strong>Departure:</strong> {new Date(ride.departureTime).toLocaleString()}</p>
      </div>

      {/* Pending Requests */}
      <div>
        <h3 className="text-xl font-medium mb-2">Pending Requests</h3>
        {ride.requestedRiders.length === 0 ? (
          <div className="flex items-center text-gray-600 space-x-2">
            <InboxIcon className="w-5 h-5" />
            <span>No pending requests.</span>
          </div>
        ) : (
          ride.requestedRiders.map(u => (
            <div key={u._id} className="flex justify-between items-center border p-3 rounded mb-2">
              <span>{u.name} ({u.email})</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleConfirm(u._id)}
                  disabled={!!actionsDisabled[u._id]}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <UserCheckIcon className="w-4 h-4 inline mr-1" />
                  Confirm
                </button>
                <button
                  onClick={() => handleDeny(u._id)}
                  disabled={!!actionsDisabled[u._id]}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4 inline mr-1" />
                  Deny
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmed Riders + Rating UI */}
      <div>
        <h3 className="text-xl font-medium mb-2">Confirmed Riders</h3>
        {ride.confirmedRiders.length === 0 ? (
          <div className="flex items-center text-gray-600 space-x-2">
            <InboxIcon className="w-5 h-5" />
            <span>No confirmed riders yet.</span>
          </div>
        ) : (
          ride.confirmedRiders.map(u => (
            <div key={u._id} className="border p-4 rounded mb-4">
              <p className="font-medium mb-2">{u.name} ({u.email})</p>

              {/* Rating form for this user */}
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium">Score:</label>
                  <select
                    value={ratingInputs[u._id]?.score || ''}
                    onChange={e => handleRatingChange(u._id, 'score', e.target.value)}
                    disabled={!!actionsDisabled[u._id]}
                    className="mt-1 block w-24 border border-gray-300 p-1 rounded disabled:opacity-50"
                  >
                    <option value="">Select</option>
                    {[1,2,3,4,5].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Comment (optional):</label>
                  <textarea
                    rows="2"
                    value={ratingInputs[u._id]?.comment || ''}
                    onChange={e => handleRatingChange(u._id, 'comment', e.target.value)}
                    disabled={!!actionsDisabled[u._id]}
                    className="mt-1 block w-full border border-gray-300 p-1 rounded disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => submitRating(u._id)}
                  disabled={!!actionsDisabled[u._id]}
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >Submit Rating</button>
                {ratingStatus[u._id] && (
                  <p className={`mt-1 text-sm ${ratingStatus[u._id].includes('Rating submitted') ? 'text-green-600' : 'text-red-600'}`}>
                    {ratingStatus[u._id]}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

