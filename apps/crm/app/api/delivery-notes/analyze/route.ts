import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { apiErrors } from '@/lib/utils/errorHandling'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    const limitCheck = await rateLimit(request, user.id)
    if (limitCheck && !limitCheck.allowed) {
      return apiErrors.rateLimit(limitCheck.resetTime)
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden()
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return apiErrors.forbidden()
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return apiErrors.forbidden()
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiErrors.internal(new Error('GEMINI_API_KEY is not configured'), { component: 'delivery-notes-analyze' })
    }

    const { rawText, supplierName } = await request.json()

    if (!rawText) {
      return apiErrors.badRequest()
    }

    // Get recent ordered projects for matching (scoped to company, limited for token efficiency)
    const MATCHING_PROJECT_LIMIT = 40
    const MATCHING_PROJECT_DAYS = 90

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - MATCHING_PROJECT_DAYS)
    const dateFilter = cutoffDate.toISOString().split('T')[0]

    const serviceClient = await createServiceClient()
    const { data: members, error: membersError } = await serviceClient
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (membersError) {
      return apiErrors.internal(new Error('Fehler beim Laden der Mitglieder'), { component: 'delivery-notes-analyze' })
    }

    const memberUserIds = (members || []).map(m => m.user_id).filter(Boolean)
    let projects: Array<{
      id: string
      customerName?: string
      orderNumber?: string
      items?: Array<{ description: string; modelNumber?: string | null }>
    }> = []

    if (memberUserIds.length > 0) {
      const { data: projectRows, error: projectsError } = await serviceClient
        .from('projects')
        .select(
          `
          id,
          customer_name,
          order_number,
          invoice_items (
            description,
            model_number
          )
        `
        )
        .in('user_id', memberUserIds)
        .eq('is_ordered', true)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(MATCHING_PROJECT_LIMIT)

      if (projectsError) {
        return apiErrors.internal(new Error('Fehler beim Laden der Projekte'), { component: 'delivery-notes-analyze' })
      }

      projects = (projectRows || []).map(project => ({
        id: project.id,
        customerName: project.customer_name || undefined,
        orderNumber: project.order_number || undefined,
        items: (project.invoice_items || []).map(
          (item: { description: string; model_number?: string | null }) => ({
            description: item.description,
            modelNumber: item.model_number || undefined,
          })
        ),
      }))
    }

    // AI Analysis: Extract delivery note data
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `Analysiere diesen Lieferschein-Text und extrahiere strukturierte Daten:

Lieferschein-Text:
${rawText}

${supplierName ? `Lieferant: ${supplierName}` : ''}

Extrahiere:
1. Lieferant-Name (falls nicht gegeben)
2. Lieferschein-Nummer
3. Lieferdatum (Format: YYYY-MM-DD)
4. Alle Positionen mit:
   - Position-Nummer
   - Artikel-Beschreibung
   - Modellnummer (falls vorhanden)
   - Hersteller
   - Bestellte Menge
   - Gelieferte Menge
   - Einheit

Antworte im JSON-Format.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplierName: { type: Type.STRING, description: 'Name des Lieferanten' },
            deliveryNoteNumber: { type: Type.STRING, description: 'Lieferschein-Nummer' },
            deliveryDate: { type: Type.STRING, description: 'Lieferdatum im Format YYYY-MM-DD' },
            items: {
              type: Type.ARRAY,
              description: 'Liste der Positionen',
              items: {
                type: Type.OBJECT,
                properties: {
                  positionNumber: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  modelNumber: { type: Type.STRING },
                  manufacturer: { type: Type.STRING },
                  quantityOrdered: { type: Type.NUMBER },
                  quantityReceived: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
              },
            },
          },
          required: ['supplierName', 'deliveryNoteNumber', 'items'],
        },
      },
    })

    const analysis = JSON.parse(analysisResponse.text || '{}')

    // AI Matching: Find best matching project
    const matchingResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `Finde den passenden Auftrag für diesen Lieferschein:

Lieferschein:
- Lieferant: ${analysis.supplierName}
- Lieferschein-Nr: ${analysis.deliveryNoteNumber}
- Artikel: ${analysis.items?.map((i: { description: string; modelNumber?: string }) => `${i.description} (${i.modelNumber || 'keine Modellnummer'})`).join(', ')}

Verfügbare Aufträge:
${projects
  .map(p => {
    const itemsStr = (p.items || [])
      .slice(0, 5)
      .map(i => i.modelNumber || i.description?.slice(0, 40) || '?')
      .join(', ')
    return `- ID: ${p.id}, Kunde: ${p.customerName}, Auftrag: ${p.orderNumber}, Artikel: ${itemsStr}`
  })
  .join('\n')}

Finde den besten Match basierend auf:
1. Lieferant (falls bekannt)
2. Artikel-Modellnummern
3. Artikel-Beschreibungen
4. Mengen

Antworte mit projectId und confidence (0.0-1.0).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectId: { type: Type.STRING, description: 'ID des passenden Projekts' },
            confidence: { type: Type.NUMBER, description: 'Confidence-Score 0.0-1.0' },
            matchedItems: {
              type: Type.ARRAY,
              description: 'Zuordnung der Lieferschein-Positionen zu Projekt-Artikeln',
              items: {
                type: Type.OBJECT,
                properties: {
                  deliveryNoteItemIndex: { type: Type.NUMBER },
                  projectItemId: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
              },
            },
            reasoning: { type: Type.STRING, description: 'Begründung für den Match' },
          },
        },
      },
    })

    const matching = JSON.parse(matchingResponse.text || '{}')

    return NextResponse.json({
      analysis,
      matching: {
        projectId: matching.projectId || null,
        confidence: matching.confidence || 0,
        matchedItems: matching.matchedItems || [],
        reasoning: matching.reasoning || '',
      },
    })
  } catch (error: unknown) {
    return apiErrors.internal(error as Error, { component: 'delivery-notes-analyze' })
  }
}
