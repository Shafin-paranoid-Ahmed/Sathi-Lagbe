
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapView from './MapView';
import { API } from '../api/auth';

export default function RideCoordination() {

  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingInputs, setRatingInputs] = useState({});
  const [ratingStatus, setRatingStatus] = useState({});
  const [actionsDisabled, setActionsDisabled] = useState({}); // track disabled per userId
  const currentUserId = sessionStorage.getItem('userId');

  const isOwner = !!(ride && currentUserId && (
    (typeof ride.riderId === 'string' ? ride.riderId : (ride.riderId?._id || ride.riderId)) === currentUserId
  ));
  const isConfirmedPassenger = !!(ride && currentUserId && ride.confirmedRiders && ride.confirmedRiders.some(cr => (cr.user?._id || cr.user) === currentUserId));

  useEffect(() => {

    
    const fetchRide = async () => {
      try {
        setLoading(true);
        setError('');
        
        const res = await API.get(`/rides/${rideId}`);
        setRide(res.data);
      } catch (e) {
        console.error('Error fetching ride:', e);
        
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
      console.error('🛑 RideCoordination: No ride ID provided');
      setError('No ride ID provided');
      setLoading(false);
    }
  }, [rideId, navigate, currentUserId]);

  const handleConfirm = async (userId, requestId) => {

    
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    try {
      const payload = { rideId, userId };
      if (requestId) payload.requestId = requestId;
      const res = await API.post('/rides/confirm', payload);

      // Update state with the fresh data from the server response
      setRide(res.data.ride);
    } catch (e) {
      console.error('❌ Confirmation failed:', e.response?.data || e);
      alert(e.response?.data?.error || 'Could not confirm');
    } finally {
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeny = async (userId) => {

    
    setActionsDisabled(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await API.post('/rides/deny', { rideId, userId });

      // Update state with the fresh data from the server response
      setRide(res.data.ride);
    } catch (e) {
      console.error('❌ Denial failed:', e.response?.data || e);
      alert(e.response?.data?.error || 'Could not deny');
    } finally {
      setActionsDisabled(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRatingChange = (userId, field, value) => {
    setRatingInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
    // Clear any previous status when user starts a new rating
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
      await API.post('/rides/rate', { rideId, riderId: userId, score: Number(score), comment });
      setRatingStatus(prev => ({ ...prev, [userId]: 'Rating submitted!' }));
      setRatingInputs(prev => ({ ...prev, [userId]: {} }));
      // Clear the rating status after a delay to show success message
      setTimeout(() => {
        setRatingStatus(prev => ({ ...prev, [userId]: '' }));
      }, 3000);
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
      
      {ride && ride._id ? (
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

          {isOwner && ride.requestedRiders && Array.isArray(ride.requestedRiders) && ride.requestedRiders.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Pending Requests</h3>
              <div className="space-y-2">
                {ride.requestedRiders.map((request) => {
                  // Skip rendering if request or request.user is null/undefined
                  if (!request || !request.user) {
                    return null;
                  }
                  
                  return (
                    <div key={request._id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        {request.user.avatarUrl ? (
                          <img src={request.user.avatarUrl} alt={request.user.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                            {request.user.name ? request.user.name.charAt(0) : '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{request.user.name || request.user.email}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Seats: {request.seatCount}</p>
                        </div>
                      </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleConfirm(request.user._id, request._id)}
                        disabled={actionsDisabled[request.user._id]}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionsDisabled[request.user._id] ? 'Confirming...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => handleDeny(request.user._id)}
                        disabled={actionsDisabled[request.user._id]}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionsDisabled[request.user._id] ? 'Denying...' : 'Deny'}
                      </button>
                                         </div>
                   </div>
                 );
                 })}
              </div>
            </div>
          )}

          {ride.confirmedRiders && Array.isArray(ride.confirmedRiders) && ride.confirmedRiders.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Confirmed Riders</h3>
              <div className="space-y-2">
                {ride.confirmedRiders.map((request) => {
                  // Skip rendering if request or request.user is null/undefined
                  if (!request || !request.user) {
                    return null;
                  }
                  
                  return (
                    <div key={request._id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          {request.user.avatarUrl ? (
                            <img src={request.user.avatarUrl} alt={request.user.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                              {request.user.name ? request.user.name.charAt(0) : '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{request.user.name || request.user.email}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Seats: {request.seatCount}</p>
                          </div>
                        </div>
                      {isOwner && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                            <select
                              value={ratingInputs[request.user._id]?.score || ''}
                              onChange={(e) => handleRatingChange(request.user._id, 'score', e.target.value)}
                              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Select</option>
                              {[1, 2, 3, 4, 5].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => submitRating(request.user._id)}
                              disabled={!ratingInputs[request.user._id]?.score || actionsDisabled[request.user._id]}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                              {actionsDisabled[request.user._id] ? 'Rating...' : 'Submit Rating'}
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Feedback:</span>
                            <input
                              type="text"
                              placeholder="Add feedback about this rider (optional)"
                              value={ratingInputs[request.user._id]?.comment || ''}
                              onChange={(e) => handleRatingChange(request.user._id, 'comment', e.target.value)}
                              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {isOwner && ratingStatus[request.user._id] && (
                      <div className={`mt-2 text-sm ${
                        ratingStatus[request.user._id].includes('submitted')
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {ratingStatus[request.user._id]}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          )}

          {/* Passengers can rate the owner only when confirmed */}
          {!isOwner && isConfirmedPassenger && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Rate Ride Owner</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                <select
                  value={ratingInputs[ride.riderId]?.score || ''}
                  onChange={(e) => handleRatingChange(ride.riderId, 'score', e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <button
                  onClick={() => submitRating(ride.riderId)}
                  disabled={!ratingInputs[ride.riderId]?.score || actionsDisabled[ride.riderId]}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {actionsDisabled[ride.riderId] ? 'Rating...' : 'Rate Owner'}
                </button>
              </div>
              {ratingStatus[ride.riderId] && (
                <div className={`mt-2 text-sm ${
                  ratingStatus[ride.riderId].includes('submitted') 
                    ? 'text-green-600 dark:text-green-400' 
                    : ratingStatus[ride.riderId].includes('Please select') 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {ratingStatus[ride.riderId]}
                </div>
              )}
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

