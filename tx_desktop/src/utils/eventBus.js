const events = new Map()

export const eventBus = {
  on(event, callback) {
    if (!events.has(event)) {
      events.set(event, new Set())
    }
    events.get(event).add(callback)
    return () => {
      events.get(event)?.delete(callback)
    }
  },

  emit(event, data) {
    const callbacks = events.get(event)
    if (!callbacks) return
    for (const cb of callbacks) {
      try {
        cb(data)
      } catch (e) {
        console.error(`[eventBus] ${event} listener error:`, e)
      }
    }
  }
}

export default eventBus
