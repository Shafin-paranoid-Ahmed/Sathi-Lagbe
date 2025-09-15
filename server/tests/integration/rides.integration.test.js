const request = require('supertest');
const app = require('../../index');
const RideMatch = require('../../models/RideMatch');
const User = require('../../models/User');

describe('Rides Integration Tests', () => {
  let user1, user2, user3, token1, token2, token3;

  beforeEach(async () => {
    // Create test users
    user1 = await global.testUtils.createTestUser({
      email: 'rider1@bracu.ac.bd',
      name: 'Rider One',
      bracuId: '11111111'
    });
    user2 = await global.testUtils.createTestUser({
      email: 'rider2@bracu.ac.bd',
      name: 'Rider Two',
      bracuId: '22222222'
    });
    user3 = await global.testUtils.createTestUser({
      email: 'rider3@bracu.ac.bd',
      name: 'Rider Three',
      bracuId: '33333333'
    });

    token1 = global.testUtils.generateToken(user1._id);
    token2 = global.testUtils.generateToken(user2._id);
    token3 = global.testUtils.generateToken(user3._id);
  });

  describe('Complete Ride Sharing Flow', () => {
    it('should complete full ride sharing flow from offer to completion', async () => {
      // Step 1: User1 offers a ride
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      expect(offerResponse.body.success).toBe(true);
      expect(offerResponse.body.ride).toBeDefined();
      const rideId = offerResponse.body.ride._id;

      // Step 2: User2 searches for available rides
      const searchResponse = await request(app)
        .get('/api/rides/available')
        .query({
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi'
        })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.rides).toHaveLength(1);
      expect(searchResponse.body.rides[0]._id).toBe(rideId);

      // Step 3: User2 requests to join the ride
      const requestData = {
        seatCount: 1
      };

      const requestResponse = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token2}`)
        .send(requestData)
        .expect(200);

      expect(requestResponse.body.success).toBe(true);

      // Step 4: User1 confirms User2's request
      const confirmResponse = await request(app)
        .post(`/api/rides/${rideId}/confirm/${user2._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(confirmResponse.body.success).toBe(true);

      // Step 5: User3 also requests to join
      const request2Response = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token3}`)
        .send({ seatCount: 2 })
        .expect(200);

      expect(request2Response.body.success).toBe(true);

      // Step 6: User1 confirms User3's request
      const confirm2Response = await request(app)
        .post(`/api/rides/${rideId}/confirm/${user3._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(confirm2Response.body.success).toBe(true);

      // Step 7: Verify the ride is now full
      const rideResponse = await request(app)
        .get(`/api/rides/${rideId}`)
        .expect(200);

      expect(rideResponse.body.success).toBe(true);
      expect(rideResponse.body.ride.confirmedRiders).toHaveLength(2);
      expect(rideResponse.body.ride.requestedRiders).toHaveLength(0);

      // Step 8: User1 updates ride status to completed
      const updateResponse = await request(app)
        .put(`/api/rides/${rideId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
    });

    it('should handle ride denial flow', async () => {
      // Step 1: User1 offers a ride
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 2,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      const rideId = offerResponse.body.ride._id;

      // Step 2: User2 requests to join
      const requestResponse = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ seatCount: 1 })
        .expect(200);

      expect(requestResponse.body.success).toBe(true);

      // Step 3: User1 denies User2's request
      const denyResponse = await request(app)
        .post(`/api/rides/${rideId}/deny/${user2._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(denyResponse.body.success).toBe(true);

      // Step 4: Verify the request was removed
      const rideResponse = await request(app)
        .get(`/api/rides/${rideId}`)
        .expect(200);

      expect(rideResponse.body.ride.requestedRiders).toHaveLength(0);
      expect(rideResponse.body.ride.confirmedRiders).toHaveLength(0);
    });

    it('should handle recurring ride creation and management', async () => {
      // Step 1: User1 creates a recurring ride
      const recurringRideData = {
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

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(recurringRideData)
        .expect(201);

      expect(offerResponse.body.success).toBe(true);
      expect(offerResponse.body.ride.recurring).toBeDefined();
      expect(offerResponse.body.ride.recurring.days).toEqual(['Monday', 'Wednesday', 'Friday']);
      expect(offerResponse.body.ride.recurring.frequency).toBe('weekly');
    });

    it('should handle ride search with multiple filters', async () => {
      // Create multiple rides with different criteria
      const ride1 = await global.testUtils.createTestRide({
        riderId: user1._id,
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        availableSeats: 2
      });

      const ride2 = await global.testUtils.createTestRide({
        riderId: user2._id,
        startLocation: 'BRAC University',
        endLocation: 'Gulshan',
        departureTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        availableSeats: 3
      });

      const ride3 = await global.testUtils.createTestRide({
        riderId: user3._id,
        startLocation: 'Dhanmondi',
        endLocation: 'BRAC University',
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        availableSeats: 1
      });

      // Search by start location only
      const search1Response = await request(app)
        .get('/api/rides/available')
        .query({ startLocation: 'BRAC University' })
        .expect(200);

      expect(search1Response.body.rides).toHaveLength(2);

      // Search by both start and end location
      const search2Response = await request(app)
        .get('/api/rides/available')
        .query({
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi'
        })
        .expect(200);

      expect(search2Response.body.rides).toHaveLength(1);
      expect(search2Response.body.rides[0]._id).toBe(ride1._id.toString());

      // Search by date range
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const search3Response = await request(app)
        .get('/api/rides/available')
        .query({
          startDate: tomorrow.toISOString(),
          endDate: dayAfter.toISOString()
        })
        .expect(200);

      expect(search3Response.body.rides).toHaveLength(2);
    });

    it('should handle ride capacity limits', async () => {
      // Step 1: User1 offers a ride with 2 seats
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 2,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      const rideId = offerResponse.body.ride._id;

      // Step 2: User2 requests 1 seat
      const request1Response = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ seatCount: 1 })
        .expect(200);

      expect(request1Response.body.success).toBe(true);

      // Step 3: User1 confirms User2
      const confirm1Response = await request(app)
        .post(`/api/rides/${rideId}/confirm/${user2._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(confirm1Response.body.success).toBe(true);

      // Step 4: User3 requests 2 seats (more than available)
      const request2Response = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token3}`)
        .send({ seatCount: 2 })
        .expect(400);

      expect(request2Response.body.success).toBe(false);
      expect(request2Response.body.error).toContain('not enough seats');

      // Step 5: User3 requests 1 seat (should work)
      const request3Response = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token3}`)
        .send({ seatCount: 1 })
        .expect(200);

      expect(request3Response.body.success).toBe(true);
    });

    it('should handle ride deletion and cleanup', async () => {
      // Step 1: User1 offers a ride
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      const rideId = offerResponse.body.ride._id;

      // Step 2: User2 requests to join
      const requestResponse = await request(app)
        .post(`/api/rides/${rideId}/request`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ seatCount: 1 })
        .expect(200);

      // Step 3: User1 deletes the ride
      const deleteResponse = await request(app)
        .delete(`/api/rides/${rideId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Step 4: Verify ride is deleted
      const getResponse = await request(app)
        .get(`/api/rides/${rideId}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should handle concurrent ride requests', async () => {
      // Step 1: User1 offers a ride with 1 seat
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 1,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      const rideId = offerResponse.body.ride._id;

      // Step 2: Both User2 and User3 request to join simultaneously
      const [request1Response, request2Response] = await Promise.all([
        request(app)
          .post(`/api/rides/${rideId}/request`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ seatCount: 1 }),
        request(app)
          .post(`/api/rides/${rideId}/request`)
          .set('Authorization', `Bearer ${token3}`)
          .send({ seatCount: 1 })
      ]);

      // Both requests should succeed initially
      expect(request1Response.status).toBe(200);
      expect(request2Response.status).toBe(200);

      // Step 3: User1 confirms User2
      const confirmResponse = await request(app)
        .post(`/api/rides/${rideId}/confirm/${user2._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(confirmResponse.body.success).toBe(true);

      // Step 4: User1 should not be able to confirm User3 (no seats left)
      const confirm2Response = await request(app)
        .post(`/api/rides/${rideId}/confirm/${user3._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);

      expect(confirm2Response.body.success).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid ride ID gracefully', async () => {
      const invalidRideId = 'invalid-id';

      const response = await request(app)
        .get(`/api/rides/${invalidRideId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent ride operations', async () => {
      const nonExistentRideId = global.testUtils.createObjectId();

      const response = await request(app)
        .get(`/api/rides/${nonExistentRideId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized ride operations', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3,
        schedule: 'One-time'
      };

      const offerResponse = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(rideData)
        .expect(201);

      const rideId = offerResponse.body.ride._id;

      // Try to delete ride without authentication
      const deleteResponse = await request(app)
        .delete(`/api/rides/${rideId}`)
        .expect(401);

      expect(deleteResponse.body.success).toBe(false);
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        departureTime: 'invalid-date',
        startLocation: '',
        endLocation: 'Dhanmondi',
        availableSeats: -1
      };

      const response = await request(app)
        .post('/api/rides/offer')
        .set('Authorization', `Bearer ${token1}`)
        .send(malformedData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});