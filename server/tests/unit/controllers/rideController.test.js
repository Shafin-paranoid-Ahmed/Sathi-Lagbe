const request = require('supertest');
const app = require('../../../index');
const RideMatch = require('../../../models/RideMatch');
const User = require('../../../models/User');

// Mock the AI matcher service
jest.mock('../../../services/aiMatcher', () => ({
  aiMatch: jest.fn()
}));

// Mock the ride notification service
jest.mock('../../../services/rideNotificationService', () => ({
  sendRideRequestNotification: jest.fn(),
  sendRideConfirmationNotification: jest.fn(),
  sendRideDenialNotification: jest.fn()
}));

// Mock the cache service
jest.mock('../../../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

describe('Ride Controller', () => {
  let user, token;

  beforeEach(async () => {
    user = await global.testUtils.createTestUser();
    token = global.testUtils.generateToken(user._id);
  });

  describe('POST /api/rides/offer', () => {
    it('should create a new ride offer with valid data', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3,
        schedule: 'One-time'
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token}`)
        .send(rideData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.ride).toBeDefined();
      expect(response.body.ride.riderId).toBe(user._id.toString());
      expect(response.body.ride.startLocation).toBe(rideData.startLocation);
      expect(response.body.ride.endLocation).toBe(rideData.endLocation);
      expect(response.body.ride.availableSeats).toBe(rideData.availableSeats);
      expect(response.body.ride.status).toBe('pending');
    });

    it('should create a recurring ride offer', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3,
        schedule: 'Recurring',
        recurring: {
          days: ['Monday', 'Wednesday', 'Friday'],
          frequency: 'weekly'
        }
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token}`)
        .send(rideData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.ride.recurring).toBeDefined();
      expect(response.body.ride.recurring.days).toEqual(rideData.recurring.days);
      expect(response.body.ride.recurring.frequency).toBe(rideData.recurring.frequency);
    });

    it('should reject ride offer without authentication', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .send(rideData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject ride offer with missing required fields', async () => {
      const rideData = {
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi'
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token}`)
        .send(rideData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject ride offer with invalid availableSeats', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 0
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token}`)
        .send(rideData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject ride offer with past departure time', async () => {
      const rideData = {
        departureTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token}`)
        .send(rideData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/rides/available', () => {
    beforeEach(async () => {
      // Create test rides
      await global.testUtils.createTestRide({
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        availableSeats: 3
      });

      await global.testUtils.createTestRide({
        startLocation: 'BRAC University',
        endLocation: 'Gulshan',
        departureTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        availableSeats: 2
      });

      await global.testUtils.createTestRide({
        startLocation: 'Dhanmondi',
        endLocation: 'BRAC University',
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        availableSeats: 1
      });
    });

    it('should get available rides without filters', async () => {
      const response = await request(app)
        .get('/api/rides/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
      expect(Array.isArray(response.body.rides)).toBe(true);
      expect(response.body.rides.length).toBeGreaterThan(0);
    });

    it('should filter rides by start location', async () => {
      const response = await request(app)
        .get('/api/rides/available')
        .query({ startLocation: 'BRAC University' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
      response.body.rides.forEach(ride => {
        expect(ride.startLocation).toBe('BRAC University');
      });
    });

    it('should filter rides by end location', async () => {
      const response = await request(app)
        .get('/api/rides/available')
        .query({ endLocation: 'Dhanmondi' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
      response.body.rides.forEach(ride => {
        expect(ride.endLocation).toBe('Dhanmondi');
      });
    });

    it('should filter rides by both start and end location', async () => {
      const response = await request(app)
        .get('/api/rides/available')
        .query({ 
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
      response.body.rides.forEach(ride => {
        expect(ride.startLocation).toBe('BRAC University');
        expect(ride.endLocation).toBe('Dhanmondi');
      });
    });

    it('should filter rides by date range', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/rides/available')
        .query({
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
    });

    it('should limit results with pagination', async () => {
      const response = await request(app)
        .get('/api/rides/available')
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rides).toBeDefined();
      expect(response.body.rides.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/rides/:rideId/request', () => {
    let ride;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide({
        riderId: user._id,
        availableSeats: 3
      });
    });

    it('should request to join a ride successfully', async () => {
      const requestData = {
        seatCount: 1
      };

      const response = await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('request sent');

      // Verify the request was added to the ride
      const updatedRide = await RideMatch.findById(ride._id);
      expect(updatedRide.requestedRiders).toHaveLength(1);
      expect(updatedRide.requestedRiders[0].user.toString()).toBe(user._id.toString());
      expect(updatedRide.requestedRiders[0].seatCount).toBe(requestData.seatCount);
    });

    it('should reject request without authentication', async () => {
      const requestData = {
        seatCount: 1
      };

      const response = await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .send(requestData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request for non-existent ride', async () => {
      const nonExistentRideId = global.testUtils.createObjectId();
      const requestData = {
        seatCount: 1
      };

      const response = await request(app)
        .post(`/api/rides/${nonExistentRideId}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject request for own ride', async () => {
      const requestData = {
        seatCount: 1
      };

      const response = await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('own ride');
    });

    it('should reject request with invalid seat count', async () => {
      const requestData = {
        seatCount: 0
      };

      const response = await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate request', async () => {
      const requestData = {
        seatCount: 1
      };

      // First request
      await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(200);

      // Second request (should fail)
      const response = await request(app)
        .post(`/api/rides/${ride._id}/request`)
        .set('Authorization', `Bearer ${token}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already requested');
    });
  });

  describe('POST /api/rides/:rideId/confirm/:userId', () => {
    let ride, requester, requesterToken;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide({
        riderId: user._id,
        availableSeats: 3
      });

      requester = await global.testUtils.createTestUser({
        email: 'requester@bracu.ac.bd'
      });
      requesterToken = global.testUtils.generateToken(requester._id);

      // Add request first
      ride.requestedRiders.push({
        user: requester._id,
        seatCount: 1
      });
      await ride.save();
    });

    it('should confirm a ride request successfully', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/confirm/${requester._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('confirmed');

      // Verify the confirmation
      const updatedRide = await RideMatch.findById(ride._id);
      expect(updatedRide.confirmedRiders).toHaveLength(1);
      expect(updatedRide.confirmedRiders[0].user.toString()).toBe(requester._id.toString());
      expect(updatedRide.requestedRiders).toHaveLength(0);
    });

    it('should reject confirmation without authentication', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/confirm/${requester._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject confirmation by non-ride owner', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/confirm/${requester._id}`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject confirmation for non-existent ride', async () => {
      const nonExistentRideId = global.testUtils.createObjectId();

      const response = await request(app)
        .post(`/api/rides/${nonExistentRideId}/confirm/${requester._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject confirmation for non-existent user', async () => {
      const nonExistentUserId = global.testUtils.createObjectId();

      const response = await request(app)
        .post(`/api/rides/${ride._id}/confirm/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/rides/:rideId/deny/:userId', () => {
    let ride, requester, requesterToken;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide({
        riderId: user._id,
        availableSeats: 3
      });

      requester = await global.testUtils.createTestUser({
        email: 'requester@bracu.ac.bd'
      });
      requesterToken = global.testUtils.generateToken(requester._id);

      // Add request first
      ride.requestedRiders.push({
        user: requester._id,
        seatCount: 1
      });
      await ride.save();
    });

    it('should deny a ride request successfully', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/deny/${requester._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('denied');

      // Verify the request was removed
      const updatedRide = await RideMatch.findById(ride._id);
      expect(updatedRide.requestedRiders).toHaveLength(0);
      expect(updatedRide.confirmedRiders).toHaveLength(0);
    });

    it('should reject denial without authentication', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/deny/${requester._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject denial by non-ride owner', async () => {
      const response = await request(app)
        .post(`/api/rides/${ride._id}/deny/${requester._id}`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/rides/:rideId', () => {
    let ride;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide({
        riderId: user._id
      });
    });

    it('should get ride by ID', async () => {
      const response = await request(app)
        .get(`/api/rides/${ride._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.ride).toBeDefined();
      expect(response.body.ride._id).toBe(ride._id.toString());
    });

    it('should return 404 for non-existent ride', async () => {
      const nonExistentRideId = global.testUtils.createObjectId();

      const response = await request(app)
        .get(`/api/rides/${nonExistentRideId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/rides/:rideId', () => {
    let ride;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide({
        riderId: user._id
      });
    });

    it('should delete ride successfully', async () => {
      const response = await request(app)
        .delete(`/api/rides/${ride._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify ride was deleted
      const deletedRide = await RideMatch.findById(ride._id);
      expect(deletedRide).toBeNull();
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/rides/${ride._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject deletion by non-ride owner', async () => {
      const otherUser = await global.testUtils.createTestUser({
        email: 'other@bracu.ac.bd'
      });
      const otherToken = global.testUtils.generateToken(otherUser._id);

      const response = await request(app)
        .delete(`/api/rides/${ride._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent ride', async () => {
      const nonExistentRideId = global.testUtils.createObjectId();

      const response = await request(app)
        .delete(`/api/rides/${nonExistentRideId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});