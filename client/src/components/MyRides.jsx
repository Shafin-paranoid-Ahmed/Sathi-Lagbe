import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyRidesCombined, deleteRide } from '../api/rides';
import { verifyToken } from '../api/auth';

export default function MyRides() {
  const [offered, setOffered] = useState([]);
  const [joined, setJoined] = useState([]);
  const [requested, setRequested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFetchRides = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        await verifyToken();
        const response = await getMyRidesCombined();
        const data = response.data || {};
        setOffered(data.offered || []);
        setJoined(data.joined || []);
        setRequested(data.requested || []);
      } catch (e) {
        if (e.response?.status !== 401) {
          setError(e.response?.data?.error || 'Could not load your rides');
        }
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
      setOffered(prev => prev.filter(r => r._id !== rideId));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete ride');
    }
  };

  if (loading) return <p className="p-4 text-gray-700 dark:text-gray-300">Loading your rides...</p>;
  if (error) return (
    <div className="p-4">
      <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
      <button 
        onClick={() => navigate('/login')}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Return to Login
      </button>
    </div>
  );

  const Section = ({ title, rides, actions }) => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      {rides.length === 0 ? (
        <p className="italic text-gray-600 dark:text-gray-400">No rides here.</p>
      ) : (
        rides.map(r => (
          <div key={r._id} className="border border-gray-200 dark:border-gray-600 p-4 rounded-md space-y-2 bg-white dark:bg-gray-700">
            <p className="text-gray-900 dark:text-white">
              <strong>From:</strong> {r.startLocation} <strong>To:</strong> {r.endLocation}
            </p>
            <p className="text-gray-900 dark:text-white">
              <strong>Departure:</strong> {new Date(r.departureTime).toLocaleString()}
            </p>
            {typeof r.availableSeats !== 'undefined' && (
              <p className="text-gray-900 dark:text-white">
                <strong>Available Seats:</strong> {r.availableSeats}
              </p>
            )}
            {actions && actions(r)}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow space-y-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">My Rides</h2>

      <Section
        title="Offered Rides"
        rides={offered}
        actions={(r) => (
          <div className="flex flex-wrap gap-2 mt-2">
            <Link to={`/rides/${r._id}/manage`} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Manage & Rate Riders</Link>
            <Link to={`/rides/${r._id}/edit`} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors">Edit</Link>
            <button onClick={() => handleDeleteRide(r._id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Delete</button>
          </div>
        )}
      />

      <Section
        title="Joined Rides"
        rides={joined}
        actions={(r) => (
          <div className="flex flex-wrap gap-2 mt-2">
            <Link to={`/rides/${r._id}/manage`} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">View</Link>
            <Link to={`/rides/${r._id}/feedback`} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">Give Feedback</Link>
          </div>
        )}
      />

      <Section
        title="Requested Rides"
        rides={requested}
        actions={(r) => (
          <div className="flex flex-wrap gap-2 mt-2">
            <Link to={`/rides/${r._id}/manage`} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">View</Link>
            {/* No confirm/deny controls for requester */}
          </div>
        )}
      />
    </div>
  );
}