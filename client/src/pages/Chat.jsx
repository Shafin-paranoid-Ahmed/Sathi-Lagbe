// client/src/pages/Chat.jsx - Enhanced version with Socket.IO real-time chat
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getAllChats,
  getChatMessages,
  sendNewMessage,
  clearUnreadMessages
} from '../api/chat';
import socketService from '../services/socketService';
import { debugSocketConnection } from '../utils/debugSocket';
import FriendList from '../components/FriendList';
import { MessageSquareIcon, SendIcon, ArrowLeftIcon, CheckIcon, PlusIcon } from 'lucide-react';

export default function Chat() {
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
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [error, setError] = useState(''); // General component error
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = sessionStorage.getItem('userId');
  const token = sessionStorage.getItem('token');
  const isInitialLoad = useRef(true);
  const [replyTo, setReplyTo] = useState(null);

  const fetchChats = useCallback(async () => {
    if (!currentUserId) {
      console.error("fetchChats: No currentUserId found. User might not be properly logged in.");
      setError('Not logged in. Please log in to continue.');
      return;
    }
    
    console.log("fetchChats: Starting for user", currentUserId);
    if (isInitialLoad.current) setLoading(true);
    try {
      const res = await getAllChats();
      console.log("fetchChats: API response received.", res.data);
      
      if (res.data && Array.isArray(res.data.data)) {
        console.log(`fetchChats: Found ${res.data.data.length} chats.`);
        setChats(res.data.data);
        // Save to localStorage for persistence, per user
        localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(res.data.data));
      } else {
        console.warn("fetchChats: Response was not in the expected format or contained no data.", res.data);
        setChats([]);
        localStorage.removeItem(`chatList_${currentUserId}`);
      }
      
    } catch (err) {
      console.error('fetchChats: Failed to fetch chats.', err);
      // It's better not to clear chats on failure, so the UI doesn't flicker.
      // setChats([]); 
    } finally {
      if (isInitialLoad.current) setLoading(false);
      isInitialLoad.current = false;
    }
  }, [currentUserId, setChats, setLoading, setError]);

  const loadChatMessages = useCallback(async (chatId) => {
    setChatLoading(true);
    setChatError('');
    try {
      const res = await getChatMessages(chatId);
      setMessages(res.data.data || []);
      
      // Mark messages as read via Socket.IO
      const unreadMessages = res.data.data?.filter(msg => !msg.read && msg.sender !== currentUserId) || [];
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
  }, [currentUserId]);
  
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
        unreadMessageCount: (selectedChat && selectedChat._id === chatId)
          ? chatToUpdate.unreadMessageCount
          : (chatToUpdate.unreadMessageCount || 0) + 1,
      };

      // Filter out the old version and prepend the updated one
      const otherChats = prevChats.filter(c => c._id !== chatId);
      return [updatedChat, ...otherChats];
    });
    
    const isFromCurrentUser = message.sender && (message.sender._id === currentUserId || message.sender === currentUserId);

    // Add the message to the view if it's the active chat and not from the current user
    if (selectedChat && selectedChat._id === chatId && !isFromCurrentUser) {
      setMessages(prev => [...prev, message]);
    }
  }, [fetchChats, selectedChat, currentUserId]);

  const handleMessageSent = useCallback((data) => {
    console.log('Message sent confirmation:', data);
  }, []);

  const handleUserTyping = useCallback((data) => {
    const { chatId, userId, userName } = data;
    if (selectedChat && selectedChat._id === chatId && userId !== currentUserId) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  }, [selectedChat, currentUserId, setTypingUsers]);

  const handleUserStoppedTyping = useCallback((data) => {
    const { chatId, userId } = data;
    if (selectedChat && selectedChat._id === chatId && userId !== currentUserId) {
      setTypingUsers(() => {
        // Remove the user who stopped typing (we need to find them by userId)
        // For now, we'll clear all typing indicators
        return new Set();
      });
    }
  }, [selectedChat, currentUserId, setTypingUsers]);

  const handleMessagesRead = useCallback((data) => {
    const { chatId, messageIds, readBy } = data;
    if (selectedChat && selectedChat._id === chatId && readBy !== currentUserId) {
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg._id) ? { ...msg, read: true } : msg
        )
      );
    }
  }, [selectedChat, currentUserId, setMessages]);



  // Initialize Socket.IO connection on component mount
  useEffect(() => {
    if (token) {
      console.log('Initializing Socket.IO connection...');
      socketService.connect(token);
      
      // Set up Socket.IO event listeners after a short delay to ensure connection
      const setupListeners = () => {
        console.log('Setting up Socket.IO event listeners...');
        socketService.onNewMessage(handleNewMessage);
        socketService.onMessageSent(handleMessageSent);
        socketService.onUserTyping(handleUserTyping);
        socketService.onUserStoppedTyping(handleUserStoppedTyping);
        socketService.onMessagesRead(handleMessagesRead);
        
        // Add connection status debug
        setTimeout(() => {
          debugSocketConnection();
        }, 500);
      };

      // Try to set up listeners immediately and also with a delay
      setupListeners();
      const timeoutId = setTimeout(setupListeners, 2000);
      
      // Cleanup on unmount
      return () => {
        clearTimeout(timeoutId);
        socketService.removeAllListeners();
        if (selectedChat) {
          socketService.leaveChat(selectedChat._id);
        }
      };
    } else {
      console.error('No token found for Socket.IO connection');
    }
  }, [token, handleNewMessage, handleMessageSent, handleUserTyping, handleUserStoppedTyping, handleMessagesRead, selectedChat]);

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // When chats state changes, update localStorage (for cases like new chat added)
  useEffect(() => {
    try {
      if (!currentUserId) return;
      localStorage.setItem(`chatList_${currentUserId}`, JSON.stringify(chats));
    } catch {}
  }, [chats, currentUserId]);

  // When messages load or change, instantly scroll to the bottom.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);
  // Also scroll to bottom when a new chat is opened
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [selectedChat]);

  // Join chat room when selected chat changes
  useEffect(() => {
    if (!selectedChat) return;

    console.log('Joining chat room:', selectedChat._id);
    socketService.joinChat(selectedChat._id);

    return () => {
      console.log('Leaving chat room:', selectedChat._id);
      socketService.leaveChat(selectedChat._id);
    };
  }, [selectedChat]);



  // Handle typing input
  const handleTyping = (e) => {
    setDraft(e.target.value);
    
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

  // Send a message
  const send = async () => {
    if (!draft.trim() || !selectedChat) return;

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
      text: draft,
      createdAt: new Date(),
      pending: true,
      replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender } : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    const draftCopy = draft;
    setDraft('');
    setReplyTo(null);

    try {
      // Send the message to the server via HTTP (ignore replyTo for now)
      const res = await sendNewMessage(selectedChat._id, draftCopy);
      console.log('Message sent:', res.data);

      // Replace the temporary message with the real one, preserving replyTo if needed
      setMessages(prev =>
        prev.map(msg => {
          if (msg._id === tempId) {
            const realMsg = res.data.data;
            // If backend does not return replyTo, preserve it from optimistic message
            if (!realMsg.replyTo && msg.replyTo) {
              return { ...realMsg, replyTo: msg.replyTo };
            }
            return realMsg;
          }
          return msg;
        })
      );

      // Refresh chats to update last message list
      fetchChats();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark message as failed
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, failed: true, pending: false }
            : msg
        )
      );
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
    }
    
    setSelectedChat(chat);
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
    if (typeof sender === 'object') return sender._id === currentUserId;
    return false;
  };

  // Get sender name from message
  const getSenderName = (sender) => {
    if (!sender) return 'Unknown User';
    if (typeof sender === 'string') return 'Unknown User';
    return sender.name || 'Unknown User';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 animate-fade-in">
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

      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-white dark:bg-gray-800 md:border-r dark:border-gray-700 md:fixed md:top-16 md:left-64 md:h-[calc(100vh-4rem)] z-30">
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
          <div className="p-4 overflow-y-auto h-[calc(100vh-10rem)]">
            {activeTab === 'chats' ? (
              <div className="space-y-1">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                  Recent Chats
                </h2>
                
                {loading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4 animate-pulse">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bracu-blue mx-auto mb-2"></div>
                    <p>Loading...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4 animate-fade-in">
                    <p>No chats yet</p>
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="mt-2 px-4 py-2 bg-bracu-blue text-white rounded hover:bg-blue-700 inline-flex items-center transition-all duration-200 transform hover:-translate-y-0.5 shadow hover:shadow-md"
                    >
                      <PlusIcon size={16} className="mr-1" />
                      Start a new chat
                    </button>
                  </div>
                ) : (
                  chats.map((chat, index) => (
                    <div
                      key={chat._id}
                      onClick={() => setSelectedChat(chat)}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedChat && selectedChat._id === chat._id
                          ? 'bg-blue-50 dark:bg-blue-900 shadow-md'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium mr-3">
                        {getChatName(chat).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {getChatName(chat)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {chat.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>
                      {chat.unreadMessageCount > 0 && (
                        <div className="bg-bracu-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unreadMessageCount}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <FriendList onSelectChat={handleSelectNewChat} />
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 md:ml-80 h-full">
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center sticky top-0 z-10">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-1 mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeftIcon size={20} />
                </button>
                <div className="w-12 h-12 rounded-full bg-bracu-blue flex items-center justify-center text-white font-medium mr-4 shadow-md">
                  {getChatName(selectedChat).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-lg">
                    {getChatName(selectedChat)}
                  </p>
                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
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
                  messages.map((msg, index) => (
                    <div
                      key={msg._id}
                      className={`flex ${
                        isSenderCurrentUser(msg.sender) ? 'justify-end' : 'justify-start'
                      } mb-4`}
                    >
                      <div className="flex flex-col max-w-xs md:max-w-md lg:max-w-lg">
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
                          className={`px-4 py-3 rounded-lg shadow-sm ${
                            isSenderCurrentUser(msg.sender)
                              ? 'bg-bracu-blue text-white rounded-tr-none'
                              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                          } ${msg.pending ? 'opacity-70' : ''}`}
                        >
                          {msg.text}
                          <div className="text-xs mt-1 flex justify-between items-center">
                            <span>
                              {msg.pending ? (
                                <span className="opacity-70">Sending...</span>
                              ) : msg.failed ? (
                                <span className="text-red-300">Failed</span>
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
                            <button
                              className="ml-2 text-xs text-blue-500 hover:underline focus:outline-none"
                              onClick={() => setReplyTo(msg)}
                              title="Reply"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                        
                        {/* Show "You" label for your messages */}
                        {isSenderCurrentUser(msg.sender) && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-2 text-right">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area - make sticky at bottom */}
              <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 shadow-inner sticky bottom-0 z-20">
                {replyTo && (
                  <div className="mb-2 p-2 rounded bg-blue-100 dark:bg-blue-900 text-sm flex items-center justify-between">
                    <div className="truncate">
                      <span className="font-medium text-blue-700 dark:text-blue-200">Replying to {getSenderName(replyTo.sender)}:</span> {replyTo.text}
                    </div>
                    <button
                      className="ml-2 text-xs text-gray-500 hover:text-red-500 focus:outline-none"
                      onClick={() => setReplyTo(null)}
                      title="Cancel reply"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-end space-x-3">
                  <textarea
                    className="flex-1 min-h-10 max-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-bracu-blue transition-all duration-200"
                    placeholder="Type a message..."
                    value={draft}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim()}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      draft.trim()
                        ? 'bg-bracu-blue text-white hover:bg-blue-700 shadow hover:shadow-md transform hover:-translate-y-0.5'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    <SendIcon size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full">
                <MessageSquareIcon size={64} className="mx-auto mb-6 text-bracu-blue opacity-90" />
                <h2 className="text-2xl font-medium mb-3 text-gray-800 dark:text-gray-200">
                  Welcome to Chat
                </h2>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  Select an existing conversation or start a new one by clicking on "Find Friends"
                </p>
                <button
                  onClick={() => setActiveTab('friends')}
                  className="w-full py-3 bg-bracu-blue text-white rounded-lg hover:bg-blue-700 inline-flex items-center justify-center transition-all duration-200 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                >
                  <PlusIcon size={18} className="mr-2" />
                  Start a new chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
