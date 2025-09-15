// client/src/components/FriendList.jsx - IMPROVED
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllUsers } from '../api/users';
import { createChat } from '../api/chat';
import { SearchIcon, MessageSquareIcon } from 'lucide-react';
import LazyImage from './LazyImage';

const PAGE_SIZE = 20;

export default function FriendList({ onSelectChat }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingChat, setProcessingChat] = useState({});
  const appliedSearchRef = useRef('');
  const [pageInfo, setPageInfo] = useState({ page: 1, hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchUsers = useCallback(async ({ page = 1, search, append = false } = {}) => {
    const effectiveSearch = typeof search === 'string' ? search : appliedSearch;
    const trimmedSearch = effectiveSearch.trim();

    setError('');
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const params = { page, limit: PAGE_SIZE };
    if (trimmedSearch) {
      params.search = trimmedSearch;
    }

    try {
      const res = await getAllUsers(params);
      const responseData = res.data || {};
      const fetchedUsers = responseData.data || [];
      const pagination = responseData.pagination || {};
      const hasMore = typeof pagination.hasMore === 'boolean'
        ? pagination.hasMore
        : fetchedUsers.length === PAGE_SIZE;

      setUsers(prev => append ? [...prev, ...fetchedUsers] : fetchedUsers);
      setPageInfo({
        page: pagination.page ?? page,
        hasMore
      });

      if (!append) {
        appliedSearchRef.current = trimmedSearch;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUsers({ page: 1, search: '' });
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers({ page: 1, search: searchQuery });
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    fetchUsers({ page: pageInfo.page + 1, append: true });
  };

  const startChat = async (userId) => {
    // Prevent multiple clicks
    if (processingChat[userId]) return;
    
    setProcessingChat(prev => ({ ...prev, [userId]: true }));
    setError('');
    
    try {
      // Create a new chat with the selected user
      const res = await createChat([userId]);
      
      // Check if the response contains data
      if (res.data && res.data.data) {
        // Pass the chat data to the parent component
        onSelectChat(res.data.data);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start chat. Please try again.');
    } finally {
      setProcessingChat(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Friends</h2>

      {/* Search box */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="w-full pl-10 pr-4 py-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        />
        <SearchIcon 
          className="absolute top-2.5 left-3 text-gray-400 dark:text-gray-500"
          size={18}
        />
        <button 
          onClick={handleSearch}
          className="absolute right-2 top-1.5 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Search
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      {/* Users list */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No users found</p>
        ) : (
          users.map(user => (
            <div 
              key={user._id} 
              className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <div className="flex items-center flex-1 min-w-0">
                {user.avatarUrl ? (
                  <LazyImage 
                    src={user.avatarUrl} 
                    alt={user.name || 'User'} 
                    className="w-8 h-8 rounded-full object-cover mr-2 shadow-sm"
                    placeholder={
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    }
                    fallback={
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    }
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{user.name || "User"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => startChat(user._id)}
                disabled={processingChat[user._id]}
                className={`p-1.5 rounded-full ${
                  processingChat[user._id] 
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Start chat"
              >
                {processingChat[user._id] ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MessageSquareIcon size={18} className="text-blue-500" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {pageInfo.hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading || loadingMore}
            className={`px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              loading || loadingMore ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}













