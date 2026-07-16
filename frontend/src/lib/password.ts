/**
 * Generate a random password for a newly created account.
 *
 * Uses crypto.getRandomValues (not Math.random) and an alphabet with the
 * look-alike characters removed (0/O, 1/l/I) so it can be read out or typed
 * from a message without confusion.
 */
export function randomPassword(len = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rnd = new Uint32Array(len)
  crypto.getRandomValues(rnd)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[rnd[i] % chars.length]
  return out
}
