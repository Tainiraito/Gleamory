<template>
  <div 
    class="reveal-on-scroll overflow-hidden cursor-pointer group relative"
    :class="featured ? 'featured-card' : 'glass-card'"
    style="position:relative;z-index:1"
    @click="openProject"
  >
    <!-- 特色卡片布局（前三个项目） -->
    <template v-if="featured">
      <!-- 封面图作为背景 -->
      <div v-if="project.cover" class="absolute inset-0">
        <img 
          :src="project.cover" 
          :alt="project.name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <!-- 渐变遮罩确保文字可读性 -->
        <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
      </div>
      <!-- 无封面时的渐变背景 -->
      <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-pink/30 to-primary-purple/30">
        <div class="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
      </div>

      <!-- 内容区域 -->
      <div class="relative z-10 p-8 flex flex-col justify-between min-h-[320px] text-white">
        <!-- 顶部：标题和状态 -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-3xl font-bold mb-2 leading-tight">{{ project.name }}</h3>
            <p class="text-lg text-white/90 line-clamp-2 max-w-2xl">{{ project.description }}</p>
          </div>
          <span 
            class="px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap bg-white/20 backdrop-blur-md border border-white/30 text-white"
          >
            {{ project.status }}
          </span>
        </div>

        <!-- 底部：标签和元信息 -->
        <div class="space-y-4">
          <!-- 标签 -->
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="tag in project.tags" 
              :key="tag"
              class="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white text-sm rounded-full border border-white/25 font-medium"
            >
              {{ tag }}
            </span>
          </div>

          <!-- 版本和更新时间 -->
          <div class="flex items-center gap-6 text-sm text-white/80">
            <span v-if="project.version" class="font-medium">{{ project.version }}</span>
            <span v-if="project.updatedAt" class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              {{ project.updatedAt }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 普通卡片布局（其余项目） -->
    <template v-else>
      <!-- 封面图区域 -->
      <div v-if="project.cover" class="h-48 bg-gradient-to-br from-primary-light to-purple-light overflow-hidden">
        <img 
          :src="project.cover" 
          :alt="project.name"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          @error="onImageError"
        />
      </div>
      <!-- 封面加载失败或没有封面时的渐变占位 -->
      <div v-else class="h-32 bg-gradient-to-br from-primary-pink/20 to-primary-purple/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-purple/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>

      <!-- 项目信息 -->
      <div class="p-5 flex-1 flex flex-col">
        <!-- 项目名称和状态 -->
        <div class="flex items-start justify-between mb-3 gap-2">
          <h3 class="text-lg font-semibold text-text-primary leading-tight group-hover:text-gradient transition-all duration-300">{{ project.name }}</h3>
          <span 
            :class="statusClass"
            class="px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap"
          >
            {{ project.status }}
          </span>
        </div>

        <!-- 项目描述 -->
        <p class="text-text-body text-sm mb-4 line-clamp-2 leading-relaxed flex-1 font-normal">{{ project.description }}</p>

        <!-- 标签 -->
        <div class="flex flex-wrap gap-2 mb-4">
          <span 
            v-for="tag in project.tags" 
            :key="tag"
            class="px-2.5 py-1 bg-gradient-to-r from-primary-purple/10 to-primary-pink/10 text-primary-purple text-xs rounded-full border border-primary-purple/20 font-medium"
          >
            {{ tag }}
          </span>
        </div>

        <!-- 版本和更新时间 - 固定在底部 -->
        <div class="flex items-center justify-between text-xs text-text-secondary pt-3 border-t border-gray-100 mt-auto font-normal">
          <span v-if="project.version">{{ project.version }}</span>
          <span v-if="project.updatedAt" class="flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            {{ project.updatedAt }}
          </span>
        </div>
      </div>
      
      <!-- 悬停时的光效装饰 -->
      <div class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary-pink/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-primary-purple/10 rounded-full blur-3xl"></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
  },
  featured: {
    type: Boolean,
    default: false
  }
})

// 状态样式
const statusClass = computed(() => {
  const statusMap = {
    '开发中': 'bg-gradient-to-r from-primary-pink/20 to-primary-pink/10 text-primary-dark border border-primary-pink/30',
    '已上线': 'bg-gradient-to-r from-primary-purple/20 to-primary-purple/10 text-primary-purple border border-primary-purple/30',
    '已下线': 'bg-gray-100 text-text-secondary border border-gray-200'
  }
  return statusMap[props.project.status] || 'bg-gray-100 text-gray-800 border border-gray-200'
})

// 打开项目链接
const openProject = () => {
  if (props.project.url) {
    window.open(props.project.url, '_blank')
  }
}

// 封面图加载失败时的回调（隐藏图片，显示兜底占位）
const onImageError = (e) => {
  e.target.style.display = 'none'
}
</script>

<style scoped>
/* 特色卡片样式 */
.featured-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: none;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 320px;
}

.featured-card:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 0 0 1px rgba(180, 144, 228, 0.3),
    0 8px 32px rgba(247, 131, 172, 0.15);
  background: rgba(255, 255, 255, 1);
}
</style>