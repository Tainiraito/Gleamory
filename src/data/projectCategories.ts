export const FEATURED_PROJECT_ID = 'gleamory'

export const PROJECT_CATEGORIES = [
  {
    id: 'music-audio',
    title: '音乐与声音',
    description: '乐器、节奏、听音练习与本地音频处理',
    projectIds: [
      'web-piano',
      'metronome',
      'pitch-detector',
      'guitar-fretboard-trainer',
      'audio-separator',
    ],
  },
  {
    id: 'image-content',
    title: '图像与内容',
    description: '提取、整理和保存喜欢的视觉内容',
    projectIds: ['netease-cover', 'pixiv-image-extractor'],
  },
  {
    id: 'leisure',
    title: '轻松一刻',
    description: '抽一次签，或发现下一部想看的作品',
    projectIds: ['gacha-simulator', 'moreAni'],
  },
] as const
