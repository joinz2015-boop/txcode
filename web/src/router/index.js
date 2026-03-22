/**
 * Vue Router 路由配置
 * 
 * 定义应用的路由结构：
 * - /           首页，重定向到聊天页
 * - /chat/:id   聊天页面，支持会话 ID 参数
 * - /settings   设置页面
 */

import Vue from 'vue';
import VueRouter from 'vue-router';
import Chat from '../views/Chat.vue';
import Settings from '../views/Settings.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/chat',
    name: 'chat',
    component: Chat,
  },
  {
    path: '/chat/:id',
    name: 'chat-session',
    component: Chat,
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
  },
];

const router = new VueRouter({
  mode: 'history',
  routes,
});

export default router;
