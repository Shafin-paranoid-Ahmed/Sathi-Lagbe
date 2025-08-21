// server/controllers/rideController.js - Merged implementation
const RideMatch = require('../models/RideMatch');
const { aiMatch } = require('../services/aiMatcher');
const { validateRideOffer, validateRecurringRide } = require('../utils/validate');
const User = require('../models/User'); // Add this import

/**
 * Migration function to update existing rides with user gender information
 */
const migrateRidesWithUserData = async () => {
  try {
    console.log('=== Starting ride migration ===');
    
    // Find all rides that don't have riderName or riderGender populated
    const ridesToUpdate = await RideMatch.find({
      $or: [
        { riderName: { $exists: false } },
        { riderName: 'Anonymous User' },
        { riderGender: { $exists: false } },
        { riderGender: '' }
      ]
    });
    
    console.log(`Found ${ridesToUpdate.length} rides to update`);
    
    for (const ride of ridesToUpdate) {
      try {
        // Fetch user data
        const user = await User.findById(ride.riderId).select('name email gender');
        
        if (user) {
          // Update the ride with user data
          await RideMatch.findByIdAndUpdate(ride._id, {
            riderName: user.name || 'Anonymous User',
            riderGender: user.gender || ''
          });
          
          console.log(`Updated ride ${ride._id} with user data:`, {
            name: user.name,
            gender: user.gender
          });
        } else {
          console.log(`User not found for ride ${ride._id}, riderId: ${ride.riderId}`);
        }
      } catch (err) {
        console.error(`Error updating ride ${ride._id}:`, err);
      }
    }
    
    console.log('=== Ride migration completed ===');
  } catch (err) {
    console.error('Error in ride migration:', err);
  }
};

/**
 * Test endpoint to check user gender and ride data
 */
exports.testGenderData = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('=== Testing Gender Data ===');
    console.log('User ID:', userId);
    
    // Check user data
    const user = await User.findById(userId).select('name email gender');
    console.log('User data:', user);
    
    // Check recent rides by this user
    const userRides = await RideMatch.find({ riderId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('riderName riderGender createdAt');
    
    console.log('User rides:', userRides);
    
    // Check all recent rides
    const allRides = await RideMatch.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('riderName riderGender riderId createdAt');
    
    console.log('All recent rides:', allRides);
    
    res.json({
      userId,
      userData: user,
      userRides,
      allRides,
      message: 'Check server console for detailed logs'
    });
  } catch (err) {
    console.error('Error in test endpoint:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Debug endpoint to check user data
 */
exports.debugUserData = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('=== Debug User Data ===');
    console.log('Requested user ID:', userId);
    
    const user = await User.findById(userId).select('name email gender');
    console.log('User data from database:', user);
    
    res.json({
      userId,
      userData: user,
      message: 'Check server console for detailed logs'
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all available rides (no search parameters required)
 */
exports.getAllAvailableRides = async (req, res) => {
  try {
    console.log('=== getAllAvailableRides called ===');
    
    // Run migration to ensure all rides have user data
    await migrateRidesWithUserData();
    
    // First, let's see how many total rides exist
    const totalRides = await RideMatch.countDocuments();
    console.log('Total rides in database:', totalRides);
    
    // Debug: Check what users exist and their gender values
    const users = await User.find({}, 'name email gender');
    console.log('All users in database:', users.map(u => ({
      name: u.name,
      email: u.email,
      gender: u.gender,
      genderType: typeof u.gender
    })));
    
    // Get all rides that are not completed (remove departureTime filter temporarily)
    const currentTime = new Date();
    console.log('Current time:', currentTime);
    
    const rides = await RideMatch.find({
      status: { $ne: 'completed' }
      // Temporarily removed: departureTime: { $gte: currentTime }
    })
    .sort({ createdAt: -1 }) // Sort by most recent first (newest to oldest)
    .lean();
    
    console.log('Found rides:', rides.length);
    console.log('Ride details:', rides.map(r => ({
      id: r._id,
      startLocation: r.startLocation,
      endLocation: r.endLocation,
      departureTime: r.departureTime,
      status: r.status,
      createdAt: r.createdAt,
      riderName: r.riderName,
      riderGender: r.riderGender
    })));
    
    // Add detailed logging for rider data
    rides.forEach((ride, index) => {
      console.log(`Ride ${index + 1} - Rider data:`, {
        riderId: ride.riderId,
        riderName: ride.riderName,
        riderGender: ride.riderGender,
        riderGenderType: typeof ride.riderGender
      });
    });
    
    // Send the results
    res.json(rides);
  } catch (err) {
    console.error('Error getting all available rides:', err);
    res.status(500).json({ error: err.message || 'Failed to get available rides' });
  }
};

/**
 * Search for ride matches
 */
exports.findRideMatches = async (req, res) => {
  try {
    // Get query parameters
    const { departureTime, startLocation, endLocation } = req.query;
    
    // Check required fields
    if (!departureTime || !startLocation) {
      return res.status(400).json({ error: 'Missing departureTime or startLocation' });
    }
    
    // Convert departureTime string to a Date object
    const targetTime = new Date(departureTime);
    
    // Define a time window (±30 minutes)
    const startTime = new Date(targetTime.getTime() - 30 * 60000); // 30 mins before
    const endTime = new Date(targetTime.getTime() + 30 * 60000); // 30 mins after
    
    // Build query
    const query = {
      departureTime: { $gte: startTime, $lte: endTime },
      startLocation: startLocation,
      status: { $ne: 'completed' } // Exclude completed rides
    };
    
    // Add endLocation if provided
    if (endLocation) {
      query.endLocation = endLocation;
    }
    
    // Query the database
    const rides = await RideMatch.find(query)
      // .populate('riderId', 'name email gender') // <-- REMOVED THIS LINE
      .sort({ departureTime: 1 }); // Sort by earliest departure
      
    // Send the results
    res.json(rides);
  } catch (err) {
    console.error('Error finding ride matches:', err);
    res.status(500).json({ error: err.message || 'Failed to find rides' });
  }
};

/**
 * Create a one-time ride offer
 */
exports.createRideOffer = async (req, res) => {
  try {
    const validationError = validateRideOffer(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    const { riderId, departureTime, startLocation, endLocation, recurring } = req.body;
    
    // Replace riderId with authenticated user if not provided
    const effectiveRiderId = riderId || req.user.id || req.user.userId;
    
    // Fetch user data to get gender
    const user = await User.findById(effectiveRiderId).select('name email gender');
    console.log('=== Creating ride for user ===');
    console.log('User ID:', effectiveRiderId);
    console.log('User data:', user);
    console.log('User name:', user?.name);
    console.log('User gender:', user?.gender);
    console.log('User gender type:', typeof user?.gender);
    
    // Create a new ride offer with user data embedded
    const newRide = new RideMatch({
      riderId: effectiveRiderId,
      riderName: user?.name || 'Anonymous User',
      riderGender: user?.gender || '',
      departureTime: new Date(departureTime),
      startLocation,
      endLocation,
      recurring: recurring || null,
      status: 'pending',
      requestedRiders: [],
      confirmedRiders: []
    });
    
    console.log('=== New ride object before save ===');
    console.log('riderName:', newRide.riderName);
    console.log('riderGender:', newRide.riderGender);
    console.log('riderGender type:', typeof newRide.riderGender);
    
    await newRide.save();
    
    console.log('=== Ride saved successfully ===');
    console.log('Saved ride riderName:', newRide.riderName);
    console.log('Saved ride riderGender:', newRide.riderGender);
    
    res.status(201).json(newRide);
  } catch (err) {
    console.error('Error creating ride offer:', err);
    res.status(500).json({ error: err.message || 'Failed to create ride offer' });
  }
};

/**
 * Create recurring rides
 */
exports.createRecurringRides = async (req, res) => {
  try {
    const { riderId, startLocation, endLocation, recurring } = req.body;
    
    const error = validateRecurringRide(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    
    // Replace riderId with authenticated user if not provided
    const effectiveRiderId = riderId || req.user.id || req.user.userId;
    
    // Fetch user data to get gender
    const user = await User.findById(effectiveRiderId).select('name email gender');
    console.log('Creating recurring rides for user:', {
      userId: effectiveRiderId,
      userName: user?.name,
      userGender: user?.gender
    });
    
    const today = new Date();
    const createdRides = [];
    
    // Map weekdays to index
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const next7Days = Array.from({ length: 14 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() + i);
      return date;
    });
    
    for (let date of next7Days) {
      const dayName = weekdays[date.getDay()];
      if (recurring.days.includes(dayName)) {
        const departureTime = new Date(date);
        departureTime.setHours(recurring.hour || 8); // default 8 AM
        departureTime.setMinutes(recurring.minute || 0);
        
        const ride = new RideMatch({
          riderId: effectiveRiderId,
          riderName: user?.name || 'Anonymous User',
          riderGender: user?.gender || '',
          startLocation,
          endLocation,
          departureTime,
          recurring,
          status: 'pending',
          requestedRiders: [],
          confirmedRiders: []
        });
        
        await ride.save();
        createdRides.push(ride);
      }
    }
    
    res.status(201).json({
      message: 'Recurring rides created',
      rides: createdRides
    });
  } catch (err) {
    console.error('Error in recurring ride creation:', err);
    res.status(500).json({ error: err.message || 'Failed to create recurring rides' });
  }
};

/**
 * Request to join a ride
 */
exports.requestToJoinRide = async (req, res) => {
  try {
    const { rideId, userId, seatCount = 1 } = req.body;
    
    // Replace userId with authenticated user if not provided
    const effectiveUserId = userId || req.user.id || req.user.userId;
    
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check if user is the ride creator
    if (ride.riderId.toString() === effectiveUserId.toString()) {
      return res.status(400).json({ error: "You can't join your own ride" });
    }
    
    // Check if already requested
    if (ride.requestedRiders.some(r => r.toString() === effectiveUserId.toString())) {
      return res.status(400).json({ error: "You have already requested this ride" });
    }
    
    // Check if already confirmed
    if (ride.confirmedRiders.some(r => r.toString() === effectiveUserId.toString())) {
      return res.status(400).json({ error: "You are already confirmed for this ride" });
    }
    
    ride.requestedRiders.push({ user: effectiveUserId, seatCount });
    await ride.save();
    
    res.json({
      message: "Ride request sent",
      ride
    });
  } catch (err) {
    console.error('Error requesting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to request ride' });
  }
};

/**
 * Confirm a ride request
 */
exports.confirmRideRequest = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check if the requester is authorized (ride owner)
    const requesterId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== requesterId.toString()) {
      return res.status(403).json({ error: "Only the ride creator can confirm requests" });
    }
    
    // Check if already confirmed
    const alreadyConfirmed = ride.confirmedRiders.some(r => r.toString() === userId);
    if (alreadyConfirmed) {
      return res.status(400).json({ error: "User already confirmed" });
    }
    
    // Find the request
    const reqIndex = ride.requestedRiders.findIndex(r => r.toString() === userId);
    if (reqIndex === -1) {
      return res.status(404).json({ error: "Request not found" });
    }

    const [riderReq] = ride.requestedRiders.splice(reqIndex, 1);
    ride.confirmedRiders.push(riderReq);
    
    // Mark ride as "confirmed" if 1st person joins
    if (ride.confirmedRiders.length === 1) {
      ride.status = "confirmed";
    }
    
    await ride.save();
    
    res.json({
      message: "Rider confirmed",
      ride
    });
  } catch (err) {
    console.error('Error confirming rider:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm rider' });
  }
};

/**
 * Deny a ride request
 */
exports.denyRideRequest = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }
    
    // Check if the requester is authorized (ride owner)
    const requesterId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== requesterId.toString()) {
      return res.status(403).json({ error: "Only the ride creator can deny requests" });
    }
    
    // Remove from requested list
    ride.requestedRiders = ride.requestedRiders.filter(r => r.toString() !== userId);
    
    await ride.save();
    
    res.json({
      message: "Request denied",
      ride
    });
  } catch (err) {
    console.error('Error denying request:', err);
    res.status(500).json({ error: err.message || 'Failed to deny request' });
  }
};

/**
 * Get ride by ID
 */
exports.getRideById = async (req, res) => {
  try {
    const ride = await RideMatch.findById(req.params.rideId)
      .populate('riderId', 'name email gender')
      .populate('requestedRiders', 'name email')
      .populate('confirmedRiders', 'name email');
      
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    res.json(ride);
  } catch (err) {
    console.error('Error getting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to get ride' });
  }
};



/**
 * Get rides created by a user
 */
exports.getRidesByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    // Replace ownerId with authenticated user if not provided or "me"
    const effectiveOwnerId = (ownerId === 'me') 
      ? (req.user.id || req.user.userId) 
      : ownerId;
    
    const rides = await RideMatch.find({ riderId: effectiveOwnerId })
      .populate('riderId', 'name email gender')
      .populate('confirmedRiders', 'name email')
      .lean();
    
    // Add average rating calculation
    const withRatings = rides.map(r => {
      const { ratings = [] } = r;
      const avg = ratings.length > 0
        ? (ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length).toFixed(1)
        : null;
        
      return {
        ...r,
        averageRating: avg,
        totalRatings: ratings.length
      };
    });
    
    res.json(withRatings);
  } catch (err) {
    console.error('Error getting user rides:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rides' });
  }
};

/**
 * Update a ride
 */
exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updates = req.body;
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized (ride owner)
    const userId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the ride creator can update the ride' });
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      // Handle special case for departureTime - convert to Date
      if (key === 'departureTime' && updates[key]) {
        ride[key] = new Date(updates[key]);
      } else {
        ride[key] = updates[key];
      }
    });
    
    await ride.save();
    res.json(ride);
  } catch (err) {
    console.error('Error updating ride:', err);
    res.status(500).json({ error: err.message || 'Failed to update ride' });
  }
};

/**
 * Delete a ride
 */
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if user is authorized (ride owner)
    const userId = req.user.id || req.user.userId;
    if (ride.riderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the ride creator can delete the ride' });
    }
    
    // Delete the ride
    await RideMatch.findByIdAndDelete(rideId);
    
    res.json({ message: 'Ride deleted' });
  } catch (err) {
    console.error('Error deleting ride:', err);
    res.status(500).json({ error: err.message || 'Failed to delete ride' });
  }
};

/**
 * Submit a rating for a rider
 */
exports.submitRating = async (req, res) => {
  try {
    const { rideId, riderId, score, comment } = req.body;
    
    if (!rideId || !riderId || !score) {
      return res.status(400).json({ error: 'Missing rating data' });
    }
    
    // Validate score
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }
    
    // Find the ride
    const ride = await RideMatch.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Check if rider was confirmed
    const isConfirmed = ride.confirmedRiders.some(id => id.toString() === riderId);
    if (!isConfirmed) {
      return res.status(403).json({ error: 'Rider not confirmed in this ride' });
    }
    
    // Check for duplicate rating
    const alreadyRated = ride.ratings && ride.ratings.some(r => r.riderId.toString() === riderId);
    if (alreadyRated) {
      return res.status(400).json({ error: 'You have already rated this rider' });
    }
    
    // Add the rating
    if (!ride.ratings) {
      ride.ratings = [];
    }
    
    ride.ratings.push({
      riderId,
      score: Number(score),
      comment: comment || ''
    });
    
    await ride.save();
    
    res.json({
      message: 'Rating submitted',
      ratings: ride.ratings
    });
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ error: err.message || 'Failed to submit rating' });
  }
};

/**
 * Get AI-based ride matches
 */
exports.getAiMatches = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime } = req.body;
    
    if (!startLocation || !departureTime) {
      return res.status(400).json({ error: 'Missing match parameters' });
    }
    
    const matches = await aiMatch({
      startLocation,
      endLocation: endLocation || '',
      departureTime
    });
    
    res.json(matches);
  } catch (err) {
    console.error('AI match error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI matches' });
  }
  };
/**
 * Stream AI-based ride matches and update on new data
 * Utilizes Server-Sent Events to push re-scored matches whenever the
 * RideMatch collection changes.
 */
exports.streamAiMatches = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime } = req.query;

    if (!startLocation || !departureTime) {
      return res.status(400).json({ error: 'Missing match parameters' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    const sendMatches = async () => {
      const matches = await aiMatch({
        startLocation,
        endLocation: endLocation || '',
        departureTime
      });
      res.write(`data: ${JSON.stringify(matches)}\n\n`);
    };

    // Send initial set of matches
    await sendMatches();

    // Watch for changes in RideMatch collection
    const changeStream = RideMatch.watch();
    changeStream.on('change', async () => {
      await sendMatches();
    });

    // Cleanup on client disconnect
    req.on('close', () => {
      changeStream.close();
      res.end();
    });
  } catch (err) {
    console.error('AI match stream error:', err);
    res.status(500).end();
  }
};