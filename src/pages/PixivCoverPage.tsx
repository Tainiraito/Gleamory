import PluginDetailPage from './PluginDetailPage'
import type { PluginConfig } from './PluginDetailPage'

const config: PluginConfig = {
  name: 'Pixiv 插画下载',
  englishName: 'Pixiv Image Extractor',
  description: '从 Pixiv 作品页一键下载插画/漫画原图，支持作者信息展示与批量保存',
  version: '1.2',
  accentColor: '#0096fa',

  features: [
    {
      icon: 'zap',
      label: '一键提取',
      description: '打开弹窗即自动识别当前作品，无需手动操作',
    },
    {
      icon: 'image',
      label: '原图下载',
      description: '绕过 Pixiv 反爬直接获取原图链接，支持单页/多页作品',
    },
    {
      icon: 'eye',
      label: '作者信息',
      description: '展示作者昵称、头像、ID 及作品标签',
    },
    {
      icon: 'download',
      label: '批量保存',
      description: '多页作品一键批量下载到本地，自动按页码命名',
    },
  ],

  screenshots: [
    {
      src: '/assets/screenshots/pixiv-image-extractor.png',
      alt: '插件弹窗截图',
      caption: '插件主界面 — 打开 Pixiv 作品页后自动展示',
    },
  ],

  usage: {
    install: [
      '下载插件并解压到本地文件夹',
      '打开 Chrome，进入 <code>chrome://extensions/</code>',
      '开启「开发者模式」，点击「加载已解压的扩展程序」',
      '选择插件文件夹，完成安装',
    ],
    usage: [
      '打开 https://www.pixiv.net/ 并浏览作品页',
      '点击浏览器工具栏插件图标打开弹窗',
      '弹窗自动识别当前作品并展示插画/作者信息',
      '点击「下载」按钮保存原图到本地',
    ],
  },

  download: {
    url: 'https://github.com/Tainiraito/pixiv-image-extractor/releases/tag/v1.2',
    steps: ['下载 ZIP', '安装扩展', '访问 pixiv.net'],
  },

  github: 'https://github.com/Tainiraito/pixiv-image-extractor',

  note: '适配 Chrome 88+（Manifest V3），需登录 Pixiv 账号',
}

const PixivCoverPage = () => <PluginDetailPage config={config} />
export default PixivCoverPage
