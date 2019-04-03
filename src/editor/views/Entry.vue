<template>
  <div class="entry">
    <h1>{{$route.params.name}}</h1>
    <palette v-if="isPalette && entry" :entry="entry"></palette>
    <level v-if="isLevel && entry" :entry="entry"></level>
    <div v-else>
      <pre>
        <code>{{JSON.stringify(entry)}}</code>
      </pre>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.entry {
  display: flex;
  flex: 1;
}
</style>

<script>
import { mapState } from 'vuex'
import Palette from 'editor/components/Palette.vue'
import Level from 'editor/components/Level.vue'

export default {
  components: {
    'palette': Palette,
    'level': Level,
  },
  mounted() {
    this.$store.dispatch('fetch', {
      name: this.$route.params.name
    })
  },
  computed: {
    ...mapState(['entry']),
    isPalette() {
      return /\.PAL$/.test(this.$route.params.name)
    },
    isLevel() {
      return /\.LEV$/.test(this.$route.params.name)
    }
  }
}
</script>

