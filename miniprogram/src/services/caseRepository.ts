import { caseRecords, interviews, pageConfig, schools } from '../data/case-library.generated'

export const caseRepository = {
  list: () => caseRecords,
  getById: (id: string) => caseRecords.find((item) => item.id === id),
  listInterviews: () => interviews,
  listSchools: () => schools,
  getConfig: (key: string, fallback = '') => pageConfig[key] || fallback
}
