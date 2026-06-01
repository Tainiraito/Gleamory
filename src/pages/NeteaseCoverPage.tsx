import PluginDetailPage from './PluginDetailPage'
import type { PluginConfig } from './PluginDetailPage'

const config: PluginConfig = {
  name: '网易云封面提取',
  englishName: 'Netease Cloud Music Cover Extractor',
  description: '从网易云音乐网页版提取当前播放歌曲的专辑封面，一键下载高清原图',
  version: '2.2',
  accentColor: '#e03050',

  features: [
    {
      icon: 'zap',
      label: '一键提取',
      description: '打开弹窗即自动识别当前歌曲，无需手动操作',
    },
    {
      icon: 'image',
      label: '高清封面',
      description: '实时预览专辑封面，附带歌曲详细信息',
    },
    {
      icon: 'download',
      label: '一键下载',
      description: '自动命名「歌手 - 歌名.jpg」，保存到本地',
    },
    {
      icon: 'globe',
      label: '暗色主题',
      description: '与网易云音乐网页版风格无缝融合',
    },
  ],

screenshots: [
    {
      src: '/assets/screenshots/netease-cover-screenshot-1.png',
      alt: '插件弹窗截图',
      caption: '插件弹窗 — 封面预览 + 歌曲信息',
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
      '打开 <a href="https://music.163.com/" target="_blank" rel="noopener noreferrer" style="color:var(--accent-amber);text-decoration:underline;text-underline-offset:3px">music.163.com</a> 并播放歌曲',
      '点击浏览器工具栏插件图标打开弹窗',
      '弹窗自动识别当前歌曲并展示封面',
      '点击「下载」按钮保存封面到本地',
    ],
  },

  download: {
    url: 'https://github.com/Tainiraito/netease-cloud-music-cover/releases',
    label: '下载插件',
  },

  github: 'https://github.com/Tainiraito/netease-cloud-music-cover',

  note: '适配 Chrome 88+（Manifest V3）',
}

const NeteaseCoverPage = () => <PluginDetailPage config={config} />

export default NeteaseCoverPage