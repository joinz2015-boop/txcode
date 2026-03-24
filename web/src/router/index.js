/**
 * Vue Router 路由配置
 * 
 * 定义应用的路由结构：
 * - /           首页，重定向到聊天页
 * - /chat/:id   聊天页面，支持会话 ID 参数
 * - /files      文件管理页面
 * - /skills     Skills 页面
 * - /db         数据库页面
 * - /settings   设置页面
 */

import Vue from 'vue';
import VueRouter from 'vue-router';
import Chat from '../views/Chat.vue';
import Settings from '../views/Settings.vue';
import Files from '../views/Files.vue';
import Skills from '../views/Skills.vue';
import DbView from '../views/DbView.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/chat',
    children: [
      {
        path: 'chat',
        name: 'chat',
        component: Chat,
      },
      {
        path: 'chat/:id',
        name: 'chat-session',
        component: Chat,
      },
      {
        path: 'files',
        name: 'files',
        component: Files,
      },
      {
        path: 'skills',
        name: 'skills',
        component: Skills,
      },
      {
        path: 'db',
        name: 'db',
        component: DbView,
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
      },
    ],
  },
];

const router = new VueRouter({
  mode: 'history',
  routes,
});

export default router;
