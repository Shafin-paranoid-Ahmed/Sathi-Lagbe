const {
  databaseNameFromUri,
  resetUserPassword,
} = require('../../../scripts/reset-password');

describe('reset-password safety', () => {
  describe('databaseNameFromUri', () => {
    it('extracts and decodes the database name', () => {
      expect(databaseNameFromUri('mongodb+srv://host/my%20database?retryWrites=true'))
        .toBe('my database');
    });

    it.each([
      'mongodb+srv://host/?retryWrites=true',
      'not a MongoDB URI',
    ])('returns an empty name for %s', (uri) => {
      expect(databaseNameFromUri(uri)).toBe('');
    });
  });

  describe('resetUserPassword', () => {
    function createUserModel(user, modifiedCount = 1) {
      const lean = jest.fn().mockResolvedValue(user);
      const select = jest.fn().mockReturnValue({ lean });
      return {
        findOne: jest.fn().mockReturnValue({ select }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount }),
      };
    }

    it('confirms the account and updates only its password hash', async () => {
      const user = {
        _id: 'user-id',
        email: 'student@g.bracu.ac.bd',
        bracuId: '12345678',
      };
      const UserModel = createUserModel(user);
      const confirmReset = jest.fn().mockResolvedValue(true);
      const hashPassword = jest.fn().mockResolvedValue('bcrypt-hash');
      const query = { email: user.email };

      await resetUserPassword({
        query,
        newPassword: 'newPassword123',
        confirmReset,
        UserModel,
        hashPassword,
      });

      expect(UserModel.findOne).toHaveBeenCalledWith(query);
      expect(confirmReset).toHaveBeenCalledWith(user);
      expect(hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { _id: user._id },
        { $set: { password: 'bcrypt-hash' } }
      );
    });

    it('does not hash or update without explicit confirmation', async () => {
      const UserModel = createUserModel({ _id: 'user-id', email: 'student@bracu.ac.bd' });
      const hashPassword = jest.fn();

      await expect(resetUserPassword({
        query: { email: 'student@bracu.ac.bd' },
        newPassword: 'newPassword123',
        confirmReset: jest.fn().mockResolvedValue(false),
        UserModel,
        hashPassword,
      })).rejects.toThrow('Password reset cancelled.');

      expect(hashPassword).not.toHaveBeenCalled();
      expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it('reports when the selected user was not modified', async () => {
      const UserModel = createUserModel({ _id: 'user-id' }, 0);

      await expect(resetUserPassword({
        query: { bracuId: '12345678' },
        newPassword: 'newPassword123',
        confirmReset: jest.fn().mockResolvedValue(true),
        UserModel,
        hashPassword: jest.fn().mockResolvedValue('bcrypt-hash'),
      })).rejects.toThrow('The password was not updated.');
    });
  });
});
