import Taro from '@tarojs/taro'
import { defaultTemplateConfig } from '../data/templateDefaults'
import type { PersonalData, StudentProfile } from '../models'

const PERSONAL_DATA_KEY = 'ruc_personal_data_v2'
const PERSONAL_DATA_DIRTY_KEY = 'ruc_personal_data_dirty_v1'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const blankProfile: StudentProfile = {
  name: '',
  school: '中国人民大学',
  college: '中法学院',
  major: '',
  cohort: '',
  gpa: '',
  rank: '',
  skills: '',
  interests: ''
}

// 产出恰好 8 个 PersonalData 字段并补齐缺失值，未知键丢弃，与云函数 bundleOf 的白名单一致。
// 嵌套值按引用带过，因此调用方不得再改写传入的对象；输入来自存储或网络的反序列化结果，本就不与他处共享。
export function normalizePersonalData(input?: Partial<PersonalData> | null): PersonalData {
  return {
    profile: { ...blankProfile, ...(input?.profile || {}) },
    experiences: Array.isArray(input?.experiences) ? input.experiences : [],
    graduationChecks: input?.graduationChecks || {},
    templateConfig: input?.templateConfig || clone(defaultTemplateConfig),
    todoStates: input?.todoStates || {},
    notes: input?.notes || '',
    version: Number(input?.version || 0),
    updatedAt: input?.updatedAt || ''
  }
}

export function getPersonalData(): PersonalData {
  return normalizePersonalData(Taro.getStorageSync<PersonalData>(PERSONAL_DATA_KEY))
}

export function setPersonalData(data: PersonalData, dirty = false) {
  Taro.setStorageSync(PERSONAL_DATA_KEY, normalizePersonalData(data))
  Taro.setStorageSync(PERSONAL_DATA_DIRTY_KEY, dirty)
}

export function updatePersonalData(mutator: (draft: PersonalData) => void): PersonalData {
  const draft = getPersonalData()
  mutator(draft)
  setPersonalData(draft, true)
  return draft
}

export function hasUnsyncedPersonalData() {
  return Boolean(Taro.getStorageSync<boolean>(PERSONAL_DATA_DIRTY_KEY))
}

export function clearPersonalData() {
  Taro.removeStorageSync(PERSONAL_DATA_KEY)
  Taro.removeStorageSync(PERSONAL_DATA_DIRTY_KEY)
}
