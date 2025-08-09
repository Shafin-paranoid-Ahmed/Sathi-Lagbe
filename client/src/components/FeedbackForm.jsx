import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitFeedback } from '../api/rides';

export default function FeedbackForm() {
  const { rideId } = useParams();
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

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
      setTimeout(() => navigate('/myrides'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Leave Feedback for Ride</h2>

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
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
