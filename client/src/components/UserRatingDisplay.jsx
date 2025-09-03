import React, { useState, useEffect } from 'react';
import { FaStar, FaStarHalfAlt } from 'react-icons/fa';
import { API } from '../api/auth';

const UserRatingDisplay = ({ userId, showDetails = false }) => {
  const [ratingData, setRatingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRatingData();
  }, [userId]);

  const fetchRatingData = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/ratings/user/${userId}/average`);
      
      if (response.data.success) {
        setRatingData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching rating data:', error);
      setError('Failed to load rating data');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FaStar key={`full-${i}`} className="text-yellow-400 text-sm" />
      );
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <FaStarHalfAlt key="half" className="text-yellow-400 text-sm" />
      );
    }

    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FaStar key={`empty-${i}`} className="text-gray-300 dark:text-gray-600 text-sm" />
      );
    }

    return stars;
  };

  const getRatingText = (rating) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.5) return 'Good';
    if (rating >= 3.0) return 'Fair';
    if (rating >= 2.0) return 'Poor';
    return 'Very Poor';
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!ratingData || ratingData.totalRatings === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        No ratings yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Rating */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {renderStars(ratingData.averageRating)}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {ratingData.averageRating.toFixed(1)}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
            ({ratingData.totalRatings} {ratingData.totalRatings === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      </div>

      {/* Rating Text */}
      <div className="text-sm text-gray-600 dark:text-gray-300">
        {getRatingText(ratingData.averageRating)}
      </div>

      {/* Detailed Ratings by Category */}
      {showDetails && ratingData.ratingsByCategory && (
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Rating Breakdown
          </h4>
          {Object.entries(ratingData.ratingsByCategory).map(([category, data]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {category.replace('_', ' ')}
              </span>
              <div className="flex items-center space-x-1">
                <div className="flex items-center space-x-1">
                  {renderStars(data.averageRating)}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {data.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserRatingDisplay;
