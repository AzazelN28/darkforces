<template>
  <div class="list">
    <form>
      <input type="search" v-model="search" />
    </form>
    <table>
      <tr>
        <th>Name</th>
        <th>Start</th>
        <th>Size</th>
      </tr>
      <tr v-for="entry in filteredEntries" :key="entry.name">
        <td><router-link :to="entry.name">{{entry.name}}</router-link></td>
        <td>{{entry.start | readable}}</td>
        <td :title="entry.size | readable">{{entry.size | bytes}}</td>
      </tr>
    </table>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data() {
    return {
      search: ''
    }
  },
  computed: {
    ...mapState(['entries']),
    filteredEntries() {
      if (this.search) {
        const search = this.search.replace(/[.?\[\]+-]/g, (match) => `\\${match}`).replace(/\*/g, '.*')
        console.log(search)
        const pattern = new RegExp(search, 'i')
        return this.entries.filter((entry) => pattern.test(entry.name))
      }
      return this.entries
    }
  }
}
</script>
