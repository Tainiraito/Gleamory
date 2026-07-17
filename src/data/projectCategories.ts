export const FEATURED_PROJECT_ID = 'gleamory'

export const PROJECT_CATEGORIES = [
  {
    id: 'music-audio',
    title: '弦歌有声',
    description: '宫商迭奏，安放乐器、节拍与听辨练习',
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
    title: '丹青拾光',
    description: '丹青不老，收录图像与内容的灵光',
    projectIds: ['netease-cover', 'pixiv-image-extractor'],
  },
  {
    id: 'leisure',
    title: '浮生半日',
    description: '偷得片刻闲，容一场偶遇与欢喜',
    projectIds: ['gacha-simulator', 'moreAni'],
  },
] as const
