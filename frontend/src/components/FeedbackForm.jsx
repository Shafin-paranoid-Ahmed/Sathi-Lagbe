import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

export default function FeedbackForm() {
  const { rideId } = useParams();
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');
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
      await axios.post(
        `${import.meta.env.VITE_API_URL}/feedback`,
        { rideId, overallScore: Number(score), comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Thank you for your feedback!');
      setTimeout(() => navigate('/myrides'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Leave Feedback for Ride</h2>

      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-600 mb-2">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Overall Score:</label>
          <select
            value={score}
            onChange={e => setScore(e.target.value)}
            className="mt-1 block w-24 border-gray-300 rounded"
          >
            <option value="">Select</option>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Comments (optional):</label>
          <textarea
            rows="4"
            value={comments}
            onChange={e => setComments(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
}
