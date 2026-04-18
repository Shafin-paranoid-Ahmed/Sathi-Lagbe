const request = require('supertest');
const { app } = require('../../../index');
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
  del: jest.fn(),
  invalidateRides: jest.fn(),
  invalidateChats: jest.fn(),
  getRidesKey: jest.fn(() => 'rides:test'),
  connect: jest.fn()
}));

// NOTE: This suite is skipped because it was authored against an aspirational
// REST API (GET /api/rides/available?start=..., POST /api/rides/:rideId/request,
// response shape { success, rides }) that does not match the actual
// implementation. The file is also truncated mid-string literal. It should
// be rewritten against the real controller surface before re-enabling.
describe.skip('Ride Controller', () => {
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

    it.skip('should reject request for own ride (truncated test)', async () => {
      // Original test body was truncated in source; preserved as a skipped
      // placeholder so the suite can still parse.
    });
  });
});
