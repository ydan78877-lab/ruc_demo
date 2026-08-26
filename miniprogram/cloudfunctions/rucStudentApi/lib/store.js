const { bundleOf, profileOf, publicUser, validateOnboarding } = require('./validation')

const COLLECTIONS = {
  users: 'users',
  data: 'student_data',
  config: 'admin_config',
  audit: 'admin_audit_logs',
  security: 'admin_security',
  campusSpaces: 'campus_spaces',
  campusMembers: 'campus_members',
  campusJoinRequests: 'campus_join_requests',
  campusMatters: 'campus_matters',
  campusMatterStates: 'campus_matter_states',
  personalMatters: 'personal_matters',
  campusResources: 'campus_resources',
  campusResourceVersions: 'campus_resource_versions',
  campusResourceUploads: 'campus_resource_uploads'
}

const CAMPUS_ROLES = ['空间负责人', '管理员', '成员']
const RESOURCE_CATEGORIES = ['课件', '阅读材料', '作业资料', '其他']
const RESOURCE_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'jpg', 'jpeg', 'png', 'webp']
const RESOURCE_MAX_BYTES = 20 * 1024 * 1024

function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function campusError(code, message) {
  return Object.assign(new Error(message), { code })
}

function publicCampusSpace(space, role) {
  return {
    id: space._id,
    name: space.name,
    type: space.type,
    role,
    members: Number(space.memberCount || 0),
    code: space.code || '',
    approvalRequired: Boolean(space.approvalRequired),
    tone: space.tone || (space.type === '班级' ? 'teal' : 'blue'),
    status: space.status || 'active',
    createdAt: space.createdAt || '',
    updatedAt: space.updatedAt || '',
    dissolvedAt: space.dissolvedAt || ''
  }
}

function publicCampusMatter(matter) {
  return {
    id: matter._id,
    scope: matter.scope === 'personal' ? 'personal' : 'space',
    spaceId: matter.spaceId,
    space: matter.space,
    title: matter.title,
    time: matter.time,
    date: matter.date || '',
    clock: matter.clock || '',
    location: matter.location || '',
    status: matter.status || '待处理',
    tone: matter.tone || 'blue',
    icon: matter.icon || 'list-blue',
    type: matter.type || '通知',
    action: matter.action || '确认收到',
    body: matter.body || '',
    priority: matter.priority || '普通',
    diff: Array.isArray(matter.diff) ? matter.diff : [],
    associatedResourceIds: Array.isArray(matter.associatedResourceIds) ? matter.associatedResourceIds : [],
    version: Number(matter.version || 1),
    createdAt: matter.createdAt || '',
    updatedAt: matter.updatedAt || ''
  }
}

function formatResourceSize(bytes) {
  const size = Number(bytes || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function publicCampusResource(resource) {
  return {
    id: resource._id,
    spaceId: resource.spaceId,
    category: resource.category,
    title: resource.title,
    meta: `v${Number(resource.currentVersion || 1)} · ${formatResourceSize(resource.size)}`,
    currentVersion: Number(resource.currentVersion || 1),
    fileName: resource.fileName || '',
    extension: resource.extension || '',
    size: Number(resource.size || 0),
    previewKind: resource.previewKind === 'image' ? 'image' : 'document',
    createdAt: resource.createdAt || '',
    updatedAt: resource.updatedAt || ''
  }
}

function publicCampusResourceVersion(version, currentVersion) {
  const uploadedAt = version.uploadedAt || ''
  const date = uploadedAt ? new Date(uploadedAt) : null
  const dateLabel = date && Number.isFinite(date.getTime()) ? `${date.getMonth() + 1}月${date.getDate()}日` : ''
  return {
    id: version._id,
    resourceId: version.resourceId,
    version: Number(version.version || 1),
    fileName: version.fileName || '',
    extension: version.extension || '',
    size: Number(version.size || 0),
    label: `${Number(version.version || 1) === Number(currentVersion) ? '当前版本' : `v${Number(version.version || 1)}`} · ${dateLabel}`,
    uploadedAt
  }
}

function validateCampusResourceInput(input = {}) {
  const fileName = cleanText(input.fileName, 160)
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
  const title = cleanText(input.title || fileName.replace(/\.[^.]+$/, ''), 100)
  const category = RESOURCE_CATEGORIES.includes(input.category) ? input.category : '其他'
  const size = Number(input.size || 0)
  if (!title) throw campusError('CAMPUS_RESOURCE_TITLE_REQUIRED', '资料名称不能为空')
  if (!RESOURCE_EXTENSIONS.includes(extension)) throw campusError('CAMPUS_RESOURCE_TYPE_UNSUPPORTED', '暂不支持该文件格式')
  if (!Number.isFinite(size) || size <= 0 || size > RESOURCE_MAX_BYTES) throw campusError('CAMPUS_RESOURCE_SIZE_INVALID', '文件大小需在20MB以内')
  return {
    title,
    category,
    fileName,
    extension,
    size,
    previewKind: ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? 'image' : 'document'
  }
}

function replacementDataUpdate(command, bundle, version, updatedAt) {
  return {
    profile: command.set(bundle.profile),
    experiences: command.set(bundle.experiences),
    graduationChecks: command.set(bundle.graduationChecks),
    templateConfig: command.set(bundle.templateConfig),
    todoStates: command.set(bundle.todoStates),
    notes: bundle.notes,
    version,
    updatedAt
  }
}

function buildAdminCampusOverview({ spaces = [], members = [], matters = [], matterStates = [], personalMatters = [], users = [] } = {}) {
  const userById = Object.fromEntries(users.map((user) => [user._id, user]))
  const membersBySpace = {}
  for (const member of members) {
    if (!membersBySpace[member.spaceId]) membersBySpace[member.spaceId] = []
    const user = userById[member.userId] || {}
    membersBySpace[member.spaceId].push({
      id: member._id,
      userId: member.userId,
      name: user.name || '未完成建档',
      cohort: user.cohort || '',
      major: user.major || '',
      role: member.role || '成员',
      joinedAt: member.joinedAt || ''
    })
  }
  Object.values(membersBySpace).forEach((items) => items.sort((a, b) => CAMPUS_ROLES.indexOf(a.role) - CAMPUS_ROLES.indexOf(b.role)))

  const stateByMatterAndUser = Object.fromEntries(matterStates.map((state) => [`${state.matterId}:${state.userId}`, state]))
  const spaceById = Object.fromEntries(spaces.map((space) => [space._id, space]))
  const reminders = []
  for (const matter of matters.filter((item) => item.status !== '草稿')) {
    const space = spaceById[matter.spaceId]
    if (!space) continue
    for (const member of membersBySpace[matter.spaceId] || []) {
      const state = stateByMatterAndUser[`${matter._id}:${member.userId}`]
      reminders.push({
        id: `${matter._id}:${member.userId}`,
        matterId: matter._id,
        scope: 'space',
        userId: member.userId,
        userName: member.name,
        userCohort: member.cohort,
        userMajor: member.major,
        spaceId: matter.spaceId,
        spaceName: space.name,
        title: matter.title,
        type: matter.type || '通知',
        status: matter.status === '已取消' ? '已取消' : state?.status || '待处理',
        sourceStatus: matter.status || '待处理',
        action: matter.action || '确认收到',
        date: matter.date || '',
        clock: matter.clock || '',
        time: matter.time || '',
        priority: matter.priority || '普通',
        updatedAt: state?.updatedAt || matter.updatedAt || ''
      })
    }
  }
  for (const matter of personalMatters.filter((item) => item.status !== '草稿')) {
    const user = userById[matter.ownerId] || {}
    reminders.push({
      id: `personal:${matter._id}`,
      matterId: matter._id,
      scope: 'personal',
      userId: matter.ownerId,
      userName: user.name || '未完成建档',
      userCohort: user.cohort || '',
      userMajor: user.major || '',
      spaceId: '',
      spaceName: '个人事项',
      title: matter.title,
      type: matter.type || '个人提醒',
      status: matter.status || '待处理',
      sourceStatus: matter.status || '待处理',
      action: matter.action || '标记完成',
      date: matter.date || '',
      clock: matter.clock || '',
      time: matter.time || '',
      priority: matter.priority || '普通',
      updatedAt: matter.updatedAt || ''
    })
  }

  const mattersBySpace = matters.filter((item) => item.status !== '草稿').reduce((result, matter) => {
    result[matter.spaceId] = (result[matter.spaceId] || 0) + 1
    return result
  }, {})
  const pendingBySpace = reminders.filter((item) => item.scope === 'space' && item.status === '待处理').reduce((result, item) => {
    result[item.spaceId] = (result[item.spaceId] || 0) + 1
    return result
  }, {})

  return {
    spaces: spaces.map((space) => ({
      id: space._id,
      name: space.name,
      type: space.type,
      status: space.status || 'active',
      approvalRequired: Boolean(space.approvalRequired),
      code: space.code || '',
      ownerId: space.ownerId || '',
      ownerName: userById[space.ownerId]?.name || '未完成建档',
      memberCount: (membersBySpace[space._id] || []).length,
      matterCount: mattersBySpace[space._id] || 0,
      pendingCount: pendingBySpace[space._id] || 0,
      createdAt: space.createdAt || '',
      updatedAt: space.updatedAt || '',
      members: membersBySpace[space._id] || []
    })).sort((a, b) => Number(a.status === 'dissolved') - Number(b.status === 'dissolved') || String(b.updatedAt).localeCompare(String(a.updatedAt))),
    reminders: reminders.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    syncedAt: new Date().toISOString()
  }
}

function createStore(cloud) {
  const db = cloud.database()
  const command = db.command

  async function findOne(collection, id) {
    const result = await db.collection(collection).where({ _id: id }).limit(1).get()
    return result.data[0] || null
  }

  async function addIfMissing(collection, document) {
    const existing = await findOne(collection, document._id)
    if (existing) return existing
    try {
      await db.collection(collection).add({ data: document })
      return document
    } catch (error) {
      const raced = await findOne(collection, document._id)
      if (raced) return raced
      throw error
    }
  }

  // command.in 每批最多 20 个 id，各批之间没有依赖，因此并发发出。
  async function findManyByIds(collection, ids) {
    const unique = [...new Set(ids.filter(Boolean))]
    const batches = []
    for (let index = 0; index < unique.length; index += 20) batches.push(unique.slice(index, index + 20))
    const results = await Promise.all(batches.map((batch) =>
      db.collection(collection).where({ _id: command.in(batch) }).limit(100).get()
    ))
    return results.flatMap((result) => result.data)
  }

  async function listAll(collection, max = 1000) {
    const records = []
    for (let offset = 0; offset < max; offset += 100) {
      const result = await db.collection(collection).skip(offset).limit(Math.min(100, max - offset)).get()
      records.push(...result.data)
      if (result.data.length < 100) break
    }
    return records
  }

  async function listWhere(collection, where, limit = 100) {
    const result = await db.collection(collection).where(where).limit(limit).get()
    return result.data
  }

  async function membershipFor(userId, spaceId) {
    const records = await listWhere(COLLECTIONS.campusMembers, { userId, spaceId }, 1)
    return records[0] || null
  }

  async function requireCampusMembership(userId, spaceId) {
    const membership = await membershipFor(userId, spaceId)
    if (!membership) throw campusError('CAMPUS_NOT_MEMBER', '你还不是该空间成员')
    return membership
  }

  async function requireCampusSpace(spaceId, active = false) {
    const space = await findOne(COLLECTIONS.campusSpaces, spaceId)
    if (!space) throw campusError('CAMPUS_SPACE_NOT_FOUND', '空间不存在')
    if (active && space.status === 'dissolved') throw campusError('CAMPUS_SPACE_DISSOLVED', '空间已解散，当前为只读记录')
    return space
  }

  async function requireCampusManager(userId, spaceId, ownerOnly = false) {
    const [space, membership] = await Promise.all([
      requireCampusSpace(spaceId, true),
      requireCampusMembership(userId, spaceId)
    ])
    const allowed = ownerOnly ? membership.role === '空间负责人' : ['空间负责人', '管理员'].includes(membership.role)
    if (!allowed) throw campusError('CAMPUS_PERMISSION_DENIED', ownerOnly ? '仅空间负责人可执行此操作' : '你没有该空间的管理权限')
    return { space, membership }
  }

  async function uniqueCampusCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let attempt = 0; attempt < 8; attempt += 1) {
      let code = ''
      for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)]
      const matches = await listWhere(COLLECTIONS.campusSpaces, { code, status: 'active' }, 1)
      if (!matches.length) return code
    }
    throw campusError('CAMPUS_CODE_UNAVAILABLE', '暂时无法生成加入码，请稍后重试')
  }

  async function addCampusMembership(spaceId, userId, role = '成员') {
    const existing = await membershipFor(userId, spaceId)
    if (existing) return existing
    const now = new Date().toISOString()
    let result
    try {
      result = await db.collection(COLLECTIONS.campusMembers).add({ data: {
        spaceId,
        userId,
        role: CAMPUS_ROLES.includes(role) ? role : '成员',
        joinedAt: now,
        updatedAt: now
      } })
    } catch (error) {
      const raced = await membershipFor(userId, spaceId)
      if (raced) return raced
      throw error
    }
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { memberCount: command.inc(1), updatedAt: now } })
    return { _id: result._id, spaceId, userId, role, joinedAt: now, updatedAt: now }
  }

  // 读取账号，首次访问时建档。调用方靠它取 status 做准入判断，因此它不写库。
  async function ensureUser(userId) {
    const now = new Date().toISOString()
    return addIfMissing(COLLECTIONS.users, {
      _id: userId,
      name: '',
      cohort: '',
      major: '',
      status: 'active',
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    })
  }

  async function ensureData(userId) {
    const now = new Date().toISOString()
    return addIfMissing(COLLECTIONS.data, {
      _id: userId,
      userId,
      profile: profileOf({}),
      experiences: [],
      graduationChecks: {},
      templateConfig: null,
      todoStates: {},
      notes: '',
      version: 0,
      createdAt: now,
      updatedAt: now
    })
  }

  // 开启会话：取回账号与个人数据，并把本次访问记为最近登录。
  async function bootstrap(userId) {
    const [user, data] = await Promise.all([ensureUser(userId), ensureData(userId)])
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.users).doc(userId).update({ data: { lastLoginAt: now, updatedAt: now } })
    return { user: publicUser({ ...user, lastLoginAt: now, updatedAt: now }), data }
  }

  async function completeOnboarding(userId, profile, templateConfig) {
    const now = new Date().toISOString()
    const current = await ensureData(userId)
    const bundle = bundleOf({ ...current, profile, templateConfig: templateConfig || current.templateConfig }, profile)
    const version = Number(current.version || 0) + 1
    await db.collection(COLLECTIONS.data).doc(userId).update({
      data: replacementDataUpdate(command, bundle, version, now)
    })
    await db.collection(COLLECTIONS.users).doc(userId).update({ data: {
      name: bundle.profile.name,
      cohort: bundle.profile.cohort,
      major: bundle.profile.major,
      onboardingComplete: true,
      updatedAt: now
    } })
    const user = await findOne(COLLECTIONS.users, userId)
    return { user: publicUser(user), data: { ...current, ...bundle, version, updatedAt: now } }
  }

  async function saveData(userId, input, expectedVersion) {
    const user = await findOne(COLLECTIONS.users, userId)
    if (!user) throw Object.assign(new Error('账号不存在'), { code: 'ACCOUNT_NOT_FOUND' })
    if (user.status === 'disabled') throw Object.assign(new Error('账号已被禁用'), { code: 'ACCOUNT_DISABLED' })
    const current = await ensureData(userId)
    const currentVersion = Number(current.version || 0)
    if (Number(expectedVersion) !== currentVersion) {
      throw Object.assign(new Error('数据已在其他位置更新，请刷新后重试'), { code: 'VERSION_CONFLICT', current })
    }
    const bundle = bundleOf(input, current.profile)
    bundle.profile = validateOnboarding(bundle.profile)
    const now = new Date().toISOString()
    const version = currentVersion + 1
    const result = await db.collection(COLLECTIONS.data).where({ _id: userId, version: currentVersion }).update({
      data: replacementDataUpdate(command, bundle, version, now)
    })
    if (!result.stats.updated) {
      const latest = await ensureData(userId)
      throw Object.assign(new Error('数据已在其他位置更新，请刷新后重试'), { code: 'VERSION_CONFLICT', current: latest })
    }
    await db.collection(COLLECTIONS.users).doc(userId).update({ data: {
      name: bundle.profile.name,
      cohort: bundle.profile.cohort,
      major: bundle.profile.major,
      updatedAt: now
    } })
    return { ...current, ...bundle, version, updatedAt: now }
  }

  async function listUsers() {
    const result = await db.collection(COLLECTIONS.users).orderBy('createdAt', 'desc').limit(100).get()
    return result.data.map(publicUser)
  }

  async function getUser(userId) {
    const user = await findOne(COLLECTIONS.users, userId)
    if (!user) return null
    const data = await ensureData(userId)
    return { user: publicUser(user), data }
  }

  async function updateUserData(userId, input) {
    const current = await getUser(userId)
    if (!current) throw Object.assign(new Error('账号不存在'), { code: 'ACCOUNT_NOT_FOUND' })
    const bundle = bundleOf(input, current.data.profile)
    bundle.profile = validateOnboarding(bundle.profile)
    const now = new Date().toISOString()
    const version = Number(current.data.version || 0) + 1
    await db.collection(COLLECTIONS.data).doc(userId).update({
      data: replacementDataUpdate(command, bundle, version, now)
    })
    await db.collection(COLLECTIONS.users).doc(userId).update({ data: {
      name: bundle.profile.name,
      cohort: bundle.profile.cohort,
      major: bundle.profile.major,
      onboardingComplete: Boolean(bundle.profile.name && bundle.profile.cohort && bundle.profile.major),
      updatedAt: now
    } })
    return getUser(userId)
  }

  async function setStatus(userId, status) {
    if (!['active', 'disabled'].includes(status)) throw Object.assign(new Error('无效账号状态'), { code: 'INVALID_STATUS' })
    const user = await findOne(COLLECTIONS.users, userId)
    if (!user) throw Object.assign(new Error('账号不存在'), { code: 'ACCOUNT_NOT_FOUND' })
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.users).doc(userId).update({ data: { status, updatedAt: now } })
    return { ...publicUser(user), status, updatedAt: now }
  }

  async function addAudit(action, targetUserId, detail = {}) {
    await db.collection(COLLECTIONS.audit).add({ data: {
      actor: 'superadmin',
      action,
      targetUserId: targetUserId || '',
      detail,
      createdAt: new Date().toISOString()
    } })
  }

  async function listAudit() {
    const result = await db.collection(COLLECTIONS.audit).orderBy('createdAt', 'desc').limit(100).get()
    return result.data
  }

  async function adminCampusOverview() {
    const [spaces, members, matters, matterStates, personalMatters, users] = await Promise.all([
      listAll(COLLECTIONS.campusSpaces),
      listAll(COLLECTIONS.campusMembers),
      listAll(COLLECTIONS.campusMatters),
      listAll(COLLECTIONS.campusMatterStates),
      listAll(COLLECTIONS.personalMatters),
      listAll(COLLECTIONS.users)
    ])
    return buildAdminCampusOverview({ spaces, members, matters, matterStates, personalMatters, users })
  }

  async function getDeveloperUserId() {
    const config = await findOne(COLLECTIONS.config, 'singleton')
    return config?.developerUserId || ''
  }

  async function setDeveloperUserId(userId) {
    const user = await findOne(COLLECTIONS.users, userId)
    if (!user) throw Object.assign(new Error('账号不存在'), { code: 'ACCOUNT_NOT_FOUND' })
    const now = new Date().toISOString()
    const existing = await findOne(COLLECTIONS.config, 'singleton')
    if (existing) await db.collection(COLLECTIONS.config).doc('singleton').update({ data: { developerUserId: userId, updatedAt: now } })
    else await db.collection(COLLECTIONS.config).add({ data: { _id: 'singleton', developerUserId: userId, updatedAt: now } })
    return userId
  }

  async function getLoginThrottle(ipHash) {
    return findOne(COLLECTIONS.security, `login-${ipHash}`)
  }

  async function recordLoginFailure(ipHash) {
    const id = `login-${ipHash}`
    const now = Date.now()
    const existing = await findOne(COLLECTIONS.security, id)
    if (!existing || now - Number(existing.windowStartedAt || 0) > 15 * 60 * 1000) {
      if (existing) await db.collection(COLLECTIONS.security).doc(id).update({ data: { failures: 1, windowStartedAt: now, updatedAt: now } })
      else await db.collection(COLLECTIONS.security).add({ data: { _id: id, failures: 1, windowStartedAt: now, updatedAt: now } })
      return 1
    }
    await db.collection(COLLECTIONS.security).doc(id).update({ data: { failures: command.inc(1), updatedAt: now } })
    return Number(existing.failures || 0) + 1
  }

  async function clearLoginFailures(ipHash) {
    const id = `login-${ipHash}`
    const existing = await findOne(COLLECTIONS.security, id)
    if (existing) await db.collection(COLLECTIONS.security).doc(id).remove()
  }

  // 查询按依赖分三层发出：先取本人成员关系（同时取只依赖 userId 的个人事项与事项状态），
  // 再取该关系涉及的空间内容，最后取依赖前一层结果的成员资料与资料版本。
  async function campusSnapshot(userId) {
    const [memberships, personalMatterResult, stateResult] = await Promise.all([
      listWhere(COLLECTIONS.campusMembers, { userId }),
      db.collection(COLLECTIONS.personalMatters).where({ ownerId: userId }).limit(200).get(),
      db.collection(COLLECTIONS.campusMatterStates).where({ userId }).limit(500).get()
    ])
    const spaceIds = memberships.map((membership) => membership.spaceId)
    const roleBySpace = Object.fromEntries(memberships.map((membership) => [membership.spaceId, membership.role]))
    const managedSpaceIds = memberships.filter((membership) => ['空间负责人', '管理员'].includes(membership.role)).map((membership) => membership.spaceId)

    const [spaces, allMembers, matterResult, joinRequests, resourceResult] = await Promise.all([
      spaceIds.length ? findManyByIds(COLLECTIONS.campusSpaces, spaceIds) : [],
      spaceIds.length
        ? db.collection(COLLECTIONS.campusMembers).where({ spaceId: command.in(spaceIds) }).limit(500).get().then((result) => result.data)
        : [],
      spaceIds.length
        ? db.collection(COLLECTIONS.campusMatters)
          .where({ spaceId: command.in(spaceIds) })
          .orderBy('updatedAt', 'desc')
          .limit(200)
          .get()
        : { data: [] },
      managedSpaceIds.length
        ? db.collection(COLLECTIONS.campusJoinRequests).where({ spaceId: command.in(managedSpaceIds), status: 'pending' }).limit(200).get().then((result) => result.data)
        : [],
      spaceIds.length
        ? db.collection(COLLECTIONS.campusResources)
          .where({ spaceId: command.in(spaceIds), status: 'active' })
          .orderBy('updatedAt', 'desc')
          .limit(200)
          .get()
        : { data: [] }
    ])

    const resourceIds = resourceResult.data.map((resource) => resource._id)
    const [users, resourceVersions] = await Promise.all([
      findManyByIds(COLLECTIONS.users, allMembers.map((member) => member.userId)),
      resourceIds.length
        ? db.collection(COLLECTIONS.campusResourceVersions).where({ resourceId: command.in(resourceIds) }).limit(500).get().then((result) => result.data)
        : []
    ])
    const userById = Object.fromEntries(users.map((user) => [user._id, user]))

    const membersBySpace = {}
    for (const member of allMembers) {
      const user = userById[member.userId]
      if (!membersBySpace[member.spaceId]) membersBySpace[member.spaceId] = []
      membersBySpace[member.spaceId].push({
        id: member._id,
        name: user?.name || '未命名成员',
        role: member.role,
        joinedAt: member.joinedAt || ''
      })
    }
    Object.values(membersBySpace).forEach((members) => members.sort((a, b) => CAMPUS_ROLES.indexOf(a.role) - CAMPUS_ROLES.indexOf(b.role)))

    const joinRequestsBySpace = {}
    for (const request of joinRequests) {
      if (!joinRequestsBySpace[request.spaceId]) joinRequestsBySpace[request.spaceId] = []
      joinRequestsBySpace[request.spaceId].push({
        id: request._id,
        spaceId: request.spaceId,
        applicantName: request.applicantName || '未命名成员',
        status: request.status,
        requestedAt: request.requestedAt || ''
      })
    }

    const currentVersionByResource = Object.fromEntries(resourceResult.data.map((resource) => [resource._id, resource.currentVersion]))
    const resourceVersionsByResource = {}
    for (const version of resourceVersions) {
      if (!resourceVersionsByResource[version.resourceId]) resourceVersionsByResource[version.resourceId] = []
      resourceVersionsByResource[version.resourceId].push(publicCampusResourceVersion(version, currentVersionByResource[version.resourceId]))
    }
    Object.values(resourceVersionsByResource).forEach((versions) => versions.sort((a, b) => b.version - a.version))

    return {
      spaces: spaces
        .map((space) => publicCampusSpace(space, roleBySpace[space._id]))
        .sort((a, b) => Number(a.status === 'dissolved') - Number(b.status === 'dissolved') || String(b.updatedAt).localeCompare(String(a.updatedAt))),
      matters: [
        ...matterResult.data
          .filter((matter) => matter.status !== '草稿' || ['空间负责人', '管理员'].includes(roleBySpace[matter.spaceId])),
        ...personalMatterResult.data
      ]
        .map(publicCampusMatter)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
      matterStates: Object.fromEntries(stateResult.data.map((state) => [state.matterId, state.status])),
      membersBySpace,
      joinRequestsBySpace,
      resources: resourceResult.data.map(publicCampusResource),
      resourceVersionsByResource,
      syncedAt: new Date().toISOString()
    }
  }

  async function campusCreateSpace(userId, input = {}) {
    const user = await findOne(COLLECTIONS.users, userId)
    if (!user?.onboardingComplete) throw campusError('CAMPUS_PROFILE_REQUIRED', '请先完成个人资料')
    const name = cleanText(input.name, 50)
    const type = input.type === '班级' ? '班级' : input.type === '课程' ? '课程' : ''
    if (name.length < 2) throw campusError('CAMPUS_INVALID_SPACE', '请填写完整的班级或课程名称')
    if (!type) throw campusError('CAMPUS_INVALID_SPACE', '请选择空间类型')
    const now = new Date().toISOString()
    const code = await uniqueCampusCode()
    const result = await db.collection(COLLECTIONS.campusSpaces).add({ data: {
      name,
      type,
      code,
      approvalRequired: input.approvalRequired !== false,
      tone: type === '班级' ? 'teal' : 'blue',
      status: 'active',
      ownerId: userId,
      memberCount: 0,
      createdAt: now,
      updatedAt: now,
      dissolvedAt: ''
    } })
    await addCampusMembership(result._id, userId, '空间负责人')
    const space = await findOne(COLLECTIONS.campusSpaces, result._id)
    return { space: publicCampusSpace(space, '空间负责人') }
  }

  async function campusJoinSpace(userId, codeInput) {
    const code = cleanText(codeInput, 20).toUpperCase()
    if (!code) throw campusError('CAMPUS_CODE_REQUIRED', '请输入加入码')
    const matches = await listWhere(COLLECTIONS.campusSpaces, { code, status: 'active' }, 1)
    const space = matches[0]
    if (!space) throw campusError('CAMPUS_CODE_INVALID', '加入码无效或空间已解散')
    const existing = await membershipFor(userId, space._id)
    if (existing) return { state: 'already', space: publicCampusSpace(space, existing.role) }
    if (space.approvalRequired) {
      const user = await findOne(COLLECTIONS.users, userId)
      const existingRequests = await listWhere(COLLECTIONS.campusJoinRequests, { spaceId: space._id, userId }, 1)
      const now = new Date().toISOString()
      if (existingRequests[0]) {
        await db.collection(COLLECTIONS.campusJoinRequests).doc(existingRequests[0]._id).update({ data: { status: 'pending', applicantName: user?.name || '', requestedAt: now, updatedAt: now } })
      } else {
        await db.collection(COLLECTIONS.campusJoinRequests).add({ data: { spaceId: space._id, userId, applicantName: user?.name || '', status: 'pending', requestedAt: now, updatedAt: now } })
      }
      return { state: 'pending', space: publicCampusSpace(space, '成员') }
    }
    await addCampusMembership(space._id, userId, '成员')
    const updated = await findOne(COLLECTIONS.campusSpaces, space._id)
    return { state: 'joined', space: publicCampusSpace(updated, '成员') }
  }

  async function campusUpdateJoinPolicy(userId, spaceId, approvalRequired) {
    const { space } = await requireCampusManager(userId, spaceId, true)
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { approvalRequired: Boolean(approvalRequired), updatedAt: now } })
    return { space: publicCampusSpace({ ...space, approvalRequired: Boolean(approvalRequired), updatedAt: now }, '空间负责人') }
  }

  async function campusResetJoinCode(userId, spaceId) {
    const { space } = await requireCampusManager(userId, spaceId, true)
    const code = await uniqueCampusCode()
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { code, updatedAt: now } })
    return { space: publicCampusSpace({ ...space, code, updatedAt: now }, '空间负责人') }
  }

  async function campusReviewJoin(userId, spaceId, requestId, decision) {
    await requireCampusManager(userId, spaceId)
    if (!['approved', 'rejected'].includes(decision)) throw campusError('CAMPUS_INVALID_DECISION', '审核状态无效')
    const request = await findOne(COLLECTIONS.campusJoinRequests, requestId)
    if (!request || request.spaceId !== spaceId || request.status !== 'pending') throw campusError('CAMPUS_REQUEST_NOT_FOUND', '申请已处理或不存在')
    if (decision === 'approved') await addCampusMembership(spaceId, request.userId, '成员')
    await db.collection(COLLECTIONS.campusJoinRequests).doc(requestId).update({ data: { status: decision, reviewedBy: userId, updatedAt: new Date().toISOString() } })
    return { requestId }
  }

  async function campusSetMemberRole(userId, spaceId, memberId, role) {
    await requireCampusManager(userId, spaceId, true)
    if (!['管理员', '成员'].includes(role)) throw campusError('CAMPUS_INVALID_ROLE', '成员身份无效')
    const member = await findOne(COLLECTIONS.campusMembers, memberId)
    if (!member || member.spaceId !== spaceId || member.role === '空间负责人') throw campusError('CAMPUS_MEMBER_NOT_FOUND', '成员不存在或不能修改')
    if (role === '管理员' && member.role !== '管理员') {
      const administrators = await listWhere(COLLECTIONS.campusMembers, { spaceId, role: '管理员' }, 4)
      if (administrators.length >= 3) throw campusError('CAMPUS_ADMIN_LIMIT', '最多设置3名管理员')
    }
    await db.collection(COLLECTIONS.campusMembers).doc(memberId).update({ data: { role, updatedAt: new Date().toISOString() } })
    return { memberId }
  }

  async function campusTransferOwnership(userId, spaceId, memberId) {
    const { membership } = await requireCampusManager(userId, spaceId, true)
    const target = await findOne(COLLECTIONS.campusMembers, memberId)
    if (!target || target.spaceId !== spaceId || target.userId === userId) throw campusError('CAMPUS_MEMBER_NOT_FOUND', '请选择其他空间成员')
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.campusMembers).doc(membership._id).update({ data: { role: '成员', updatedAt: now } })
    await db.collection(COLLECTIONS.campusMembers).doc(memberId).update({ data: { role: '空间负责人', updatedAt: now } })
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { ownerId: target.userId, updatedAt: now } })
    return { ownerId: memberId }
  }

  async function campusRemoveMember(userId, spaceId, memberId) {
    await requireCampusManager(userId, spaceId)
    const target = await findOne(COLLECTIONS.campusMembers, memberId)
    if (!target || target.spaceId !== spaceId || target.role !== '成员' || target.userId === userId) throw campusError('CAMPUS_MEMBER_NOT_REMOVABLE', '只能移除其他普通成员')
    await db.collection(COLLECTIONS.campusMembers).doc(memberId).remove()
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { memberCount: command.inc(-1), updatedAt: new Date().toISOString() } })
    return { memberId }
  }

  async function campusDissolveSpace(userId, spaceId) {
    await requireCampusManager(userId, spaceId, true)
    const now = new Date().toISOString()
    await db.collection(COLLECTIONS.campusSpaces).doc(spaceId).update({ data: { status: 'dissolved', code: '', dissolvedAt: now, updatedAt: now } })
    return { spaceId }
  }

  async function savePersonalMatter(userId, input = {}, draft = false) {
    const title = cleanText(input.title, 80)
    if (!title) throw campusError('CAMPUS_INVALID_MATTER', '请填写事项标题')
    const now = new Date().toISOString()
    const existing = input.id ? await findOne(COLLECTIONS.personalMatters, cleanText(input.id, 100)) : null
    if (existing && existing.ownerId !== userId) throw campusError('CAMPUS_PERMISSION_DENIED', '不能修改其他人的个人事项')
    const document = {
      scope: 'personal',
      ownerId: userId,
      spaceId: '',
      space: '个人事项',
      title,
      time: cleanText(input.time, 80),
      date: cleanText(input.date, 10),
      clock: cleanText(input.clock, 8),
      location: '',
      status: draft ? '草稿' : existing?.status === '已完成' ? '已完成' : '待处理',
      tone: 'blue',
      icon: 'check-blue',
      type: '个人提醒',
      action: '标记完成',
      body: cleanText(input.body, 5000),
      priority: input.priority === '重要' ? '重要' : '普通',
      diff: [],
      associatedResourceIds: [],
      version: Number(existing?.version || 0) + 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }
    let matterId = existing?._id
    if (existing) await db.collection(COLLECTIONS.personalMatters).doc(existing._id).update({ data: document })
    else matterId = (await db.collection(COLLECTIONS.personalMatters).add({ data: document }))._id
    return { matter: publicCampusMatter({ _id: matterId, ...document }) }
  }

  async function campusSaveMatter(userId, input = {}, draft = false) {
    if (input.scope === 'personal') return savePersonalMatter(userId, input, draft)
    const spaceId = cleanText(input.spaceId, 80)
    const { space } = await requireCampusManager(userId, spaceId)
    const title = cleanText(input.title, 80)
    if (!title) throw campusError('CAMPUS_INVALID_MATTER', '请填写事项标题')
    const now = new Date().toISOString()
    const existing = input.id ? await findOne(COLLECTIONS.campusMatters, cleanText(input.id, 100)) : null
    if (existing && existing.spaceId !== spaceId) throw campusError('CAMPUS_PERMISSION_DENIED', '不能修改其他空间的事项')
    const document = {
      spaceId,
      space: space.name,
      title,
      time: cleanText(input.time, 80),
      date: cleanText(input.date, 10),
      clock: cleanText(input.clock, 8),
      location: cleanText(input.location, 100),
      status: draft ? '草稿' : '待处理',
      tone: cleanText(input.tone, 20) || 'blue',
      icon: cleanText(input.icon, 40) || 'list-blue',
      type: cleanText(input.type, 30) || '通知',
      action: cleanText(input.action, 30) || '确认收到',
      body: cleanText(input.body, 5000),
      priority: input.priority === '重要' ? '重要' : '普通',
      diff: Array.isArray(input.diff) ? input.diff.slice(0, 20).map((item) => ({ field: cleanText(item.field, 30), before: cleanText(item.before, 300), after: cleanText(item.after, 300) })) : [],
      associatedResourceIds: Array.isArray(input.associatedResourceIds) ? input.associatedResourceIds.slice(0, 20).map((id) => cleanText(id, 100)).filter(Boolean) : [],
      publishedBy: userId,
      version: Number(existing?.version || 0) + 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }
    let matterId = existing?._id
    if (existing) await db.collection(COLLECTIONS.campusMatters).doc(existing._id).update({ data: document })
    else matterId = (await db.collection(COLLECTIONS.campusMatters).add({ data: document }))._id
    return { matter: publicCampusMatter({ _id: matterId, ...document }) }
  }

  async function campusSetMatterState(userId, matterId, status) {
    if (!['待处理', '已确认', '已完成'].includes(status)) throw campusError('CAMPUS_INVALID_MATTER_STATE', '事项状态无效')
    const matter = await findOne(COLLECTIONS.campusMatters, matterId)
    if (!matter) {
      const personalMatter = await findOne(COLLECTIONS.personalMatters, matterId)
      if (!personalMatter) throw campusError('CAMPUS_MATTER_NOT_FOUND', '事项不存在')
      if (personalMatter.ownerId !== userId) throw campusError('CAMPUS_PERMISSION_DENIED', '不能操作其他人的个人事项')
      if (!['待处理', '已完成'].includes(status)) throw campusError('CAMPUS_INVALID_MATTER_STATE', '个人事项状态无效')
      await db.collection(COLLECTIONS.personalMatters).doc(matterId).update({ data: { status, updatedAt: new Date().toISOString() } })
      return { matterId, status }
    }
    if (status === '待处理') throw campusError('CAMPUS_INVALID_MATTER_STATE', '共享事项状态无效')
    await requireCampusSpace(matter.spaceId, true)
    await requireCampusMembership(userId, matter.spaceId)
    const current = (await listWhere(COLLECTIONS.campusMatterStates, { matterId, userId }, 1))[0]
    const now = new Date().toISOString()
    if (current) await db.collection(COLLECTIONS.campusMatterStates).doc(current._id).update({ data: { status, updatedAt: now } })
    else await db.collection(COLLECTIONS.campusMatterStates).add({ data: { matterId, spaceId: matter.spaceId, userId, status, updatedAt: now } })
    return { matterId, status }
  }

  async function campusDeletePersonalMatter(userId, matterIdInput) {
    const matterId = cleanText(matterIdInput, 100)
    const matter = await findOne(COLLECTIONS.personalMatters, matterId)
    if (!matter) throw campusError('CAMPUS_MATTER_NOT_FOUND', '个人事项不存在')
    if (matter.ownerId !== userId) throw campusError('CAMPUS_PERMISSION_DENIED', '不能删除其他人的个人事项')
    await db.collection(COLLECTIONS.personalMatters).doc(matterId).remove()
    return { matterId }
  }

  async function campusPrepareResourceUpload(userId, input = {}) {
    const spaceId = cleanText(input.spaceId, 80)
    const { space } = await requireCampusManager(userId, spaceId)
    if (space.type !== '课程') throw campusError('CAMPUS_RESOURCE_COURSE_ONLY', '资料仅支持上传到课程空间')
    const file = validateCampusResourceInput(input)
    const mode = input.mode === 'replace' ? 'replace' : 'new'
    let resourceId = ''
    let version = 1
    if (mode === 'replace') {
      resourceId = cleanText(input.resourceId, 100)
      const resource = await findOne(COLLECTIONS.campusResources, resourceId)
      if (!resource || resource.spaceId !== spaceId || resource.status !== 'active') throw campusError('CAMPUS_RESOURCE_NOT_FOUND', '要替换的资料不存在')
      version = Number(resource.currentVersion || 0) + 1
    }
    const now = new Date().toISOString()
    const result = await db.collection(COLLECTIONS.campusResourceUploads).add({ data: {
      userId,
      spaceId,
      resourceId,
      mode,
      version,
      ...file,
      cloudPath: '',
      status: 'pending',
      expiresAt: Date.now() + 30 * 60 * 1000,
      createdAt: now,
      updatedAt: now
    } })
    const cloudPath = `campus-resources/${spaceId}/${result._id}.${file.extension}`
    await db.collection(COLLECTIONS.campusResourceUploads).doc(result._id).update({ data: { cloudPath, updatedAt: now } })
    return { ticketId: result._id, cloudPath }
  }

  async function campusCompleteResourceUpload(userId, ticketIdInput, fileIdInput) {
    const ticketId = cleanText(ticketIdInput, 100)
    const fileID = cleanText(fileIdInput, 500)
    const ticket = await findOne(COLLECTIONS.campusResourceUploads, ticketId)
    if (!ticket || ticket.userId !== userId || ticket.status !== 'pending') throw campusError('CAMPUS_UPLOAD_TICKET_INVALID', '上传凭证无效或已经使用')
    if (Number(ticket.expiresAt || 0) < Date.now()) throw campusError('CAMPUS_UPLOAD_TICKET_EXPIRED', '上传已超时，请重新选择文件')
    await requireCampusManager(userId, ticket.spaceId)
    if (!fileID.startsWith('cloud://') || !fileID.includes(`/${ticket.cloudPath}`)) throw campusError('CAMPUS_UPLOAD_FILE_INVALID', '云端文件与上传凭证不匹配')

    const now = new Date().toISOString()
    let resourceId = ticket.resourceId
    let createdResource = false
    if (ticket.mode === 'replace') {
      const resource = await findOne(COLLECTIONS.campusResources, resourceId)
      if (!resource || resource.spaceId !== ticket.spaceId || resource.status !== 'active') throw campusError('CAMPUS_RESOURCE_NOT_FOUND', '要替换的资料不存在')
    } else {
      const result = await db.collection(COLLECTIONS.campusResources).add({ data: {
        spaceId: ticket.spaceId,
        title: ticket.title,
        category: ticket.category,
        status: 'active',
        currentVersion: 1,
        fileName: ticket.fileName,
        extension: ticket.extension,
        size: ticket.size,
        previewKind: ticket.previewKind,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now
      } })
      resourceId = result._id
      createdResource = true
    }

    let versionResult
    try {
      versionResult = await db.collection(COLLECTIONS.campusResourceVersions).add({ data: {
        resourceId,
        spaceId: ticket.spaceId,
        version: Number(ticket.version || 1),
        fileName: ticket.fileName,
        extension: ticket.extension,
        size: ticket.size,
        previewKind: ticket.previewKind,
        cloudFileId: fileID,
        uploadedBy: userId,
        uploadedAt: now
      } })
      if (ticket.mode === 'replace') {
        await db.collection(COLLECTIONS.campusResources).doc(resourceId).update({ data: {
          title: ticket.title,
          category: ticket.category,
          currentVersion: Number(ticket.version || 1),
          fileName: ticket.fileName,
          extension: ticket.extension,
          size: ticket.size,
          previewKind: ticket.previewKind,
          updatedBy: userId,
          updatedAt: now
        } })
      }
    } catch (error) {
      if (versionResult?._id) await db.collection(COLLECTIONS.campusResourceVersions).doc(versionResult._id).remove()
      if (createdResource) await db.collection(COLLECTIONS.campusResources).doc(resourceId).remove()
      throw error
    }

    await db.collection(COLLECTIONS.campusResourceUploads).doc(ticketId).update({ data: { status: 'completed', fileID, resourceId, completedAt: now, updatedAt: now } })
    const resource = await findOne(COLLECTIONS.campusResources, resourceId)
    return { resource: publicCampusResource(resource) }
  }

  async function campusDeleteResource(userId, resourceIdInput) {
    const resourceId = cleanText(resourceIdInput, 100)
    const resource = await findOne(COLLECTIONS.campusResources, resourceId)
    if (!resource || resource.status !== 'active') throw campusError('CAMPUS_RESOURCE_NOT_FOUND', '资料不存在')
    await requireCampusManager(userId, resource.spaceId, true)

    const versions = await listWhere(COLLECTIONS.campusResourceVersions, { resourceId }, 100)
    const fileList = [...new Set(versions.map((version) => version.cloudFileId).filter(Boolean))]
    if (fileList.length) {
      const result = await cloud.deleteFile({ fileList })
      const failed = (result.fileList || []).find((item) => Number(item.status || 0) !== 0)
      if (failed) throw campusError('CAMPUS_RESOURCE_DELETE_FAILED', '云端文件删除失败，请稍后重试')
    }

    for (const version of versions) {
      await db.collection(COLLECTIONS.campusResourceVersions).doc(version._id).remove()
    }
    const uploads = await listWhere(COLLECTIONS.campusResourceUploads, { resourceId }, 100)
    for (const upload of uploads) {
      await db.collection(COLLECTIONS.campusResourceUploads).doc(upload._id).remove()
    }
    await db.collection(COLLECTIONS.campusResources).doc(resourceId).remove()
    return { resourceId }
  }

  async function campusGetResourceDownload(userId, resourceIdInput, versionIdInput) {
    const resourceId = cleanText(resourceIdInput, 100)
    const resource = await findOne(COLLECTIONS.campusResources, resourceId)
    if (!resource || resource.status !== 'active') throw campusError('CAMPUS_RESOURCE_NOT_FOUND', '资料不存在')
    await requireCampusSpace(resource.spaceId)
    await requireCampusMembership(userId, resource.spaceId)
    const versionId = cleanText(versionIdInput, 100)
    const version = versionId
      ? await findOne(COLLECTIONS.campusResourceVersions, versionId)
      : (await listWhere(COLLECTIONS.campusResourceVersions, { resourceId, version: Number(resource.currentVersion || 1) }, 1))[0]
    if (!version || version.resourceId !== resourceId || !version.cloudFileId) throw campusError('CAMPUS_RESOURCE_VERSION_NOT_FOUND', '资料版本不存在')
    const urlResult = await cloud.getTempFileURL({ fileList: [{ fileID: version.cloudFileId, maxAge: 10 * 60 }] })
    const fileAccess = urlResult.fileList?.[0]
    if (!fileAccess?.tempFileURL || Number(fileAccess.status || 0) !== 0) throw campusError('CAMPUS_RESOURCE_DOWNLOAD_FAILED', '暂时无法生成下载地址')
    return {
      tempFileURL: fileAccess.tempFileURL,
      fileName: version.fileName,
      extension: version.extension,
      previewKind: version.previewKind === 'image' ? 'image' : 'document'
    }
  }

  async function exportAll() {
    const users = await listUsers()
    const records = []
    for (const user of users) records.push(await getUser(user.id))
    return records
  }

  return {
    ensureUser,
    bootstrap,
    completeOnboarding,
    saveData,
    listUsers,
    getUser,
    updateUserData,
    setStatus,
    addAudit,
    listAudit,
    adminCampusOverview,
    getDeveloperUserId,
    setDeveloperUserId,
    getLoginThrottle,
    recordLoginFailure,
    clearLoginFailures,
    campusSnapshot,
    campusCreateSpace,
    campusJoinSpace,
    campusUpdateJoinPolicy,
    campusResetJoinCode,
    campusReviewJoin,
    campusSetMemberRole,
    campusTransferOwnership,
    campusRemoveMember,
    campusDissolveSpace,
    campusSaveMatter,
    campusSetMatterState,
    campusDeletePersonalMatter,
    campusPrepareResourceUpload,
    campusCompleteResourceUpload,
    campusDeleteResource,
    campusGetResourceDownload,
    exportAll
  }
}

module.exports = {
  createStore,
  COLLECTIONS,
  buildAdminCampusOverview,
  replacementDataUpdate,
  publicCampusSpace,
  publicCampusMatter,
  publicCampusResource,
  publicCampusResourceVersion,
  validateCampusResourceInput
}
