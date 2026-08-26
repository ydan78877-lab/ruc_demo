import crypto from 'node:crypto'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('用法: node scripts/hash-admin-password.mjs "至少12位的管理员密码"')
  process.exit(1)
}

const salt = crypto.randomBytes(16).toString('hex')
const derived = crypto.scryptSync(password, salt, 64).toString('hex')
console.log(`scrypt$${salt}$${derived}`)
