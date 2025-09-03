import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllChats, getChatMessages, sendNewMessage, clearUnreadMessages } from '../api/chat';
import { getUserById } from '../api/users';

export const useChatData = () => {
  const [chats, setChats] = useState(() => {
    try {
      const currentUserId = sessionStorage.getItem('userId');
      if (!currentUserId) return [];
      const saved = localStorage.getItem(`chatList_${currentUserId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [messages, setMessages] = useState([]);
  const [messagesCache, setMessagesCache] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [error, setError] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const currentUserId = sessionStorage.getItem('userId');
  const isInitialLoad = useRef(true);

  // Helper function to get current draft
  const getCurrentDraft = (selectedChat) => {
    return selectedChat ? (drafts[selectedChat._id] || '') : '';
  };
  
  // Helper function to update current draft
  const updateCurrentDraft = (selectedChat, value) => {
    if (selectedChat) {
      setDrafts(prev => ({
        ...prev,
        [selectedChat._id]: value
      }));
    }
  };

  // Load profile pictures for all users in chats
  const loadUserProfiles = useCallback(async (chatsList) => {
    try {
      const userIds = new Set();
      
      chatsList.forEach(chat => {
        if (chat.members && Array.isArray(chat.members)) {
          chat.members.forEach(member => {
            if (member && typeof member === 'object' && member._id && member._id !== currentUserId) {
              userIds.add(member._id);
            }
          });
        }
      });
      
      if (currentUserId) {
        userIds.add(currentUserId);
      }
      
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
        localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(res.data.data));
        await loadUserProfiles(res.data.data);
      } else {
        setChats([]);
        localStorage.removeItem(`chatList_${currentUserId}`);
      }
      
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      }
    } finally {
      if (isInitialLoad.current) setLoading(false);
      isInitialLoad.current = false;
    }
  }, [currentUserId, loadUserProfiles]);

  const loadChatMessages = useCallback(async (chatId) => {
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
      
      setMessagesCache(prev => ({
        ...prev,
        [chatId]: messagesData
      }));
      
      setMessages(messagesData);
      
      const unreadMessages = messagesData.filter(msg => !msg.read && msg.sender !== currentUserId) || [];
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg._id);
        // Note: This would need socketService to be passed in or imported
        // socketService.markMessagesAsRead(chatId, messageIds);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatError('Could not load messages. Please try again.');
    } finally {
      setChatLoading(false);
    }
  }, [currentUserId, messagesCache]);

  // When chats state changes, update localStorage
  useEffect(() => {
    if (!currentUserId) return;
    localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(chats));
  }, [chats, currentUserId]);

  return {
    chats,
    setChats,
    messages,
    setMessages,
    messagesCache,
    setMessagesCache,
    drafts,
    setDrafts,
    loading,
    chatLoading,
    chatError,
    error,
    userProfiles,
    setUserProfiles,
    getCurrentDraft,
    updateCurrentDraft,
    fetchChats,
    loadChatMessages,
    loadUserProfiles
  };
};
