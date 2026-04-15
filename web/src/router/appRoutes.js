import AppLayout from '../views/app/AppLayout.vue'
import IndexView from '../views/app/IndexView.vue'
import AppFilesView from '../views/app/FilesView.vue'
import ChatView from '../views/app/ChatView.vue'
import Settings from '../views/Settings.vue'

export default {
  path: '/app',
  component: AppLayout,
  children: [
    {
      path: '',
      name: 'app-index',
      component: IndexView,
    },
    {
      path: 'code',
      name: 'app-code',
      component: ChatView,
    },
    {
      path: 'code/:id',
      name: 'app-code-session',
      component: ChatView,
    },
    {
      path: 'files',
      name: 'app-files',
      component: AppFilesView,
    },
    {
      path: 'git',
      name: 'app-git',
      component: () => import('../views/app/GitChangesApp.vue'),
    },
    {
      path: 'dev',
      name: 'app-dev',
      component: () => import('../views/app/DevWorkflowView.vue'),
    },
    {
      path: 'settings',
      name: 'app-settings',
      component: Settings,
    },
  ],
}
