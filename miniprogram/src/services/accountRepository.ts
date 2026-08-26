import Taro from '@tarojs/taro'
import type { AccountBootstrap, PersonalData, StudentAccount, StudentProfile, StudentTemplateConfig } from '../models'
import { getPersonalData, hasUnsyncedPersonalData, normalizePersonalData, setPersonalData } from './personalDataRepository'

const ACCOUNT_KEY = 'ruc_student_account_v1'
const ADMIN_TOKEN_KEY = 'ruc_admin_session_v1'
const CLOUD_FUNCTION_NAME = 'rucStudentApi'

type ApiResult<T> = { ok: true } & T
type ApiFailure = { ok: false; code: string; message: string; current?: PersonalData }

export class AccountApiError extends Error {
  code: string
  current?: PersonalData

  constructor(failure: ApiFailure) {
    super(failure.message)
    this.code = failure.code
    this.current = failure.current
  }
}

function apiBaseUrl() {
  return String(process.env.TARO_APP_ADMIN_API_URL || '').replace(/\/$/, '')
}

function accountOf(input: StudentAccount): StudentAccount {
  return {
    id: input.id,
    name: input.name || '',
    cohort: input.cohort || '',
    major: input.major || '',
    status: input.status || 'active',
    onboardingComplete: Boolean(input.onboardingComplete),
    createdAt: input.createdAt || '',
    updatedAt: input.updatedAt || '',
    lastLoginAt: input.lastLoginAt || ''
  }
}

function applyBootstrap(input: { user: StudentAccount; data: PersonalData }): AccountBootstrap {
  const bootstrap = { user: accountOf(input.user), data: normalizePersonalData(input.data) }
  Taro.setStorageSync(ACCOUNT_KEY, bootstrap.user)
  setPersonalData(bootstrap.data)
  return bootstrap
}

async function miniCall<T>(data: Record<string, unknown>): Promise<ApiResult<T>> {
  const response = await Taro.cloud.callFunction({ name: CLOUD_FUNCTION_NAME, data })
  const result = response.result as ApiResult<T> | ApiFailure
  if (!result || !result.ok) throw new AccountApiError(result || { ok: false, code: 'EMPTY_RESPONSE', message: '云端没有返回数据' })
  return result
}

async function webCall<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<ApiResult<T>> {
  const baseUrl = apiBaseUrl()
  if (!baseUrl) throw new AccountApiError({ ok: false, code: 'ADMIN_API_URL_MISSING', message: '本地真实账号接口尚未配置' })
  const token = options.token || getAdminToken()
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  })
  const result = await response.json() as ApiResult<T> | ApiFailure
  if (!response.ok || !result.ok) throw new AccountApiError(result.ok ? { ok: false, code: `HTTP_${response.status}`, message: '请求失败' } : result)
  return result
}

export async function callUserAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const result = process.env.TARO_ENV === 'weapp'
    ? await miniCall<T>({ action, ...payload })
    : await webCall<T>('/developer/action', { method: 'POST', body: { action, ...payload } })
  return result as T
}

export function getCachedAccount(): StudentAccount | null {
  return Taro.getStorageSync<StudentAccount>(ACCOUNT_KEY) || null
}

export function getAdminToken(): string {
  return Taro.getStorageSync<string>(ADMIN_TOKEN_KEY) || ''
}

export function clearAccountSession() {
  Taro.removeStorageSync(ACCOUNT_KEY)
  Taro.removeStorageSync(ADMIN_TOKEN_KEY)
}

async function fetchBootstrap(): Promise<AccountBootstrap> {
  if (process.env.TARO_ENV === 'weapp') {
    const result = await miniCall<{ user: StudentAccount; data: PersonalData }>({ action: 'bootstrap' })
    return applyBootstrap(result)
  }
  const result = await webCall<{ user: StudentAccount; data: PersonalData }>('/developer/bootstrap')
  return applyBootstrap(result)
}

export async function bootstrapAccount(): Promise<AccountBootstrap> {
  if (getCachedAccount() && hasUnsyncedPersonalData()) await savePersonalData(getPersonalData())
  return fetchBootstrap()
}

export async function loginLocalAdmin(username: string, password: string): Promise<AccountBootstrap> {
  const login = await webCall<{ token: string }>('/auth/login', { method: 'POST', body: { username, password }, token: '' })
  Taro.setStorageSync(ADMIN_TOKEN_KEY, login.token)
  return fetchBootstrap()
}

export async function completeOnboarding(profile: StudentProfile, templateConfig: StudentTemplateConfig): Promise<AccountBootstrap> {
  if (process.env.TARO_ENV !== 'weapp') throw new AccountApiError({ ok: false, code: 'WEAPP_ONLY', message: '首次资料需在微信小程序中完成' })
  const result = await miniCall<{ user: StudentAccount; data: PersonalData }>({ action: 'completeOnboarding', profile, templateConfig })
  return applyBootstrap(result)
}

let pendingSave: PersonalData | null = null
let saveWorker: Promise<PersonalData> | null = null

async function flushPersonalData(): Promise<PersonalData> {
  let saved = getPersonalData()
  while (pendingSave) {
    const snapshot = normalizePersonalData(pendingSave)
    pendingSave = null
    try {
      const result = process.env.TARO_ENV === 'weapp'
        ? await miniCall<{ data: PersonalData }>({ action: 'saveData', data: snapshot, expectedVersion: snapshot.version })
        : await webCall<{ data: PersonalData }>('/developer/data', { method: 'PUT', body: { data: snapshot, expectedVersion: snapshot.version } })
      saved = normalizePersonalData(result.data)
      const queued = pendingSave as PersonalData | null
      if (queued) {
        pendingSave = normalizePersonalData({ ...queued, version: saved.version, updatedAt: saved.updatedAt })
        setPersonalData(pendingSave, true)
      } else {
        setPersonalData(saved, false)
      }
    } catch (error) {
      if (error instanceof AccountApiError && error.code === 'VERSION_CONFLICT' && error.current) {
        pendingSave = null
        setPersonalData(normalizePersonalData(error.current), false)
      }
      throw error
    }
  }
  return saved
}

export function savePersonalData(next: PersonalData): Promise<PersonalData> {
  pendingSave = normalizePersonalData(next)
  setPersonalData(pendingSave, true)
  if (!saveWorker) {
    saveWorker = flushPersonalData().finally(() => {
      saveWorker = null
    })
  }
  return saveWorker
}
