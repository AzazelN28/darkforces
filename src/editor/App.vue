<template>
  <router-view>
</template>

<style lang="scss">

html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

</style>

<script>
export default {
  mounted() {
    this.$store.dispatch('load')
  }
}
</script>
