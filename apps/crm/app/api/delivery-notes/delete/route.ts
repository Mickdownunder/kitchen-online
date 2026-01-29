import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/supabase/services/audit'
import { logger } from '@/lib/utils/logger'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'supplier' // 'supplier' oder 'customer'

    if (!id) {
      return NextResponse.json(
        { error: 'Fehlende Parameter: id ist erforderlich' },
        { status: 400 }
      )
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    // KRITISCH: Permission-Check - prüfe ob User die Berechtigung hat, Lieferscheine zu löschen
    const { data: canDelete, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'delete_projects',
    })

    if (permError || !canDelete) {
      if (permError) {
        logger.warn(
          'Permission check failed',
          {
            component: 'api/delivery-notes/delete',
            userId: user.id,
          },
          permError
        )
      }
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Löschen von Lieferscheinen' },
        { status: 403 }
      )
    }

    try {
      // Hole den Lieferschein vor dem Löschen für Audit-Log (direkt mit Server-Supabase)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deliveryNoteData: Record<string, any> | null = null

      if (type === 'customer') {
        const { data, error } = await supabase
          .from('customer_delivery_notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          return NextResponse.json({ error: 'Kunden-Lieferschein nicht gefunden' }, { status: 404 })
        }

        deliveryNoteData = {
          deliveryNoteNumber: data.delivery_note_number,
          deliveryDate: data.delivery_date,
          projectId: data.project_id,
          status: data.status,
        }

        // Lösche den Kunden-Lieferschein
        const { error: deleteError } = await supabase
          .from('customer_delivery_notes')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (deleteError) {
          logger.error(
            'Fehler beim Löschen des Kunden-Lieferscheins',
            {
              component: 'api/delivery-notes/delete',
              deliveryNoteId: id,
            },
            deleteError
          )
          throw deleteError
        }
      } else {
        const { data, error } = await supabase
          .from('delivery_notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 })
        }

        deliveryNoteData = {
          supplierName: data.supplier_name,
          supplierDeliveryNoteNumber: data.supplier_delivery_note_number,
          deliveryDate: data.delivery_date,
          status: data.status,
        }

        // Lösche zuerst die Items (falls Foreign Key nicht CASCADE ist)
        const { error: itemsError } = await supabase
          .from('delivery_note_items')
          .delete()
          .eq('delivery_note_id', id)

        if (itemsError) {
          logger.warn(
            'Fehler beim Löschen der Items (möglicherweise CASCADE)',
            {
              component: 'api/delivery-notes/delete',
            },
            itemsError
          )
          // Nicht abbrechen, versuche Lieferschein trotzdem zu löschen
        }

        // Lösche den Lieferschein
        const { error: deleteError } = await supabase
          .from('delivery_notes')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (deleteError) {
          logger.error(
            'Fehler beim Löschen des Lieferscheins',
            {
              component: 'api/delivery-notes/delete',
              deliveryNoteId: id,
            },
            deleteError
          )
          throw deleteError
        }
      }

      // Logge Audit-Event (server-seitig)
      try {
        if (type === 'customer') {
          await logAuditEvent({
            action: 'customer_delivery_note.deleted',
            entityType: 'customer_delivery_note',
            entityId: id,
            changes: {
              before: {
                deliveryNoteNumber: deliveryNoteData.deliveryNoteNumber,
                deliveryDate: deliveryNoteData.deliveryDate,
                projectId: deliveryNoteData.projectId,
                status: deliveryNoteData.status,
              },
              after: undefined,
            },
            metadata: {
              deletedAt: new Date().toISOString(),
            },
          })
        } else {
          await logAuditEvent({
            action: 'delivery_note.deleted',
            entityType: 'delivery_note',
            entityId: id,
            changes: {
              before: {
                supplierName: deliveryNoteData.supplierName,
                supplierDeliveryNoteNumber: deliveryNoteData.supplierDeliveryNoteNumber,
                deliveryDate: deliveryNoteData.deliveryDate,
                status: deliveryNoteData.status,
              },
              after: undefined,
            },
            metadata: {
              deletedAt: new Date().toISOString(),
            },
          })
        }
      } catch (auditError) {
        logger.warn(
          'Fehler beim Loggen des Audit-Events',
          {
            component: 'api/delivery-notes/delete',
          },
          auditError as Error
        )
        // Nicht abbrechen, Löschung war erfolgreich
      }

      logger.info(`${type === 'customer' ? 'Kunden-' : 'Lieferanten-'}Lieferschein gelöscht`, {
        component: 'api/delivery-notes/delete',
        deliveryNoteId: id,
        userId: user.id,
      })

      return NextResponse.json({ success: true, message: 'Lieferschein erfolgreich gelöscht' })
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error(
        'Fehler beim Löschen des Lieferscheins',
        {
          component: 'api/delivery-notes/delete',
          deliveryNoteId: id,
          type,
        },
        error as Error
      )

      if (errMsg.includes('nicht gefunden')) {
        return NextResponse.json({ error: errMsg }, { status: 404 })
      }

      return NextResponse.json(
        { error: errMsg || 'Fehler beim Löschen des Lieferscheins' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    logger.error(
      'Unerwarteter Fehler beim Löschen des Lieferscheins',
      {
        component: 'api/delivery-notes/delete',
      },
      error as Error
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Serverfehler' },
      { status: 500 }
    )
  }
}
