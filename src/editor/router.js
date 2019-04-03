import Vue from 'vue'
import Router from 'vue-router'

import Index from './views/Index.vue'
import Entry from './views/Entry.vue'

Vue.use(Router)

const routes = [{
  path: '/',
  component: Index
}, {
  path: '/:name',
  component: Entry
}]

export const router = new Router({
  routes
})

export default router
