/// <reference types="vitest/config" />
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const UVR_MODEL_BASE_URL =
  'https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/'

function uvrModelProxyPlugin(): Plugin {
  return {
    name: 'uvr-model-proxy',
    configureServer(server) {
      server.middlewares.use('/model-proxy/uvr/', async (req, res) => {
        const fileName = decodeURIComponent((req.url ?? '').replace(/^\/+/, ''))
        if (!/^[\w.-]+\.onnx$/.test(fileName)) {
          res.statusCode = 400
          res.end('Invalid UVR model filename')
          return
        }

        try {
          const upstream = await fetch(`${UVR_MODEL_BASE_URL}${fileName}`, {
            redirect: 'follow',
            headers: {
              accept: 'application/octet-stream,*/*',
              'user-agent': 'Gleamory-Audio-Separator',
            },
          })

          if (!upstream.ok || !upstream.body) {
            res.statusCode = upstream.status || 502
            res.end(`Failed to fetch upstream model: ${upstream.statusText}`)
            return
          }

          res.statusCode = 200
          res.setHeader('content-type', 'application/octet-stream')
          const contentLength = upstream.headers.get('content-length')
          if (contentLength) {
            res.setHeader('content-length', contentLength)
          }
          res.setHeader('cache-control', 'no-store')

          Readable.fromWeb(upstream.body as unknown as NodeReadableStream).pipe(res)
        } catch (error) {
          res.statusCode = 502
          res.end(error instanceof Error ? error.message : String(error))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), uvrModelProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
})
