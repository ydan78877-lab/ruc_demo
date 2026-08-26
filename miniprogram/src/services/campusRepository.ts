import Taro from '@tarojs/taro'
import type {
  CampusJoinRequest,
  CampusMatter,
  CampusMember,
  CampusResource,
  CampusResourceVersion,
  CampusSnapshot,
  CampusSpace,
  CampusSpaceRole,
  CampusSpaceType
} from '../data/campus'
import { callUserAction } from './accountRepository'

const CAMPUS_CACHE_KEY = 'campus_cloud_snapshot_v1'

const emptySnapshot = (): CampusSnapshot => ({
  spaces: [],
  matters: [],
  matterStates: {},
  membersBySpace: {},
  joinRequestsBySpace: {},
  resources: [],
  resourceVersionsByResource: {},
  syncedAt: ''
})

function normalizeSnapshot(input?: Partial<CampusSnapshot> | null): CampusSnapshot {
  return {
    spaces: Array.isArray(input?.spaces) ? input.spaces : [],
    matters: Array.isArray(input?.matters) ? input.matters : [],
    matterStates: input?.matterStates && typeof input.matterStates === 'object' ? input.matterStates : {},
    membersBySpace: input?.membersBySpace && typeof input.membersBySpace === 'object' ? input.membersBySpace : {},
    joinRequestsBySpace: input?.joinRequestsBySpace && typeof input.joinRequestsBySpace === 'object' ? input.joinRequestsBySpace : {},
    resources: Array.isArray(input?.resources) ? input.resources : [],
    resourceVersionsByResource: input?.resourceVersionsByResource && typeof input.resourceVersionsByResource === 'object' ? input.resourceVersionsByResource : {},
    syncedAt: input?.syncedAt || ''
  }
}

function cacheSnapshot(snapshot: CampusSnapshot) {
  const normalized = normalizeSnapshot(snapshot)
  Taro.setStorageSync(CAMPUS_CACHE_KEY, normalized)
  return normalized
}

export function getCampusSnapshot(): CampusSnapshot {
  return normalizeSnapshot(Taro.getStorageSync<CampusSnapshot>(CAMPUS_CACHE_KEY) || emptySnapshot())
}

export function getCampusSpaces(): CampusSpace[] {
  return getCampusSnapshot().spaces
}

export function getCampusMatters(): CampusMatter[] {
  const snapshot = getCampusSnapshot()
  return snapshot.matters.map((matter) => {
    const personalState = snapshot.matterStates[matter.id]
    const scheduledAt = matter.date ? new Date(`${matter.date}T${matter.clock || '23:59'}:00`).getTime() : Number.NaN
    const status = personalState || (matter.status === '待处理' && Number.isFinite(scheduledAt) && scheduledAt < Date.now() ? '已逾期' : matter.status)
    return { ...matter, status }
  })
}

export function getCampusMembers(spaceId: string): CampusMember[] {
  return getCampusSnapshot().membersBySpace[spaceId] || []
}

export function getCampusJoinRequests(spaceId: string): CampusJoinRequest[] {
  return getCampusSnapshot().joinRequestsBySpace[spaceId] || []
}

export async function syncCampusSnapshot(): Promise<CampusSnapshot> {
  const response = await callUserAction<{ snapshot: CampusSnapshot }>('campusBootstrap')
  return cacheSnapshot(response.snapshot)
}

async function mutateCampus<T extends Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}) {
  const response = await callUserAction<T & { snapshot: CampusSnapshot }>(action, payload)
  cacheSnapshot(response.snapshot)
  return response
}

export function createCampusSpace(input: { name: string; type: CampusSpaceType; approvalRequired: boolean }) {
  return mutateCampus<{ space: CampusSpace }>('campusCreateSpace', { space: input })
}

export function joinCampusSpace(code: string) {
  return mutateCampus<{ state: 'joined' | 'pending' | 'already'; space: CampusSpace }>('campusJoinSpace', { code })
}

export function updateCampusJoinPolicy(spaceId: string, approvalRequired: boolean) {
  return mutateCampus<{ space: CampusSpace }>('campusUpdateJoinPolicy', { spaceId, approvalRequired })
}

export function resetCampusJoinCode(spaceId: string) {
  return mutateCampus<{ space: CampusSpace }>('campusResetJoinCode', { spaceId })
}

export function reviewCampusJoinRequest(spaceId: string, requestId: string, decision: 'approved' | 'rejected') {
  return mutateCampus<{ requestId: string }>('campusReviewJoin', { spaceId, requestId, decision })
}

export function setCampusMemberRole(spaceId: string, memberId: string, role: Exclude<CampusSpaceRole, '空间负责人'>) {
  return mutateCampus<{ memberId: string }>('campusSetMemberRole', { spaceId, memberId, role })
}

export function transferCampusOwnership(spaceId: string, memberId: string) {
  return mutateCampus<{ ownerId: string }>('campusTransferOwnership', { spaceId, memberId })
}

export function removeCampusMember(spaceId: string, memberId: string) {
  return mutateCampus<{ memberId: string }>('campusRemoveMember', { spaceId, memberId })
}

export function dissolveCampusSpace(spaceId: string) {
  return mutateCampus<{ spaceId: string }>('campusDissolveSpace', { spaceId })
}

export function saveCampusMatter(item: CampusMatter, draft = false) {
  return mutateCampus<{ matter: CampusMatter }>('campusSaveMatter', { matter: item, draft })
}

export function setCampusMatterState(matterId: string, status: '待处理' | '已确认' | '已完成') {
  return mutateCampus<{ matterId: string; status: string }>('campusSetMatterState', { matterId, status })
}

export function deletePersonalMatter(matterId: string) {
  return mutateCampus<{ matterId: string }>('campusDeletePersonalMatter', { matterId })
}

export function getCampusResources(): CampusResource[] {
  return getCampusSnapshot().resources
}

export function getCampusResourceVersions(resourceId: string): CampusResourceVersion[] {
  return getCampusSnapshot().resourceVersionsByResource[resourceId] || []
}

export function prepareCampusResourceUpload(input: {
  spaceId: string
  resourceId?: string
  mode: 'new' | 'replace'
  title: string
  category: string
  fileName: string
  size: number
}) {
  return callUserAction<{ ticketId: string; cloudPath: string }>('campusPrepareResourceUpload', { upload: input })
}

export function completeCampusResourceUpload(ticketId: string, fileID: string) {
  return mutateCampus<{ resource: CampusResource }>('campusCompleteResourceUpload', { ticketId, fileID })
}

export function deleteCampusResource(resourceId: string) {
  return mutateCampus<{ resourceId: string }>('campusDeleteResource', { resourceId })
}

export function getCampusResourceDownload(resourceId: string, versionId: string) {
  return callUserAction<{ tempFileURL: string; fileName: string; extension: string; previewKind: 'document' | 'image' }>('campusGetResourceDownload', { resourceId, versionId })
}
