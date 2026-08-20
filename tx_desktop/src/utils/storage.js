const PREFIX = 'txcode:desktop'

export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`)
    if (raw === null) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export function setItem(key, value) {
  localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value))
}

export function removeItem(key) {
  localStorage.removeItem(`${PREFIX}:${key}`)
}
