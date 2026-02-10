import type { CustomerProject, Invoice } from '@/types'
import {
  savePayment,
  removePayment,
  markPaymentAsPaid,
  unmarkPaymentAsPaid,
  generateFinalInvoice,
  deleteFinalInvoice,
} from '@/hooks/paymentFlow.actions'
import {
  createInvoice,
  deleteInvoice,
  getInvoiceByNumber,
  markInvoicePaid,
  markInvoiceUnpaid,
  updateInvoice,
} from '@/lib/supabase/services'

jest.mock('@/lib/supabase/services', () => ({
  createInvoice: jest.fn(),
  deleteInvoice: jest.fn(),
  getInvoiceByNumber: jest.fn(),
  markInvoicePaid: jest.fn(),
  markInvoiceUnpaid: jest.fn(),
  updateInvoice: jest.fn(),
}))

const mockCreateInvoice = createInvoice as jest.MockedFunction<typeof createInvoice>
const mockDeleteInvoice = deleteInvoice as jest.MockedFunction<typeof deleteInvoice>
const mockGetInvoiceByNumber = getInvoiceByNumber as jest.MockedFunction<typeof getInvoiceByNumber>
const mockMarkInvoicePaid = markInvoicePaid as jest.MockedFunction<typeof markInvoicePaid>
const mockMarkInvoiceUnpaid = markInvoiceUnpaid as jest.MockedFunction<typeof markInvoiceUnpaid>
const mockUpdateInvoice = updateInvoice as jest.MockedFunction<typeof updateInvoice>

const alertMock = jest.fn()
const confirmMock = jest.fn()

beforeAll(() => {
  Object.defineProperty(globalThis, 'alert', {
    value: alertMock,
    writable: true,
  })

  Object.defineProperty(globalThis, 'window', {
    value: { confirm: confirmMock },
    writable: true,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('paymentFlow.actions', () => {
  describe('savePayment', () => {
    it('returns false when required form fields are missing', async () => {
      const result = await savePayment({
        projectId: 'proj-1',
        paymentForm: { description: '', amount: 1000 },
        editingPaymentId: null,
        invoiceNumber: '',
      })

      expect(result).toBe(false)
      expect(alertMock).toHaveBeenCalledWith('Bitte füllen Sie Beschreibung und Betrag aus.')
      expect(mockCreateInvoice).not.toHaveBeenCalled()
    })

    it('updates an existing payment when editingPaymentId is provided', async () => {
      mockUpdateInvoice.mockResolvedValue({ ok: true, data: {} as Invoice })

      const result = await savePayment({
        projectId: 'proj-1',
        paymentForm: {
          description: 'Anzahlung 1',
          amount: 1234.567,
          date: '2026-02-01',
        },
        editingPaymentId: 'inv-1',
        invoiceNumber: '',
      })

      expect(result).toBe(true)
      expect(mockUpdateInvoice).toHaveBeenCalledWith('inv-1', {
        amount: 1234.57,
        description: 'Anzahlung 1',
        invoiceDate: '2026-02-01',
      })
      expect(mockCreateInvoice).not.toHaveBeenCalled()
    })

    it('blocks new payment creation when invoice number is already in use', async () => {
      mockGetInvoiceByNumber.mockResolvedValue({ ok: true, data: {} as Invoice })

      const result = await savePayment({
        projectId: 'proj-1',
        paymentForm: { description: 'Anzahlung 1', amount: 1000, date: '2026-02-01' },
        editingPaymentId: null,
        invoiceNumber: 'RE-2026-0001',
      })

      expect(result).toBe(false)
      expect(mockCreateInvoice).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith(
        'Die Rechnungsnummer "RE-2026-0001" ist bereits vergeben. Bitte wählen Sie eine andere Nummer.',
      )
    })

    it('creates a new partial payment with rounded amount', async () => {
      mockGetInvoiceByNumber.mockResolvedValue({
        ok: false,
        code: 'NOT_FOUND',
        message: 'Nicht gefunden',
      })
      mockCreateInvoice.mockResolvedValue({ ok: true, data: {} as Invoice })

      const result = await savePayment({
        projectId: 'proj-1',
        paymentForm: {
          description: 'Anzahlung 1',
          amount: 1999.999,
          date: '2026-02-15',
        },
        editingPaymentId: null,
        invoiceNumber: 'RE-2026-0042',
      })

      expect(result).toBe(true)
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        projectId: 'proj-1',
        type: 'partial',
        amount: 2000,
        invoiceDate: '2026-02-15',
        description: 'Anzahlung 1',
        invoiceNumber: 'RE-2026-0042',
      })
    })
  })

  describe('payment status mutations', () => {
    it('marks payment as paid', async () => {
      mockMarkInvoicePaid.mockResolvedValue({ ok: true, data: {} as Invoice })
      const result = await markPaymentAsPaid('inv-1', '2026-02-10')
      expect(result).toBe(true)
      expect(mockMarkInvoicePaid).toHaveBeenCalledWith('inv-1', '2026-02-10')
    })

    it('unmarks payment as paid', async () => {
      mockMarkInvoiceUnpaid.mockResolvedValue({ ok: true, data: {} as Invoice })
      const result = await unmarkPaymentAsPaid('inv-1')
      expect(result).toBe(true)
      expect(mockMarkInvoiceUnpaid).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('removePayment', () => {
    it('aborts when user cancels confirmation', async () => {
      confirmMock.mockReturnValue(false)

      const result = await removePayment('inv-1')
      expect(result).toBe(false)
      expect(mockDeleteInvoice).not.toHaveBeenCalled()
    })

    it('deletes payment when confirmation is accepted', async () => {
      confirmMock.mockReturnValue(true)
      mockDeleteInvoice.mockResolvedValue({ ok: true, data: undefined })

      const result = await removePayment('inv-1')
      expect(result).toBe(true)
      expect(mockDeleteInvoice).toHaveBeenCalledWith('inv-1')
    })
  })

  describe('generateFinalInvoice', () => {
    const project = {
      id: 'proj-1',
      totalAmount: 10000,
    } as CustomerProject

    it('rejects final invoice when partial payments are still open', async () => {
      const result = await generateFinalInvoice({
        selectedProject: project,
        projects: [project],
        partialPayments: [
          { id: 'p1', amount: 2000, isPaid: true } as Invoice,
          { id: 'p2', amount: 2000, isPaid: false } as Invoice,
        ],
        finalInvoice: undefined,
        invoiceDate: '2026-02-10',
      })

      expect(result).toBe(false)
      expect(mockCreateInvoice).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith(
        '⚠️ Schlussrechnungen können erst erzeugt werden, wenn alle Anzahlungen bezahlt sind.',
      )
    })

    it('rejects final invoice when no remaining amount exists', async () => {
      const result = await generateFinalInvoice({
        selectedProject: project,
        projects: [project],
        partialPayments: [{ id: 'p1', amount: 10000, isPaid: true } as Invoice],
        finalInvoice: undefined,
        invoiceDate: '2026-02-10',
      })

      expect(result).toBe(false)
      expect(mockCreateInvoice).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith(
        'Es gibt keinen verbleibenden Betrag für die Schlussrechnung.',
      )
    })

    it('creates final invoice with calculated remaining gross amount', async () => {
      mockCreateInvoice.mockResolvedValue({ ok: true, data: {} as Invoice })

      const result = await generateFinalInvoice({
        selectedProject: project,
        projects: [project],
        partialPayments: [
          { id: 'p1', amount: 3000, isPaid: true } as Invoice,
          { id: 'p2', amount: 2500, isPaid: true } as Invoice,
        ],
        finalInvoice: undefined,
        invoiceDate: '2026-02-15',
      })

      expect(result).toBe(true)
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        projectId: 'proj-1',
        type: 'final',
        amount: 4500,
        description: 'Schlussrechnung',
        invoiceDate: '2026-02-15',
      })
    })
  })

  describe('deleteFinalInvoice', () => {
    const finalInvoice = {
      id: 'final-1',
      amount: 4500,
      isPaid: false,
    } as Invoice

    it('aborts final invoice deletion when confirmation is declined', async () => {
      confirmMock.mockReturnValue(false)
      const result = await deleteFinalInvoice(finalInvoice)
      expect(result).toBe(false)
      expect(mockDeleteInvoice).not.toHaveBeenCalled()
    })

    it('deletes final invoice when confirmation is accepted', async () => {
      confirmMock.mockReturnValue(true)
      mockDeleteInvoice.mockResolvedValue({ ok: true, data: undefined })

      const result = await deleteFinalInvoice(finalInvoice)
      expect(result).toBe(true)
      expect(mockDeleteInvoice).toHaveBeenCalledWith('final-1')
    })
  })
})
