import { vi } from 'vitest'

export const GlobalWorkerOptions = {
  get workerSrc() { return 'mocked-worker.js' },
  set workerSrc(value) { }
}

const mockPage = {
  getViewport: vi.fn(() => ({
    width: 595,
    height: 842
  })),
  render: vi.fn(() => ({
    promise: Promise.resolve()
  }))
}

const mockPdf = {
  numPages: 2,
  getPage: vi.fn(() => Promise.resolve(mockPage))
}

export const getDocument = vi.fn(() => ({
  promise: Promise.resolve(mockPdf)
}))

export default {
  getDocument,
  GlobalWorkerOptions
}