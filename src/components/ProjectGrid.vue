<template>
  <div class="space-y-6">
    <!-- 特色卡片（独占一行） -->
    <template v-for="(project, index) in projects" :key="project.id">
      <ProjectCard v-if="index < (featuredCount ?? 3)" :project="project" :featured="true" />
    </template>

    <!-- 其余项目使用网格布局（普通卡片） -->
    <div
      v-if="projects.length > (featuredCount ?? 3)"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <ProjectCard
        v-for="project in projects.slice(featuredCount ?? 3)"
        :key="project.id"
        :project="project"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProjectCard from './ProjectCard.vue'
import type { Project } from '../types'

const props = defineProps<{
  projects: Project[]
  featuredCount?: number
}>()
</script>
