import React from 'react';
import { SendIcon } from 'lucide-react';

const MessageComposer = ({ 
  getCurrentDraft, 
  handleTyping, 
  handleKeyDown, 
  send, 
  loading, 
  replyTo, 
  setReplyTo, 
  getSenderName, 
  showWhereAreYouButton, 
  handleQuickReply 
}) => {
  return (
    <div className="composer shrink-0 border-t h-[72px] flex items-center gap-2 px-6 bg-white dark:bg-gray-800 [height:calc(72px+env(safe-area-inset-bottom,0px))] [padding-bottom:env(safe-area-inset-bottom,0px)]">
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
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative">
          <label htmlFor="message-input" className="sr-only">
            Type a message
          </label>
          <textarea
            id="message-input"
            className="w-full min-w-0 min-h-10 max-h-20 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-bracu-blue focus:border-transparent transition-all duration-200"
            placeholder="Type a message..."
            value={getCurrentDraft()}
            aria-label="Type a message"
            aria-describedby="message-input-help"
            onChange={(e) => {
              handleTyping(e);
              // Auto-resize textarea with smooth transition
              const textarea = e.target;
              textarea.style.height = 'auto';
              const newHeight = Math.min(textarea.scrollHeight, 80);
              textarea.style.height = newHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={1000}
            disabled={loading}
          />
          {getCurrentDraft().length > 0 && (
            <div id="message-input-help" className="absolute bottom-1 right-1 text-xs text-gray-400">
              {getCurrentDraft().length}/1000
            </div>
          )}
        </div>
        <button
          onClick={send}
          disabled={!getCurrentDraft().trim() || loading}
          className={`p-2 rounded-lg transition-all duration-200 min-w-10 min-h-10 ${
            getCurrentDraft().trim() && !loading
              ? 'bg-bracu-blue text-white hover:bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          title={loading ? 'Sending...' : 'Send message'}
          aria-label={loading ? 'Sending message...' : 'Send message'}
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;
