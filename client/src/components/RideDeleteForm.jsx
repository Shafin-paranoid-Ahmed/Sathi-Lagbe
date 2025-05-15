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
    try {
      await deleteRide(rideId);
      navigate('/myrides');
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <p className="p-4">Loading ride...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Delete Ride</h2>
      <p>Are you sure you want to delete this ride?</p>
      <div className="mt-4 space-y-2">
        <p>
          <strong>From:</strong> {ride.startLocation}
        </p>
        <p>
          <strong>To:</strong> {ride.endLocation}
        </p>
        <p>
          <strong>Departure:</strong>{' '}
          {new Date(ride.departureTime).toLocaleString()}
        </p>
      </div>
      <div className="flex space-x-4 mt-6">
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Yes, Delete
        </button>
        <Link
          to="/myrides"
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
