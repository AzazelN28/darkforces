<template>
  <div class="palette">
    <div class="color" v-for="color in colors" :key="color.id" :style="getColorStyles(color.value)"></div>
  </div>
</template>

<style lang="scss" scoped>
.palette {
  display: flex;
  flex-wrap: wrap;
}

.color {
  min-width: 1rem;
  min-height: 1rem;
  border: 1px solid black;
}
</style>

<script>
export default {
  props: ['entry'],
  computed: {
    colors() {
      const list = []
      for (let i = 0; i < this.entry.length; i++) {
        const r = this.entry[i]
        const g = this.entry[i + 1]
        const b = this.entry[i + 2]
        const a = this.entry[i + 3]
        list.push({ id: i, value: `rgba(${r},${g},${b},${a})` })
      }
      return list
    }
  },
  methods: {
    getColorStyles(color) {
      return {
        backgroundColor: color
      }
    }
  }
}
</script>
