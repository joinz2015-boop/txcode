/**
 * Vue 应用主入口
 * 
 * 初始化 Vue 实例，配置：
 * - ElementUI 组件库
 * - Vue Router 路由
 * - API 封装挂载
 */

import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import './styles/global.css';
import App from './App.vue';
import router from './router/index.js';
import { api } from './api/index.js';

Vue.use(ElementUI);
Vue.prototype.$api = api;

Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');

// 修复 dropdown-menu 遮罩 dialog 问题
const style = document.createElement('style');
style.textContent = '.v-modal { z-index: 1999 !important; }';
document.head.appendChild(style);
