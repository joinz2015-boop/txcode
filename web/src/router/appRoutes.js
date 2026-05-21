import AppLayout from '../views/app/AppLayout.vue'
import IndexViewApp from '../views/app/IndexViewApp.vue'
import AppFilesView from '../views/app/FilesViewApp.vue'
import ChatViewApp from '../views/app/ChatViewApp.vue'
import Settings from '../views/pc/Settings.vue'

export default {
  path: '/views/app',
  component: AppLayout,
  children: [
    {
      path: '',
      name: 'app-index',
      component: IndexViewApp,
    },
    {
      path: 'ChatViewApp',
      name: 'app-ChatViewApp',
      component: ChatViewApp,
    },
    {
      path: 'ChatViewApp/:id',
      name: 'app-ChatViewApp-session',
      component: ChatViewApp,
    },
    {
      path: 'FilesViewApp',
      name: 'app-FilesViewApp',
      component: AppFilesView,
    },
    {
      path: 'GitChangesApp',
      name: 'app-GitChangesApp',
      component: () => import('../views/app/GitChangesApp.vue'),
    },
    {
      path: 'DevWorkflowViewApp',
      name: 'app-DevWorkflowViewApp',
      component: () => import('../views/app/DevWorkflowViewApp.vue'),
    },
    {
      path: 'settings',
      name: 'app-settings',
      component: Settings,
    },
  ],
}
