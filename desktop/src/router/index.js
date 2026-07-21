import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  { path: '/', redirect: '/views/code/coding' },
  {
    path: '/views',
    component: () => import('../layouts/DesktopLayout.vue'),
    redirect: '/views/code/coding',
    children: [
      { path: 'code/coding', name: 'coding', component: () => import('../views/code/DesktopCodingView.vue') },
      { path: 'design/designView', name: 'design', component: () => import('../views/design/DesktopDesignView.vue') },
      { path: 'specs/specsView', name: 'specs', component: () => import('../views/specs/DesktopSpecsView.vue') },
      { path: 'skills/skillsView', name: 'skills', component: () => import('../views/skills/DesktopSkillsView.vue') },
      { path: 'settings/settingsView', name: 'settings', component: () => import('../views/settings/DesktopSettingsView.vue') },
      { path: 'plugins/pluginsView', name: 'plugins', component: () => import('../views/plugins/DesktopPluginsView.vue') },
      { path: 'plugins/webshellManage', name: 'webshellManage', component: () => import('../views/plugins/webshell/webshellManage.vue') },
      { path: 'plugins/webshellWorkbench', name: 'webshellWorkbench', component: () => import('../views/plugins/webshell/webshellWorkbench.vue') },
    ]
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

export default router
