/**
 * Vue Router 路由配置（Hash 模式）
 */

import Vue from 'vue';
import VueRouter from 'vue-router';
import CodeView from '../views/pc/codeView.vue';
import Settings from '../views/pc/Settings.vue';
import Files from '../views/pc/Files.vue';
import Skills from '../views/pc/Skills.vue';
import DbView from '../views/pc/DbView.vue';
import appRoutes from './appRoutes.js';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    redirect: '/views/pc/codeView',
  },
  appRoutes,
  {
    path: '/views/pc',
    component: () => import('../views/pc/Layout.vue'),
    children: [
      {
        path: '',
        redirect: '/views/pc/codeView',
      },
      {
        path: 'codeView',
        name: 'codeView',
        component: CodeView,
        meta: { title: '对话' },
      },
      {
        path: 'codeView/:id',
        name: 'codeView-session',
        component: CodeView,
        meta: { title: '对话' },
      },
      {
        path: 'files',
        name: 'files',
        component: Files,
        meta: { title: '文件管理' },
      },
      {
        path: 'skills',
        name: 'skills',
        component: Skills,
        meta: { title: 'Skill 管理' },
      },
      {
        path: 'terminal',
        name: 'terminal',
        component: () => import('../views/pc/TerminalView.vue'),
        meta: { title: '终端' },
      },
      {
        path: 'terminal/:id',
        name: 'terminal-session',
        component: () => import('../views/pc/TerminalView.vue'),
        meta: { title: '终端' },
      },
      {
        path: 'db',
        name: 'db',
        component: DbView,
        meta: { title: '数据库' },
      },
      {
        path: 'aiLogs',
        name: 'aiLogs',
        component: () => import('../views/pc/AiLogsView.vue'),
        meta: { title: 'AI 日志' },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('../views/pc/TasksView.vue'),
        meta: { title: '任务列表' },
      },
      {
        path: 'devWorkflow',
        name: 'devWorkflow',
        component: () => import('../views/pc/DevWorkflowView.vue'),
        meta: { title: '软件研发' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: { title: '设置' },
      },
      {
        path: 'git-changes',
        name: 'gitChanges',
        component: () => import('../views/pc/GitChanges.vue'),
        meta: { title: 'Git 变更' },
      },
      {
        path: 'custom-actions',
        name: 'customActions',
        component: () => import('../views/pc/CustomActionsView.vue'),
        meta: { title: '自定义操作' },
      },
      {
        path: 'wiki',
        name: 'wiki',
        component: () => import('../views/pc/WikiView.vue'),
        meta: { title: '文档' },
      },
      {
        path: 'fileZihao',
        name: 'fileZihao',
        component: () => import('../views/pc/fileZihao.vue'),
        meta: { title: '文件梓豪' },
      },
      {
        path: 'deploy',
        name: 'deploy',
        component: () => import('../views/pc/deployView.vue'),
        meta: { title: '部署' },
      },
    ],
  },
];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - TXCode`
  }
});

export default router;
