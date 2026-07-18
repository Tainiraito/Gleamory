import PluginDetailPage from './PluginDetailPage'
import type { PluginConfig } from './PluginDetailPage'
import { getProjectById } from '@/utils/projectData'

const project = getProjectById('markdown-furigana')!

const config: PluginConfig = {
  name: project.name,
  englishName: 'Furigana Lens',
  description: project.description,
  version: project.version.replace(/^v/, ''),
  accentColor: '#b46f32',
  notice:
    '个人自用独立实现，暂不提供公开下载、安装支持或社区插件提交。页面仅记录当前功能与语法兼容关系。',

  features: [
    {
      icon: 'feather',
      label: '灵活注音语法',
      description: '支持半角与日文括号、分隔符，可为汉字、假名、全角字符和数字添加注音。',
    },
    {
      icon: 'eye',
      label: '双视图一致',
      description: '阅读视图与实时预览共享解析逻辑，表格、Callout 与送假名写法表现一致。',
    },
    {
      icon: 'settings',
      label: '三种显示模式',
      description: '可选择默认模糊、悬停前隐藏或始终清晰显示，并保持行高稳定。',
    },
    {
      icon: 'smartphone',
      label: '便于阅读编辑',
      description: '实时预览中的注音可点击回到源码编辑，阅读视图复制时不混入注音文字。',
    },
  ],

  usage: {
    usage: [
      '整词注音：<code>{漢字|かんじ}</code>',
      '逐字注音：<code>{漢字|かん|じ}</code>',
      '数字与混合文本：<code>{1日目|いち|nichi|め}</code>',
      '日文输入法符号：<code>＜漢字｜かん｜じ＞</code>',
      '在插件设置中选择显示模式，并调整模糊强度、默认透明度和悬停延迟',
    ],
  },

  externalLinks: [
    {
      url: 'https://github.com/steven-kraft/obsidian-markdown-furigana',
      label: '语法灵感项目',
    },
  ],

  note: 'Furigana Lens 为独立实现；来源链接仅说明既有语法灵感，不代表代码继承或官方关系。',
}

const MarkdownFuriganaPage = () => <PluginDetailPage config={config} />

export default MarkdownFuriganaPage
