<template>
  <div class="min-h-screen bg-bg-cream">
    <!-- 页面头部 -->
    <header class="py-8 text-center">
      <h1 class="text-4xl font-bold text-primary-dark">Gleamory 微光集</h1>
      <p class="mt-2 text-text-secondary">我的项目展示首页</p>
    </header>

    <!-- 主要内容 -->
    <main class="container mx-auto px-4 py-8">
      <!-- 项目卡片区域 -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-primary-dark mb-6">项目展示</h2>
        <ProjectGrid :projects="projects" />
      </section>

      <!-- 时间线区域 -->
      <section>
        <h2 class="text-2xl font-semibold text-primary-dark mb-6">最新动态</h2>
        <Timeline :updates="updates" />
      </section>
    </main>

    <!-- 页面底部 -->
    <footer class="py-6 text-center text-text-secondary text-sm">
      <p>© 2026 Gleamory 微光集</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProjectGrid from './components/ProjectGrid.vue'
import Timeline from './components/Timeline.vue'
import projectsData from './data/projects.json'
import updatesData from './data/timeline.json'

// 项目数据
const projects = ref(projectsData.projects)

// 时间线数据
const updates = ref(updatesData.updates)
</script>
