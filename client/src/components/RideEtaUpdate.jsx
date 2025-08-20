import React, { useState } from 'react';
import { FaClock, FaTimes, FaCheck } from 'react-icons/fa';
import axios from 'axios';

const RideEtaUpdate = ({ ride, isOpen, onClose, onEtaUpdated }) => {
  const [newEta, setNewEta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newEta.trim()) {
      setError('Please enter a new ETA');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await axios.patch(`/api/rides/${ride._id}/eta`, {
        newEta: newEta.trim()
      });

      onEtaUpdated(newEta.trim());
      onClose();
    } catch (error) {
      console.error('Error updating ETA:', error);
      setError(error.response?.data?.error || 'Failed to update ETA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewEta('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <FaClock className="text-blue-500" />
            <h2 className="text-lg font-semibold">Update ETA</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ride Details
            </label>
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div className="mb-1">
                <span className="font-medium">From:</span> {ride.startLocation}
              </div>
              <div className="mb-1">
                <span className="font-medium">To:</span> {ride.endLocation}
              </div>
              <div>
                <span className="font-medium">Departure:</span> {new Date(ride.departureTime).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="newEta" className="block text-sm font-medium text-gray-700 mb-2">
              New ETA
            </label>
            <input
              type="text"
              id="newEta"
              value={newEta}
              onChange={(e) => setNewEta(e.target.value)}
              placeholder="e.g., 15 minutes, 2:30 PM, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the new estimated time of arrival
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FaCheck size={14} />
                  <span>Update ETA</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RideEtaUpdate;
