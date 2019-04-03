<template>
  <canvas ref="canvas"></canvas>
</template>

<script>
import resizeObserver from 'editor/resize'

export default {
  props: {
    entry: {
      type: Object
    },
    layers: {
      type: Map,
      default: new Map([
        [-1, { visible: true }]
      ])
    }
  },
  mounted() {
    resizeObserver.add(this.$refs.canvas, this.draw)
    this.draw()
  },
  updated() {
    this.draw()
  },
  beforeDestroy() {
    resizeObserver.remove(this.$refs.canvas)
  },
  methods: {
    draw() {
      const cx = this.$refs.canvas.getContext('2d')
      if (cx.canvas.width !== cx.canvas.clientWidth) {
        cx.canvas.width = cx.canvas.clientWidth
      }
      if (cx.canvas.height !== cx.canvas.clientHeight) {
        cx.canvas.height = cx.canvas.clientHeight
      }
      if (!this.entry) {
        return
      }
      const { sectors } = this.entry
      for (const sector of sectors) {
        if (!this.layers.get(sector.layer).visible) {
          continue
        }

        for (const [x, y] of sector.vertices) {
          cx.beginPath()
          cx.moveTo(x, y - 4)
          cx.lineTo(x + 4, y)
          cx.lineTo(x, y + 4)
          cx.lineTo(x - 4, y)
          cx.closePath()
          cx.fillStyle = 'red'
          cx.fill()
        }

        for (const wall of sector.walls) {
          const [sx, sy] = sector.vertices[wall.left]
          const [ex, ey] = sector.vertices[wall.right]
          cx.beginPath()
          cx.moveTo(sx, sy)
          cx.lineTo(ex, ey)
          cx.strokeStyle = 'black'
          cx.stroke()
        }
      }
    }
  }
}
</script>

