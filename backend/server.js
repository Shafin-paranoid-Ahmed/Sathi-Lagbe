// server.js
require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const morgan     = require('morgan');
const http       = require('http');
const { Server } = require('socket.io');

// Route-wrappers for function-based controllers
const authRoutes     = require('./routes/authRoutes');
const rideRoutes     = require('./routes/rideRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const freeRoutes     = require('./routes/freeRoutes');

// Routers exported by your router-style controllers
const chatRouter     = require('./controllers/chatController');
const messageRouter  = require('./controllers/messageController');
const sosRouter      = require('./controllers/sosController');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// — Global middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// — Mount all endpoints on this single app instance
app.use('/api/auth',     authRoutes);
app.use('/api/rides',    rideRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/free',     freeRoutes);
app.use('/api/chat',     chatRouter);
app.use('/api/message',  messageRouter);
app.use('/api/sos',      sosRouter);

// — Health check
app.get('/', (req, res) => res.send('Welcome to the Ride Matching API!'));

// — (Optional) real-time socket handlers
io.on('connection', socket => {
  console.log('🟢 Socket connected:', socket.id);
  // … your real-time logic here …
});

// — Connect to MongoDB & start listening
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`✅ MongoDB connected to: ${mongoose.connection.db.databaseName}`);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });