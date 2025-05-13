// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // assume you have this schema

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Step 1: Basic validation
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  // Step 2: Check user exists (for demo, assume simple match — you’ll replace with proper hashing)
  const user = await User.findOne({ email });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Step 3: Create token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ token });
};
