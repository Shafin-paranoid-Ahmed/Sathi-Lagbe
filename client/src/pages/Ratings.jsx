import React, { useState, useEffect } from 'react';
import { FaStar, FaPlus, FaEye, FaEdit } from 'react-icons/fa';
import RatingForm from '../components/RatingForm';
import RatingList from '../components/RatingList';
import UserRatingDisplay from '../components/UserRatingDisplay';
import axios from 'axios';

const Ratings = () => {
  const [activeTab, setActiveTab] = useState('received');
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [userRides, setUserRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchUserRides();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: token }
      });
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserRides = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/rides/my-rides', {
        headers: { Authorization: token }
      });
      
      // Filter completed rides that can be rated
      const completedRides = response.data.filter(ride => 
        ride.status === 'completed' || ride.status === 'finished'
      );
      setUserRides(completedRides);
    } catch (error) {
      console.error('Error fetching user rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmitted = () => {
    setShowRatingForm(false);
    setSelectedRide(null);
    // Optionally refresh the ratings list
  };

  const openRatingForm = (ride) => {
    setSelectedRide(ride);
    setShowRatingForm(true);
  };

  const tabs = [
    { id: 'received', label: 'Ratings Received', icon: FaEye },
    { id: 'given', label: 'Ratings Given', icon: FaEdit },
    { id: 'give', label: 'Give Rating', icon: FaPlus }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ratings & Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your ratings and see how others rate you
          </p>
        </div>

        {/* User Rating Summary */}
        {currentUser && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Your Rating Summary
                </h2>
                <UserRatingDisplay userId={currentUser._id} showDetails={true} />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="text-lg" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'received' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Ratings You've Received
                </h3>
                <RatingList userId={currentUser?._id} isOwnRatings={false} />
              </div>
            )}

            {activeTab === 'given' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Ratings You've Given
                </h3>
                <RatingList userId={currentUser?._id} isOwnRatings={true} />
              </div>
            )}

            {activeTab === 'give' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Give a Rating
                </h3>
                
                {showRatingForm && selectedRide ? (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                      <RatingForm
                        rateeId={selectedRide.rider._id}
                        rideId={selectedRide._id}
                        isRiderRating={true}
                        onRatingSubmitted={handleRatingSubmitted}
                        onCancel={() => setShowRatingForm(false)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading rides...</p>
                      </div>
                    ) : userRides.length === 0 ? (
                      <div className="text-center py-8">
                        <FaStar className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No completed rides to rate
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          Complete some rides first to be able to rate your ride partners.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Select a completed ride to rate your ride partner:
                        </p>
                        {userRides.map((ride) => (
                          <div
                            key={ride._id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {ride.origin} → {ride.destination}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(ride.date).toLocaleDateString()} • {ride.rider?.name || 'Unknown Rider'}
                                </p>
                              </div>
                              <button
                                onClick={() => openRatingForm(ride)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                Rate Ride
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ratings;
