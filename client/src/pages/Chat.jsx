// client/src/pages/Chat.jsx - Enhanced version with Socket.IO real-time chat
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  getAllChats,
  getChatMessages,
  sendNewMessage,
  clearUnreadMessages
} from '../api/chat';
import { getUserById } from '../api/users';
import socketService from '../services/socketService';

import FriendList from '../components/FriendList';
import { MessageSquareIcon, SendIcon, ArrowLeftIcon, CheckIcon, PlusIcon, UserIcon } from 'lucide-react';

export default function Chat() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'friends'
  const [chats, setChats] = useState(() => {
    // Try to load from localStorage for persistence, per user
    try {
      const currentUserId = sessionStorage.getItem('userId');
      if (!currentUserId) return [];
      const saved = localStorage.getItem(`chatList_${currentUserId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedChat, setSelectedChat] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesCache, setMessagesCache] = useState({}); // Cache messages per chat
  const [drafts, setDrafts] = useState({}); // Per-chat drafts
  const [loading, setLoading] = useState(false);
  
  // Helper function to get current draft
  const getCurrentDraft = () => {
    return selectedChat ? (drafts[selectedChat._id] || '') : '';
  };
  
  // Helper function to update current draft
  const updateCurrentDraft = (value) => {
    if (selectedChat) {
      setDrafts(prev => ({
        ...prev,
        [selectedChat._id]: value
      }));
    }
  };
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [error, setError] = useState(''); // General component error
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [userProfiles, setUserProfiles] = useState({}); // Store user profile pictures
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = sessionStorage.getItem('userId');
  const token = sessionStorage.getItem('token');
  const isInitialLoad = useRef(true);
  const [replyTo, setReplyTo] = useState(null);
  const [showWhereAreYouButton, setShowWhereAreYouButton] = useState(false);

  // Use a ref to hold the current selected chat to avoid stale closures in socket handlers
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    if (location.state && location.state.chat) {
      const incomingChat = location.state.chat;
      // If the chat is not already in the list, add it
      if (!chats.find(c => c._id === incomingChat._id)) {
        setChats(prev => [incomingChat, ...prev]);
      }
      setSelectedChat(incomingChat);

      if(location.state.from === 'status_notification'){
          setShowWhereAreYouButton(true);
      }
    }
  }, [location.state, chats]);

  // Load profile pictures for all users in chats
  const loadUserProfiles = useCallback(async (chatsList) => {
    try {
      const userIds = new Set();
      
      // Collect all unique user IDs from chat members
      chatsList.forEach(chat => {
        if (chat.members && Array.isArray(chat.members)) {
          chat.members.forEach(member => {
            if (member && typeof member === 'object' && member._id && member._id !== currentUserId) {
              userIds.add(member._id);
            }
          });
        }
      });
      
      // Also add current user ID to load their profile picture
      if (currentUserId) {
        userIds.add(currentUserId);
      }
      
      // Fetch profiles for all users
      const profiles = {};
      for (const userId of userIds) {
        try {

          const userRes = await getUserById(userId);
          if (userRes.data) {
            profiles[userId] = userRes.data;
          }
        } catch (err) {
          console.warn(`Failed to fetch profile for user ${userId}:`, err);
        }
      }
      
      setUserProfiles(prev => ({ ...prev, ...profiles }));
    } catch (err) {
      console.error('Failed to load user profiles:', err);
    }
  }, [currentUserId]);

  const fetchChats = useCallback(async () => {
    if (!currentUserId) {
      setError('Not logged in. Please log in to continue.');
      return;
    }

    if (isInitialLoad.current) setLoading(true);
    try {
      const res = await getAllChats();

      if (res.data && Array.isArray(res.data.data)) {
        setChats(res.data.data);
        // Save to localStorage for persistence, per user
        localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(res.data.data));
        
        // Load profile pictures for all chat members
        await loadUserProfiles(res.data.data);
      } else {
        setChats([]);
        localStorage.removeItem(`chatList_${currentUserId}`);
      }
      
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      // Don't clear chats on failure to prevent UI flicker
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      }
    } finally {
      if (isInitialLoad.current) setLoading(false);
      isInitialLoad.current = false;
    }
  }, [currentUserId, loadUserProfiles]);

  const loadChatMessages = useCallback(async (chatId) => {
    // Check if messages are already cached
    if (messagesCache[chatId]) {
      setMessages(messagesCache[chatId]);
      setChatLoading(false);
      setChatError('');
      return;
    }

    setChatLoading(true);
    setChatError('');
    try {
      const res = await getChatMessages(chatId);
      const messagesData = res.data.data || [];
      
      // Cache the messages
      setMessagesCache(prev => ({
        ...prev,
        [chatId]: messagesData
      }));
      
      setMessages(messagesData);
      
      // Mark messages as read via Socket.IO
      const unreadMessages = messagesData.filter(msg => !msg.read && msg.sender !== currentUserId) || [];
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg._id);
        socketService.markMessagesAsRead(chatId, messageIds);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatError('Could not load messages. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }, [currentUserId, messagesCache]);
  
  // Define Socket.IO event handlers
  const handleNewMessage = useCallback((data) => {
    const { chatId, message } = data;

    setChats(prevChats => {
      const chatToUpdate = prevChats.find(c => c._id === chatId);
      
      // If chat isn't in the list yet, we need a full refresh to get its details
      if (!chatToUpdate) {
        fetchChats();
        return prevChats;
      }

      // Create an updated version of the chat
      const updatedChat = {
        ...chatToUpdate,
        lastMessage: message,
        unreadMessageCount: (selectedChatRef.current && selectedChatRef.current._id === chatId)
          ? chatToUpdate.unreadMessageCount
          : (chatToUpdate.unreadMessageCount || 0) + 1,
      };

      // Filter out the old version and prepend the updated one
      const otherChats = prevChats.filter(c => c._id !== chatId);
      return [updatedChat, ...otherChats];
    });
    
    const isFromCurrentUser = message.sender && (message.sender._id === currentUserId || message.sender === currentUserId);

    // Add the message to the view if it's the active chat and not from the current user
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && !isFromCurrentUser) {
      setMessages(prev => [...prev, message]);
      // Also update the cache
      setMessagesCache(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), message]
      }));
    }
  }, [fetchChats, currentUserId]);

  const handleMessageSent = useCallback(() => {
    // Message sent confirmation - could be used for analytics or debugging
  }, []);

  const handleUserTyping = useCallback((data) => {
    const { chatId, userId, userName } = data;
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && userId !== currentUserId) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  }, [currentUserId]);

  const handleUserStoppedTyping = useCallback((data) => {
    const { chatId, userId } = data;
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && userId !== currentUserId) {
      setTypingUsers(() => {
        // Remove the user who stopped typing (we need to find them by userId)
        // For now, we'll clear all typing indicators
        return new Set();
      });
    }
  }, [currentUserId]);

  const handleMessagesRead = useCallback((data) => {
    const { chatId, messageIds, readBy } = data;
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && readBy !== currentUserId) {
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg._id) ? { ...msg, read: true } : msg
        )
      );
    }
  }, [currentUserId]);



  // Initialize Socket.IO connection and listeners on component mount
  useEffect(() => {
    if (token) {
      socketService.connect(token);
      
      // Set up Socket.IO event listeners
      const setupListeners = () => {
        socketService.onNewMessage(handleNewMessage);
        socketService.onMessageSent(handleMessageSent);
        socketService.onUserTyping(handleUserTyping);
        socketService.onUserStoppedTyping(handleUserStoppedTyping);
        socketService.onMessagesRead(handleMessagesRead);
      };

      setupListeners();
      
      // Cleanup on unmount
      return () => {
        clearTimeout(typingTimeoutRef.current);
        socketService.off('new_message');
        socketService.off('message_sent');
        socketService.off('user_typing');
        socketService.off('user_stopped_typing');
        socketService.off('messages_read');
      };
    }
  }, [token]); // Only depend on token, not the callback functions

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // When chats state changes, update localStorage (for cases like new chat added)
  useEffect(() => {
    if (!currentUserId) return;
    localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(chats));
  }, [chats, currentUserId]);

  // Track if user has manually scrolled up
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const messagesContainerRef = useRef(null);

  // Handle scroll events to detect user behavior
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 100px of bottom
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    
    // If user scrolls up significantly, mark as user-initiated scroll
    if (scrollTop < scrollHeight - clientHeight - 200) {
      setUserHasScrolledUp(true);
    } else if (nearBottom) {
      setUserHasScrolledUp(false);
    }
  }, []);

  // Track new messages and handle scroll behavior
  const previousMessageCount = useRef(0);
  
  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessage = messages.length > previousMessageCount.current;
      
      if (isNewMessage && userHasScrolledUp) {
        // User is scrolled up and new message arrived - increment counter
        setNewMessagesCount(prev => prev + 1);
      } else if (isNearBottom || !userHasScrolledUp) {
        // User is near bottom or hasn't scrolled up - auto scroll and reset counter
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setNewMessagesCount(0);
      }
      
      previousMessageCount.current = messages.length;
    }
  }, [messages, isNearBottom, userHasScrolledUp]);

  // When a new chat is selected, scroll to recent messages (not necessarily bottom)
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      // Reset scroll state for new chat
      setUserHasScrolledUp(false);
      setIsNearBottom(true);
      setNewMessagesCount(0);
      previousMessageCount.current = messages.length;
      
      // Scroll to bottom smoothly for new chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedChat, messages.length]);

  // Auto-resize textarea when draft changes (e.g., when switching chats)
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder="Type a message..."]');
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 128);
      textarea.style.height = newHeight + 'px';
    }
  }, [getCurrentDraft()]);

  // Join chat room when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      socketService.joinChat(selectedChat._id);

      return () => {
        socketService.leaveChat(selectedChat._id);
      };
    }
  }, [selectedChat]);



  // Handle typing input
  const handleTyping = (e) => {
    updateCurrentDraft(e.target.value);
    
    if (selectedChat) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.startTyping(selectedChat._id);
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.stopTyping(selectedChat._id);
      }, 2000);
    }
  };

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    
    // Load messages
    loadChatMessages(selectedChat._id);
    
    // Switch back to chats tab
    setActiveTab('chats');
    
    // Mark messages as read
    clearUnreadMessages(selectedChat._id)
      .catch(err => console.error('Failed to clear unread messages:', err));
      
  }, [selectedChat, loadChatMessages]);

  // Send a message with improved error handling
  const send = async () => {
    const currentDraft = getCurrentDraft();
    if (!currentDraft.trim() || !selectedChat) return;

    // Stop typing indicator
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketService.stopTyping(selectedChat._id);

    // Add the message to the local state with optimistic UI update
    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      chatId: selectedChat._id,
      sender: currentUserId,
      text: currentDraft.trim(),
      createdAt: new Date(),
      pending: true,
      replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender } : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    const draftCopy = currentDraft.trim();
    updateCurrentDraft(''); // Clear current chat's draft
    setReplyTo(null);

    try {
      // Send the message to the server via HTTP
      const res = await sendNewMessage(selectedChat._id, draftCopy);

      // Replace the temporary message with the real one, preserving replyTo if needed
      const updatedMessages = messages.map(msg => {
        if (msg._id === tempId) {
          const realMsg = res.data.data;
          // If backend does not return replyTo, preserve it from optimistic message
          if (!realMsg.replyTo && msg.replyTo) {
            return { ...realMsg, replyTo: msg.replyTo };
          }
          return realMsg;
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      // Also update the cache
      setMessagesCache(prev => ({
        ...prev,
        [selectedChat._id]: updatedMessages
      }));

      // Refresh chats to update last message list
      fetchChats();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark message as failed and show retry option
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, failed: true, pending: false, error: err.response?.data?.error || 'Failed to send' }
            : msg
        )
      );
    }
  };

  const handleQuickReply = (message) => {
    updateCurrentDraft(message);
    setShowWhereAreYouButton(false);
  };

  // Retry sending a failed message
  const retryMessage = async (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (!message || !message.failed) return;

    // Mark as pending again
    const updatedMessages = messages.map(msg =>
      msg._id === messageId
        ? { ...msg, pending: true, failed: false, error: null }
        : msg
    );
    
    setMessages(updatedMessages);
    // Also update the cache
    setMessagesCache(prev => ({
      ...prev,
      [selectedChat._id]: updatedMessages
    }));

    try {
      const res = await sendNewMessage(selectedChat._id, message.text);
      
      // Replace with real message
      const updatedMessages = messages.map(msg => {
        if (msg._id === messageId) {
          return res.data.data;
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      // Also update the cache
      setMessagesCache(prev => ({
        ...prev,
        [selectedChat._id]: updatedMessages
      }));

      fetchChats();
    } catch (err) {
      console.error('Failed to retry message:', err);
      const updatedMessages = messages.map(msg =>
        msg._id === messageId
          ? { ...msg, failed: true, pending: false, error: err.response?.data?.error || 'Failed to send' }
          : msg
      );
      
      setMessages(updatedMessages);
      // Also update the cache
      setMessagesCache(prev => ({
        ...prev,
        [selectedChat._id]: updatedMessages
      }));
    }
  };

  // Handle pressing Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Handle chat selection from FriendList
  const handleSelectNewChat = (chat) => {
    // Add new chat to the list if it's not already there
    if (!chats.find(c => c._id === chat._id)) {
      setChats(prev => [chat, ...prev]);
      
      // Load profile pictures for new chat members
      if (chat.members && Array.isArray(chat.members)) {
        const newUserIds = chat.members
          .filter(m => m && typeof m === 'object' && m._id && m._id !== currentUserId)
          .map(m => m._id);
        
        // Load profiles for new users
        newUserIds.forEach(async (userId) => {
          if (!userProfiles[userId]) {
            try {
              const userRes = await getUserById(userId);
              if (userRes.data && userRes.data.avatarUrl) {
                setUserProfiles(prev => ({ ...prev, [userId]: userRes.data }));
              }
            } catch (err) {
              console.warn(`Failed to fetch profile for user ${userId}:`, err);
            }
          }
        });
      }
    }
    
    setSelectedChat(chat);
    setShowMobileChat(true);
    setActiveTab('chats');
  };

  // Get chat display name (other user's name)
  const getChatName = (chat) => {
    try {
      if (!chat || !chat.members || !Array.isArray(chat.members) || chat.members.length === 0) {
        return 'Chat';
      }
      
      // Filter out current user and get the other user's name
      const otherMembers = chat.members.filter(m => 
        m && (typeof m === 'string' ? m !== currentUserId : m._id !== currentUserId)
      );
      
      if (otherMembers.length === 0) return 'Just you';
      
      return otherMembers.map(m => {
        if (typeof m === 'string') return 'User';
        return m.name || 'User';
      }).join(', ');
    } catch (err) {
      console.error('Error getting chat name:', err);
      return 'Chat';
    }
  };

  // Handle message sender correctly based on format
  const isSenderCurrentUser = (sender) => {
    if (!sender) return false;
    if (typeof sender === 'string') return sender === currentUserId;
    if (typeof sender === 'object' && sender._id) return sender._id === currentUserId;
    return false;
  };

  // Get sender name from message
  const getSenderName = (sender) => {
    if (!sender) return 'Unknown User';
    if (typeof sender === 'string') return 'Unknown User';
    return sender.name || 'Unknown User';
  };

  // Get user avatar URL
  const getUserAvatar = (userId) => {
    if (!userId || !userProfiles[userId]) {
      return null;
    }
    return userProfiles[userId].avatarUrl;
  };



  // Render avatar component with improved error handling
  const renderAvatar = (userId, name, size = 'w-10 h-10', preferredUrl = null) => {
    // Support multiple possible field names just in case (avatarUrl, avatar, profilePic)
    let normalizedPreferred = preferredUrl;
    if (preferredUrl && typeof preferredUrl === 'object') {
      normalizedPreferred = preferredUrl.avatarUrl || preferredUrl.avatar || preferredUrl.profilePic || null;
    }
    let avatarUrl = normalizedPreferred || getUserAvatar(userId);
    
    // Prefer current user's stored avatar early
    if (userId === currentUserId && !avatarUrl) {
      avatarUrl = sessionStorage.getItem(`userAvatarUrl_${userId}`);
    }
    
    // Try cached profiles
    if (!avatarUrl && userProfiles[userId]) {
      avatarUrl = userProfiles[userId].avatarUrl || userProfiles[userId].avatar || userProfiles[userId].profilePic || null;
    }
    
    // Generate initials for fallback
    const getInitials = (name) => {
      if (!name || typeof name !== 'string') return 'U';
      const words = name.trim().split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    };
    
    // Visual fallback with better error handling
    if (!avatarUrl && name) {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`;
    }
    
    if (avatarUrl) {
      return (
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt={name || 'User'} 
            className={`${size} rounded-full object-cover shadow-md`}
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.target.style.display = 'none';
              const fallback = e.target.nextSibling;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
            loading="lazy"
          />
          {/* Fallback initials - hidden by default, shown on image error */}
          <div className={`${size} rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium shadow-md absolute inset-0 hidden`}>
            {getInitials(name)}
          </div>
        </div>
      );
    }
    
    // Fallback to initials when no avatar URL
    return (
      <div className={`${size} rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium shadow-md`}>
        {getInitials(name)}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 animate-fade-in overflow-hidden">

      {/* Show general error at the top if there is one */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 text-center animate-slide-in">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center"
          >
            Refresh Page
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* Desktop Sidebar - Always visible on desktop */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex-shrink-0 flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'chats'
                  ? 'text-bracu-blue border-b-2 border-bracu-blue'
                  : 'text-gray-600 dark:text-gray-300 hover:text-bracu-blue dark:hover:text-blue-400'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'friends'
                  ? 'text-bracu-blue border-b-2 border-bracu-blue'
                  : 'text-gray-600 dark:text-gray-300 hover:text-bracu-blue dark:hover:text-blue-400'
              }`}
            >
              Find Friends
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {activeTab === 'chats' ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Recent Chats
                  </h2>
                  {chats.length > 0 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-bracu-blue transition-all duration-200"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Clear search"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-pulse">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bracu-blue mx-auto mb-3"></div>
                    <p className="text-sm font-medium">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquareIcon size={32} className="text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">No conversations yet</p>
                    <p className="text-sm mb-4">Start chatting with your friends</p>
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="px-6 py-3 bg-gradient-to-r from-bracu-blue to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <PlusIcon size={18} className="inline mr-2" />
                      Start a new chat
                    </button>
                  </div>
                ) : (() => {
                  const filteredChats = chats.filter(chat => {
                    if (!searchQuery) return true;
                    const chatName = getChatName(chat).toLowerCase();
                    const lastMessage = chat.lastMessage?.text?.toLowerCase() || '';
                    return chatName.includes(searchQuery.toLowerCase()) || 
                           lastMessage.includes(searchQuery.toLowerCase());
                  });

                  if (searchQuery && filteredChats.length === 0) {
                    return (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquareIcon size={32} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">No chats found</p>
                        <p className="text-sm">Try searching with a different term</p>
                      </div>
                    );
                  }

                  return filteredChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => {
                        setSelectedChat(chat);
                        setShowMobileChat(true);
                      }}
                      className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedChat && selectedChat._id === chat._id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-lg border border-blue-200 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-700'
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      {(() => {
                        const otherMember = chat.members?.find(m => 
                          m && (typeof m === 'string' ? m !== currentUserId : m._id !== currentUserId)
                        );
                        return otherMember && typeof otherMember === 'object' ? (
                          <div className="relative">
                            {renderAvatar(otherMember._id, otherMember.name, 'w-12 h-12', otherMember)}
                            {/* Online status indicator */}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bracu-blue to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {getChatName(chat).charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0 ml-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-bracu-blue dark:group-hover:text-blue-400 transition-colors">
                            {getChatName(chat)}
                          </p>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                              {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {chat.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>
                      {chat.unreadMessageCount > 0 && (
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                          {chat.unreadMessageCount > 99 ? '99+' : chat.unreadMessageCount}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <FriendList onSelectChat={handleSelectNewChat} />
            )}
          </div>
        </div>

        {/* Mobile Sidebar - Only visible on mobile when no chat is selected */}
        <div className={`lg:hidden w-full bg-white dark:bg-gray-800 flex-shrink-0 flex-col ${
          showMobileChat ? 'hidden' : 'flex'
        }`}>
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'chats'
                  ? 'text-bracu-blue border-b-2 border-bracu-blue'
                  : 'text-gray-600 dark:text-gray-300 hover:text-bracu-blue dark:hover:text-blue-400'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'friends'
                  ? 'text-bracu-blue border-b-2 border-bracu-blue'
                  : 'text-gray-600 dark:text-gray-300 hover:text-bracu-blue dark:hover:text-blue-400'
              }`}
            >
              Find Friends
            </button>
          </div>

          {/* Content based on active tab */}
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {activeTab === 'chats' ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Recent Chats
                  </h2>
                  {chats.length > 0 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-bracu-blue transition-all duration-200"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Clear search"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {loading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-pulse">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bracu-blue mx-auto mb-3"></div>
                    <p className="text-sm font-medium">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquareIcon size={32} className="text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">No conversations yet</p>
                    <p className="text-sm mb-4">Start chatting with your friends</p>
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="px-6 py-3 bg-gradient-to-r from-bracu-blue to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <PlusIcon size={18} className="inline mr-2" />
                      Start a new chat
                    </button>
                  </div>
                ) : (() => {
                  const filteredChats = chats.filter(chat => {
                    if (!searchQuery) return true;
                    const chatName = getChatName(chat).toLowerCase();
                    const lastMessage = chat.lastMessage?.text?.toLowerCase() || '';
                    return chatName.includes(searchQuery.toLowerCase()) || 
                           lastMessage.includes(searchQuery.toLowerCase());
                  });

                  if (searchQuery && filteredChats.length === 0) {
                    return (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquareIcon size={32} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">No chats found</p>
                        <p className="text-sm">Try a different search term</p>
                      </div>
                    );
                  }

                  return filteredChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => {
                        setSelectedChat(chat);
                        setShowMobileChat(true);
                      }}
                      className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        selectedChat && selectedChat._id === chat._id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-lg border border-blue-200 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-700'
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      {(() => {
                        const otherMember = chat.members?.find(m => 
                          m && (typeof m === 'string' ? m !== currentUserId : m._id !== currentUserId)
                        );
                        return otherMember && typeof otherMember === 'object' ? (
                          <div className="relative mr-4">
                            {renderAvatar(otherMember._id, otherMember.name, 'w-12 h-12', otherMember)}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium mr-4 shadow-md">
                            {getChatName(chat).charAt(0).toUpperCase()}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-bracu-blue dark:group-hover:text-blue-400 transition-colors">
                            {getChatName(chat)}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {chat.lastMessage?.createdAt ? 
                              new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                              ''
                            }
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {chat.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <FriendList onSelectChat={handleSelectNewChat} />
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-full min-w-0 ${
          showMobileChat ? 'block lg:flex' : 'hidden lg:flex'
        }`}>
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-gray-800 shadow-lg p-4 flex items-center sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
                {/* Desktop hint - subtle indicator that chat list is available */}
                <div className="hidden lg:block absolute left-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none animate-pulse">
                  💬 Chat list always visible on desktop
                </div>
                <button
                  onClick={() => {
                    setSelectedChat(null);
                    setShowMobileChat(false);
                  }}
                  className="lg:hidden p-2 mr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
                  title="Back to chat list"
                  aria-label="Back to chat list"
                >
                  <ArrowLeftIcon size={20} />
                </button>
                {(() => {
                  const otherMember = selectedChat.members?.find(m => 
                    m && (typeof m === 'string' ? m !== currentUserId : m._id !== currentUserId)
                  );
                  return otherMember && typeof otherMember === 'object' ? (
                    <div className="relative mr-4">
                      {renderAvatar(otherMember._id, otherMember.name, 'w-12 h-12', otherMember)}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium mr-4 shadow-md">
                      {getChatName(selectedChat).charAt(0).toUpperCase()}
                    </div>
                  );
                })()}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-lg">
                    {getChatName(selectedChat)}
                  </p>
                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 italic animate-pulse">
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-gray-50 dark:bg-gray-900 max-h-[calc(100vh-12rem)] relative"
              >
                {chatLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bracu-blue"></div>
                  </div>
                ) : chatError ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400 animate-fade-in">
                    <p>{chatError}</p>
                    <button 
                      onClick={() => loadChatMessages(selectedChat._id)}
                      className="mt-4 px-6 py-2 bg-bracu-blue text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow hover:shadow-md"
                    >
                      Try Again
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 animate-fade-in">
                    <MessageSquareIcon size={64} className="mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        isSenderCurrentUser(msg.sender) ? 'justify-end' : 'justify-start'
                      } mb-4`}
                    >
                                             <div className={`flex ${isSenderCurrentUser(msg.sender) ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs md:max-w-md lg:max-w-lg`}>
                         {/* Avatar for other users' messages (left side) */}
                         {!isSenderCurrentUser(msg.sender) && (
                           <div className="flex-shrink-0 mr-2">
                             {renderAvatar(
                               (msg.sender && typeof msg.sender === 'object') ? msg.sender._id : msg.sender,
                               getSenderName(msg.sender),
                               'w-8 h-8',
                               typeof msg.sender === 'object' ? msg.sender : null
                             )}
                           </div>
                         )}
                         
                         {/* Message content */}
                         <div className="flex flex-col">
                           {/* Show sender name if not current user */}
                           {!isSenderCurrentUser(msg.sender) && (
                             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                               {getSenderName(msg.sender)}
                             </span>
                           )}
                           {/* Reply preview in bubble */}
                           {msg.replyTo && (
                             <div className="mb-1 p-2 rounded bg-blue-100 dark:bg-blue-900 text-xs text-blue-700 dark:text-blue-200">
                               Replying to {getSenderName(msg.replyTo.sender)}: {msg.replyTo.text}
                             </div>
                           )}
                           <div
                             className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
                               isSenderCurrentUser(msg.sender)
                                 ? 'bg-gradient-to-r from-bracu-blue to-blue-600 text-white rounded-tr-sm'
                                 : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-200 dark:border-gray-600'
                             } ${msg.pending ? 'opacity-70 animate-pulse' : ''} ${msg.failed ? 'border-red-300 dark:border-red-600' : ''}`}
                           >
                             {msg.text}
                             <div className="text-xs mt-1 flex justify-between items-center">
                               <span>
                                 {msg.pending ? (
                                   <span className="opacity-70">Sending...</span>
                                 ) : msg.failed ? (
                                   <div className="flex items-center space-x-2">
                                     <span className="text-red-500 dark:text-red-400 flex items-center">
                                       <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                         <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                       </svg>
                                       Failed
                                     </span>
                                     <button
                                       onClick={() => retryMessage(msg._id)}
                                       className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                       title="Retry sending message"
                                       aria-label="Retry sending message"
                                     >
                                       Retry
                                     </button>
                                   </div>
                                 ) : (
                                   <span className="opacity-70">
                                     {new Date(msg.createdAt).toLocaleTimeString([], {
                                       hour: '2-digit',
                                       minute: '2-digit'
                                     })}
                                     {msg.read && (
                                       <CheckIcon size={12} className="inline ml-1" />
                                     )}
                                   </span>
                                 )}
                               </span>
                               {!msg.failed && (
                                                                 <button
                                  className="ml-2 text-xs text-blue-500 hover:underline focus:outline-none"
                                  onClick={() => setReplyTo(msg)}
                                  title="Reply"
                                  aria-label="Reply to this message"
                                >
                                  Reply
                                </button>
                               )}
                             </div>
                           </div>
                           
                           {/* Show "You" label for your messages */}
                           {isSenderCurrentUser(msg.sender) && (
                             <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-2 text-right">
                               You
                             </span>
                           )}
                         </div>
                         
                         {/* Avatar for current user's messages (right side) */}
                         {isSenderCurrentUser(msg.sender) && (
                           <div className="flex-shrink-0 ml-2">
                             {renderAvatar(
                               currentUserId,
                               'You',
                               'w-8 h-8'
                             )}
                           </div>
                         )}
                       </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
                
                {/* Scroll to bottom button - appears when user has scrolled up */}
                {userHasScrolledUp && (
                  <button
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                      setUserHasScrolledUp(false);
                      setNewMessagesCount(0);
                    }}
                    className="fixed bottom-24 right-8 bg-bracu-blue hover:bg-blue-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 z-40 relative"
                    title={newMessagesCount > 0 ? `${newMessagesCount} new message${newMessagesCount > 1 ? 's' : ''}` : "Scroll to bottom"}
                    aria-label={newMessagesCount > 0 ? `Scroll to bottom to see ${newMessagesCount} new message${newMessagesCount > 1 ? 's' : ''}` : "Scroll to bottom of conversation"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {newMessagesCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                        {newMessagesCount > 9 ? '9+' : newMessagesCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Input area - make sticky at bottom */}
              <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 shadow-inner sticky bottom-0 z-30 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
                {replyTo && (
                  <div className="mb-2 p-2 rounded bg-blue-100 dark:bg-blue-900 text-sm flex items-center justify-between">
                    <div className="truncate">
                      <span className="font-medium text-blue-700 dark:text-blue-200">Replying to {getSenderName(replyTo.sender)}:</span> {replyTo.text}
                    </div>
                    <button
                      className="ml-2 text-xs text-gray-500 hover:text-red-500 focus:outline-none"
                      onClick={() => setReplyTo(null)}
                      title="Cancel reply"
                      aria-label="Cancel reply"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {showWhereAreYouButton && (
                  <div className="mb-2">
                      <button 
                        onClick={() => handleQuickReply("Where are you on campus?")} 
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-sm rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                        aria-label="Send quick reply: Where are you on campus?"
                        title="Send quick reply: Where are you on campus?"
                      >
                          Where are you on campus?
                      </button>
                  </div>
                )}
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      className="w-full min-h-12 max-h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-bracu-blue focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                      placeholder="Type a message..."
                      value={getCurrentDraft()}
                      onChange={(e) => {
                        handleTyping(e);
                        // Auto-resize textarea with smooth transition
                        const textarea = e.target;
                        textarea.style.height = 'auto';
                        const newHeight = Math.min(textarea.scrollHeight, 128);
                        textarea.style.height = newHeight + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      maxLength={1000}
                      disabled={loading}
                    />
                    {getCurrentDraft().length > 0 && (
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {getCurrentDraft().length}/1000
                      </div>
                    )}
                  </div>
                  <button
                    onClick={send}
                    disabled={!getCurrentDraft().trim() || loading}
                    className={`p-3 rounded-full transition-all duration-200 min-w-[48px] min-h-[48px] ${
                      getCurrentDraft().trim() && !loading
                        ? 'bg-gradient-to-r from-bracu-blue to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                    title={loading ? 'Sending...' : 'Send message'}
                    aria-label={loading ? 'Sending message...' : 'Send message'}
                  >
                    <SendIcon size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                <div className="w-24 h-24 bg-gradient-to-br from-bracu-blue to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageSquareIcon size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                  Welcome to Chat
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400 leading-relaxed">
                  Start meaningful conversations with your friends and classmates. Select an existing chat or create a new one to get started.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setActiveTab('friends');
                      setShowMobileChat(false);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-bracu-blue to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 inline-flex items-center justify-center transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                  >
                    <PlusIcon size={20} className="mr-2" />
                    Start a new chat
                  </button>
                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Real-time
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Secure
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
