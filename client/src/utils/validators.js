export const BD_PHONE_REGEX = /^\+880\d{10}$/;

export function isValidBangladeshPhone(phone) {
  if (typeof phone !== 'string') return false;
  return BD_PHONE_REGEX.test(phone.trim());
}
