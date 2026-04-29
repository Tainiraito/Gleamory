<template>
  <div 
    class="card-hover bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
    @click="openProject"
  >
    <!-- 封面图区域 -->
    <div v-if="project.cover" class="h-48 bg-primary-light">
      <img 
        :src="project.cover" 
        :alt="project.name"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- 项目信息 -->
    <div class="p-4">
      <!-- 项目名称和状态 -->
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-primary-dark">{{ project.name }}</h3>
        <span 
          :class="statusClass"
          class="px-2 py-1 text-xs rounded-full"
        >
          {{ project.status }}
        </span>
      </div>

      <!-- 项目描述 -->
      <p class="text-text-secondary text-sm mb-3">{{ project.description }}</p>

      <!-- 标签 -->
      <div class="flex flex-wrap gap-2 mb-3">
        <span 
          v-for="tag in project.tags" 
          :key="tag"
          class="px-2 py-1 bg-accent-purple text-text-primary text-xs rounded"
        >
          {{ tag }}
        </span>
      </div>

      <!-- 版本和更新时间 -->
      <div class="flex items-center justify-between text-xs text-text-secondary">
        <span v-if="project.version">{{ project.version }}</span>
        <span v-if="project.updatedAt">{{ project.updatedAt }}</span>
      </div>
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
    '开发中': 'bg-primary-pink text-white',
    '已上线': 'bg-green-100 text-green-800',
    '已下线': 'bg-gray-100 text-gray-800'
  }
  return statusMap[props.project.status] || 'bg-gray-100 text-gray-800'
})

// 打开项目链接
const openProject = () => {
  if (props.project.url) {
    window.open(props.project.url, '_blank')
  }
}
</script>
