export type CampusMatter = {
  id: string
  scope?: 'space' | 'personal'
  spaceId: string
  space: string
  title: string
  time: string
  date?: string
  clock?: string
  location: string
  status: string
  tone: string
  icon: string
  type: string
  action: string
  body: string
  priority?: '普通' | '重要'
  diff?: Array<{ field: string; before: string; after: string }>
  associatedResourceIds?: string[]
  version?: number
  createdAt?: string
  updatedAt?: string
}

export type CampusSpaceRole = '空间负责人' | '管理员' | '成员'
export type CampusSpaceType = '课程' | '班级'
export type CampusSpace = {
  id: string
  name: string
  type: CampusSpaceType
  role: CampusSpaceRole
  members: number
  code: string
  approvalRequired: boolean
  tone: string
  status?: 'active' | 'dissolved'
  createdAt?: string
  updatedAt?: string
  dissolvedAt?: string
}

export type CampusMember = {
  id: string
  name: string
  role: CampusSpaceRole
  joinedAt?: string
}

export type CampusJoinRequest = {
  id: string
  spaceId: string
  applicantName: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

export type CampusSnapshot = {
  spaces: CampusSpace[]
  matters: CampusMatter[]
  matterStates: Record<string, string>
  membersBySpace: Record<string, CampusMember[]>
  joinRequestsBySpace: Record<string, CampusJoinRequest[]>
  resources: CampusResource[]
  resourceVersionsByResource: Record<string, CampusResourceVersion[]>
  syncedAt: string
}

export type CampusResource = {
  id: string
  spaceId: string
  category: string
  title: string
  meta: string
  currentVersion: number
  fileName: string
  extension: string
  size: number
  previewKind: 'document' | 'image'
  createdAt?: string
  updatedAt?: string
}

export type CampusResourceVersion = {
  id: string
  resourceId: string
  version: number
  fileName: string
  extension: string
  size: number
  label: string
  uploadedAt: string
}
