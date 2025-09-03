import React from 'react';
import { CheckIcon } from 'lucide-react';

const MessageBubble = ({ 
  message, 
  isSenderCurrentUser, 
  getSenderName, 
  renderAvatar, 
  currentUserId, 
  retryMessage, 
  setReplyTo 
}) => {
  return (
    <div
      className={`flex ${
        isSenderCurrentUser(message.sender) ? 'justify-end' : 'justify-start'
      } mb-4`}
      role="article"
      aria-label={`Message from ${isSenderCurrentUser(message.sender) ? 'you' : getSenderName(message.sender)}`}
    >
      <div className={`flex ${isSenderCurrentUser(message.sender) ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs md:max-w-md lg:max-w-lg`}>
        {/* Avatar for other users' messages (left side) */}
        {!isSenderCurrentUser(message.sender) && (
          <div className="flex-shrink-0 mr-2">
            {renderAvatar(
              (message.sender && typeof message.sender === 'object') ? message.sender._id : message.sender,
              getSenderName(message.sender),
              'w-8 h-8',
              typeof message.sender === 'object' ? message.sender : null
            )}
          </div>
        )}
        
        {/* Message content */}
        <div className="flex flex-col">
          {/* Show sender name if not current user */}
          {!isSenderCurrentUser(message.sender) && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
              {getSenderName(message.sender)}
            </span>
          )}
          {/* Reply preview in bubble */}
          {message.replyTo && (
            <div className="mb-1 p-2 rounded bg-blue-100 dark:bg-blue-900 text-xs text-blue-700 dark:text-blue-200">
              Replying to {getSenderName(message.replyTo.sender)}: {message.replyTo.text}
            </div>
          )}
          <div
            className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
              isSenderCurrentUser(message.sender)
                ? 'bg-gradient-to-r from-bracu-blue to-blue-600 text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-200 dark:border-gray-600'
            } ${message.pending ? 'opacity-70 animate-pulse' : ''} ${message.failed ? 'border-red-300 dark:border-red-600' : ''}`}
          >
            {message.text}
            <div className="text-xs mt-1 flex justify-between items-center">
              <span>
                {message.pending ? (
                  <span className="opacity-70">Sending...</span>
                ) : message.failed ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500 dark:text-red-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Failed
                    </span>
                    <button
                      onClick={() => retryMessage(message._id)}
                      className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      title="Retry sending message"
                      aria-label="Retry sending message"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <span className="opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {message.read && (
                      <CheckIcon size={12} className="inline ml-1" />
                    )}
                  </span>
                )}
              </span>
              {!message.failed && (
                <button
                  className="ml-2 text-xs text-blue-500 hover:underline focus:outline-none"
                  onClick={() => setReplyTo(message)}
                  title="Reply"
                  aria-label="Reply to this message"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
          
          {/* Show "You" label for your messages */}
          {isSenderCurrentUser(message.sender) && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-2 text-right">
              You
            </span>
          )}
        </div>
        
        {/* Avatar for current user's messages (right side) */}
        {isSenderCurrentUser(message.sender) && (
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
  );
};

export default MessageBubble;
