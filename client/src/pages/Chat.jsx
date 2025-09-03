import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendNewMessage } from '../api/chat';
import { getUserById } from '../api/users';
import socketService from '../services/socketService';

// Components
import ChatLayout from '../components/chat/ChatLayout';
import NavigationSidebar from '../components/chat/NavigationSidebar';
import ChatList from '../components/chat/ChatList';
import ChatThread from '../components/chat/ChatThread';

// Hooks
import { useChatData } from '../hooks/useChatData';
import { useChatHelpers } from '../hooks/useChatHelpers.jsx';
import { useChatScroll } from '../hooks/useChatScroll';

export default function Chat() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showWhereAreYouButton, setShowWhereAreYouButton] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUserId = sessionStorage.getItem('userId');
  const token = sessionStorage.getItem('token');
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);

  // Custom hooks
  const {
    chats,
    setChats,
    messages,
    setMessages,
    messagesCache,
    setMessagesCache,
    drafts,
    setDrafts,
    loading: chatDataLoading,
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
  } = useChatData();

  const {
    getChatName,
    isSenderCurrentUser,
    getSenderName,
    renderAvatar
  } = useChatHelpers();

  const {
    userHasScrolledUp,
    setUserHasScrolledUp,
    isNearBottom,
    newMessagesCount,
    setNewMessagesCount,
    messagesContainerRef,
    messagesEndRef,
    handleScroll
  } = useChatScroll(messages, selectedChat);

  // Update selectedChatRef when selectedChat changes
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Handle location state for incoming chats
  useEffect(() => {
    if (location.state && location.state.chat) {
      const incomingChat = location.state.chat;
      if (!chats.find(c => c._id === incomingChat._id)) {
        setChats(prev => [incomingChat, ...prev]);
      }
      setSelectedChat(incomingChat);

      if (location.state.from === 'status_notification') {
        setShowWhereAreYouButton(true);
      }
    }
  }, [location.state, chats, setChats]);

  // Socket.IO event handlers
  const handleNewMessage = useCallback((data) => {
    const { chatId, message } = data;

    setChats(prevChats => {
      const chatToUpdate = prevChats.find(c => c._id === chatId);
      
      if (!chatToUpdate) {
        fetchChats();
        return prevChats;
      }

      const updatedChat = {
        ...chatToUpdate,
        lastMessage: message,
        unreadMessageCount: (selectedChatRef.current && selectedChatRef.current._id === chatId)
          ? chatToUpdate.unreadMessageCount
          : (chatToUpdate.unreadMessageCount || 0) + 1,
      };

      const otherChats = prevChats.filter(c => c._id !== chatId);
      return [updatedChat, ...otherChats];
    });
    
    const isFromCurrentUser = message.sender && (message.sender._id === currentUserId || message.sender === currentUserId);

    if (selectedChatRef.current && selectedChatRef.current._id === chatId && !isFromCurrentUser) {
      setMessages(prev => [...prev, message]);
      setMessagesCache(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), message]
      }));
    }
  }, [fetchChats, currentUserId, setChats, setMessages, setMessagesCache]);

  const handleUserTyping = useCallback((data) => {
    const { chatId, userId, userName } = data;
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && userId !== currentUserId) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  }, [currentUserId]);

  const handleUserStoppedTyping = useCallback((data) => {
    const { chatId, userId } = data;
    if (selectedChatRef.current && selectedChatRef.current._id === chatId && userId !== currentUserId) {
      setTypingUsers(() => new Set());
    }
  }, [currentUserId]);

  // Initialize Socket.IO connection and listeners
  useEffect(() => {
    if (token) {
      socketService.connect(token);
      
      const setupListeners = () => {
        socketService.onNewMessage(handleNewMessage);
        socketService.onUserTyping(handleUserTyping);
        socketService.onUserStoppedTyping(handleUserStoppedTyping);
      };

      setupListeners();
      
      return () => {
        clearTimeout(typingTimeoutRef.current);
        socketService.off('new_message');
        socketService.off('user_typing');
        socketService.off('user_stopped_typing');
      };
    }
  }, [token, handleNewMessage, handleUserTyping, handleUserStoppedTyping]);

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Handle typing input
  const handleTyping = (e) => {
    updateCurrentDraft(selectedChat, e.target.value);
    
    if (selectedChat) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.startTyping(selectedChat._id);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.stopTyping(selectedChat._id);
      }, 2000);
    }
  };

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    
    loadChatMessages(selectedChat._id);
    setActiveTab('chats');
  }, [selectedChat, loadChatMessages]);

  // Send a message
  const send = async () => {
    const currentDraft = getCurrentDraft(selectedChat);
    if (!currentDraft.trim() || !selectedChat) return;

    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketService.stopTyping(selectedChat._id);

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
    updateCurrentDraft(selectedChat, '');
    setReplyTo(null);

    try {
      const res = await sendNewMessage(selectedChat._id, draftCopy);

      const updatedMessages = messages.map(msg => {
        if (msg._id === tempId) {
          const realMsg = res.data.data;
          if (!realMsg.replyTo && msg.replyTo) {
            return { ...realMsg, replyTo: msg.replyTo };
          }
          return realMsg;
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      setMessagesCache(prev => ({
        ...prev,
        [selectedChat._id]: updatedMessages
      }));

      fetchChats();
    } catch (err) {
      console.error('Failed to send message:', err);
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
    updateCurrentDraft(selectedChat, message);
    setShowWhereAreYouButton(false);
  };

  // Retry sending a failed message
  const retryMessage = async (messageId) => {
    const message = messages.find(msg => msg._id === messageId);
    if (!message || !message.failed) return;

    const updatedMessages = messages.map(msg =>
      msg._id === messageId
        ? { ...msg, pending: true, failed: false, error: null }
        : msg
    );
    
    setMessages(updatedMessages);
    setMessagesCache(prev => ({
      ...prev,
      [selectedChat._id]: updatedMessages
    }));

    try {
      const res = await sendNewMessage(selectedChat._id, message.text);
      
      const updatedMessages = messages.map(msg => {
        if (msg._id === messageId) {
          return res.data.data;
        }
        return msg;
      });
      
      setMessages(updatedMessages);
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
    if (!chats.find(c => c._id === chat._id)) {
      setChats(prev => [chat, ...prev]);
      
      if (chat.members && Array.isArray(chat.members)) {
        const newUserIds = chat.members
          .filter(m => m && typeof m === 'object' && m._id && m._id !== currentUserId)
          .map(m => m._id);
        
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

  // Join chat room when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      socketService.joinChat(selectedChat._id);
      return () => {
        socketService.leaveChat(selectedChat._id);
      };
    }
  }, [selectedChat]);

  return (
    <ChatLayout error={error}>
      <NavigationSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <ChatList
        activeTab={activeTab}
        chats={chats}
        loading={chatDataLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        setShowMobileChat={setShowMobileChat}
        setActiveTab={setActiveTab}
        getChatName={getChatName}
        renderAvatar={(userId, name, size, preferredUrl) => renderAvatar(userId, name, size, preferredUrl, userProfiles)}
        currentUserId={currentUserId}
        onSelectNewChat={handleSelectNewChat}
      />
      
      <ChatThread
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        setShowMobileChat={setShowMobileChat}
        showMobileChat={showMobileChat}
        getChatName={getChatName}
        renderAvatar={(userId, name, size, preferredUrl) => renderAvatar(userId, name, size, preferredUrl, userProfiles)}
        currentUserId={currentUserId}
        typingUsers={typingUsers}
        messagesContainerRef={messagesContainerRef}
        handleScroll={handleScroll}
        chatLoading={chatLoading}
        chatError={chatError}
        loadChatMessages={loadChatMessages}
        messages={messages}
        isSenderCurrentUser={isSenderCurrentUser}
        getSenderName={getSenderName}
        retryMessage={retryMessage}
        setReplyTo={setReplyTo}
        messagesEndRef={messagesEndRef}
        userHasScrolledUp={userHasScrolledUp}
        newMessagesCount={newMessagesCount}
        setUserHasScrolledUp={setUserHasScrolledUp}
        setNewMessagesCount={setNewMessagesCount}
        getCurrentDraft={() => getCurrentDraft(selectedChat)}
        handleTyping={handleTyping}
        handleKeyDown={handleKeyDown}
        send={send}
        loading={loading}
        replyTo={replyTo}
        showWhereAreYouButton={showWhereAreYouButton}
        handleQuickReply={handleQuickReply}
        setActiveTab={setActiveTab}
      />
    </ChatLayout>
  );
}
