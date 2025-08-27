// client/src/pages/Classroom.jsx - Professional Classroom Dashboard
import React, { useState } from 'react';
import ClassroomAvailability from '../components/ClassroomAvailability';

export default function Classroom() {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // If advanced search is enabled, show the ClassroomAvailability component
  if (showAdvancedSearch) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowAdvancedSearch(false)}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            <span>← Back to Dashboard</span>
          </button>
        </div>
        <ClassroomAvailability />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          🏫 Classroom Dashboard
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Welcome to the Classroom System!
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Manage and search for available classrooms across campus with our advanced scheduling system.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200">Available</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">5</p>
            </div>
            
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Occupied</h3>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">3</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAdvancedSearch(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            🚀 Launch Advanced Search
          </button>
        </div>
      </div>
    </div>
  );
}
