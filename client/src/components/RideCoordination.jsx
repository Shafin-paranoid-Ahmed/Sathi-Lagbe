
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapView from './MapView';

export default function RideCoordination() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingInputs, setRatingInputs] = useState({});
  const [ratingStatus, setRatingStatus] = useState({});
  const [actionsDisabled, setActionsDisabled] = useState({}); // track disabled per userId
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    console.log('🔄 RideCoordination: Fetching ride with ID:', rideId);
    
    const fetchRide = async () => {
      try {
        setLoading(true);
        setError('');
        
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/rides/${rideId}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        
        console.log('✅ Ride fetched successfully:', res.data);
        setRide(res.data);
      } catch (e) {
        console.error('🛑 fetchRide error:', e);
        
        if (e.response?.status === 404) {
          setError('Ride not found. It may have been deleted or the ID is invalid.');
          // Redirect to rides page after a short delay
          setTimeout(() => {
            navigate('/rides', { replace: true });
          }, 3000);
        } else {
          setError(e.response?.data?.error || e.message || 'Failed to load ride');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (rideId) {
      fetchRide();
    } else {
      setError('No ride ID provided');
      setLoading(false);
    }
  }, [rideId, token, navigate]);

  const handleConfirm = async (userId) => {
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/confirm`,
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
        `${import.meta.env.VITE_API_URL}/api/rides/deny`,
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
        `${import.meta.env.VITE_API_URL}/api/rides/rate`,
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

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ride Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/rides')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Go to My Rides
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow space-y-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Ride Coordination</h2>
      
      {ride ? (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ride Details</h3>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>From:</strong> {ride.startLocation} <strong>To:</strong> {ride.endLocation}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Departure:</strong> {new Date(ride.departureTime).toLocaleString()}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Available Seats:</strong> {ride.availableSeats}
            </p>
          </div>

          {ride.startLocation && ride.endLocation && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Route Map</h3>
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <MapView startLocation={ride.startLocation} endLocation={ride.endLocation} />
              </div>
            </div>
          )}

          {ride.requestedRiders && ride.requestedRiders.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Pending Requests</h3>
              <div className="space-y-2">
                {ride.requestedRiders.map((rider) => (
                  <div key={rider._id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{rider.name || rider.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Seats: {rider.seatCount}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleConfirm(rider._id)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleDeny(rider._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ride.confirmedRiders && ride.confirmedRiders.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Confirmed Riders</h3>
              <div className="space-y-2">
                {ride.confirmedRiders.map((rider) => (
                  <div key={rider._id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{rider.name || rider.email}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Seats: {rider.seatCount}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                        <select
                          value={ratingInputs[rider._id]?.score || ''}
                          onChange={(e) => handleRatingChange(rider._id, 'score', e.target.value)}
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select</option>
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => submitRating(rider._id)}
                          disabled={!ratingInputs[rider._id]?.score}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          Rate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!ride.requestedRiders || ride.requestedRiders.length === 0) && 
           (!ride.confirmedRiders || ride.confirmedRiders.length === 0) && (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No riders have joined this ride yet.
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">Ride not found.</p>
      )}
    </div>
  );
}

