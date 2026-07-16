export interface HomeHeroSlide {
  id: string
  src: string
  alt: string
  objectPosition?: string
}

// 新增轮播图片时，把优化后的 WebP/JPEG 放入 public/covers，并在此追加一项。
export const HOME_HERO_SLIDES: readonly HomeHeroSlide[] = [
  {
    id: 'rin-len-interlude',
    src: '/covers/interlude_RinLen_3.webp',
    alt: '镜音铃与镜音连的彩色插画',
    objectPosition: 'center 48%',
  },
  {
    id: 'lumine-moon',
    src: '/covers/荧月.webp',
    alt: '荧与月色主题插画',
    objectPosition: 'center 44%',
  },
  {
    id: 'santonia',
    src: '/covers/santonia.webp',
    alt: '桑多涅与小动物在暖色光影中的插画',
    objectPosition: 'center 46%',
  },
]
