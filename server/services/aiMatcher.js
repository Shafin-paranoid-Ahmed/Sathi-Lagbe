// services/aiMatcher.js
const RideMatch = require('../models/RideMatch');

// Simple fuzzy-match helper
const fuzzyMatch = (a = '', b = '') =>
  a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());

async function aiMatch({ startLocation, endLocation, departureTime }) {
  console.log('🤖 AI Match called with:', { startLocation, endLocation, departureTime });
  
  // 1. Fetch all pending rides (status = 'pending')
  const candidates = await RideMatch.find({ status: 'pending' })
    .populate('riderId', 'name email avatarUrl gender')
    .lean();

  console.log(`📊 Found ${candidates.length} candidate rides`);

  // Filter out rides without valid riderId
  const validCandidates = candidates.filter(r => r.riderId && r.riderId._id);
  console.log(`✅ ${validCandidates.length} rides with valid rider data`);

  if (validCandidates.length === 0) {
    console.log('⚠️ No valid rides found for AI matching');
    return [];
  }

  const desiredTime = new Date(departureTime);

  // 2. Score each candidate
  const scored = validCandidates.map(r => {
    let score = 0;

    // Time proximity (max 60 min difference for full 100 points)
    const diffMins = Math.abs(new Date(r.departureTime) - desiredTime) / 1000 / 60;
    score += Math.max(0, 100 - diffMins * 2);

    // Route overlap
    if (fuzzyMatch(r.startLocation, startLocation)) score += 20;
    if (fuzzyMatch(r.endLocation, endLocation))     score += 20;

    // Average partner rating (if any)
    const ratings = r.ratings || [];
    if (ratings.length) {
      const avg = ratings.reduce((sum, rr) => sum + rr.score, 0) / ratings.length;
      score += avg * 10; // from 10 to 50
    }

    const finalScore = Math.min(100, Math.round(score));
    console.log(`🎯 Ride ${r._id}: score=${finalScore}, time=${r.departureTime}, start=${r.startLocation}, end=${r.endLocation}`);
    
    return { ...r, matchScore: finalScore };
  });

  // 3. Sort by descending score
  scored.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`🏆 Returning ${scored.length} scored matches`);
  return scored;
}

module.exports = { aiMatch };