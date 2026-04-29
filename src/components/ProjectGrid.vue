<template>
  <div class="space-y-6">
    <!-- 特色卡片（独占一行） -->
    <template v-for="(project, index) in projects" :key="project.id">
      <ProjectCard 
        v-if="index < featuredCount"
        :project="project"
        :featured="true"
      />
    </template>
    
    <!-- 其余项目使用网格布局（普通卡片） -->
    <div v-if="projects.length > featuredCount" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProjectCard 
        v-for="project in projects.slice(featuredCount)" 
        :key="project.id"
        :project="project"
      />
    </div>
  </div>
</template>

<script setup>
import ProjectCard from './ProjectCard.vue'

const props = defineProps({
  projects: {
    type: Array,
    required: true
  },
  // 特色卡片数量（独占一行的项目数），默认为 3
  featuredCount: {
    type: Number,
    default: 1,
    validator: (value) => value >= 0
  }
})
</script>
