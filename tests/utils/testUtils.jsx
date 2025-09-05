import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock store providers if needed
const MockStoreProvider = ({ children }) => {
  return children
}

// Custom render function that wraps components with necessary providers
export function renderWithProviders(ui, options = {}) {
  const {
    initialEntries = ['/'],
    ...renderOptions
  } = options

  const Wrapper = ({ children }) => (
    <MockStoreProvider>
      {children}
    </MockStoreProvider>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Mock file for testing file uploads
export const createMockFile = (name = 'test.pdf', type = 'application/pdf', content = 'mock file content') => {
  return new File([content], name, { type })
}

// Helper for waiting for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock Zustand stores
export const mockUseProjectStore = vi.fn()
export const mockUseUserStore = vi.fn()

// Re-export everything from testing library
export * from '@testing-library/react'