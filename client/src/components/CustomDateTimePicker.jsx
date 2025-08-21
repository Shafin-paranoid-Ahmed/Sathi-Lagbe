import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

const CustomDateTimePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select date and time",
  disabled = false,
  className = "",
  onClose 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState({ hours: 12, minutes: 0, period: 'AM' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  
  const containerRef = useRef(null);

  // Initialize with current value
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setSelectedTime({
        hours: date.getHours() % 12 || 12,
        minutes: date.getMinutes(),
        period: date.getHours() >= 12 ? 'PM' : 'AM'
      });
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowTimeSelection(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = (date) => {
    const days = [];
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month - only show from today onwards
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
      const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      // Only show days from today onwards
      const isSelectable = currentDateOnly >= todayOnly;
      
      if (isSelectable) {
        days.push({
          day,
          date: currentDate,
          isSelected: selectedDate && 
            selectedDate.getDate() === day && 
            selectedDate.getMonth() === date.getMonth() && 
            selectedDate.getFullYear() === date.getFullYear()
        });
      } else {
        // Add placeholder to maintain grid structure
        days.push(null);
      }
    }
    
    // Ensure we always have 6 rows (42 cells) for consistent popup size
    while (days.length < 42) {
      days.push(null);
    }
    
    return days;
  };

  const handleDateSelect = (day) => {
    if (day && day.isSelectable !== false) {
      setSelectedDate(day.date);
      setShowTimeSelection(true);
      
      // Set default time to current time + 5 minutes
      const now = new Date();
      const futureTime = new Date(now.getTime() + 5 * 60 * 1000);
      const hours = futureTime.getHours();
      const minutes = futureTime.getMinutes();
      
      setSelectedTime({
        hours: hours % 12 || 12,
        minutes: minutes,
        period: hours >= 12 ? 'PM' : 'AM'
      });
    }
  };

  const handleTimeInputChange = (field, value) => {
    setSelectedTime(prev => {
      const newTime = { ...prev };
      
      if (field === 'hours') {
        newTime.hours = Math.max(1, Math.min(12, parseInt(value) || 1));
      } else if (field === 'minutes') {
        newTime.minutes = Math.max(0, Math.min(59, parseInt(value) || 0));
      } else if (field === 'period') {
        newTime.period = value;
      }
      
      return newTime;
    });
  };

  // Check if selected time is valid (not before current time for today)
  const isTimeValid = () => {
    if (!selectedDate) return false;
    
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If not today, any time is valid
    if (selectedDateOnly.getTime() !== todayOnly.getTime()) return true;
    
    // If today, check if time is at least 5 minutes in the future
    const selectedTimeInMinutes = (selectedTime.period === 'PM' && selectedTime.hours !== 12 
      ? selectedTime.hours + 12 
      : selectedTime.period === 'AM' && selectedTime.hours === 12 
        ? 0 
        : selectedTime.hours) * 60 + selectedTime.minutes;
    
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Require at least 5 minutes in the future (not allowing past times)
    return selectedTimeInMinutes >= (currentTimeInMinutes + 5);
  };

  // Get validation message for time
  const getTimeValidationMessage = () => {
    if (!selectedDate) return '';
    
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If not today, no validation message needed
    if (selectedDateOnly.getTime() !== todayOnly.getTime()) return '';
    
    // If today, check if time is valid
    if (!isTimeValid()) {
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `⚠️ Time must be at least 5 minutes in the future from ${currentTime}. Please select a later time.`;
    }
    
    return '';
  };

  // Suggest a better time when invalid time is selected
  const suggestBetterTime = () => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const hours = futureTime.getHours();
    const minutes = futureTime.getMinutes();
    
    setSelectedTime({
      hours: hours % 12 || 12,
      minutes: minutes,
      period: hours >= 12 ? 'PM' : 'AM'
    });
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime && isTimeValid()) {
      const finalDate = new Date(selectedDate);
      const hours = selectedTime.period === 'PM' && selectedTime.hours !== 12 
        ? selectedTime.hours + 12 
        : selectedTime.period === 'AM' && selectedTime.hours === 12 
          ? 0 
          : selectedTime.hours;
      
      finalDate.setHours(hours, selectedTime.minutes, 0, 0);
      onChange(finalDate.toISOString());
      setIsOpen(false);
      setShowTimeSelection(false);
    }
  };

  const formatDisplayValue = () => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calendarDays = generateCalendarDays(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  // Navigation logic - only allow going forward from current month
  const canGoToPreviousMonth = () => {
    const now = new Date();
    return currentMonth.getMonth() > now.getMonth() || currentMonth.getFullYear() > now.getFullYear();
  };

  const canGoToNextMonth = () => {
    const now = new Date();
    const fourMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 4, 0);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    return nextMonth <= fourMonthsFromNow;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Field */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full p-3 border rounded-lg cursor-pointer transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-primary-500 dark:hover:border-primary-400'
          }
          ${isOpen ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20' : 'border-gray-300 dark:border-gray-600'}
          focus:outline-none focus:ring-2 focus:ring-primary-500/20
        `}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
            {value ? formatDisplayValue() : placeholder}
          </span>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Picker Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 min-w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {showTimeSelection ? 'Select Time' : 'Select Date'}
            </h3>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowTimeSelection(false);
              }}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {!showTimeSelection ? (
            /* Calendar Section */
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (canGoToPreviousMonth()) {
                      const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
                      setCurrentMonth(prevMonth);
                    }
                  }}
                  disabled={!canGoToPreviousMonth()}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={() => {
                    if (canGoToNextMonth()) {
                      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
                      setCurrentMonth(nextMonth);
                    }
                  }}
                  disabled={!canGoToNextMonth()}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div key={index} className="p-1">
                    {day ? (
                      <button
                        onClick={() => handleDateSelect(day)}
                        className={`
                          w-full h-8 rounded-full text-sm font-medium transition-colors
                          ${day.isSelected 
                            ? 'bg-primary-500 text-white' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        {day.day}
                      </button>
                    ) : (
                      <div className="w-full h-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Time Selection Section */
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selected: {selectedDate?.toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center justify-center space-x-2 mb-4">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={selectedTime.hours}
                  onChange={(e) => handleTimeInputChange('hours', e.target.value)}
                  className="w-16 p-2 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={selectedTime.minutes.toString().padStart(2, '0')}
                  onChange={(e) => handleTimeInputChange('minutes', e.target.value)}
                  className="w-16 p-2 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <select
                  value={selectedTime.period}
                  onChange={(e) => handleTimeInputChange('period', e.target.value)}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              
              {/* Time validation message */}
              {selectedDate && getTimeValidationMessage() && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
                  <div className="mb-2">{getTimeValidationMessage()}</div>
                  <button
                    type="button"
                    onClick={suggestBetterTime}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    🕐 Suggest Better Time (5 min from now)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                if (showTimeSelection) {
                  setShowTimeSelection(false);
                } else {
                  setIsOpen(false);
                  setShowTimeSelection(false);
                }
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {showTimeSelection ? 'Back' : 'Cancel'}
            </button>
            {showTimeSelection && (
              <button
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedTime || !isTimeValid()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateTimePicker;
