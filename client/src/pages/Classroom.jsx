import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Classroom() {
  const [rooms, setRooms] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('http://localhost:5000/api/classrooms', {
      headers: { Authorization: token }
    }).then(res => setRooms(res.data));
  }, []);

  return (
    <div>
      <h2>Available Classrooms</h2>
      <ul>
        {rooms.map(r => (
          <li key={r._id}>
            {r.building} {r.roomNumber} — {r.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
