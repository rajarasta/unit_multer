import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, createMockFile } from '../../../utils/testUtils'
import InvoiceProcessor2 from '../../../../src/components/tabs/InvoiceProcessor2'

// Mock dependencies
vi.mock('../../../../src/services/BackendService')
vi.mock('pdfjs-dist')

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('InvoiceProcessor2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders initial upload interface', () => {
    renderWithProviders(<InvoiceProcessor2 />)
    
    expect(screen.getByText(/Invoice Processor/)).toBeInTheDocument()
    expect(screen.getByText(/Kliknite ili povucite datoteke/)).toBeInTheDocument()
    expect(screen.getByText(/PDF ili slike/)).toBeInTheDocument()
  })

  test('shows file input button', () => {
    renderWithProviders(<InvoiceProcessor2 />)
    
    const addButton = screen.getByText(/Dodaj datoteke/)
    expect(addButton).toBeInTheDocument()
  })

  test('shows upload area', () => {
    renderWithProviders(<InvoiceProcessor2 />)
    
    const uploadButton = screen.getByText(/Odaberite datoteke/)
    expect(uploadButton).toBeInTheDocument()
  })
})