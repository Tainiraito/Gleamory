import type { ProjectStatus } from '@/types'

/**
 * 状态标签的视觉样式映射
 * 不同状态使用语义化颜色 — 用户一眼能区分项目阶段
 */
export interface StatusStyle {
  color: string       // 文字色
  border: string      // 边框色 (rgba)
  background: string  // 背景色 (rgba)
}

export const getStatusStyle = (status: ProjectStatus): StatusStyle => {
  switch (status) {
    case '已发布':
      // 绿色系：稳定、可靠
      return {
        color: '#10b981',
        border: 'rgba(16,185,129,0.35)',
        background: 'rgba(16,185,129,0.12)',
      }
    case '在线':
      // 蓝色系：在运行，但不一定是稳定版
      return {
        color: '#3b82f6',
        border: 'rgba(59,130,246,0.35)',
        background: 'rgba(59,130,246,0.12)',
      }
    case '开发中':
      // 琥珀色系：进行中
      return {
        color: '#f59e0b',
        border: 'rgba(245,158,11,0.35)',
        background: 'rgba(245,158,11,0.12)',
      }
    case '已下线':
      // 灰色系：归档
      return {
        color: '#9ca3af',
        border: 'rgba(156,163,175,0.35)',
        background: 'rgba(156,163,175,0.12)',
      }
  }
}
