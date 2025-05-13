const RideMatch = require('../models/RideMatch');

const { aiMatch } = require('../services/aiMatcher');

const { validateRideOffer, validateRecurringRide } = require('../utils/validate');


// Handle GET request to search for rides
exports.findRideMatches = async (req, res) => {
  try {
    // Get query parameters from the URL
    const { departureTime, startLocation } = req.query;

    // Check if required fields are provided
    if (!departureTime || !startLocation) {
      return res.status(400).json({ error: 'Missing departureTime or startLocation!' });
    }

    // Convert departureTime string to a Date object
    const targetTime = new Date(departureTime);

    // Define a time window (±30 minutes)
    const startTime = new Date(targetTime.getTime() - 30 * 60000); // 30 mins before
    const endTime = new Date(targetTime.getTime() + 30 * 60000);    // 30 mins after

    // Query the database for rides in this time window and location
    const rides = await RideMatch.find({
      departureTime: { $gte: startTime, $lte: endTime },
      startLocation: startLocation
    }).sort({ departureTime: 1 }); // Sort by earliest departure

    // Send the results back to the client
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Server error!' });
  }
};


exports.createRideOffer = async (req, res) => {
  try {
    console.log("Request body:", req.body); // Debug: Check incoming data
    const validationError = validateRideOffer(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    const { riderId, departureTime, startLocation, endLocation, recurring } = req.body;
    
    // Validate required fields
    if (!riderId || !departureTime || !startLocation || !endLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a new ride offer
    const newRide = new RideMatch({
      riderId,
      departureTime: new Date(departureTime),
      startLocation,
      endLocation,
      recurring: recurring || null,
      status: 'pending'
    });

    await newRide.save();
    res.status(201).json(newRide);
  } catch (err) {
    console.error("Error creating ride offer:", err.message);
    res.status(500).json({ error: 'Failed to create ride offer' });
  }
};


exports.requestToJoinRide = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.requestedRiders.includes(userId)) {
      return res.status(400).json({ error: "You have already requested this ride" });
    }

    ride.requestedRiders.push(userId);
    await ride.save();

    res.json({ message: "Ride request sent", ride });
  } catch (err) {
    console.error("Error requesting ride:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.confirmRideRequest = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const ride = await RideMatch.findById(rideId);

    if (!ride) return res.status(404).json({ error: "Ride not found" });

    const alreadyConfirmed = ride.confirmedRiders.includes(userId);
    if (alreadyConfirmed) return res.status(400).json({ error: "User already confirmed" });

    // Remove from requested list if exists
    ride.requestedRiders = ride.requestedRiders.filter(id => id.toString() !== userId);
    ride.confirmedRiders.push(userId);

    // Optional: mark ride as "confirmed" if 1st person joins
    if (ride.confirmedRiders.length === 1) {
      ride.status = "confirmed";
    }

    await ride.save();
    res.json({ message: "Rider confirmed", ride });
  } catch (err) {
    console.error("Error confirming rider:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createRecurringRides = async (req, res) => {
  try {
    const { riderId, startLocation, endLocation, recurring } = req.body;

    const error = validateRecurringRide(req.body);
    if (error) return res.status(400).json({ error });


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
          riderId,
          startLocation,
          endLocation,
          departureTime,
          recurring,
          status: 'pending'
        });

        await ride.save();
        createdRides.push(ride);
      }
    }

    res.status(201).json({ message: 'Recurring rides created', rides: createdRides });
  } catch (err) {
    console.error("Error in recurring ride creation:", err.message);
    res.status(500).json({ error: 'Failed to create recurring rides' });
  }
};


exports.submitRating = async (req, res) => {
  const { rideId, riderId, score, comment } = req.body;

  if (!rideId || !riderId || !score) {
    return res.status(400).json({ error: 'Missing rating data' });
  }

  try {
    const ride = await RideMatch.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Check if rider was confirmed
    const isConfirmed = ride.confirmedRiders.some(id => id.toString() === riderId);
    if (!isConfirmed) return res.status(403).json({ error: 'Rider not confirmed in this ride' });

    // Check for duplicate rating
    const alreadyRated = ride.ratings.some(r => r.riderId.toString() === riderId);
    if (alreadyRated) return res.status(400).json({ error: 'You have already rated this rider' });

    ride.ratings.push({ riderId, score, comment });
    await ride.save();

    res.json({ message: 'Rating submitted', ratings: ride.ratings });
  } catch (err) {
    console.error("Rating error:", err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};


exports.getRideById = async (req, res) => {
  try {
    const ride = await RideMatch
      .findById(req.params.rideId)
      .populate('requestedRiders', 'name email')    // bring in user info
      .populate('confirmedRiders', 'name email');
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.denyRideRequest = async (req, res) => {
  const { rideId, userId } = req.body;
  try {
    const ride = await RideMatch.findById(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    ride.requestedRiders = ride.requestedRiders.filter(id => id.toString() !== userId);
    await ride.save();
    res.json({ message: 'Request denied' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/rides/owner/:ownerId
exports.getRidesByOwner = async (req, res) => {
  const { ownerId } = req.params;
  try {

    const rides = await RideMatch.find({ riderId: ownerId })
      .populate('confirmedRiders', 'name email')
      .lean();


    const withRatings = rides.map(r => {
      const { ratings = [] } = r;
      const avg =
        ratings.length > 0
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
    console.error('getRidesByOwner error:', err);
    res.status(500).json({ error: 'Failed to fetch your rides' });
  }
};

// DELETE /api/rides/:rideId
exports.deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const deleted = await RideMatch.findByIdAndDelete(rideId);
    if (!deleted) return res.status(404).json({ error: 'Ride not found' });
    res.json({ message: 'Ride deleted' });
  } catch (err) {
    console.error('Delete ride error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/rides/:rideId
exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updates = req.body; // ideally validate fields
    const ride = await RideMatch.findByIdAndUpdate(rideId, updates, { new: true });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    console.error('Update ride error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateRide = async (req, res) => {
  const { rideId } = req.params;
  try {
    const ride = await RideMatch.findByIdAndUpdate(rideId, req.body, { new: true });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};



exports.getAiMatches = async (req, res) => {
  try {
    const { startLocation, endLocation, departureTime } = req.body;
    if (!startLocation || !endLocation || !departureTime) {
      return res.status(400).json({ error: 'Missing match parameters' });
    }
    const matches = await aiMatch({ startLocation, endLocation, departureTime });
    res.json(matches);
  } catch (err) {
    console.error('AI match error:', err);
    res.status(500).json({ error: 'Failed to generate AI matches' });
  }
};
