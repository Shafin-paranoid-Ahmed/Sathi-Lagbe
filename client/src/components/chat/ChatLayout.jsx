import React from 'react';

// Cache bust - v2.0
const ChatLayout = ({ children, error }) => {
  return (
    <div className="chat-page h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900 animate-fade-in">
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

      {/* 3-Column Grid Layout - Perfect Alignment */}
      <div className="grid h-[100dvh] grid-rows-[1fr]">
        {/* Content Row */}
        <div className="content grid-row-1 grid grid-cols-[240px_360px_1fr] gap-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
