import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    if (user.app_metadata?.role === 'customer') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 403 })
    }

    const { data: hasPermission, error: permError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })
    if (permError || !hasPermission) {
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Analysieren von Lieferscheinen' },
        { status: 403 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const { rawText, supplierName } = await request.json()

    if (!rawText) {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
    }

    // Get all projects for matching (scoped to company)
    const serviceClient = await createServiceClient()
    const { data: members, error: membersError } = await serviceClient
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (membersError) {
      return NextResponse.json({ error: 'Fehler beim Laden der Mitglieder' }, { status: 500 })
    }

    const memberUserIds = (members || []).map(m => m.user_id).filter(Boolean)
    let projects: Array<{
      id: string
      customerName?: string
      orderNumber?: string
      status?: string
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
          status,
          invoice_items (
            description,
            model_number
          )
        `
        )
        .in('user_id', memberUserIds)

      if (projectsError) {
        return NextResponse.json({ error: 'Fehler beim Laden der Projekte' }, { status: 500 })
      }

      projects = (projectRows || []).map(project => ({
        id: project.id,
        customerName: project.customer_name || undefined,
        orderNumber: project.order_number || undefined,
        status: project.status || undefined,
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
  .map(
    p =>
      `- ID: ${p.id}, Kunde: ${p.customerName}, Auftrag: ${p.orderNumber}, Status: ${p.status}, Artikel: ${p.items?.map(i => `${i.description} (${i.modelNumber || 'keine'})`).join(', ')}`
  )
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
    console.error('Delivery note analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze delivery note' },
      { status: 500 }
    )
  }
}
