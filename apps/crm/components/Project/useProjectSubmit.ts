import { CustomerProject, ProjectStatus } from '@/types'
import { logger } from '@/lib/utils/logger'

interface UseProjectSubmitProps {
  formData: Partial<CustomerProject>
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
        address: formData.address || '',
        phone: formData.phone || '',
        email: formData.email || '',
        orderNumber: formData.id ? formData.orderNumber : undefined, // Bei neuem Projekt: createProject nutzt getNextOrderNumber()
        status: formData.status || ProjectStatus.PLANNING,
        items: validItems,
        totalAmount: calculations.grossTotal || 0,
        netAmount: calculations.netTotal || 0,
        taxAmount: calculations.taxTotal || 0,
        depositAmount:
          formData.partialPayments?.reduce((sum, p) => sum + p.amount, 0) ||
          formData.depositAmount ||
          0,
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
