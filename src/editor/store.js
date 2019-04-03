import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import FileManager from 'worker/FileManager'

Vue.use(Vuex)

const fm = new FileManager()

export const store = new Store({
  state: {
    entries: [],
    entry: null
  },
  mutations: {
    fetched(state, { entry }) {
      state.entry = entry
    },
    loaded(state, { entries }) {
      state.entries.push(...entries)
    }
  },
  actions: {
    fetch({ commit }, { name }) {
      return fm.fetch(name)
        .then((entry) => commit('fetched', { entry }))
    },
    load({ commit }) {
      fetch('data/dark.gob')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => fm.store(arrayBuffer))
        .then(payload => commit('loaded', payload))
    }
  }
})

export default store
