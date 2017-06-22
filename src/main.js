// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Focus from './directives/Focus'
import Drop from './directives/Drop'

Vue.config.productionTip = false
Vue.directive('focus', Focus)
Vue.directive('drop', Drop)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App }
})
