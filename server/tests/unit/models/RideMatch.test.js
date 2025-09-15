const RideMatch = require('../../../models/RideMatch');

describe('RideMatch Model', () => {
  describe('RideMatch Creation', () => {
    it('should create a ride match with valid data', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        riderName: 'John Doe',
        riderGender: 'Male',
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 3
      };

      const ride = new RideMatch(rideData);
      await ride.save();

      expect(ride._id).toBeDefined();
      expect(ride.riderId).toEqual(rideData.riderId);
      expect(ride.riderName).toBe(rideData.riderName);
      expect(ride.riderGender).toBe(rideData.riderGender);
      expect(ride.departureTime).toEqual(rideData.departureTime);
      expect(ride.startLocation).toBe(rideData.startLocation);
      expect(ride.endLocation).toBe(rideData.endLocation);
      expect(ride.availableSeats).toBe(rideData.availableSeats);
      expect(ride.status).toBe('pending');
      expect(ride.requestedRiders).toEqual([]);
      expect(ride.confirmedRiders).toEqual([]);
    });

    it('should create a ride match with default values', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi'
      };

      const ride = new RideMatch(rideData);
      await ride.save();

      expect(ride.riderName).toBe('Anonymous User');
      expect(ride.riderGender).toBe('');
      expect(ride.availableSeats).toBe(1);
      expect(ride.status).toBe('pending');
      expect(ride.recurring).toBeNull();
    });

    it('should require riderId field', async () => {
      const rideData = {
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi'
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should require departureTime field', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi'
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should require startLocation field', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endLocation: 'Dhanmondi'
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should require endLocation field', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University'
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should validate availableSeats minimum value', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        availableSeats: 0
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        status: 'invalid_status'
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'confirmed', 'completed'];
      
      for (const status of validStatuses) {
        const rideData = {
          riderId: global.testUtils.createObjectId(),
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi',
          status
        };

        const ride = new RideMatch(rideData);
        await expect(ride.save()).resolves.toBeDefined();
      }
    });

    it('should validate recurring frequency enum', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        recurring: {
          days: ['Monday', 'Tuesday'],
          frequency: 'invalid_frequency'
        }
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should accept valid recurring frequency values', async () => {
      const validFrequencies = ['daily', 'weekly'];
      
      for (const frequency of validFrequencies) {
        const rideData = {
          riderId: global.testUtils.createObjectId(),
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi',
          recurring: {
            days: ['Monday', 'Tuesday'],
            frequency
          }
        };

        const ride = new RideMatch(rideData);
        await expect(ride.save()).resolves.toBeDefined();
      }
    });

    it('should validate rating score range', async () => {
      const rideData = {
        riderId: global.testUtils.createObjectId(),
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startLocation: 'BRAC University',
        endLocation: 'Dhanmondi',
        ratings: [{
          riderId: global.testUtils.createObjectId(),
          raterId: global.testUtils.createObjectId(),
          score: 6, // Invalid score
          comment: 'Great ride!'
        }]
      };

      const ride = new RideMatch(rideData);
      await expect(ride.save()).rejects.toThrow();
    });

    it('should accept valid rating scores', async () => {
      const validScores = [1, 2, 3, 4, 5];
      
      for (const score of validScores) {
        const rideData = {
          riderId: global.testUtils.createObjectId(),
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi',
          ratings: [{
            riderId: global.testUtils.createObjectId(),
            raterId: global.testUtils.createObjectId(),
            score,
            comment: 'Great ride!'
          }]
        };

        const ride = new RideMatch(rideData);
        await expect(ride.save()).resolves.toBeDefined();
      }
    });
  });

  describe('RideMatch Methods', () => {
    let ride;

    beforeEach(async () => {
      ride = await global.testUtils.createTestRide();
    });

    it('should add a rider request', async () => {
      const userId = global.testUtils.createObjectId();
      const seatCount = 2;

      ride.requestedRiders.push({ user: userId, seatCount });
      await ride.save();

      expect(ride.requestedRiders).toHaveLength(1);
      expect(ride.requestedRiders[0].user).toEqual(userId);
      expect(ride.requestedRiders[0].seatCount).toBe(seatCount);
    });

    it('should confirm a rider', async () => {
      const userId = global.testUtils.createObjectId();
      const seatCount = 1;

      ride.confirmedRiders.push({ user: userId, seatCount });
      await ride.save();

      expect(ride.confirmedRiders).toHaveLength(1);
      expect(ride.confirmedRiders[0].user).toEqual(userId);
      expect(ride.confirmedRiders[0].seatCount).toBe(seatCount);
    });

    it('should calculate remaining seats correctly', () => {
      const totalSeats = ride.availableSeats;
      const confirmedSeats = ride.confirmedRiders.reduce((sum, rider) => sum + rider.seatCount, 0);
      const remainingSeats = totalSeats - confirmedSeats;

      expect(remainingSeats).toBe(ride.availableSeats);
    });

    it('should validate seat count for requested riders', async () => {
      const userId = global.testUtils.createObjectId();
      const invalidSeatCount = 0;

      ride.requestedRiders.push({ user: userId, seatCount: invalidSeatCount });
      await expect(ride.save()).rejects.toThrow();
    });

    it('should validate seat count for confirmed riders', async () => {
      const userId = global.testUtils.createObjectId();
      const invalidSeatCount = 0;

      ride.confirmedRiders.push({ user: userId, seatCount: invalidSeatCount });
      await expect(ride.save()).rejects.toThrow();
    });
  });

  describe('RideMatch Indexes', () => {
    it('should have status and departureTime index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('status_1_departureTime_1');
    });

    it('should have riderId and status index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('riderId_1_status_1');
    });

    it('should have startLocation and endLocation index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('startLocation_1_endLocation_1');
    });

    it('should have departureTime and status index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('departureTime_1_status_1');
    });

    it('should have createdAt index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('createdAt_-1');
    });

    it('should have recurring days index', async () => {
      const indexes = await RideMatch.collection.getIndexes();
      expect(indexes).toHaveProperty('recurring.days_1');
    });
  });

  describe('RideMatch Timestamps', () => {
    it('should have createdAt and updatedAt timestamps', async () => {
      const ride = await global.testUtils.createTestRide();
      
      expect(ride.createdAt).toBeDefined();
      expect(ride.updatedAt).toBeDefined();
      expect(ride.createdAt).toBeInstanceOf(Date);
      expect(ride.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const ride = await global.testUtils.createTestRide();
      const originalUpdatedAt = ride.updatedAt;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      ride.status = 'confirmed';
      await ride.save();
      
      expect(ride.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});