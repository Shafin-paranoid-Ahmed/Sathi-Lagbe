const path = require('path');
const readline = require('readline/promises');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

function buildIdentifierQuery(value) {
  const identifier = String(value || '').trim();

  if (/^\d{8}$/.test(identifier)) return { bracuId: identifier };
  if (/^[^@\s]+@(?:g\.)?bracu\.ac\.bd$/i.test(identifier)) {
    return { email: identifier.toLowerCase() };
  }

  throw new Error('Enter a valid BRACU email or an 8-digit BRACU ID.');
}

function validateNewPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      'Password must be at least 8 characters and include both letters and numbers.'
    );
  }
  return password;
}

async function promptText(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

function promptHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error('A real interactive terminal is required for hidden input.');
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const wasRaw = Boolean(input.isRaw);
    let value = '';
    let finished = false;

    const cleanup = () => {
      input.removeListener('data', onData);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write('\n');
    };
    const finish = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new Error('Password reset cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\b' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(question);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

function databaseNameFromUri(uri) {
  try {
    return decodeURIComponent(new URL(uri).pathname.replace(/^\//, '')).trim();
  } catch {
    return '';
  }
}

async function resetUserPassword({
  query,
  newPassword,
  confirmReset,
  UserModel = User,
  hashPassword = (password) => bcrypt.hash(password, 10),
}) {
  validateNewPassword(newPassword);

  const user = await UserModel.findOne(query).select('_id name email bracuId').lean();
  if (!user) throw new Error('No user was found for that email or BRACU ID.');
  if (!await confirmReset(user)) throw new Error('Password reset cancelled.');

  const passwordHash = await hashPassword(newPassword);
  const result = await UserModel.updateOne(
    { _id: user._id },
    { $set: { password: passwordHash } }
  );
  if (result.modifiedCount !== 1) throw new Error('The password was not updated.');

  return user;
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command directly in an interactive terminal.');
  }

  const identifier = await promptText('BRACU email or 8-digit BRACU ID: ');
  const query = buildIdentifierQuery(identifier);
  const newPassword = validateNewPassword(await promptHidden('New password: '));
  const confirmation = await promptHidden('Confirm new password: ');
  if (newPassword !== confirmation) throw new Error('The two passwords do not match.');

  const mongoUri = process.env.MONGO_URI || await promptHidden('MongoDB URI: ');
  if (!mongoUri) throw new Error('MONGO_URI is required.');

  let dbName = process.env.MONGO_DB_NAME || databaseNameFromUri(mongoUri);
  if (!dbName) dbName = (await promptText('MongoDB database name: ')).trim();
  if (!dbName) {
    throw new Error('A MongoDB database name is required to avoid updating the wrong database.');
  }

  try {
    await mongoose.connect(mongoUri, { dbName });
    await resetUserPassword({
      query,
      newPassword,
      confirmReset: async (user) => {
        const answer = await promptText(
          `Reset password for ${user.email} (${user.bracuId || 'no BRACU ID'})? Type RESET: `
        );
        return answer === 'RESET';
      },
    });

    console.log('Password reset successfully. You can now sign in with the new password.');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Password reset failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildIdentifierQuery,
  databaseNameFromUri,
  resetUserPassword,
  validateNewPassword,
};
