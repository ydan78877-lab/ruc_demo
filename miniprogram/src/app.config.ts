export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/overview/index',
    'pages/functions/index',
    'pages/target/index',
    'pages/template-settings/index',
    'pages/cases/index',
    'pages/case-detail/index',
    'pages/interviews/index',
    'pages/archive/index',
    'pages/resume/index',
    'pages/entry/index',
    'pages/templates/index',
    'pages/profile/index',
    'pages/matters/index',
    'pages/matter-detail/index',
    'pages/matter-editor/index',
    'pages/spaces/index',
    'pages/space-detail/index',
    'pages/resource-preview/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F7FAFF',
    navigationBarTitleText: '人大中法学生助手',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F5F8FC'
  },
  lazyCodeLoading: 'requiredComponents',
  sitemapLocation: 'sitemap.json'
})
