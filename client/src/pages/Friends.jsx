import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserGroupIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const token = sessionStorage.getItem('token');
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mine !== null) {
      axios.put('http://localhost:5000/api/friends/status',
        { isFree: mine },
        { headers: { "Authorization": token } });
    }
    axios.get('http://localhost:5000/api/friends/free',
      { headers: { "Authorization": token } })
      .then(res => {
        setFriends(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching friends:', err);
        setLoading(false);
      });
  }, [mine]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Friends</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Check your friends' availability and update your status.
        </p>
      </div>

      {/* Status Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <div className="flex items-center space-x-4">
          <UserGroupIcon className="h-6 w-6 text-primary-500" />
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              I am available for activities
            </label>
            <button
              onClick={() => setMine(!mine)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mine ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mine ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Available Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No friends are currently available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map(friend => (
              <div key={friend._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {friend.userId.name ? friend.userId.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {friend.userId.name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {friend.userId.location || 'Location not set'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-success-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
