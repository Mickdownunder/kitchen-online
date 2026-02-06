import { CustomerProject, ProjectStatus } from '@/types'
import { logger } from '@/lib/utils/logger'
import { formatAddressForDB } from '@/lib/utils/addressFormatter'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

interface UseProjectSubmitProps {
  formData: Partial<CustomerProject>
  /** Aktueller Wert des Adressfelds (wird beim Speichern verwendet, falls formData.address noch nicht gesetzt) */
  currentAddress?: string
  calculations: {
    grossTotal: number
    netTotal: number
    taxTotal: number
  }
  onSave: (project: CustomerProject) => void
  onClose: () => void
}

export function useProjectSubmit({
  formData,
  currentAddress,
  calculations,
  onSave,
  onClose,
}: UseProjectSubmitProps) {
  const handleSubmit = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!formData.customerName || formData.customerName.trim() === '') {
      alert('Bitte geben Sie einen Kundennamen ein.')
      return
    }

    try {
      // Filter out empty items - Artikel mit Beschreibung werden gespeichert, auch wenn Preis 0 ist
      const validItems = (formData.items || []).filter(
        item =>
          item.description &&
          item.description.trim() !== '' &&
          item.pricePerUnit !== undefined &&
          item.pricePerUnit !== null
      )

      logger.debug('Processing items for save', {
        component: 'useProjectSubmit',
        totalItems: formData.items?.length || 0,
        validItems: validItems.length,
      })

      const documents = formData.documents || []
      logger.debug('Documents to save', {
        component: 'useProjectSubmit',
        count: documents.length,
        hasData: documents.some(d => d.data && d.data.length > 0),
      })

      const finalProject: CustomerProject = {
        id: formData.id || Date.now().toString(),
        customerId: formData.customerId,
        customerName: formData.customerName.trim(),
        address:
          formatAddressForDB(
            formData.addressStreet,
            formData.addressHouseNumber,
            formData.addressPostalCode,
            formData.addressCity
          ) ||
          (formData.address ?? currentAddress ?? '').trim(),
        phone: formData.phone || '',
        email: formData.email || '',
        orderNumber: formData.id ? formData.orderNumber : undefined, // Bei neuem Projekt: createProject nutzt getNextOrderNumber()
        status: formData.status || ProjectStatus.PLANNING,
        items: validItems,
        totalAmount: roundTo2Decimals(calculations.grossTotal || 0),
        netAmount: roundTo2Decimals(calculations.netTotal || 0),
        taxAmount: roundTo2Decimals(calculations.taxTotal || 0),
        depositAmount: roundTo2Decimals(
          formData.partialPayments?.reduce((sum, p) => sum + p.amount, 0) ||
            formData.depositAmount ||
            0
        ),
        isDepositPaid: formData.partialPayments?.every(p => p.isPaid) || !!formData.isDepositPaid,
        isFinalPaid: formData.finalInvoice?.isPaid || !!formData.isFinalPaid,
        partialPayments: formData.partialPayments || [],
        finalInvoice: formData.finalInvoice,
        isMeasured: !!formData.isMeasured,
        isOrdered: !!formData.isOrdered,
        isInstallationAssigned: !!formData.isInstallationAssigned,
        documents: documents,
        complaints: formData.complaints || [],
        notes: formData.notes || '',
        orderFooterText: formData.orderFooterText,
        measurementDate: formData.measurementDate,
        measurementTime: formData.measurementTime,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        deliveryType: formData.deliveryType,
        installationDate: formData.installationDate,
        installationTime: formData.installationTime,
        invoiceNumber: formData.invoiceNumber,
        salespersonId: formData.salespersonId,
        salespersonName: formData.salespersonName,
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      logger.debug('Saving project', {
        component: 'useProjectSubmit',
        projectId: finalProject.id,
        customerName: finalProject.customerName,
        documentsCount: finalProject.documents.length,
      })
      onSave(finalProject)
      onClose()
    } catch (error: unknown) {
      logger.error('Error saving project', { component: 'useProjectSubmit' }, error as Error)
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.')
    }
  }

  return { handleSubmit }
}
