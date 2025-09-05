import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock DOMMatrix
global.DOMMatrix = vi.fn().mockImplementation(() => ({
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
}))

// Mock document.createElement for canvas
const originalCreateElement = document.createElement
document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement.call(document, tagName)
    canvas.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
    }))
    canvas.toBlob = vi.fn((callback) => {
      const mockBlob = new Blob(['mock-image-data'], { type: 'image/png' })
      callback(mockBlob)
    })
    return canvas
  }
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn(),
      style: {}
    }
  }
  return originalCreateElement.call(document, tagName)
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true
})

// Mock navigator.clipboard
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true
})