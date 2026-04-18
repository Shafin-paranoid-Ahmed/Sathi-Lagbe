const request = require('supertest');
const { app } = require('../../index');
const RideMatch = require('../../models/RideMatch');

describe('Rides integration (smoke)', () => {
  let owner;
  let passenger;
  let ownerToken;
  let passengerToken;

  beforeEach(async () => {
    owner = await global.testUtils.createTestUser({ email: 'rides-owner@bracu.ac.bd' });
    passenger = await global.testUtils.createTestUser({ email: 'rides-passenger@bracu.ac.bd' });
    ownerToken = global.testUtils.generateToken(owner._id);
    passengerToken = global.testUtils.generateToken(passenger._id);
  });

  it('creates ride and allows request/confirm flow', async () => {
    const offerRes = await request(app)
      .post('/api/rides/offer')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        startLocation: 'BRAC University',
        endLocation: 'Gulshan',
        availableSeats: 2
      })
      .expect(201);

    const rideId = offerRes.body.ride._id;
    expect(rideId).toBeDefined();

    await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId, seatCount: 1 })
      .expect(200);

    await request(app)
      .post('/api/rides/confirm')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ rideId, userId: passenger._id.toString() })
      .expect(200);

    const ride = await RideMatch.findById(rideId);
    expect(ride.confirmedRiders.length).toBe(1);
  });

  it('rejects unauthenticated available-rides request', async () => {
    await request(app).get('/api/rides/available').expect(401);
  });
});
