const cloud = require('wx-server-sdk')
const { createStore } = require('./lib/store')
const { validateOnboarding } = require('./lib/validation')
const { verifyPassword, signSession, verifySession, sha256 } = require('./lib/auth')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const store = createStore(cloud)

function ok(data = {}) {
  return { ok: true, ...data }
}

function failure(error) {
  return {
    ok: false,
    code: error.code || 'INTERNAL_ERROR',
    message: error.code ? error.message : '服务暂时不可用',
    ...(error.current ? { current: error.current } : {})
  }
}

async function handleUserAction(userId, event) {
  const action = event.action || 'bootstrap'
  const user = await store.ensureUser(userId)
  if (user.status === 'disabled') throw Object.assign(new Error('账号已被禁用，请联系管理员'), { code: 'ACCOUNT_DISABLED' })
  if (action === 'bootstrap') return ok(await store.bootstrap(userId))
  if (action === 'completeOnboarding') {
    const profile = validateOnboarding(event.profile)
    return ok(await store.completeOnboarding(userId, profile, event.templateConfig))
  }
  if (action === 'saveData') {
    return ok({ data: await store.saveData(userId, event.data, event.expectedVersion) })
  }
  if (action === 'campusBootstrap') return ok({ snapshot: await store.campusSnapshot(userId) })

  const campusActions = {
    campusCreateSpace: () => store.campusCreateSpace(userId, event.space),
    campusJoinSpace: () => store.campusJoinSpace(userId, event.code),
    campusUpdateJoinPolicy: () => store.campusUpdateJoinPolicy(userId, event.spaceId, event.approvalRequired),
    campusResetJoinCode: () => store.campusResetJoinCode(userId, event.spaceId),
    campusReviewJoin: () => store.campusReviewJoin(userId, event.spaceId, event.requestId, event.decision),
    campusSetMemberRole: () => store.campusSetMemberRole(userId, event.spaceId, event.memberId, event.role),
    campusTransferOwnership: () => store.campusTransferOwnership(userId, event.spaceId, event.memberId),
    campusRemoveMember: () => store.campusRemoveMember(userId, event.spaceId, event.memberId),
    campusDissolveSpace: () => store.campusDissolveSpace(userId, event.spaceId),
    campusSaveMatter: () => store.campusSaveMatter(userId, event.matter, event.draft),
    campusSetMatterState: () => store.campusSetMatterState(userId, event.matterId, event.status),
    campusDeletePersonalMatter: () => store.campusDeletePersonalMatter(userId, event.matterId),
    campusPrepareResourceUpload: () => store.campusPrepareResourceUpload(userId, event.upload),
    campusCompleteResourceUpload: () => store.campusCompleteResourceUpload(userId, event.ticketId, event.fileID),
    campusDeleteResource: () => store.campusDeleteResource(userId, event.resourceId),
    campusGetResourceDownload: () => store.campusGetResourceDownload(userId, event.resourceId, event.versionId)
  }
  if (campusActions[action]) {
    const result = await campusActions[action]()
    return ok({ ...result, snapshot: await store.campusSnapshot(userId) })
  }
  throw Object.assign(new Error('未知操作'), { code: 'UNKNOWN_ACTION' })
}

async function handleMiniProgram(event) {
  const context = cloud.getWXContext()
  const userId = context.OPENID
  if (!userId) throw Object.assign(new Error('无法识别微信账号'), { code: 'WECHAT_IDENTITY_MISSING' })
  return handleUserAction(userId, event)
}

function requestOrigin(event) {
  return event.headers?.origin || event.headers?.Origin || ''
}

function allowedOrigin(origin) {
  if (!origin) return '*'
  const configured = String(process.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (configured.includes(origin)) return origin
  if (/^https:\/\/[a-z0-9-]+\.(tcloudbaseapp|tcloudbase)\.com$/i.test(origin)) return origin
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return origin
  return configured[0] || 'null'
}

function httpResponse(event, statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin(requestOrigin(event)),
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin'
    },
    body: JSON.stringify(data)
  }
}

function parseBody(event) {
  if (!event.body) return {}
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    throw Object.assign(new Error('请求内容格式错误'), { code: 'INVALID_JSON' })
  }
}

function normalizePath(path) {
  const value = `/${String(path || '').replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/'
  return value === '/api' ? '/' : value.startsWith('/api/') ? value.slice(4) : value
}

function bearer(event) {
  const value = event.headers?.authorization || event.headers?.Authorization || ''
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function requireAdmin(event) {
  const payload = verifySession(bearer(event), process.env.ADMIN_SESSION_SECRET)
  if (!payload) throw Object.assign(new Error('登录状态已失效'), { code: 'ADMIN_UNAUTHORIZED', statusCode: 401 })
  return payload
}

function clientIp(event) {
  return event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || event.requestContext?.sourceIp || 'unknown'
}

async function login(event, body) {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_SESSION_SECRET) {
    throw Object.assign(new Error('管理员账号尚未完成安全配置'), { code: 'ADMIN_NOT_CONFIGURED', statusCode: 503 })
  }
  const ipHash = sha256(clientIp(event))
  const throttle = await store.getLoginThrottle(ipHash)
  if (throttle && Number(throttle.failures || 0) >= 5 && Date.now() - Number(throttle.windowStartedAt || 0) < 15 * 60 * 1000) {
    throw Object.assign(new Error('尝试次数过多，请15分钟后重试'), { code: 'LOGIN_THROTTLED', statusCode: 429 })
  }
  const usernameMatches = String(body.username || '') === process.env.ADMIN_USERNAME
  const passwordMatches = verifyPassword(String(body.password || ''), process.env.ADMIN_PASSWORD_HASH)
  if (!usernameMatches || !passwordMatches) {
    await store.recordLoginFailure(ipHash)
    throw Object.assign(new Error('账号或密码不正确'), { code: 'INVALID_CREDENTIALS', statusCode: 401 })
  }
  await store.clearLoginFailures(ipHash)
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000
  const token = signSession({ role: 'superadmin', username: process.env.ADMIN_USERNAME, exp: expiresAt }, process.env.ADMIN_SESSION_SECRET)
  await store.addAudit('admin.login', '', { ipHash })
  return { token, expiresAt, username: process.env.ADMIN_USERNAME }
}

async function handleHttp(event) {
  if (event.httpMethod === 'OPTIONS') return httpResponse(event, 204, {})
  const path = normalizePath(event.path)
  const method = event.httpMethod || 'GET'
  const body = parseBody(event)

  try {
    if (path === '/health' && method === 'GET') return httpResponse(event, 200, ok({ service: 'rucStudentApi' }))
    if (path === '/auth/login' && method === 'POST') return httpResponse(event, 200, ok(await login(event, body)))

    requireAdmin(event)

    if (path === '/admin/me' && method === 'GET') return httpResponse(event, 200, ok({ username: process.env.ADMIN_USERNAME }))
    if (path === '/admin/users' && method === 'GET') return httpResponse(event, 200, ok({ users: await store.listUsers() }))
    if (path === '/admin/campus' && method === 'GET') return httpResponse(event, 200, ok(await store.adminCampusOverview()))
    if (path === '/admin/audit' && method === 'GET') return httpResponse(event, 200, ok({ logs: await store.listAudit() }))
    if (path === '/admin/export' && method === 'GET') return httpResponse(event, 200, ok({ records: await store.exportAll() }))
    if (path === '/admin/developer-account' && method === 'GET') return httpResponse(event, 200, ok({ userId: await store.getDeveloperUserId() }))
    if (path === '/admin/developer-account' && method === 'PUT') {
      const userId = await store.setDeveloperUserId(String(body.userId || ''))
      await store.addAudit('developer.bind', userId)
      return httpResponse(event, 200, ok({ userId }))
    }
    if (path === '/developer/bootstrap' && method === 'GET') {
      const userId = await store.getDeveloperUserId()
      if (!userId) throw Object.assign(new Error('尚未绑定本地开发账号'), { code: 'DEVELOPER_ACCOUNT_NOT_BOUND', statusCode: 409 })
      return httpResponse(event, 200, ok(await store.getUser(userId)))
    }
    if (path === '/developer/data' && method === 'PUT') {
      const userId = await store.getDeveloperUserId()
      if (!userId) throw Object.assign(new Error('尚未绑定本地开发账号'), { code: 'DEVELOPER_ACCOUNT_NOT_BOUND', statusCode: 409 })
      const data = await store.saveData(userId, body.data, body.expectedVersion)
      await store.addAudit('developer.data.update', userId, { version: data.version })
      return httpResponse(event, 200, ok({ data }))
    }
    if (path === '/developer/action' && method === 'POST') {
      const userId = await store.getDeveloperUserId()
      if (!userId) throw Object.assign(new Error('尚未绑定本地开发账号'), { code: 'DEVELOPER_ACCOUNT_NOT_BOUND', statusCode: 409 })
      return httpResponse(event, 200, await handleUserAction(userId, body))
    }

    const match = path.match(/^\/admin\/users\/([^/]+)(?:\/(status))?$/)
    if (match) {
      const userId = decodeURIComponent(match[1])
      if (!match[2] && method === 'GET') {
        const record = await store.getUser(userId)
        if (!record) throw Object.assign(new Error('账号不存在'), { code: 'ACCOUNT_NOT_FOUND', statusCode: 404 })
        return httpResponse(event, 200, ok(record))
      }
      if (!match[2] && method === 'PUT') {
        const record = await store.updateUserData(userId, body.data || {})
        await store.addAudit('user.data.update', userId, { version: record.data.version })
        return httpResponse(event, 200, ok(record))
      }
      if (match[2] === 'status' && method === 'PUT') {
        const user = await store.setStatus(userId, body.status)
        await store.addAudit(`user.${body.status}`, userId)
        return httpResponse(event, 200, ok({ user }))
      }
    }

    return httpResponse(event, 404, failure(Object.assign(new Error('接口不存在'), { code: 'NOT_FOUND' })))
  } catch (error) {
    return httpResponse(event, error.statusCode || (error.code ? 400 : 500), failure(error))
  }
}

exports.main = async (event) => {
  if (event && (event.httpMethod || event.requestContext)) return handleHttp(event)
  try {
    return await handleMiniProgram(event || {})
  } catch (error) {
    return failure(error)
  }
}
