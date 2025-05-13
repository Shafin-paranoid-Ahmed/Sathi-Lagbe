import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function MyRides() {
  const [rides, setRides] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchMyRides = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/rides/owner/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRides(res.data);
      } catch (e) {
        console.error('Fetch MyRides error:', e);
        setError(e.response?.data?.error || 'Could not load your rides');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchMyRides();
    else {
      setError('No user logged in');
      setLoading(false);
    }
  }, [token, userId]);

  const deleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this ride?')) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/rides/${rideId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRides(prev => prev.filter(r => r._id !== rideId));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete ride');
    }
  };

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 5, rides.length));
  };

  if (loading) return <p className="p-4">Loading your rides...</p>;
  if (error)   return <p className="p-4 text-red-600">{error}</p>;

  const visibleRides = rides.slice(0, visibleCount);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-semibold">My Rides</h2>

      {!rides.length ? (
        <p className="italic text-gray-600">You haven’t offered any rides yet.</p>
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
                <strong>Pending:</strong> {r.requestedRiders.length}{' '}
                <strong>Confirmed:</strong> {r.confirmedRiders.length}
              </p>
              {r.averageRating ? (
                <p>
                  <strong>Average Rating:</strong> {r.averageRating} ⭐️ (
                  {r.totalRatings} reviews)
                </p>
              ) : (
                <p className="italic">No ratings yet.</p>
              )}
              <div className="flex space-x-2 mt-2">
                <Link
                  to={`/rides/${r._id}/manage`}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Manage / Rate
                </Link>
                <Link
                  to={`/rides/${r._id}/edit`}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </Link>
                <Link
                  to={`/rides/${r._id}/delete`}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
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
