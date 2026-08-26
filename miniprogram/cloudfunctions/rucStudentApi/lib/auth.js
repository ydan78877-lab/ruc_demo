const crypto = require('crypto')

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function safeEqual(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

function verifyPassword(password, encoded) {
  if (!encoded || typeof encoded !== 'string') return false
  const [algorithm, salt, expected] = encoded.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const actual = crypto.scryptSync(password, salt, 64).toString('hex')
  return safeEqual(actual, expected)
}

function signSession(payload, secret) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured')
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

function verifySession(token, secret) {
  if (!token || !secret) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!safeEqual(signature, expected)) return null
  try {
    const payload = JSON.parse(base64UrlDecode(body))
    if (payload.role !== 'superadmin' || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

module.exports = { hashPassword, verifyPassword, signSession, verifySession, sha256 }
