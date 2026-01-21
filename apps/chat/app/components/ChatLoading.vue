<script setup lang="ts">
const props = defineProps<{
  text?: string
}>()

const messages = [
  'Searching the documentation',
  'Reading through the docs',
  'Looking for relevant files',
  'Analyzing the content',
  'Finding the best answer',
  'Checking related resources',
  'Almost there',
]

const currentIndex = ref(0)
const targetText = computed(() => props.text || messages[currentIndex.value])
const displayedText = ref(targetText.value)

const chars = 'abcdefghijklmnopqrstuvwxyz'

function scrambleText(from: string, to: string) {
  const maxLength = Math.max(from.length, to.length)
  let frame = 0
  const totalFrames = 15

  const animate = () => {
    frame++
    let result = ''

    for (let i = 0; i < maxLength; i++) {
      const progress = frame / totalFrames
      const charProgress = progress * maxLength

      if (i < charProgress - 2) {
        result += to[i] || ''
      } else if (i < charProgress) {
        result += chars[Math.floor(Math.random() * chars.length)]
      } else {
        result += from[i] || ''
      }
    }

    displayedText.value = result

    if (frame < totalFrames) {
      requestAnimationFrame(animate)
    } else {
      displayedText.value = to
    }
  }

  requestAnimationFrame(animate)
}

// Matrix animation
const gridSize = 3
const totalDots = gridSize * gridSize
const activeDots = ref<Set<number>>(new Set())
const animationIndex = ref(0)

// Different patterns for the matrix
const patterns = [
  // Spin clockwise
  [[0], [1], [2], [5], [8], [7], [6], [3]],
  // Diagonal wave
  [[0], [1, 3], [2, 4, 6], [5, 7], [8]],
  // Center pulse
  [[4], [1, 3, 5, 7], [0, 2, 6, 8], [1, 3, 5, 7], [4]],
  // Corners then center
  [[0, 2, 6, 8], [1, 3, 5, 7], [4]],
  // Row by row
  [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
  // Snake
  [[0], [1], [2], [5], [4], [3], [6], [7], [8]],
]

let patternIndex = 0
let stepIndex = 0
let matrixInterval: ReturnType<typeof setInterval> | null = null
let textInterval: ReturnType<typeof setInterval> | null = null

function nextStep() {
  const pattern = patterns[patternIndex]
  if (!pattern) return

  activeDots.value = new Set(pattern[stepIndex])
  stepIndex++

  if (stepIndex >= pattern.length) {
    stepIndex = 0
    patternIndex = (patternIndex + 1) % patterns.length
  }
}

watch(targetText, (newText, oldText) => {
  if (newText !== oldText) {
    scrambleText(oldText, newText)
  }
})

onMounted(() => {
  // Matrix animation - faster
  matrixInterval = setInterval(nextStep, 150)
  nextStep()

  // Text rotation
  if (!props.text) {
    textInterval = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % messages.length
    }, 3500)
  }
})

onUnmounted(() => {
  if (matrixInterval) clearInterval(matrixInterval)
  if (textInterval) clearInterval(textInterval)
})
</script>

<template>
  <div class="flex items-center gap-3 text-sm text-muted">
    <div class="matrix">
      <span
        v-for="i in totalDots"
        :key="i"
        class="matrix-dot"
        :class="{ active: activeDots.has(i - 1) }"
      />
    </div>
    <span class="font-mono tracking-tight">{{ displayedText }}</span>
  </div>
</template>

<style scoped>
.matrix {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  width: 18px;
  height: 18px;
}

.matrix-dot {
  width: 4px;
  height: 4px;
  background-color: currentColor;
  opacity: 0.2;
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.matrix-dot.active {
  opacity: 1;
  transform: scale(1.1);
}
</style>
