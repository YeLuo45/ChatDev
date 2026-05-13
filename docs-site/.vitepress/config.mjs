import { defineConfig } from "vitepress";

export default defineConfig({
  title: "ChatDev 2.0 文档",
  description: "DevAll - 零代码多智能体编排平台",
  lang: "zh-CN",

  head: [
    ['meta', { name: 'theme-color', content: '#1a1a2e' }],
    ['meta', { name: 'description', content: 'ChatDev 2.0 (DevAll) 零代码多智能体编排平台官方文档' }],
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: '首页', link: '/zh/' },
      { text: '快速入门', link: '/zh/web-ui' },
      { text: '工作流编排', link: '/zh/workflow' },
      { text: '图执行逻辑', link: '/zh/execution' },
      { text: '动态执行', link: '/zh/dynamic' },
      { text: '模块', link: '/zh/modules' },
      { text: '节点', link: '/zh/nodes' },
      { text: 'API', link: '/zh/api' },
    ],

    sidebar: {
      '/zh/': [
        {
          text: '指南',
          items: [
            { text: '首页', link: '/zh/' },
            { text: 'Web UI 快速入门', link: '/zh/web-ui' },
            { text: '工作流编排', link: '/zh/workflow' },
            { text: '图执行逻辑', link: '/zh/execution' },
            { text: '动态执行', link: '/zh/dynamic' },
            { text: '附件与工件 API', link: '/zh/api' },
          ],
        },
        {
          text: '模块',
          items: [
            { text: 'Memory 模块', link: '/zh/modules/memory' },
            { text: 'Thinking 模块', link: '/zh/modules/thinking' },
            { text: 'Tooling 模块', link: '/zh/modules/tooling' },
          ],
        },
        {
          text: '节点类型',
          items: [
            { text: 'Agent 节点', link: '/zh/nodes/agent' },
            { text: 'Python 节点', link: '/zh/nodes/python' },
            { text: 'Human 节点', link: '/zh/nodes/human' },
            { text: 'Subgraph 节点', link: '/zh/nodes/subgraph' },
            { text: '其他节点', link: '/zh/nodes/others' },
          ],
        },
      ],
    },

    footer: {
      message: 'ChatDev 2.0 (DevAll) 文档',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/OpenBMB/ChatDev' },
    ],
  },

  rewrites: {},
});
