import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyRides, deleteRide } from '../api/rides';
import { verifyToken } from '../api/auth';

export default function MyRides() {
  const [rides, setRides] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // First verify if the token is valid before making any ride requests
    const checkAuthAndFetchRides = async () => {
      try {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found, redirecting to login');
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Try to verify the token first
        await verifyToken();
        
        // If token verification succeeded, fetch rides
        const response = await getMyRides();
        console.log('Rides fetched successfully:', response.data);
        setRides(response.data);
      } catch (e) {
        console.error('MyRides error:', e);
        
        // If it's NOT a 401 error (that's already handled by the interceptor)
        if (e.response?.status !== 401) {
          setError(e.response?.data?.error || 'Could not load your rides');
        }
        // 401 errors are handled by the interceptor in auth.js
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetchRides();
  }, [navigate]);

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this ride?')) return;
    try {
      await deleteRide(rideId);
      setRides(prev => prev.filter(r => r._id !== rideId));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete ride');
    }
  };

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 5, rides.length));
  };

  if (loading) return <p className="p-4">Loading your rides...</p>;
  if (error) return (
    <div className="p-4">
      <p className="text-red-600 mb-2">{error}</p>
      <button 
        onClick={() => navigate('/login')}
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        Return to Login
      </button>
    </div>
  );

  const visibleRides = rides.slice(0, visibleCount);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-semibold">My Rides</h2>

      {rides.length === 0 ? (
        <p className="italic text-gray-600">You haven't offered any rides yet.</p>
      ) : (
        <>
          {visibleRides.map(r => (
            <div key={r._id} className="border p-4 rounded-md space-y-2">
              <p>
                <strong>From:</strong> {r.startLocation} <strong>To:</strong> {r.endLocation}
              </p>
              <p>
                <strong>Departure:</strong>{' '}
                {new Date(r.departureTime).toLocaleString()}
              </p>
              <p>
                <strong>Pending:</strong> {r.requestedRiders?.length || 0}{' '}
                <strong>Confirmed:</strong> {r.confirmedRiders?.length || 0}
              </p>
              {r.averageRating ? (
                <p>
                  <strong>Average Rating:</strong> {r.averageRating} ⭐️ (
                  {r.totalRatings} reviews)
                </p>
              ) : (
                <p className="italic">No ratings yet.</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  to={`/rides/${r._id}/edit`}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteRide(r._id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <Link to={`/rides/${r._id}/feedback`}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Give Feedback
                </Link>
              </div>
            </div>
          ))}

          {visibleCount < rides.length && (
            <button
              onClick={loadMore}
              className="block mx-auto mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Load More
            </button>
          )}
        </>
      )}
    </div>
  );
}