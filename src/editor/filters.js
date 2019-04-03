import Vue from 'vue'
import bytes from './filters/bytes'
import readable from './filters/readable'

Vue.filter('bytes', bytes)
Vue.filter('readable', readable)
