import { useState } from 'react';
import axios from 'axios';

export default function Login() {
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');

	const handleChange = (e) => {
		setForm({
			...form,
			[e.target.name]: e.target.value
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		try {
			const res = await axios.post('http://localhost:5000/api/auth/login', form);
			const { token, user } = res.data;

			// Store token and user info in localStorage
			localStorage.setItem('token', token);
			localStorage.setItem('user', JSON.stringify(user));

			alert("Login successful!");
			// You can redirect here later e.g. navigate("/dashboard")
		} catch (err) {
			setError(err.response?.data?.error || "Login failed");
		}
	};

	return (
		<div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
			<h2>Login</h2>
			<form onSubmit={handleSubmit}>
				<input
					type="email"
					name="email"
					placeholder="Email"
					value={form.email}
					onChange={handleChange}
					required
				/><br /><br />

				<input
					type="password"
					name="password"
					placeholder="Password"
					value={form.password}
					onChange={handleChange}
					required
				/><br /><br />

				<button type="submit">Login</button>

				{error && (
					<p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>
				)}
			</form>
		</div>
	);
}