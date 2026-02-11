import type { CustomerProject, InvoiceItem, ProjectDocument } from '@/types'
import type { Row } from '@/lib/types/service'
import { calculateProjectTotals, roundTo2Decimals } from '@/lib/utils/priceCalculations'
import type { ProjectRow } from './types'

export function mapItemFromDB(row: Row<'invoice_items'>): InvoiceItem {
  let unit = row.unit as InvoiceItem['unit']
  if (unit === 'm' && row.description?.toLowerCase().includes('laufmeter')) {
    unit = 'lfm'
  }

  const quantity = row.quantity ?? 0
  const grossTotal = row.gross_total ?? 0

  const grossPricePerUnit =
    row.gross_price_per_unit != null
      ? row.gross_price_per_unit
      : quantity > 0 && Number.isFinite(grossTotal) && grossTotal > 0
        ? roundTo2Decimals(grossTotal / quantity)
        : undefined

  return {
    id: row.id,
    articleId: row.article_id ?? undefined,
    position: row.position,
    description: row.description,
    modelNumber: row.model_number ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    specifications: (row.specifications as Record<string, string>) ?? {},
    quantity,
    unit,
    pricePerUnit: row.price_per_unit ?? 0,
    grossPricePerUnit,
    purchasePricePerUnit: row.purchase_price_per_unit ?? undefined,
    taxRate: (row.tax_rate ? parseInt(row.tax_rate, 10) : 20) as 10 | 13 | 20,
    netTotal: row.net_total ?? 0,
    taxAmount: row.tax_amount ?? 0,
    grossTotal,
    deliveryStatus: row.delivery_status as InvoiceItem['deliveryStatus'],
    expectedDeliveryDate: row.expected_delivery_date ?? undefined,
    actualDeliveryDate: row.actual_delivery_date ?? undefined,
    quantityOrdered: row.quantity_ordered ?? undefined,
    quantityDelivered: row.quantity_delivered ?? undefined,
    procurementType: (row.procurement_type as InvoiceItem['procurementType']) ?? 'external_order',
    showInPortal: row.show_in_portal ?? false,
    serialNumber: row.serial_number ?? undefined,
    installationDate: row.installation_date ?? undefined,
    warrantyUntil: row.warranty_until ?? undefined,
    applianceCategory: row.appliance_category ?? undefined,
    manufacturerSupportUrl: row.manufacturer_support_url ?? undefined,
    manufacturerSupportPhone: row.manufacturer_support_phone ?? undefined,
    manufacturerSupportEmail: row.manufacturer_support_email ?? undefined,
  }
}

export function mapProjectFromDB(row: ProjectRow): CustomerProject {
  const items: InvoiceItem[] = (row.invoice_items ?? []).map(mapItemFromDB)

  let totalAmount = row.total_amount ?? 0
  if (items.length > 0) {
    const { grossTotal } = calculateProjectTotals(items)
    totalAmount = grossTotal
  }

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    salespersonId: row.salesperson_id ?? undefined,
    salespersonName: row.salesperson_name ?? undefined,
    customerName: row.customer_name,
    address: row.customer_address ?? undefined,
    phone: row.customer_phone ?? undefined,
    email: row.customer_email ?? undefined,
    orderNumber: row.order_number,
    offerNumber: row.offer_number ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    contractNumber: row.contract_number ?? undefined,
    status: row.status as CustomerProject['status'],
    items,
    totalAmount,
    netAmount: row.net_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    depositAmount: row.deposit_amount ?? 0,
    isDepositPaid: row.is_deposit_paid ?? false,
    isFinalPaid: row.is_final_paid ?? false,
    paymentSchedule:
      (row.payment_schedule as unknown as CustomerProject['paymentSchedule']) ?? undefined,
    secondPaymentCreated: row.second_payment_created ?? false,
    offerDate: row.offer_date ?? undefined,
    measurementDate: row.measurement_date ?? undefined,
    measurementTime: row.measurement_time ?? undefined,
    isMeasured: row.is_measured ?? false,
    orderDate: row.order_date ?? undefined,
    isOrdered: row.is_ordered ?? false,
    deliveryDate: row.delivery_date ?? undefined,
    deliveryTime: row.delivery_time ?? undefined,
    installationDate: row.installation_date ?? undefined,
    installationTime: row.installation_time ?? undefined,
    isInstallationAssigned: row.is_installation_assigned ?? false,
    completionDate: row.completion_date ?? undefined,
    documents: (row.documents as unknown as ProjectDocument[]) ?? [],
    complaints: (row.complaints as unknown as CustomerProject['complaints']) ?? [],
    notes: (row.notes as string) ?? '',
    accessCode: row.access_code ?? undefined,
    orderFooterText: row.order_footer_text ?? undefined,
    orderContractSignedAt: row.order_contract_signed_at ?? undefined,
    orderContractSignedBy: row.order_contract_signed_by ?? undefined,
    customerSignature: row.customer_signature ?? undefined,
    customerSignatureDate: row.customer_signature_date ?? undefined,
    withdrawalWaivedAt: (row as Record<string, unknown>).withdrawal_waived_at as
      | string
      | undefined,
    deliveryStatus: row.delivery_status as CustomerProject['deliveryStatus'],
    allItemsDelivered: row.all_items_delivered ?? false,
    readyForAssemblyDate: row.ready_for_assembly_date ?? undefined,
    deliveryType: (row.delivery_type as 'delivery' | 'pickup') || 'delivery',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}
