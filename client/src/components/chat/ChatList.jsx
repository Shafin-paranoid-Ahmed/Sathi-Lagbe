import React from 'react';
import { MessageSquareIcon, PlusIcon } from 'lucide-react';
import FriendList from '../FriendList';

const ChatList = ({ 
  activeTab, 
  chats, 
  loading, 
  searchQuery, 
  setSearchQuery, 
  selectedChat, 
  setSelectedChat, 
  setShowMobileChat, 
  setActiveTab,
  getChatName,
  renderAvatar,
  currentUserId,
  onSelectNewChat
}) => {
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const chatName = getChatName(chat).toLowerCase();
    const lastMessage = chat.lastMessage?.text?.toLowerCase() || '';
    return chatName.includes(searchQuery.toLowerCase()) || 
           lastMessage.includes(searchQuery.toLowerCase());
  });

  return (
    <section className="list hidden lg:flex flex-col min-h-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">

      
      {/* Chat List Content */}
      <div className="recentList flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        {activeTab === 'chats' ? (
          <div className="space-y-2" role="tabpanel" id="chats-panel" aria-labelledby="chats-tab">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Recent Chats
              </h2>
              {chats.length > 0 && (
                <div className="relative">
                  <label htmlFor="chat-search-desktop" className="sr-only">
                    Search chats
                  </label>
                  <input
                    id="chat-search-desktop"
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-bracu-blue transition-all duration-200"
                    aria-label="Search chats by name or message content"
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
            ) : searchQuery && filteredChats.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquareIcon size={32} className="text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">No chats found</p>
                <p className="text-sm">Try searching with a different term</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => {
                    setSelectedChat(chat);
                    setShowMobileChat(true);
                  }}
                  className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 w-full text-left ${
                    selectedChat && selectedChat._id === chat._id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-lg border border-blue-200 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-700'
                      : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:shadow-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                  aria-label={`Open chat with ${getChatName(chat)}`}
                  aria-describedby={`chat-${chat._id}-preview`}
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
                    <p id={`chat-${chat._id}-preview`} className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {chat.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                  {chat.unreadMessageCount > 0 && (
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                      {chat.unreadMessageCount > 99 ? '99+' : chat.unreadMessageCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          <div role="tabpanel" id="friends-panel" aria-labelledby="friends-tab" className="w-full self-stretch min-w-0">
            <FriendList onSelectChat={onSelectNewChat} />
          </div>
        )}
      </div>
    </section>
  );
};

export default ChatList;
