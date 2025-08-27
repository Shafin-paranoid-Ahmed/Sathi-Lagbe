import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitFeedback } from '../api/rides';
import { API } from '../api/auth';

export default function FeedbackForm() {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/rides/${rideId}`);
        setRide(response.data);
      } catch (err) {
        setError('Failed to load ride details');
      } finally {
        setLoading(false);
      }
    };

    if (rideId) {
      fetchRideDetails();
    }
  }, [rideId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!score) {
      setError('Please select an overall score');
      return;
    }

    try {
      await submitFeedback(rideId, Number(score), comments);
      setSuccess('Thank you for your feedback!');
      setTimeout(() => navigate('/rides'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">Ride not found</p>
          <button 
            onClick={() => navigate('/rides')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to My Rides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Rate Ride Owner</h2>

      {/* Ride Owner Information */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">You are rating:</h3>
        <div className="flex items-center space-x-3">
          {ride.riderId?.avatarUrl ? (
            <img 
              src={ride.riderId.avatarUrl} 
              alt={ride.riderId.name || 'Ride Owner'} 
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {ride.riderId?.name ? ride.riderId.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {ride.riderId?.name || 'Ride Owner'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ride Owner</p>
          </div>
        </div>
      </div>

      {/* Ride Details */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Ride Details:</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>From:</strong> {ride.startLocation}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>To:</strong> {ride.endLocation}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>Date:</strong> {new Date(ride.departureTime).toLocaleDateString()}
        </p>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {success && <p className="text-green-600 dark:text-green-400 mb-2">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300">Overall Score:</label>
          <select
            value={score}
            onChange={e => setScore(e.target.value)}
            className="mt-1 block w-24 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select</option>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300">Comments (optional):</label>
          <textarea
            rows="4"
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Share your experience with this ride owner..."
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/rides')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Submit Rating
          </button>
        </div>
      </form>
    </div>
  );
}
