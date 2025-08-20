// client/src/components/RideMatchResults.jsx

import { useState, useEffect } from 'react';
import { searchRides, getAiMatches, requestToJoinRide, getAllAvailableRides } from '../api/rides';


export default function RideMatchResults() {
  const [searchParams, setSearchParams] = useState({
    startLocation: '',
    endLocation: '',
    departureTime: ''
  });

  const [matches, setMatches] = useState([]);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [useAI, setUseAI] = useState(false);

  const [isSearching, setIsSearching] = useState(false);

  // Load all available rides on component mount
  useEffect(() => {
    loadAllRides();
  }, []);

  const loadAllRides = async () => {
    setLoading(true);
    setErrors(null);
    setSuccess('');
    setIsSearching(false);
    
    try {
      console.log('=== Frontend: Calling getAllAvailableRides ===');
      const res = await getAllAvailableRides();
      console.log('=== Frontend: API Response ===', res);
      console.log('=== Frontend: Response data ===', res.data);
      console.log('=== Frontend: Number of rides received ===', res.data?.length || 0);
      
      setMatches(res.data || []);
      if (res.data && res.data.length === 0) {
        setSuccess('No rides available at the moment.');
      }
    } catch (err) {
      console.error('=== Frontend: Error fetching rides ===', err);
      setErrors(err.response?.data?.error || 'Error fetching rides');
    } finally {
      setLoading(false);
    }
  };


  const handleSearch = async (e) => {
    e.preventDefault();
    setErrors(null);
    setSuccess('');
    setMatches([]);
    setLoading(true);
    setIsSearching(true);
    
    try {
      let res;
      
      if (useAI) {
        res = await getAiMatches(searchParams);
      } else {
        res = await searchRides(searchParams);
      }
      
      setMatches(res.data);
      if (res.data.length === 0) {
        setSuccess('No rides found matching your criteria.');
      }
    } catch (err) {
      setErrors(err.response?.data?.error || 'Error fetching rides');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (rideId) => {
    try {
      const seatCount = seatCounts[rideId] || 1;
      await requestToJoinRide(rideId, seatCount);
      setSuccess('Request sent successfully!');
      
      // Update the UI to show the request was sent
      setMatches(prev => 
        prev.map(ride => 
          ride._id === rideId 
            ? { ...ride, requested: true } 
            : ride
        )
      );
    } catch (err) {
      setErrors(err.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Find a Ride</h2>
      
      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Location
            </label>
            <input
              type="text"
              placeholder="e.g., North Campus"
              value={searchParams.startLocation}
              onChange={e => setSearchParams({ ...searchParams, startLocation: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Location (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., South Campus"
              value={searchParams.endLocation}
              onChange={e => setSearchParams({ ...searchParams, endLocation: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Departure Time (optional)
          </label>
          <input
            type="datetime-local"
            value={searchParams.departureTime}
            onChange={e => setSearchParams({ ...searchParams, departureTime: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={useAI}
              onChange={() => setUseAI(!useAI)}
              className="rounded"
            />
            <span>Use AI matching (finds better matches)</span>
          </label>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Rides'}
          </button>
          <button
            type="button"
            onClick={loadAllRides}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Show All Rides
          </button>
        </div>
      </form>

      {errors && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {errors}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          {success}
        </div>
      )}

      <div className="space-y-4 mt-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {isSearching 
            ? (matches.length > 0 ? 'Search Results' : 'No rides found matching your criteria.')
            : (matches.length > 0 
                ? 'Available Rides' 
                : loading 
                  ? 'Loading rides...' 
                  : 'No rides available at the moment.')}
        </h3>
        
        {matches.map(ride => (
          <div 
            key={ride._id} 
            className="border dark:border-gray-700 p-4 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700"
          >
            {useAI && isSearching && (
              <div className="mb-2">
                <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-sm">
                  Match Score: {ride.matchScore}%
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">From:</strong> {ride.startLocation}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">To:</strong> {ride.endLocation}
                </p>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">Departure:</strong>{' '}
                  {new Date(ride.departureTime).toLocaleString()}
                </p>
                {ride.recurring && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">Recurring:</strong>{' '}
                    {ride.recurring.days ? ride.recurring.days.join(', ') : 'Yes'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="number"
                min="1"
                value={seatCounts[ride._id] || 1}
                onChange={e => setSeatCounts({ ...seatCounts, [ride._id]: Number(e.target.value) })}
                className="w-20 p-2 border rounded bg-white dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => handleRequestToJoin(ride._id)}
                disabled={ride.requested}
                className="px-4 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {ride.requested ? 'Request Sent' : 'Request to Join'}
              </button>
              <button
                onClick={() => setVisibleMap(visibleMap === ride._id ? null : ride._id)}
                className="px-4 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                {visibleMap === ride._id ? 'Hide Route' : 'Show Route'}
              </button>
            </div>
            {visibleMap === ride._id && (
              <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <MapView startLocation={ride.startLocation} endLocation={ride.endLocation} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}