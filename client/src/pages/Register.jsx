import { useState } from 'react';
import axios from 'axios';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', gender: '', location: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', form);
            alert("Registration successful");
        } catch (err) {
            alert("Error: " + err.response?.data?.error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Password" onChange={e => setForm({ ...form, password: e.target.value })} />
            <input placeholder="Gender" onChange={e => setForm({ ...form, gender: e.target.value })} />
            <input placeholder="Location" onChange={e => setForm({ ...form, location: e.target.value })} />
            <button type="submit">Register</button>
        </form>
    );
}