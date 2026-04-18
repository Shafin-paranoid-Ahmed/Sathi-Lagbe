const Rating = require('../../../models/Rating');

describe('Rating Model', () => {
  describe('Rating Creation', () => {
    it('should create a rating with valid data', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5,
        comment: 'Excellent ride!',
        category: 'overall',
        isRiderRating: true
      };

      const rating = new Rating(ratingData);
      await rating.save();

      expect(rating._id).toBeDefined();
      expect(rating.rater).toEqual(ratingData.rater);
      expect(rating.ratee).toEqual(ratingData.ratee);
      expect(rating.rideId).toEqual(ratingData.rideId);
      expect(rating.rating).toBe(ratingData.rating);
      expect(rating.comment).toBe(ratingData.comment);
      expect(rating.category).toBe(ratingData.category);
      expect(rating.isRiderRating).toBe(ratingData.isRiderRating);
    });

    it('should create a rating with default values', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 4
      };

      const rating = new Rating(ratingData);
      await rating.save();

      expect(rating.comment).toBe('');
      expect(rating.category).toBe('overall');
      expect(rating.isRiderRating).toBe(true);
    });

    it('should require rater field', async () => {
      const ratingData = {
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should require ratee field', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should require rideId field', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rating: 5
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should require rating field', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId()
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should validate rating range', async () => {
      const validRatings = [1, 2, 3, 4, 5];

      for (const ratingValue of validRatings) {
        const ratingData = {
          rater: global.testUtils.createObjectId(),
          ratee: global.testUtils.createObjectId(),
          rideId: global.testUtils.createObjectId(),
          rating: ratingValue
        };

        const rating = new Rating(ratingData);
        await expect(rating.save()).resolves.toBeDefined();
      }
    });

    it('should reject rating below minimum', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 0
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should reject rating above maximum', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 6
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should validate category enum values', async () => {
      const validCategories = ['punctuality', 'cleanliness', 'communication', 'safety', 'overall'];

      for (const category of validCategories) {
        const ratingData = {
          rater: global.testUtils.createObjectId(),
          ratee: global.testUtils.createObjectId(),
          rideId: global.testUtils.createObjectId(),
          rating: 5,
          category
        };

        const rating = new Rating(ratingData);
        await expect(rating.save()).resolves.toBeDefined();
      }
    });

    it('should reject invalid category values', async () => {
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5,
        category: 'invalid_category'
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should validate comment length', async () => {
      const longComment = 'a'.repeat(501); // 501 characters
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5,
        comment: longComment
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).rejects.toThrow();
    });

    it('should accept comment at maximum length', async () => {
      const maxComment = 'a'.repeat(500); // 500 characters
      const ratingData = {
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5,
        comment: maxComment
      };

      const rating = new Rating(ratingData);
      await expect(rating.save()).resolves.toBeDefined();
    });
  });

  describe('Rating Indexes', () => {
    it('should have unique index on rater, ratee, rideId, and isRiderRating', async () => {
      // Create a rating first to ensure collection exists
      await global.testUtils.createTestUser();
      const rater = await global.testUtils.createTestUser({ email: 'rater@bracu.ac.bd' });
      const ratee = await global.testUtils.createTestUser({ email: 'ratee@bracu.ac.bd' });
      await Rating.create({
        rater: rater._id,
        ratee: ratee._id,
        rideId: global.testUtils.createObjectId(),
        rating: 5,
        isRiderRating: true
      });
      await Rating.ensureIndexes();
      const indexes = await Rating.collection.getIndexes();
      expect(indexes).toHaveProperty('rater_1_ratee_1_rideId_1_isRiderRating_1');
    });

    it('should prevent duplicate ratings', async () => {
      const rater = global.testUtils.createObjectId();
      const ratee = global.testUtils.createObjectId();
      const rideId = global.testUtils.createObjectId();

      const rating1 = new Rating({
        rater,
        ratee,
        rideId,
        rating: 5,
        isRiderRating: true
      });
      await rating1.save();

      const rating2 = new Rating({
        rater,
        ratee,
        rideId,
        rating: 4,
        isRiderRating: true
      });

      await expect(rating2.save()).rejects.toThrow();
    });

    it('should allow different rater for same ratee and ride', async () => {
      const rater1 = global.testUtils.createObjectId();
      const rater2 = global.testUtils.createObjectId();
      const ratee = global.testUtils.createObjectId();
      const rideId = global.testUtils.createObjectId();

      const rating1 = new Rating({
        rater: rater1,
        ratee,
        rideId,
        rating: 5,
        isRiderRating: true
      });
      await rating1.save();

      const rating2 = new Rating({
        rater: rater2,
        ratee,
        rideId,
        rating: 4,
        isRiderRating: true
      });

      await expect(rating2.save()).resolves.toBeDefined();
    });

    it('should allow same rater for different isRiderRating values', async () => {
      const rater = global.testUtils.createObjectId();
      const ratee = global.testUtils.createObjectId();
      const rideId = global.testUtils.createObjectId();

      const rating1 = new Rating({
        rater,
        ratee,
        rideId,
        rating: 5,
        isRiderRating: true
      });
      await rating1.save();

      const rating2 = new Rating({
        rater,
        ratee,
        rideId,
        rating: 4,
        isRiderRating: false
      });

      await expect(rating2.save()).resolves.toBeDefined();
    });
  });

  describe('Rating Static Methods', () => {
    let user1, user2, user3, ride1, ride2;

    beforeEach(async () => {
      user1 = global.testUtils.createObjectId();
      user2 = global.testUtils.createObjectId();
      user3 = global.testUtils.createObjectId();
      ride1 = global.testUtils.createObjectId();
      ride2 = global.testUtils.createObjectId();

      // Create ratings for user1
      await Rating.create([
        {
          rater: user2,
          ratee: user1,
          rideId: ride1,
          rating: 5,
          category: 'overall',
          isRiderRating: true
        },
        {
          rater: user3,
          ratee: user1,
          rideId: ride1,
          rating: 4,
          category: 'overall',
          isRiderRating: true
        },
        {
          rater: user2,
          ratee: user1,
          rideId: ride2,
          rating: 3,
          category: 'punctuality',
          isRiderRating: true
        },
        {
          rater: user3,
          ratee: user1,
          rideId: ride2,
          rating: 5,
          category: 'punctuality',
          isRiderRating: true
        }
      ]);
    });

    it('should calculate average rating correctly', async () => {
      const result = await Rating.getAverageRating(user1);

      expect(result.averageRating).toBe(4.3); // rounded from (5 + 4 + 3 + 5) / 4
      expect(result.totalRatings).toBe(4);
    });

    it('should return zero for user with no ratings', async () => {
      const newUser = global.testUtils.createObjectId();
      const result = await Rating.getAverageRating(newUser);

      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
    });

    it('should get ratings by category correctly', async () => {
      const result = await Rating.getRatingsByCategory(user1);

      expect(result.overall).toBeDefined();
      expect(result.overall.averageRating).toBe(4.5); // (5 + 4) / 2
      expect(result.overall.totalRatings).toBe(2);

      expect(result.punctuality).toBeDefined();
      expect(result.punctuality.averageRating).toBe(4); // (3 + 5) / 2
      expect(result.punctuality.totalRatings).toBe(2);
    });

    it('should return empty object for user with no ratings by category', async () => {
      const newUser = global.testUtils.createObjectId();
      const result = await Rating.getRatingsByCategory(newUser);

      expect(result).toEqual({});
    });
  });

  describe('Rating Queries', () => {
    let user1, user2, user3, ride1, rating1, rating2, rating3;

    beforeEach(async () => {
      user1 = global.testUtils.createObjectId();
      user2 = global.testUtils.createObjectId();
      user3 = global.testUtils.createObjectId();
      ride1 = global.testUtils.createObjectId();

      rating1 = new Rating({
        rater: user2,
        ratee: user1,
        rideId: ride1,
        rating: 5,
        category: 'overall',
        isRiderRating: true
      });
      await rating1.save();

      rating2 = new Rating({
        rater: user3,
        ratee: user1,
        rideId: ride1,
        rating: 4,
        category: 'punctuality',
        isRiderRating: true
      });
      await rating2.save();

      rating3 = new Rating({
        rater: user1,
        ratee: user2,
        rideId: ride1,
        rating: 3,
        category: 'overall',
        isRiderRating: false
      });
      await rating3.save();
    });

    it('should find ratings by ratee', async () => {
      const ratings = await Rating.find({ ratee: user1 });
      
      expect(ratings).toHaveLength(2);
      expect(ratings.map(r => r._id.toString())).toContain(rating1._id.toString());
      expect(ratings.map(r => r._id.toString())).toContain(rating2._id.toString());
    });

    it('should find ratings by rater', async () => {
      const ratings = await Rating.find({ rater: user2 });
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0]._id.toString()).toBe(rating1._id.toString());
    });

    it('should find ratings by ride', async () => {
      const ratings = await Rating.find({ rideId: ride1 });
      
      expect(ratings).toHaveLength(3);
    });

    it('should find ratings by category', async () => {
      const ratings = await Rating.find({ category: 'overall' });
      
      expect(ratings).toHaveLength(2);
      expect(ratings.map(r => r._id.toString())).toContain(rating1._id.toString());
      expect(ratings.map(r => r._id.toString())).toContain(rating3._id.toString());
    });

    it('should find rider ratings', async () => {
      const ratings = await Rating.find({ isRiderRating: true });
      
      expect(ratings).toHaveLength(2);
      expect(ratings.map(r => r._id.toString())).toContain(rating1._id.toString());
      expect(ratings.map(r => r._id.toString())).toContain(rating2._id.toString());
    });

    it('should find passenger ratings', async () => {
      const ratings = await Rating.find({ isRiderRating: false });
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0]._id.toString()).toBe(rating3._id.toString());
    });

    it('should find ratings by rating value', async () => {
      const ratings = await Rating.find({ rating: 5 });
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0]._id.toString()).toBe(rating1._id.toString());
    });

    it('should find ratings with comments', async () => {
      const ratingWithComment = new Rating({
        rater: user2,
        ratee: user3,
        rideId: ride1,
        rating: 4,
        comment: 'Great ride!'
      });
      await ratingWithComment.save();

      const ratings = await Rating.find({ comment: { $ne: '' } });
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0]._id.toString()).toBe(ratingWithComment._id.toString());
    });
  });

  describe('Rating Timestamps', () => {
    it('should have createdAt and updatedAt timestamps', async () => {
      const rating = new Rating({
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5
      });
      await rating.save();

      expect(rating.createdAt).toBeDefined();
      expect(rating.updatedAt).toBeDefined();
      expect(rating.createdAt).toBeInstanceOf(Date);
      expect(rating.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const rating = new Rating({
        rater: global.testUtils.createObjectId(),
        ratee: global.testUtils.createObjectId(),
        rideId: global.testUtils.createObjectId(),
        rating: 5
      });
      await rating.save();

      const originalUpdatedAt = rating.updatedAt;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      rating.comment = 'Updated comment';
      await rating.save();
      
      expect(rating.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
