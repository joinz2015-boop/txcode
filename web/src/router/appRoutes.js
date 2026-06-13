import AppLayout from '../layouts/AppLayout.vue'
import IndexViewApp from '../views/app/home/indexViewApp.vue'
import AppFilesView from '../views/app/file/fileViewApp.vue'
import ChatViewApp from '../views/app/chat/chatViewApp.vue'
import Settings from '../views/pc/settings/settingsView.vue'

export default {
  path: '/views/app',
  component: AppLayout,
  children: [
    {
      path: '',
      name: 'app-index',
      component: IndexViewApp,
      meta: { title: '首页' },
    },
    {
      path: 'ChatViewApp',
      name: 'app-ChatViewApp',
      component: ChatViewApp,
      meta: { title: '对话' },
    },
    {
      path: 'ChatViewApp/:id',
      name: 'app-ChatViewApp-session',
      component: ChatViewApp,
      meta: { title: '对话' },
    },
    {
      path: 'FilesViewApp',
      name: 'app-FilesViewApp',
      component: AppFilesView,
      meta: { title: '文件' },
    },
    {
      path: 'GitChangesApp',
      name: 'app-GitChangesApp',
      component: () => import('../views/app/git/gitChangesApp.vue'),
      meta: { title: 'Git 变更' },
    },
    {
      path: 'DevWorkflowViewApp',
      name: 'app-DevWorkflowViewApp',
      component: () => import('../views/app/workflow/devWorkflowViewApp.vue'),
      meta: { title: '软件研发' },
    },
    {
      path: 'settings',
      name: 'app-settings',
      component: Settings,
      meta: { title: '设置' },
    },
  ],
}
