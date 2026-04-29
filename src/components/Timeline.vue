<template>
  <div class="space-y-4">
    <!-- 显示的更新列表 -->
    <div 
      v-for="update in displayedUpdates" 
      :key="update.id"
      class="fade-in bg-white rounded-lg p-4 shadow-sm border-l-4 border-primary-pink"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-text-primary">{{ update.content }}</p>
          <p class="text-xs text-text-secondary mt-2">{{ update.date }}</p>
        </div>
      </div>
    </div>

    <!-- 展开全部按钮 -->
    <div v-if="updates.length > 10 && !showAll" class="text-center">
      <button 
        @click="showAll = true"
        class="px-4 py-2 text-primary-dark hover:text-primary-pink transition-colors"
      >
        展开全部 ({{ updates.length }} 条)
      </button>
    </div>

    <!-- 收起按钮 -->
    <div v-if="showAll && updates.length > 10" class="text-center">
      <button 
        @click="showAll = false"
        class="px-4 py-2 text-primary-dark hover:text-primary-pink transition-colors"
      >
        收起
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  updates: {
    type: Array,
    required: true
  }
})

// 是否显示全部
const showAll = ref(false)

// 计算显示的更新列表
const displayedUpdates = computed(() => {
  if (showAll.value) {
    return props.updates
  }
  // 默认显示最近 10 条
  return props.updates.slice(0, 10)
})
</script>
