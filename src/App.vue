<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { readBarcodesFromImageData } from 'zxing-wasm'

const videoRef = ref<HTMLVideoElement | null>(null)
const result = ref<string>('')
const error = ref<string>('')
const isScanning = ref(false)
const history = ref<{ value: string; time: Date }[]>([])
let animationId: number | null = null

async function startScanner() {
  error.value = ''
  result.value = ''
  isScanning.value = true
  
  try {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (!videoRef.value) {
      error.value = 'Video element not ready'
      isScanning.value = false
      return
    }
    
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    
    const scan = async () => {
      if (!isScanning.value || !videoRef.value) return
      
      try {
        if (videoRef.value.readyState < 2) {
          animationId = requestAnimationFrame(scan)
          return
        }
        
        const imageData = await captureFrame(videoRef.value)
        const decoded = await readBarcodesFromImageData(imageData)
        
        if (decoded.length > 0) {
          result.value = decoded[0].text
          history.value.unshift({ value: result.value, time: new Date() })
          if (history.value.length > 20) history.value.pop()
        }
      } catch (e) {
        if (e instanceof Error && !e.message.includes('NotFound')) {
          console.error('Scan error:', e)
        }
      }
      
      animationId = requestAnimationFrame(scan)
    }
    
    scan()
  } catch (e) {
    console.error('Camera error:', e)
    if (e instanceof Error) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        error.value = 'Camera permission denied. Please allow camera access in browser settings.'
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        error.value = 'No camera found on this device.'
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        error.value = 'Camera is in use by another application.'
      } else if (e.name === 'OverconstrainedError') {
        error.value = 'Camera does not support required resolution.'
      } else {
        error.value = e.message || 'Camera access failed'
      }
    } else {
      error.value = 'Camera access failed'
    }
    isScanning.value = false
  }
}

async function captureFrame(video: HTMLVideoElement): Promise<ImageData> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }
    ctx.drawImage(video, 0, 0)
    resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
  })
}

function stopScanner() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (videoRef.value?.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
  isScanning.value = false
}

function copyResult() {
  navigator.clipboard.writeText(result.value)
}

onMounted(() => {
  startScanner()
})

onUnmounted(() => {
  stopScanner()
})
</script>

<template>
  <div class="min-h-100vh bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
    <header class="text-center py-6">
      <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
        QR Scanner
      </h1>
      <p class="text-slate-400 mt-2">Scan QR codes & barcodes</p>
    </header>
    
    <div class="relative max-w-md mx-auto">
      <div class="aspect-square bg-black rounded-2xl overflow-hidden border-2 border-slate-700">
        <video 
          ref="videoRef" 
          class="w-full h-full object-cover"
          autoplay 
          playsinline
          muted
        ></video>
        
        <div v-if="!isScanning && !error" class="absolute inset-0 flex items-center justify-center bg-black/50">
          <p class="text-slate-300 text-center px-4">Camera inactive</p>
        </div>
        
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
            <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
          </div>
        </div>
      </div>
      
      <div class="mt-4 flex gap-2 justify-center">
        <button 
          @click="startScanner"
          class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
        >
          Start
        </button>
        <button 
          @click="stopScanner"
          class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
    
    <div v-if="error" class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center max-w-md mx-auto">
      {{ error }}
    </div>
    
    <div v-if="result" class="mt-6 p-4 bg-slate-700 rounded-xl max-w-md mx-auto">
      <p class="text-slate-400 text-sm mb-2">Scanned Result</p>
      <p class="text-lg break-all">{{ result }}</p>
      <button 
        @click="copyResult"
        class="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm"
      >
        Copy
      </button>
    </div>
    
    <div v-if="history.length > 0" class="mt-8 max-w-md mx-auto">
      <h2 class="text-lg font-semibold mb-4">History</h2>
      <div class="space-y-2">
        <div 
          v-for="(item, index) in history" 
          :key="index"
          class="p-3 bg-slate-700/50 rounded-lg flex justify-between items-center"
        >
          <span class="text-sm truncate flex-1 mr-4">{{ item.value }}</span>
          <span class="text-xs text-slate-500">{{ item.time.toLocaleTimeString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>