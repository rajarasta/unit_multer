import { vi } from 'vitest'

const mockBackendService = {
  analyzeDocument: vi.fn().mockResolvedValue({
    success: true,
    data: {
      documentType: 'invoice',
      documentNumber: 'R-2025-001',
      issueDate: '2025-01-15',
      dueDate: '2025-02-15',
      supplier: {
        name: 'Test Supplier d.o.o.',
        address: 'Test Street 123',
        taxNumber: '12345678901'
      },
      customer: {
        name: 'Test Customer d.o.o.',
        address: 'Customer Street 456',
        taxNumber: '98765432109'
      },
      items: [
        {
          position: '1',
          code: 'ALU-001',
          description: 'Test aluminijumski profil',
          quantity: 10,
          unit: 'kom',
          unitPrice: 25.50,
          discountPercent: 0,
          totalPrice: 255.00
        }
      ],
      totals: {
        subtotal: 255.00,
        taxAmount: 51.00,
        totalAmount: 306.00
      },
      currency: 'EUR'
    }
  }),

  processDocument: vi.fn().mockResolvedValue({
    success: true,
    analysis: {
      confidence: 0.95,
      extractedText: 'Mock extracted text from document'
    }
  })
}

export default mockBackendService