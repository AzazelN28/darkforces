const targets = new Map()

const ro = new ResizeObserver((entries) => {
  for (const { target, contentRect } of entries) {
    if (targets.has(target)) {
      target.width = contentRect.width
      target.height = contentRect.height
      const callback = targets.get(target)
      callback()
    }
  }
})

export default {
  add(target, callback) {
    targets.set(target, callback)
    ro.observe(target)
  },
  remove(target) {
    ro.unobserve(target)
    targets.delete(target)
  }
}
