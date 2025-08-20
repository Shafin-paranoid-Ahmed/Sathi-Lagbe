import React, { useState, useEffect } from 'react';
import { FaStar, FaTrash, FaEdit } from 'react-icons/fa';
import axios from 'axios';

const RatingList = ({ userId, isOwnRatings = false }) => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('all');
  const [statistics, setStatistics] = useState(null);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'overall', label: 'Overall Experience' },
    { value: 'punctuality', label: 'Punctuality' },
    { value: 'cleanliness', label: 'Cleanliness' },
    { value: 'communication', label: 'Communication' },
    { value: 'safety', label: 'Safety' }
  ];

  useEffect(() => {
    fetchRatings();
  }, [userId, currentPage, category]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const endpoint = isOwnRatings 
        ? `/api/ratings/given?page=${currentPage}&limit=10`
        : `/api/ratings/user/${userId}?page=${currentPage}&limit=10&category=${category}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: localStorage.getItem('token')
        }
      });

      if (response.data.success) {
        setRatings(response.data.data.ratings);
        setTotalPages(response.data.data.pagination.totalPages);
        if (response.data.data.statistics) {
          setStatistics(response.data.data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setError('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRating = async (ratingId) => {
    if (!window.confirm('Are you sure you want to delete this rating?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/ratings/${ratingId}`, {
        headers: {
          Authorization: localStorage.getItem('token')
        }
      });

      if (response.data.success) {
        fetchRatings(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      alert('Failed to delete rating');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar
          key={i}
          className={`text-sm ${
            i <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-center py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      {statistics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Rating Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.averageRating.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Ratings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.totalRatings}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      {!isOwnRatings && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by:
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ratings List */}
      {ratings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {isOwnRatings ? 'You haven\'t given any ratings yet.' : 'No ratings found.'}
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map((rating) => (
            <div key={rating._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      {renderStars(rating.rating)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {rating.rating}/5
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {rating.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isOwnRatings ? 'Rated' : 'By'} {rating.rater?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(rating.createdAt)}
                    </span>
                  </div>

                  {rating.comment && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      "{rating.comment}"
                    </p>
                  )}

                  {rating.rideId && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ride: {rating.rideId.origin} → {rating.rideId.destination}
                    </div>
                  )}
                </div>

                {/* Action buttons for own ratings */}
                {isOwnRatings && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteRating(rating._id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete rating"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RatingList;
