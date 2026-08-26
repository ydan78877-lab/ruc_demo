const COHORTS = ['19级', '20级', '21级', '22级', '23级', '24级', '25级', '26级']
const MAJORS = ['金融', '国管', '人管', '法语', '传播', '数学', '大数据', '人工智能']

function text(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function profileOf(input = {}) {
  return {
    name: text(input.name, 30),
    school: text(input.school, 50) || '中国人民大学',
    college: text(input.college, 50) || '中法学院',
    major: text(input.major, 40),
    cohort: text(input.cohort, 10),
    gpa: text(input.gpa, 20),
    rank: text(input.rank, 30),
    skills: text(input.skills, 2000),
    interests: text(input.interests, 2000)
  }
}

function validateOnboarding(profile) {
  const normalized = profileOf(profile)
  if (normalized.name.length < 2) throw Object.assign(new Error('请填写真实姓名'), { code: 'INVALID_PROFILE' })
  if (!COHORTS.includes(normalized.cohort)) throw Object.assign(new Error('请选择有效年级'), { code: 'INVALID_PROFILE' })
  if (!normalized.major) throw Object.assign(new Error('请选择或填写专业'), { code: 'INVALID_PROFILE' })
  return normalized
}

function jsonClone(value, fallback) {
  try {
    return value == null ? fallback : JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

function bundleOf(input = {}, fallbackProfile = {}) {
  const experiences = Array.isArray(input.experiences) ? jsonClone(input.experiences.slice(0, 500), []) : []
  const graduationChecks = input.graduationChecks && typeof input.graduationChecks === 'object' ? jsonClone(input.graduationChecks, {}) : {}
  const todoStates = input.todoStates && typeof input.todoStates === 'object' ? jsonClone(input.todoStates, {}) : {}
  const templateConfig = input.templateConfig && typeof input.templateConfig === 'object' ? jsonClone(input.templateConfig, null) : null
  const notes = text(input.notes, 10000)
  const profile = profileOf({ ...fallbackProfile, ...(input.profile || {}) })
  const bundle = { profile, experiences, graduationChecks, templateConfig, todoStates, notes }
  if (Buffer.byteLength(JSON.stringify(bundle), 'utf8') > 2 * 1024 * 1024) {
    throw Object.assign(new Error('个人数据超过当前容量限制'), { code: 'DATA_TOO_LARGE' })
  }
  return bundle
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name || '',
    cohort: user.cohort || '',
    major: user.major || '',
    status: user.status || 'active',
    onboardingComplete: Boolean(user.onboardingComplete),
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
    lastLoginAt: user.lastLoginAt || ''
  }
}

module.exports = { COHORTS, MAJORS, profileOf, validateOnboarding, bundleOf, publicUser }
