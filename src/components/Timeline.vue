<template>
  <div class="space-y-4 timeline-container">
    <el-timeline mode="start">
      <!-- :css="showAll" 为 false 时禁用 CSS 过渡类，收起时直接隐藏不延迟 -->
      <transition-group 
        name="timeline-fade" 
        tag="div"
        :css="showAll"
      >
        <el-timeline-item
          v-for="(update, index) in displayedUpdates"
          :key="update.id"
          :timestamp="update.date"
          placement="top"
          color="#F783AC"
          :style="{ animationDelay: `${index * 0.02}s` }"
          class="timeline-item-animate"
        >
          <template #dot>
            <div class="timeline-dot"></div>
          </template>
          <span class="text-text-body text-body font-normal">{{ update.content }}</span>
        </el-timeline-item>
      </transition-group>
    </el-timeline>

    <!-- 展开全部按钮 -->
    <div v-if="updates.length > 10 && !showAll" class="text-center">
      <button
        @click="showAll = true"
        class="px-4 py-2 text-sm font-medium rounded-8 text-primary-dark hover:text-primary-purple hover:bg-primary-purple/10 transition-all duration-100"
      >
        展开全部 ({{ updates.length }} 条)
      </button>
    </div>

    <!-- 收起按钮 -->
    <div v-if="showAll && updates.length > 10" class="text-center">
      <button
        @click="showAll = false"
        class="px-4 py-2 text-sm font-medium rounded-8 text-text-secondary hover:text-primary-purple hover:bg-primary-purple/10 transition-all duration-100"
      >
        收起
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElTimeline, ElTimelineItem } from 'element-plus'

const props = defineProps({
  updates: {
    type: Array,
    required: true
  }
})

const showAll = ref(false)

const displayedUpdates = computed(() => {
  if (showAll.value) {
    return props.updates
  }
  return props.updates.slice(0, 10)
})
</script>

<style scoped>
/* 时间线容器 */
.timeline-container {
  position: relative;
  z-index: 1;
}

/* 时间线圆点 */
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F783AC, #B490E4);
}

/* 时间线条目载入动画 */
@keyframes timelineSlideIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-item-animate {
  animation: timelineSlideIn 0.4s ease-out forwards;
  opacity: 0;
}

/* Vue Transition 动画（仅用于展开，收起时禁用） */
.timeline-fade-enter-active {
  transition: all 0.25s ease-out;
}

.timeline-fade-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

/* 收起时不使用动画 */
.timeline-fade-leave-active {
  transition: none;
}

.timeline-fade-leave-to {
  opacity: 0;
  transform: translateY(0);
}
</style>
