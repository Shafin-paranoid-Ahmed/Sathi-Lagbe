import React from 'react';
import { ArrowLeftIcon, MessageSquareIcon, PlusIcon } from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const ChatThread = ({ 
  selectedChat, 
  setSelectedChat, 
  setShowMobileChat, 
  showMobileChat, 
  getChatName, 
  renderAvatar, 
  currentUserId, 
  typingUsers, 
  messagesContainerRef, 
  handleScroll, 
  chatLoading, 
  chatError, 
  loadChatMessages, 
  messages, 
  isSenderCurrentUser, 
  getSenderName, 
  renderAvatar: renderAvatarProp, 
  retryMessage, 
  setReplyTo, 
  messagesEndRef, 
  userHasScrolledUp, 
  newMessagesCount, 
  setUserHasScrolledUp, 
  setNewMessagesCount, 
  getCurrentDraft, 
  handleTyping, 
  handleKeyDown, 
  send, 
  loading, 
  replyTo, 
  showWhereAreYouButton, 
  handleQuickReply, 
  setActiveTab 
}) => {
  return (
    <main className={`thread flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 ${
      showMobileChat ? 'block lg:flex' : 'hidden lg:flex'
    }`}>
      {selectedChat ? (
        <>
          {/* Thread Bar */}
          <div className="bar h-14 px-6 flex items-center gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Desktop hint - subtle indicator that chat list is available */}
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
          <div id="messages-description" className="sr-only">
            Chat messages with {getChatName(selectedChat)}. New messages will be announced automatically.
          </div>
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="messages flex-1 min-h-0 max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-4 space-y-4 bg-gray-50 dark:bg-gray-900 relative"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            aria-describedby="messages-description"
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
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  isSenderCurrentUser={isSenderCurrentUser}
                  getSenderName={getSenderName}
                  renderAvatar={renderAvatarProp}
                  currentUserId={currentUserId}
                  retryMessage={retryMessage}
                  setReplyTo={setReplyTo}
                />
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

          {/* Composer */}
          <MessageComposer
            getCurrentDraft={getCurrentDraft}
            handleTyping={handleTyping}
            handleKeyDown={handleKeyDown}
            send={send}
            loading={loading}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            getSenderName={getSenderName}
            showWhereAreYouButton={showWhereAreYouButton}
            handleQuickReply={handleQuickReply}
          />
        </>
      ) : (
        <div className="threadEmpty flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
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
    </main>
  );
};

export default ChatThread;
