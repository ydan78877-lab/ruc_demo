import type { StudentGoal, StudentGoalWorkspace } from '../models'
import {
  createCustomGoal,
  createGoalWorkspace,
  createGraduationGoal,
  createRecommendationGoal
} from '../data/goalDefaults'
import { savePersonalData } from './accountRepository'
import { getPersonalData, updatePersonalData } from './personalDataRepository'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizedWorkspace(): StudentGoalWorkspace {
  const data = getPersonalData()
  const stored = data.templateConfig.goalWorkspace
  const workspace = stored?.schemaVersion === 2 && Array.isArray(stored.goals)
    ? clone(stored)
    : createGoalWorkspace(data.profile, data.templateConfig)
  if (!workspace.goals.some((goal) => goal.kind === 'graduation')) {
    workspace.goals.unshift(createGraduationGoal(data.profile))
  }
  workspace.goals = workspace.goals.map((goal) => ({
    ...goal,
    primary: Boolean(goal.primary),
    protected: goal.kind === 'graduation' || Boolean(goal.protected),
    sourceKey: goal.sourceKey || (goal.kind === 'custom' ? 'personal-custom' : 'legacy-goal'),
    sourceLabel: goal.sourceLabel || (goal.kind === 'custom' ? '个人自定义目标' : '旧版目标'),
    matched: goal.matched !== false,
    pages: Array.isArray(goal.pages) ? goal.pages : []
  }))
  if (!workspace.goals.some((goal) => goal.id === workspace.activeGoalId)) {
    workspace.activeGoalId = workspace.goals.find((goal) => goal.primary)?.id || workspace.goals[0]?.id || ''
  }
  return workspace
}

export function getGoalWorkspace() {
  return normalizedWorkspace()
}

export function getGoal(goalId?: string) {
  const workspace = normalizedWorkspace()
  return workspace.goals.find((goal) => goal.id === goalId)
    || workspace.goals.find((goal) => goal.id === workspace.activeGoalId)
    || workspace.goals[0]
}

export function saveGoalWorkspace(workspace: StudentGoalWorkspace) {
  const normalized = clone(workspace)
  const active = normalized.goals.find((goal) => goal.id === normalized.activeGoalId) || normalized.goals[0]
  const next = updatePersonalData((draft) => {
    draft.templateConfig.goalWorkspace = normalized
    if (active) {
      draft.templateConfig.id = active.id
      draft.templateConfig.title = active.title
      draft.templateConfig.primary = active.primary
      draft.templateConfig.pages = clone(active.pages)
    }
  })
  return savePersonalData(next)
}

export function setActiveGoal(goalId: string) {
  const workspace = normalizedWorkspace()
  if (workspace.goals.some((goal) => goal.id === goalId)) workspace.activeGoalId = goalId
  return saveGoalWorkspace(workspace)
}

export function saveGoal(goal: StudentGoal) {
  const workspace = normalizedWorkspace()
  const index = workspace.goals.findIndex((item) => item.id === goal.id)
  if (index >= 0) workspace.goals[index] = clone(goal)
  else workspace.goals.push(clone(goal))
  workspace.activeGoalId = goal.id
  return saveGoalWorkspace(workspace)
}

export function addCustomGoal(title: string) {
  const workspace = normalizedWorkspace()
  const goal = createCustomGoal(title)
  workspace.goals.push(goal)
  workspace.activeGoalId = goal.id
  return saveGoalWorkspace(workspace).then(() => goal)
}

export function deleteGoal(goalId: string) {
  const workspace = normalizedWorkspace()
  const goal = workspace.goals.find((item) => item.id === goalId)
  if (!goal || goal.protected) return Promise.reject(new Error('毕业目标不能删除'))
  workspace.goals = workspace.goals.filter((item) => item.id !== goalId)
  if (workspace.activeGoalId === goalId) workspace.activeGoalId = workspace.goals[0]?.id || ''
  return saveGoalWorkspace(workspace)
}

export function resetGoal(goalId: string) {
  const data = getPersonalData()
  const workspace = normalizedWorkspace()
  const index = workspace.goals.findIndex((goal) => goal.id === goalId)
  if (index < 0) return Promise.reject(new Error('目标不存在'))
  const current = workspace.goals[index]
  const replacement = current.kind === 'graduation'
    ? createGraduationGoal(data.profile)
    : current.id === '25-baoyan'
      ? createRecommendationGoal()
      : createCustomGoal(current.title)
  replacement.id = current.id
  workspace.goals[index] = replacement
  return saveGoalWorkspace(workspace).then(() => replacement)
}
