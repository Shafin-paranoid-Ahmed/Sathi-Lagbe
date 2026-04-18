// server/utils/jwt.js
const jwt = require('jsonwebtoken');

/**
 * Resolve the JWT secret from a single env var. Throws if missing so misconfigured
 * deploys fail fast instead of silently signing/verifying with a known fallback.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 16 characters'
    );
  }
  return secret;
}

/**
 * Sign a payload with the app-wide JWT secret.
 * @param {object} payload
 * @param {jwt.SignOptions} [options]
 */
function signToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', ...options });
}

/**
 * Verify a token with the app-wide JWT secret. Throws on invalid/expired.
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = { getJwtSecret, signToken, verifyToken };
