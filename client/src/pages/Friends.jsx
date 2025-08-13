import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserGroupIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Add state for all users
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'pending', 'add'
  const token = sessionStorage.getItem('token');

  const fetchFriends = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/friends/accepted', {
        headers: { "Authorization": token }
      });
      setFriends(response.data);
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      // Incoming requests to me
      const response = await axios.get('http://localhost:5000/api/friends/requests?status=pending&scope=incoming', {
        headers: { "Authorization": token }
      });
      setFriendRequests(response.data);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      // Outgoing requests I sent
      const response = await axios.get('http://localhost:5000/api/friends/requests?status=pending&scope=outgoing', {
        headers: { "Authorization": token }
      });
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  // Add function to fetch all users
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { "Authorization": token }
      });
      // Sort users alphabetically by name
      const sortedUsers = response.data.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setAllUsers(sortedUsers);
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { "Authorization": token }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post('http://localhost:5000/api/friends/request', 
        { friendId: userId },
        { headers: { "Authorization": token } }
      );
      // Refresh pending requests
      await fetchPendingRequests();
      // Remove user from add list and search results to avoid duplicates
      setAllUsers(prev => prev.filter(user => user._id !== userId));
      setSearchResults(prev => prev.filter(user => user._id !== userId));
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchPendingRequests(),
        fetchAllUsers() // Add this to load all users
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Real-time updates
  useEffect(() => {
    const handler = () => {
      // Refresh all lists on any friends_updated event
      Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchPendingRequests(),
        fetchAllUsers()
      ]).catch(() => {});
    };
    try {
      const socket = window?.debugSocket?.socket || null;
      // Fallback: use our socketService singleton
      const { default: socketService } = require('../services/socketService');
      socketService.onNewNotification(() => {}); // ensure initialized
      socketService.socket?.on?.('friends_updated', handler);
      return () => socketService.socket?.off?.('friends_updated', handler);
    } catch {}
  }, []);

  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.put(`http://localhost:5000/api/friends/request/${requestId}/accept`, {}, {
        headers: { "Authorization": token }
      });
      // Refresh data
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchPendingRequests()
      ]);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axios.put(`http://localhost:5000/api/friends/request/${requestId}/reject`, {}, {
        headers: { "Authorization": token }
      });
      // Refresh data
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchPendingRequests()
      ]);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    try {
      await axios.delete(`http://localhost:5000/api/friends/${friendshipId}`, {
        headers: { "Authorization": token }
      });
      await fetchFriends();
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

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
          Manage your friends and friend requests.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-2">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Requests ({friendRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Add Friends
          </button>
        </div>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Friends
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No friends yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map(friend => (
                <div key={friend.friendshipId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {friend.friend.name ? friend.friend.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {friend.friend.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {friend.friend.status?.current || 'No status'}
                      </p>
                      {friend.friend.status?.location && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          📍 {friend.friend.status.location}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleRemoveFriend(friend.friendshipId)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove friend"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Friend Requests
          </h2>
          {friendRequests.length === 0 ? (
            <div className="text-center py-8">
              <UserPlusIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {friendRequests.map(request => (
                <div key={request._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {request.user.name ? request.user.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.user.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request._id)}
                        className="px-3 py-1 bg-success-500 text-white rounded-lg text-sm hover:bg-success-600"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Pending Requests
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No pending requests sent</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => (
                <div key={request._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {request.friend.name ? request.friend.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.friend.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.friend.email}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Friends Tab */}
      {activeTab === 'add' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add Friends
          </h2>
          
          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <button
                onClick={searchUsers}
                disabled={searchLoading}
                className="absolute right-2 top-2 px-4 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Users List - Show search results if searching, otherwise show all users */}
          {(searchQuery.trim() && searchResults.length > 0) ? (
            // Search Results
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.map(user => (
                <div key={user._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                        {user.location && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            📍 {user.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(user._id)}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 flex items-center space-x-2"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      <span>Add Friend</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 && !searchLoading ? (
            // No search results
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            // All Users List (default view)
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                All Users ({allUsers.length})
              </h3>
              {allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No users available</p>
                </div>
              ) : (
                // Filter out myself, current friends, and users with any pending/accepted request either direction
                allUsers
                  .filter(user => {
                    const myId = sessionStorage.getItem('userId');
                    if (user._id === myId) return false; // not myself
                    const isFriend = friends.some(f => f.friend?._id === user._id);
                    if (isFriend) return false;
                    const hasIncomingPending = friendRequests.some(r => r.user?._id === user._id);
                    if (hasIncomingPending) return false;
                    const hasOutgoingPending = pendingRequests.some(r => r.friend?._id === user._id);
                    if (hasOutgoingPending) return false;
                    return true;
                  })
                  .map(user => (
                  <div key={user._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                          {user.location && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              📍 {user.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(user._id)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 flex items-center space-x-2"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                        <span>Add Friend</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
