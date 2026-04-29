<template>
  <div 
    class="glass-card reveal-on-scroll overflow-hidden cursor-pointer group flex flex-col h-full"
    style="position:relative;z-index:1"
    @click="openProject"
  >
    <!-- 封面图区域 -->
    <div v-if="project.cover" class="h-48 bg-gradient-to-br from-primary-light to-purple-light overflow-hidden">
      <img 
        :src="project.cover" 
        :alt="project.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
    </div>
    <!-- 无封面时的渐变背景 -->
    <div v-else class="h-32 bg-gradient-to-br from-primary-pink/20 to-primary-purple/20 flex items-center justify-center">
      <span class="text-4xl opacity-50">✨</span>
    </div>

    <!-- 项目信息 -->
    <div class="p-5 flex-1 flex flex-col">
      <!-- 项目名称和状态 -->
      <div class="flex items-start justify-between mb-3 gap-2">
        <h3 class="text-lg font-bold text-text-primary leading-tight group-hover:text-gradient transition-all duration-300">{{ project.name }}</h3>
        <span 
          :class="statusClass"
          class="px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap status-badge"
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
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true
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
</script>