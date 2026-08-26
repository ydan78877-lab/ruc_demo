const assert = require('node:assert/strict')
const test = require('node:test')
const { hashPassword, verifyPassword, signSession, verifySession } = require('../lib/auth')
const { validateOnboarding, bundleOf } = require('../lib/validation')
const {
  buildAdminCampusOverview,
  publicCampusMatter,
  publicCampusResource,
  publicCampusResourceVersion,
  publicCampusSpace,
  replacementDataUpdate,
  validateCampusResourceInput
} = require('../lib/store')

test('administrator password hashes are salted and verifiable', () => {
  const encoded = hashPassword('a-long-test-password')
  assert.equal(verifyPassword('a-long-test-password', encoded), true)
  assert.equal(verifyPassword('wrong-password', encoded), false)
})

test('administrator sessions expire and reject tampering', () => {
  const secret = 'test-secret'
  const token = signSession({ role: 'superadmin', exp: Date.now() + 1000 }, secret)
  assert.equal(verifySession(token, secret)?.role, 'superadmin')
  assert.equal(verifySession(`${token}x`, secret), null)
  const expired = signSession({ role: 'superadmin', exp: Date.now() - 1 }, secret)
  assert.equal(verifySession(expired, secret), null)
})

test('onboarding requires name, configured cohort, and major', () => {
  const profile = validateOnboarding({ name: '陶方正', cohort: '25级', major: '金融' })
  assert.equal(profile.school, '中国人民大学')
  assert.throws(() => validateOnboarding({ name: '陶方正', cohort: '27级', major: '金融' }), /有效年级/)
  assert.throws(() => validateOnboarding({ name: '', cohort: '25级', major: '金融' }), /真实姓名/)
})

test('new bundles contain no demo experiences or personal values', () => {
  const bundle = bundleOf({})
  assert.equal(bundle.profile.name, '')
  assert.deepEqual(bundle.experiences, [])
  assert.deepEqual(bundle.graduationChecks, {})
})

test('personal data objects are replaced instead of merged into null fields', () => {
  const setValues = []
  const command = {
    set(value) {
      setValues.push(value)
      return { replace: value }
    }
  }
  const bundle = bundleOf({
    profile: { name: '测试用户', cohort: '25级', major: '金融' },
    templateConfig: { id: '25-baoyan', pages: [] }
  })
  const update = replacementDataUpdate(command, bundle, 1, '2026-08-22T00:00:00.000Z')

  assert.deepEqual(update.templateConfig, { replace: { id: '25-baoyan', pages: [] } })
  assert.deepEqual(update.profile, { replace: bundle.profile })
  assert.deepEqual(update.graduationChecks, { replace: {} })
  assert.equal(update.version, 1)
  assert.equal(setValues.length, 5)
})

test('campus payloads expose collaboration fields without internal account identifiers', () => {
  const space = publicCampusSpace({
    _id: 'space-1', name: '公司金融', type: '课程', code: 'ABC123', memberCount: 2,
    approvalRequired: true, ownerId: 'openid-owner', status: 'active'
  }, '成员')
  const matter = publicCampusMatter({
    _id: 'matter-1', spaceId: 'space-1', space: '公司金融', title: '提交练习',
    time: '8月28日 截止22:00', date: '2026-08-28', clock: '22:00', status: '待处理',
    publishedBy: 'openid-owner'
  })
  const personalMatter = publicCampusMatter({
    _id: 'personal-1', scope: 'personal', ownerId: 'openid-owner', spaceId: '', space: '个人事项',
    title: '准备明天的材料', status: '待处理'
  })

  assert.equal(space.id, 'space-1')
  assert.equal(space.role, '成员')
  assert.equal('ownerId' in space, false)
  assert.equal(matter.date, '2026-08-28')
  assert.equal('publishedBy' in matter, false)
  assert.equal(matter.scope, 'space')
  assert.equal(personalMatter.scope, 'personal')
  assert.equal(personalMatter.space, '个人事项')
  assert.equal('ownerId' in personalMatter, false)
})

test('administrator campus overview joins spaces, members, and per-user reminder states', () => {
  const overview = buildAdminCampusOverview({
    users: [
      { _id: 'owner', name: '课程负责人', cohort: '25级', major: '金融' },
      { _id: 'member', name: '测试成员', cohort: '25级', major: '金融' }
    ],
    spaces: [{ _id: 'space-1', name: '公司金融', type: '课程', code: 'CORP25', ownerId: 'owner', status: 'active', approvalRequired: true, updatedAt: '2026-08-23T02:00:00.000Z' }],
    members: [
      { _id: 'membership-owner', spaceId: 'space-1', userId: 'owner', role: '空间负责人' },
      { _id: 'membership-member', spaceId: 'space-1', userId: 'member', role: '成员' }
    ],
    matters: [
      { _id: 'matter-1', spaceId: 'space-1', title: '资本预算练习提交', type: '作业', status: '已发布', action: '标记完成', updatedAt: '2026-08-23T03:00:00.000Z' },
      { _id: 'draft-1', spaceId: 'space-1', title: '尚未发布', status: '草稿' }
    ],
    matterStates: [{ matterId: 'matter-1', spaceId: 'space-1', userId: 'member', status: '已完成', updatedAt: '2026-08-23T04:00:00.000Z' }],
    personalMatters: [{ _id: 'personal-1', ownerId: 'member', title: '准备课程材料', status: '待处理', updatedAt: '2026-08-23T05:00:00.000Z' }]
  })

  assert.equal(overview.spaces.length, 1)
  assert.equal(overview.spaces[0].memberCount, 2)
  assert.equal(overview.spaces[0].matterCount, 1)
  assert.equal(overview.spaces[0].pendingCount, 1)
  assert.equal(overview.reminders.length, 3)
  assert.equal(overview.reminders.find((item) => item.userId === 'member' && item.scope === 'space').status, '已完成')
  assert.equal(overview.reminders.find((item) => item.scope === 'personal').spaceName, '个人事项')
})

test('course resource uploads enforce supported formats and the 20 MB limit', () => {
  const resource = validateCampusResourceInput({ fileName: '资本预算讲义.PDF', title: '资本预算讲义', category: '课件', size: 1024 })
  assert.equal(resource.extension, 'pdf')
  assert.equal(resource.previewKind, 'document')
  assert.throws(() => validateCampusResourceInput({ fileName: '程序.exe', size: 1024 }), /文件格式/)
  assert.throws(() => validateCampusResourceInput({ fileName: '超大课件.pdf', size: 21 * 1024 * 1024 }), /20MB/)
})

test('resource snapshots omit cloud file ids and uploader identities', () => {
  const resource = publicCampusResource({
    _id: 'resource-1', spaceId: 'space-1', title: '课程讲义', category: '课件', currentVersion: 2,
    fileName: '课程讲义.pdf', extension: 'pdf', size: 1024, previewKind: 'document', createdBy: 'openid-owner'
  })
  const version = publicCampusResourceVersion({
    _id: 'version-2', resourceId: 'resource-1', version: 2, fileName: '课程讲义.pdf', extension: 'pdf',
    size: 1024, cloudFileId: 'cloud://secret/path', uploadedBy: 'openid-owner', uploadedAt: '2026-08-22T00:00:00.000Z'
  }, 2)

  assert.equal(resource.meta, 'v2 · 1 KB')
  assert.equal('createdBy' in resource, false)
  assert.equal('cloudFileId' in version, false)
  assert.equal('uploadedBy' in version, false)
  assert.match(version.label, /^当前版本/)
})
