// services/aiMatcher.js
const RideMatch = require('../models/RideMatch');

// --- Constants for Scoring ---
// These weights determine the importance of each factor. Adjust them to tweak the AI's priorities.
const WEIGHTS = {
  TIME: 0.4,          // 40% importance
  START_LOCATION: 0.3, // 30% importance
  END_LOCATION: 0.2,   // 20% importance
  RIDER_RATING: 0.1,  // 10% importance
};
const MAX_SCORE = 100;
const TIME_GRACE_PERIOD_MINS = 15; // +/- 15 mins from desired time gets a perfect time score.

/**
 * Calculates a location match score (0-100) between two location strings.
 * This is more intelligent than a simple `includes()` check.
 * @param {string} searchLocation - The location the user is searching for.
 * @param {string} rideLocation - The location listed in the ride candidate.
 * @returns {number} A score from 0 to 100.
 */
const calculateLocationScore = (searchLocation = '', rideLocation = '') => {
  const search = searchLocation.toLowerCase().trim();
  const ride = rideLocation.toLowerCase().trim();

  if (!search || !ride) return 0;
  if (search === ride) return 100; // Perfect match

  // Tokenize (split into words) to find partial matches
  const searchTokens = search.split(/\s+/);
  const rideTokens = ride.split(/\s+/);

  const commonTokens = searchTokens.filter(token => rideTokens.includes(token));
  
  // Score based on the proportion of matching words from the user's search
  if (searchTokens.length === 0) return 0;
  return (commonTokens.length / searchTokens.length) * 80 + 20; // Give a base score of 20 for any overlap
};

/**
 * The main AI matching function.
 * @param {object} criteria - The user's search criteria.
 * @param {string} criteria.startLocation
 * @param {string} criteria.endLocation
 * @param {string} criteria.departureTime
 * @param {string} criteria.userId - The ID of the user performing the search.
 * @returns {Promise<Array>} A sorted list of scored ride matches.
 */
async function aiMatch({ startLocation, endLocation, departureTime, userId }) {
  const desiredTime = new Date(departureTime);

  // --- 1. Fetch a broad list of candidates ---
  // We now fetch rides that are 'pending' OR 'confirmed' but not yet completed.
  const candidates = await RideMatch.find({
    status: { $in: ['pending', 'confirmed'] },
    departureTime: { $gte: new Date() }, // Only find rides in the future
    riderId: { $ne: userId } // Exclude the user's own rides
  }).lean(); // .lean() is faster for read-only operations

  // --- 2. Score each candidate ride ---
  const scored = candidates.map(ride => {
    // a. Time Score (more forgiving)
    const diffMins = Math.abs(new Date(ride.departureTime) - desiredTime) / (1000 * 60);
    const timePenalty = Math.max(0, diffMins - TIME_GRACE_PERIOD_MINS);
    const timeScore = Math.max(0, MAX_SCORE - timePenalty * 1.5); // Gentler penalty after grace period

    // b. Location Scores (smarter matching)
    const startScore = calculateLocationScore(startLocation, ride.startLocation);
    const endScore = endLocation ? calculateLocationScore(endLocation, ride.endLocation) : MAX_SCORE; // If no end location, it's a perfect match

    // c. Rider Rating Score
    const ratings = ride.ratings || [];
    let ratingScore = 70; // Default score for users with no ratings yet
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
      ratingScore = (avg / 5) * MAX_SCORE; // Convert 1-5 scale to 0-100
    }

    // d. Final Weighted Score
    const totalScore = 
      (timeScore * WEIGHTS.TIME) +
      (startScore * WEIGHTS.START_LOCATION) +
      (endScore * WEIGHTS.END_LOCATION) +
      (ratingScore * WEIGHTS.RIDER_RATING);

    return { 
      ...ride, 
      // Breakdown of scores for potential UI display or debugging
      _scores: {
        time: Math.round(timeScore),
        start: Math.round(startScore),
        end: Math.round(endScore),
        rating: Math.round(ratingScore)
      },
      matchScore: Math.round(totalScore) 
    };
  });

  // --- 3. Sort by the final match score in descending order ---
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // --- 4. Filter out very low-scoring results ---
  return scored.filter(ride => ride.matchScore > 30);
}

module.exports = { aiMatch };