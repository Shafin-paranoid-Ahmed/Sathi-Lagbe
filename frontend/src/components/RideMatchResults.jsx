import React, { useState } from 'react';
import axios from 'axios';

const RideMatchResults = () => {
  const [searchParams, setSearchParams] = useState({
    startLocation: '',
    departureTime: ''
  });

  const [matches, setMatches] = useState([]);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [useAI, setUseAI] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setErrors(null);
    setSuccess('');
    setMatches([]);
    setLoading(true);
    const endpoint = useAI ? '/rides/ai-match' : '/rides/search';
    const method   = useAI ? 'post' : 'get';

    try {
      // const res = await axios.get(`${import.meta.env.VITE_API_URL}/rides/search`, {
      //   params: searchParams
      // });
      const res = await axios[method](
       `${API}${endpoint}`,
       useAI ? searchParams : { params: searchParams }
         );
      setMatches(res.data);
      if (res.data.length === 0) setSuccess('No rides found.');
    } catch {
      setErrors('Error fetching rides');
    } finally {
      setLoading(false);
    }
  };

  const requestToJoin = async (rideId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/rides/request`, {
        rideId,
        userId: 'REPLACE_WITH_LOGGED_IN_USER_ID'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess('Request sent successfully!');
    } catch (err) {
      setErrors(err.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Find a Ride</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Start Location"
          value={searchParams.startLocation}
          onChange={e => setSearchParams({ ...searchParams, startLocation: e.target.value })}
        />
        <input
          type="datetime-local"
          value={searchParams.departureTime}
          onChange={e => setSearchParams({ ...searchParams, departureTime: e.target.value })}
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p>Searching...</p>}
      {errors && <p style={{ color: 'red' }}>{errors}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div style={{ marginTop: '2rem' }}>
        {matches.map(ride => (
          <div key={ride._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            {useAI && (
                 <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-sm">
                 Match: {ride.matchScore}%
                  </span>)}
            <p><strong>From:</strong> {ride.startLocation}</p>
            <p><strong>To:</strong> {ride.endLocation}</p>
            <p><strong>Departure:</strong> {new Date(ride.departureTime).toLocaleString()}</p>
            <button onClick={() => requestToJoin(ride._id)}>Request to Join</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RideMatchResults;
