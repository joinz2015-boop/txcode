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
      },
      {
        path: 'codeView/:id',
        name: 'codeView-session',
        component: CodeView,
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
        path: 'terminal',
        name: 'terminal',
        component: () => import('../views/pc/TerminalView.vue'),
      },
      {
        path: 'terminal/:id',
        name: 'terminal-session',
        component: () => import('../views/pc/TerminalView.vue'),
      },
      {
        path: 'db',
        name: 'db',
        component: DbView,
      },
      {
        path: 'aiLogs',
        name: 'aiLogs',
        component: () => import('../views/pc/AiLogsView.vue'),
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('../views/pc/TasksView.vue'),
      },
      {
        path: 'devWorkflow',
        name: 'devWorkflow',
        component: () => import('../views/pc/DevWorkflowView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
      },
      {
        path: 'git-changes',
        name: 'gitChanges',
        component: () => import('../views/pc/GitChanges.vue'),
      },
      {
        path: 'custom-actions',
        name: 'customActions',
        component: () => import('../views/pc/CustomActionsView.vue'),
      },
      {
        path: 'wiki',
        name: 'wiki',
        component: () => import('../views/pc/WikiView.vue'),
      },
      {
        path: 'fileZihao',
        name: 'fileZihao',
        component: () => import('../views/pc/fileZihao.vue'),
      },
      {
        path: 'deploy',
        name: 'deploy',
        component: () => import('../views/pc/deployView.vue'),
      },
    ],
  },
];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

export default router;
