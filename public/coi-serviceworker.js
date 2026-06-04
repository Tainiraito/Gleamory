/* coi-serviceworker.js — Cross-Origin Isolation polyfill for GitHub Pages
 *
 * GitHub Pages 不允许设置自定义 HTTP headers,无法通过 COOP/COEP 让页面
 * 获得 crossOriginIsolated 状态。SharedArrayBuffer + 多线程 WASM 必须有
 * 跨域隔离才能用。
 *
 * 这个 service worker 通过拦截请求伪造所需的 COOP/COEP headers,让
 * 浏览器认为页面是 cross-origin isolated 的。
 *
 * 源码:https://github.com/gzuidhof/coi-serviceworker
 * 协议:全 Apache 2.0(详见原仓库)
 */
!function () {
  'use strict'

  if (typeof window === 'undefined') {
    // Service worker context
    self.addEventListener('install', () => self.skipWaiting())
    self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

    self.addEventListener('message', (ev) => {
      if (!ev.data) return
      if (ev.data.type === 'deregister') {
        self.registration.unregister().then(() => self.clients.matchAll()).then((cs) => cs.forEach(({ url }) => fetch(url, { cache: 'reload' })))
      }
    })

    self.addEventListener('fetch', (event) => {
      const req = event.request
      if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return

      const resp = fetch(req)
        .then((r) => {
          if (r.status === 0) return r
          const headers = new Headers(r.headers)
          // 关键:为所有响应添加 COOP/COEP
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
          headers.set('Cross-Origin-Opener-Policy', 'same-origin')
          headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
          return new Response(r.body, { status: r.status, statusText: r.statusText, headers })
        })
        .catch((e) => console.error('[COI-SW]', e))

      event.respondWith(resp)
    })
  } else {
    // Main thread — 注册 SW
    const coi = (window.coi = window.coi || {})
    const shouldRegister = !('coi' in navigator) || (navigator.coi && !navigator.coi.shouldRegister)
    if (!shouldRegister) return

    coi.shouldRegister = true
    coi.doReload = true

    const reload = () => {
      if (coi.doReload) {
        coi.doReload = false
        window.location.reload()
      }
    }

    const swScript = document.currentScript ? document.currentScript.dataset.swSrc || 'coi-serviceworker.js' : 'coi-serviceworker.js'

    navigator.serviceWorker
      .register(swScript)
      .then((reg) => {
        reg.addEventListener('updatefound', reload)
        if (reg.active && !navigator.serviceWorker.controller) reload()
      })
      .catch((err) => console.error('[COI-SW] registration failed', err))
  }
}()
