<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- 顶部导航栏 -->
    <header 
      class="sticky top-0 z-50 bg-gradient-to-r from-primary-pink/10 via-white to-primary-purple/10 backdrop-blur-md border-b border-gray-100 shadow-sm"
    >
      <!-- 白色 overlay：opacity 平滑过渡，不影响 header 原始渐变背景 -->
      <div 
        class="absolute inset-0 bg-white transition-opacity duration-1000"
        :style="{ opacity: headerScrolled ? 0.72 : 0 }"
      ></div>
      <div class="relative container mx-auto px-4 py-3 flex items-center justify-between">
        <!-- 左侧标题 -->
        <h1 class="text-2xl font-bold text-gradient">Gleamory 微光集</h1>
        
        <!-- 桌面端导航链接 -->
        <nav class="hidden md:flex items-center gap-6">
          <a 
            href="https://github.com/Tainiraito/Gleamory" 
            target="_blank"
            class="text-primary-pink hover:text-primary-dark transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span class="hidden sm:inline">GitHub</span>
          </a>
        </nav>

        <!-- 移动端汉堡菜单按钮 -->
        <button 
          class="md:hidden p-2 text-text-secondary hover:text-primary-pink transition-colors"
          @click="drawerVisible = true"
          aria-label="打开菜单"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Element Plus 抽屉式移动端导航 -->
    <el-drawer
      v-model="drawerVisible"
      direction="rtl"
      size="280px"
      :with-header="false"
    >
      <div class="flex flex-col gap-4 p-6">
        <h2 class="text-xl font-bold text-gradient mb-4">Gleamory 微光集</h2>
        <a 
          href="https://github.com/Tainiraito/Gleamory" 
          target="_blank"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-primary-pink hover:bg-primary-pink/10 hover:text-primary-dark transition-all"
          @click="drawerVisible = false"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </div>
    </el-drawer>

    <!-- 主要内容 -->
    <main class="container mx-auto px-4 py-8 flex-1 main-content">
      <!-- 滚动 sentinel：内容滚过导航栏时触发 header 增强背景 -->
      <div class="header-sentinel" ref="sentinelRef"></div>
      <!-- 工具展示区域 -->
      <section class="mb-12">
        <div class="flex items-end gap-3 mb-6">
          <h2 class="section-title">拾光集录</h2>
          <p class="text-small text-text-secondary pb-0.5">Tools</p>
        </div>
        <ProjectGrid v-if="projects.length > 0" :projects="projects" />
        <EmptyState v-else type="empty" title="暂无项目" description="项目展示区还在准备中，敬请期待～" />
      </section>

      <!-- 时间线区域 -->
      <section>
        <div class="flex items-end gap-3 mb-6">
          <h2 class="section-title">流光忆庭</h2>
          <p class="text-small text-text-secondary pb-0.5">Timeline</p>
        </div>
        <Timeline v-if="updates.length > 0" :updates="updates" />
        <EmptyState v-else type="empty" title="暂无动态" description="还没有项目更新记录哦～" />
      </section>
    </main>

    <!-- 页面底部 -->
    <footer class="py-6 text-center text-text-secondary text-sm border-t border-gray-100 font-normal">
      <p>© 2026 Gleamory 微光集</p>
    </footer>
    
    <!-- 回到顶部按钮 -->
    <button 
      class='back-to-top' 
      @click='scrollToTop' 
      :class='{ visible: showBackTop }'
      aria-label='回到顶部'
    >↑</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElDrawer } from 'element-plus'
import ProjectGrid from './components/ProjectGrid.vue'
import Timeline from './components/Timeline.vue'
import EmptyState from './components/EmptyState.vue'
import projectsData from './data/projects.json'
import updatesData from './data/timeline.json'

// 移动端抽屉菜单状态
const drawerVisible = ref(false)

// 项目数据（静态数据无需响应式）
const projects = projectsData.projects

// 时间线数据（静态数据无需响应式，倒序排列）
const updates = [...updatesData.updates].reverse()

// 回到顶部功能
const showBackTop = ref(false)

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const handleScroll = () => { showBackTop.value = window.scrollY > 400 }

// ---- 方案①：IntersectionObserver 检测内容滚动 ----
// sentinel 元素滚入 header 下方时增强背景不透明度
const headerScrolled = ref(false)
const sentinelRef = ref(null)
let headerObserver = null

// 滚动动画观察器
let scrollObserver = null

onMounted(() => {
  // 初始化滚动监听
  window.addEventListener('scroll', handleScroll)
  
  // ---- header 背景 sentinel 观察器 ----
  // 缩小顶部 60px（≈header 高度），sentinel 滚入该区域时增强背景
  headerObserver = new IntersectionObserver(
    ([entry]) => { headerScrolled.value = !entry.isIntersecting },
    { rootMargin: '-60px 0px 0px 0px' }
  )
  if (sentinelRef.value) headerObserver.observe(sentinelRef.value)
  
  // 初始化滚动显示动画
  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('revealed')
    })
  }, { threshold: 0.15 })
  
  document.querySelectorAll('.reveal-on-scroll').forEach(el => scrollObserver.observe(el))
})

onUnmounted(() => {
  // 清理事件监听器，防止内存泄漏
  window.removeEventListener('scroll', handleScroll)
  
  // 清理 header 观察器
  if (headerObserver) headerObserver.disconnect()
  
  // 清理滚动动画观察器
  if (scrollObserver) scrollObserver.disconnect()
})
</script>

<style scoped>
/* 主内容区域定位 */
.main-content {
  position: relative;
  z-index: 1;
}
</style>
