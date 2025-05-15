import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const token = localStorage.getItem('token');
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (mine !== null) {
      axios.put('http://localhost:5000/api/friends/status',
        { isFree: mine },
        { headers: { "Authorization": token } });
    }
    axios.get('http://localhost:5000/api/friends/free',
      { headers: { "Authorization": token } })
      .then(res => setFriends(res.data));
  }, [mine]);

  return (
    <div>
      <h2>Friends Availability</h2>
      <label>
        <input
          type="checkbox"
          checked={mine}
          onChange={e => setMine(e.target.checked)}
        />
        I am free
      </label>
      <ul>
        {friends.map(f => (
          <li key={f._id}>{f.userId.name} — {f.userId.location}</li>
        ))}
      </ul>
    </div>
  );
}
