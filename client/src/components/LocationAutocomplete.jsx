import React, { useState, useEffect, useRef, useCallback } from 'react';

// Custom debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const LocationAutocomplete = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "",
  disabled = false 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const inputRef = useRef(null);

  // Initialize Google Places services
  useEffect(() => {
    const checkAndInitializeAPI = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          placesService.current = new window.google.maps.places.PlacesService(
            document.createElement('div')
          );
          setApiAvailable(true);
        } catch (err) {
          setApiAvailable(false);
        }
      } else {
        // Retry after a short delay if API is not yet loaded
        setTimeout(checkAndInitializeAPI, 1000);
      }
    };

    checkAndInitializeAPI();
  }, []);

  // Debounced function to fetch suggestions
  const debouncedFetchSuggestions = useCallback(
    debounce(async (inputValue) => {
      if (!inputValue || inputValue.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!apiAvailable || !autocompleteService.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const request = {
          input: inputValue,
          componentRestrictions: { country: 'bd' }, // Restrict to Bangladesh
          types: ['geocode', 'establishment'], // Include both addresses and places
        };

        autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
          setLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            setShowSuggestions(false);
          } else {
            setError('Unable to fetch location suggestions');
            setSuggestions([]);
            setShowSuggestions(false);
          }
        });
      } catch (err) {
        setLoading(false);
        setError('Error fetching suggestions');
      }
    }, 300),
    [apiAvailable]
  );

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedFetchSuggestions(newValue);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow clicking suggestions)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${className}`}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* API not available warning */}
      {!apiAvailable && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-700 z-10">
          Location suggestions loading... Please wait a moment.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded border border-red-200 dark:border-red-700 z-10">
          {error}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none transition-colors"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !loading && value.length >= 2 && apiAvailable && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg text-sm text-gray-500 dark:text-gray-400 z-20">
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
