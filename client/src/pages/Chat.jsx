// client/src/pages/Chat.jsx - Simplified version
import { useState, useEffect, useRef } from 'react';
import { 
  getAllChats,
  getChatMessages,
  sendNewMessage,
  clearUnreadMessages
} from '../api/chat';
import FriendList from '../components/FriendList';
import { MessageSquareIcon, SendIcon, ArrowLeftIcon, CheckIcon, PlusIcon } from 'lucide-react';

export default function Chat() {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'friends'
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [error, setError] = useState(''); // General component error
  const messagesEndRef = useRef(null);
  const currentUserId = sessionStorage.getItem('userId');

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch current user's chats
  const fetchChats = async () => {
    if (!currentUserId) {
      setError('Not logged in. Please log in to continue.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await getAllChats();
      console.log('Fetched chats:', res.data);
      setChats(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
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
      
  }, [selectedChat]);

  const loadChatMessages = async (chatId) => {
    setChatLoading(true);
    setChatError('');
    try {
      const res = await getChatMessages(chatId);
      console.log('Fetched messages:', res.data);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatError('Could not load messages. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  // Send a message
  const send = async () => {
    if (!draft.trim() || !selectedChat) return;
    
    // Add the message to the local state with optimistic UI update
    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      chatId: selectedChat._id,
      sender: currentUserId,
      text: draft,
      createdAt: new Date(),
      pending: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    const draftCopy = draft;
    setDraft('');
    
    try {
      // Send the message to the server via HTTP
      const res = await sendNewMessage(selectedChat._id, draftCopy);
      console.log('Message sent:', res.data);
      
      // Replace the temporary message with the real one
      setMessages(prev => 
        prev.map(msg => msg._id === tempId ? res.data.data : msg)
      );
      
      // Refresh chats to update last message list
      fetchChats();
      
      // Refresh messages to ensure we have the latest data
      loadChatMessages(selectedChat._id);
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
    console.log('Selected new chat:', chat);
    setSelectedChat(chat);
    fetchChats(); // Refresh the chat list to include the new chat
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

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-white dark:bg-gray-800 md:border-r dark:border-gray-700 animate-slide-in">
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
          <div className="p-4">
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
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 animate-fade-in ${
                        selectedChat && selectedChat._id === chat._id
                          ? 'bg-blue-50 dark:bg-blue-900 shadow-md'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow'
                      } delay-${index * 100 > 500 ? 500 : index * 100}`}
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
                        <div className="bg-bracu-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse-slow">
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
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 animate-slide-in">
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
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      } mb-4 animate-fade-in delay-${index * 50 > 500 ? 500 : index * 50}`}
                    >
                      <div className="flex flex-col max-w-xs md:max-w-md lg:max-w-lg">
                        {/* Show sender name if not current user */}
                        {!isSenderCurrentUser(msg.sender) && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                            {getSenderName(msg.sender)}
                          </span>
                        )}
                        
                        <div
                          className={`px-4 py-3 rounded-lg shadow-sm ${
                            isSenderCurrentUser(msg.sender)
                              ? 'bg-bracu-blue text-white rounded-tr-none'
                              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                          } ${msg.pending ? 'opacity-70' : ''}`}
                        >
                          {msg.text}
                          <div className="text-xs mt-1 flex justify-end">
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

              {/* Input area */}
              <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 shadow-inner">
                <div className="flex items-end space-x-3">
                  <textarea
                    className="flex-1 min-h-10 max-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-bracu-blue transition-all duration-200"
                    placeholder="Type a message..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
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