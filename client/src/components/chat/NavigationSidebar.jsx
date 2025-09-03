import React from 'react';

const NavigationSidebar = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="nav hidden lg:flex flex-col min-h-0 bg-white dark:bg-gray-800">
      {/* Navigation Content */}
      <div className="recentList flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={`w-full py-2 px-3 text-left font-medium transition-all duration-200 rounded-lg ${
              activeTab === 'chats'
                ? 'bg-bracu-blue text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`w-full py-2 px-3 text-left font-medium transition-all duration-200 rounded-lg ${
              activeTab === 'friends'
                ? 'bg-bracu-blue text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Find Friends
          </button>
        </div>
      </div>
    </aside>
  );
};

export default NavigationSidebar;
