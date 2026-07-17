const {
  buildIdentifierQuery,
  validateNewPassword,
} = require('../../../scripts/reset-password');

describe('reset-password utility', () => {
  describe('buildIdentifierQuery', () => {
    it('normalizes an email address', () => {
      expect(buildIdentifierQuery('  Student@G.BRACU.AC.BD  ')).toEqual({
        email: 'student@g.bracu.ac.bd',
      });
    });

    it('accepts an eight-digit BRACU ID', () => {
      expect(buildIdentifierQuery('12345678')).toEqual({ bracuId: '12345678' });
    });

    it('rejects an invalid identifier', () => {
      expect(() => buildIdentifierQuery('student')).toThrow(
        'Enter a valid BRACU email or an 8-digit BRACU ID.'
      );
    });
  });

  describe('validateNewPassword', () => {
    it('accepts a password containing letters and numbers', () => {
      expect(validateNewPassword('newPassword123')).toBe('newPassword123');
    });

    it.each(['short1', 'onlyletters', '12345678'])(
      'rejects the weak password %s',
      (password) => {
        expect(() => validateNewPassword(password)).toThrow(
          'Password must be at least 8 characters and include both letters and numbers.'
        );
      }
    );
  });
});
