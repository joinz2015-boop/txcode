import { request } from '../request.js'

export function listPlanSessions() {
  return request('GET', '/plan-code/list')
}

export function createPlanSession(folderName) {
  return request('POST', '/plan-code/create', { folderName })
}

export function renamePlanSession(oldName, newName) {
  return request('POST', '/plan-code/update', { oldName, newName })
}

export function deletePlanSession(folderName) {
  return request('POST', '/plan-code/delete', { folderName })
}

export function getPlanSessionDetail(folderName) {
  return request('GET', `/plan-code/detail?folderName=${encodeURIComponent(folderName)}`)
}

export function saveMeta(folderName, meta) {
  return request('POST', '/plan-code/save-meta', { folderName, meta })
}

export function savePlan(folderName, content) {
  return request('POST', '/plan-code/save-plan', { folderName, content })
}

export function readPlan(folderName) {
  return request('GET', `/plan-code/read-plan?folderName=${encodeURIComponent(folderName)}`)
}
