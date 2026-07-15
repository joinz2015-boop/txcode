export const diagMixin = {
  data() {
    return {
      diagCallCounters: {}
    }
  },
  methods: {
    _log(scope, msg, extra = {}) {
      const t = (performance.now() / 1000).toFixed(3)
      const prefix = `[${scope}][${t}]`
      console.log(prefix, msg, extra)
    },
    _checkCallFrequency(methodName, thresholdMs = 100, maxCalls = 10) {
      const now = performance.now()
      const c = this.diagCallCounters[methodName] || { count: 0, firstCallTime: now, lastCallTime: now, warned: false }
      c.count++
      c.lastCallTime = now
      if (!c.warned && c.count >= maxCalls && (now - c.firstCallTime) < thresholdMs * maxCalls) {
        console.warn(`[FREQ_WARN] ${methodName} called ${c.count} times in ${(now - c.firstCallTime).toFixed(0)}ms — possible infinite loop!`)
        c.warned = true
      }
      if (now - c.firstCallTime > 2000) {
        c.count = 1
        c.firstCallTime = now
        c.warned = false
      }
      this.diagCallCounters[methodName] = c
    }
  }
}
