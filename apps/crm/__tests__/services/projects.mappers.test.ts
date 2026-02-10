import type { Row } from '@/lib/types/service'
import { mapItemFromDB, mapProjectFromDB } from '@/lib/supabase/services/projects/mappers'
import type { ProjectRow } from '@/lib/supabase/services/projects/types'

function makeInvoiceItemRow(overrides: Partial<Row<'invoice_items'>> = {}): Row<'invoice_items'> {
  return {
    id: 'item-1',
    project_id: 'proj-1',
    article_id: null,
    position: 1,
    description: 'Laufmeter Arbeitsplatte',
    model_number: null,
    manufacturer: null,
    specifications: null,
    quantity: 2,
    unit: 'm',
    price_per_unit: 100,
    gross_price_per_unit: null,
    purchase_price_per_unit: null,
    tax_rate: '20',
    net_total: 200,
    tax_amount: 40,
    gross_total: 240,
    delivery_status: null,
    expected_delivery_date: null,
    actual_delivery_date: null,
    quantity_ordered: null,
    quantity_delivered: null,
    show_in_portal: false,
    serial_number: null,
    installation_date: null,
    warranty_until: null,
    appliance_category: null,
    manufacturer_support_url: null,
    manufacturer_support_phone: null,
    manufacturer_support_email: null,
    created_at: null,
    ...overrides,
  }
}

function makeProjectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'proj-1',
    user_id: 'user-1',
    customer_id: null,
    salesperson_id: null,
    salesperson_name: null,
    customer_name: 'Max Mustermann',
    customer_address: null,
    customer_phone: null,
    customer_email: null,
    order_number: 'K-2026-0001',
    offer_number: null,
    invoice_number: null,
    contract_number: null,
    status: 'Planung',
    total_amount: 1,
    net_amount: 0,
    tax_amount: 0,
    deposit_amount: 0,
    is_deposit_paid: false,
    is_final_paid: false,
    offer_date: null,
    measurement_date: null,
    measurement_time: null,
    is_measured: false,
    order_date: null,
    is_ordered: false,
    delivery_date: null,
    delivery_time: null,
    installation_date: null,
    installation_time: null,
    is_installation_assigned: false,
    completion_date: null,
    notes: '',
    access_code: null,
    complaints: null,
    documents: null,
    payment_schedule: null,
    second_payment_created: false,
    order_footer_text: null,
    order_contract_signed_at: null,
    order_contract_signed_by: null,
    customer_signature: null,
    customer_signature_date: null,
    delivery_status: null,
    all_items_delivered: false,
    ready_for_assembly_date: null,
    delivery_type: 'delivery',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    assigned_employee_id: null,
    is_delivered: null,
    is_completed: null,
    partial_payments: null,
    final_invoice: null,
    access_code_expires_at: null,
    withdrawal_waived_at: null,
    invoice_items: [makeInvoiceItemRow()],
    ...overrides,
  } as unknown as ProjectRow
}

describe('projects mappers', () => {
  it('maps item rows and normalizes laufmeter units', () => {
    const mapped = mapItemFromDB(makeInvoiceItemRow())

    expect(mapped.unit).toBe('lfm')
    expect(mapped.grossPricePerUnit).toBe(120)
    expect(mapped.taxRate).toBe(20)
  })

  it('recalculates project total from mapped items', () => {
    const mapped = mapProjectFromDB(makeProjectRow())

    expect(mapped.items).toHaveLength(1)
    expect(mapped.totalAmount).toBe(240)
  })
})
