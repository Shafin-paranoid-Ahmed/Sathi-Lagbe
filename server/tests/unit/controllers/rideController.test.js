const request = require('supertest');
const { app } = require('../../../index');
const RideMatch = require('../../../models/RideMatch');

jest.mock('../../../services/aiMatcher', () => ({
  aiMatch: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../services/cacheService', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidateRides: jest.fn().mockResolvedValue(true),
  getRidesKey: jest.fn(() => 'rides:test'),
  connect: jest.fn().mockResolvedValue(true)
}));

describe('Ride Controller (smoke)', () => {
  let owner;
  let ownerToken;

  beforeEach(async () => {
    owner = await global.testUtils.createTestUser();
    ownerToken = global.testUtils.generateToken(owner._id);
  });

  it('creates a ride offer for authenticated owner', async () => {
    const payload = {
      departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      startLocation: 'BRAC University',
      endLocation: 'Dhanmondi',
      availableSeats: 2
    };

    const res = await request(app)
      .post('/api/rides/offer')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.ride).toBeDefined();
    expect(res.body.ride.riderId).toBe(owner._id.toString());
  });

  it('returns available rides list', async () => {
    await global.testUtils.createTestRide({
      riderId: owner._id,
      riderName: owner.name,
      riderGender: owner.gender
    });

    const res = await request(app)
      .get('/api/rides/available')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('allows a second user to request join', async () => {
    const ride = await global.testUtils.createTestRide({
      riderId: owner._id,
      riderName: owner.name,
      riderGender: owner.gender,
      availableSeats: 3
    });
    const passenger = await global.testUtils.createTestUser({ email: 'passenger@bracu.ac.bd' });
    const passengerToken = global.testUtils.generateToken(passenger._id);

    await request(app)
      .post('/api/rides/request')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ rideId: ride._id.toString(), seatCount: 1 })
      .expect(200);

    const updated = await RideMatch.findById(ride._id);
    expect(updated.requestedRiders.length).toBe(1);
  });
});
