// src/components/RideDeleteForm.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRideById, deleteRide } from '../api/rides';

export default function RideDeleteForm() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const response = await getRideById(rideId);
        setRide(response.data);
      } catch (err) {
        setError('Could not load ride');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRide();
  }, [rideId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRide(rideId);
      navigate('/myrides');
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Delete Ride</h2>
      
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading ride details...</p>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : ride ? (
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
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. All ride data, including confirmed riders and ratings, will be permanently deleted.
            </p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete Ride'}
            </button>
            <button
              onClick={() => navigate('/rides')}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">Ride not found.</p>
      )}
    </div>
  );
}
