import { defaultTemplateConfig } from '../data/templateDefaults'
import type { StudentTemplateConfig } from '../models'
import { savePersonalData } from './accountRepository'
import { getPersonalData, updatePersonalData } from './personalDataRepository'

function cloneDefault(): StudentTemplateConfig {
  return JSON.parse(JSON.stringify(defaultTemplateConfig)) as StudentTemplateConfig
}

export function getTemplateConfig(): StudentTemplateConfig {
  return getPersonalData().templateConfig
}

export function saveTemplateConfig(config: StudentTemplateConfig) {
  const next = updatePersonalData((draft) => {
    draft.templateConfig = JSON.parse(JSON.stringify(config)) as StudentTemplateConfig
  })
  return savePersonalData(next)
}

export async function resetTemplateConfig() {
  const nextConfig = cloneDefault()
  await saveTemplateConfig(nextConfig)
  return nextConfig
}
