import Vue from 'vue'
import store from './editor/store'
import router from './editor/router'
import App from './editor/App'
import './editor/filters'

new Vue({
  store,
  router,
  el: '#app',
  render: h => h(App)
})
