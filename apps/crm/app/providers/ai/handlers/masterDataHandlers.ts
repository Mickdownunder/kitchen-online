import type { CompanyRole } from '@/types'
import {
  createArticle as createArticleInDB,
  createCustomer as createCustomerInDB,
  getCompanySettings,
  saveCompanySettings,
  saveEmployee,
  updateArticle as updateArticleInDB,
  updateCustomer as updateCustomerInDB,
  getCustomers,
  getCustomer,
  getArticles,
} from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleCreateArticle(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    // KRITISCH: AI Input-Validierung für Artikeldaten
    const articleName = args.name as string | undefined
    const rawSellingPrice = parseFloat(String(args.sellingPrice ?? 0))
    const rawPurchasePrice = parseFloat(String(args.purchasePrice ?? 0))
    const rawTaxRate = parseInt(String(args.taxRate ?? 20))

    if (!articleName || articleName.trim() === '') {
      return `❌ Artikelname ist erforderlich.`
    }
    if (isNaN(rawSellingPrice) || rawSellingPrice < 0) {
      return `❌ Ungültiger Verkaufspreis: ${args.sellingPrice}. Preis muss eine positive Zahl sein.`
    }
    if (!isNaN(rawPurchasePrice) && rawPurchasePrice < 0) {
      return `❌ Ungültiger Einkaufspreis: ${args.purchasePrice}. Preis darf nicht negativ sein.`
    }
    if (!isNaN(rawTaxRate) && (rawTaxRate < 0 || rawTaxRate > 100)) {
      return `❌ Ungültiger Steuersatz: ${args.taxRate}. Steuersatz muss zwischen 0 und 100 liegen.`
    }

    // Dependency Check: Prüfe ob Artikel bereits existiert
    const articleNumber = args.articleNumber as string | undefined
    const existingArticles = await getArticles()
    const existingArticle = existingArticles.find(
      a => a.name?.toLowerCase() === articleName.toLowerCase() || a.sku === articleNumber
    )

    if (existingArticle) {
      return `⚠️ Artikel "${articleName}" existiert bereits (SKU: ${existingArticle.sku}). Verwende diese ID für weitere Aktionen.`
    }

    const categoryMap: Record<
      string,
      'Kitchen' | 'Appliance' | 'Accessory' | 'Service' | 'Material' | 'Other'
    > = {
      Küche: 'Kitchen',
      Geräte: 'Appliance',
      Zubehör: 'Accessory',
      Service: 'Service',
      Material: 'Material',
      Sonstiges: 'Other',
    }
    const unitMap: Record<string, 'Stk' | 'Pkg' | 'Std' | 'Paush' | 'm' | 'm²'> = {
      Stk: 'Stk',
      stk: 'Stk',
      STK: 'Stk',
      Pkg: 'Pkg',
      pkg: 'Pkg',
      PKG: 'Pkg',
      Std: 'Std',
      std: 'Std',
      STD: 'Std',
      Paush: 'Paush',
      paush: 'Paush',
      PAUSH: 'Paush',
      m: 'm',
      M: 'm',
      lfm: 'm',
      LFM: 'm',
      'lfm.': 'm',
      'm²': 'm²',
      m2: 'm²',
      'M²': 'm²',
      qm: 'm²',
      QM: 'm²',
    }

    const category = args.category as string | undefined
    const articleUnit = args.unit as string | undefined
    const articleDescription = args.description as string | undefined
    const supplier = args.supplier as string | undefined

    const newArticle = await createArticleInDB({
      name: articleName,
      sku: articleNumber || `ART-${Date.now().toString().slice(-6)}`,
      description: articleDescription,
      category: (category && categoryMap[category]) || 'Other',
      unit: (articleUnit && unitMap[articleUnit]) || 'Stk',
      defaultPurchasePrice: rawPurchasePrice || 0,
      defaultSalePrice: rawSellingPrice || 0,
      taxRate: rawTaxRate === 10 || rawTaxRate === 13 || rawTaxRate === 20 ? rawTaxRate : 20,
      manufacturer: supplier,
      isActive: true,
    })

    // Validation: Prüfe ob Artikel wirklich angelegt wurde
    const verifyArticles = await getArticles()
    const verifyArticle = verifyArticles.find(a => a.id === newArticle.id)
    if (!verifyArticle) {
      return '❌ Fehler: Artikel wurde nicht korrekt angelegt. Bitte manuell prüfen.'
    }

    return `✅ Artikel "${articleName}" im Artikelstamm angelegt (SKU: ${newArticle.sku}, ID: ${newArticle.id}).`
  } catch (error: unknown) {
    console.error('Error creating article:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Anlegen des Artikels: ${errorMessage}`
  }
}

export async function handleUpdateArticle(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    await updateArticleInDB(args.articleId as string, {
      name: args.name as string | undefined,
      sku: args.articleNumber as string | undefined,
      description: args.description as string | undefined,
      defaultPurchasePrice: args.purchasePrice as number | undefined,
      defaultSalePrice: args.sellingPrice as number | undefined,
      taxRate: args.taxRate as 10 | 13 | 20 | undefined,
      manufacturer: args.supplier as string | undefined,
      isActive: args.isActive as boolean | undefined,
    })
    return `✅ Artikel im Stamm aktualisiert.`
  } catch (error) {
    console.error('Error updating article:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleCreateCustomer(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    const firstName = args.firstName as string
    const lastName = args.lastName as string
    const companyName = args.companyName as string | undefined

    // Dependency Check: Prüfe ob Kunde bereits existiert
    const existingCustomers = await getCustomers()
    const existingCustomer = existingCustomers.find(
      c =>
        (c.firstName?.toLowerCase() === firstName?.toLowerCase() &&
          c.lastName?.toLowerCase() === lastName?.toLowerCase()) ||
        (companyName && c.companyName?.toLowerCase() === companyName.toLowerCase())
    )

    if (existingCustomer) {
      return `⚠️ Kunde "${firstName} ${lastName}" existiert bereits (ID: ${existingCustomer.id}). Verwende diese ID für weitere Aktionen.`
    }

    const newCustomer = await createCustomerInDB({
      firstName,
      lastName,
      companyName,
      address: {
        street: (args.street as string) || '',
        houseNumber: (args.houseNumber as string) || '',
        postalCode: (args.postalCode as string) || '',
        city: (args.city as string) || '',
        country: 'Österreich',
      },
      contact: { phone: (args.phone as string) || '', email: (args.email as string) || '' },
      notes: args.notes as string | undefined,
    })

    // Validation: Prüfe ob Kunde wirklich angelegt wurde
    const verifyCustomer = await getCustomer(newCustomer.id)
    if (!verifyCustomer) {
      return '❌ Fehler: Kunde wurde nicht korrekt angelegt. Bitte manuell prüfen.'
    }

    return `✅ Kunde "${firstName} ${lastName}" im Kundenstamm angelegt (ID: ${newCustomer.id}).`
  } catch (error: unknown) {
    console.error('Error creating customer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Anlegen des Kunden: ${errorMessage}`
  }
}

export async function handleUpdateCustomer(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    // Build address object only if any address field is provided
    const addressUpdate =
      args.street || args.houseNumber || args.postalCode || args.city
        ? {
            street: (args.street as string) || '',
            houseNumber: (args.houseNumber as string) || '',
            postalCode: (args.postalCode as string) || '',
            city: (args.city as string) || '',
          }
        : undefined

    // Build contact object only if any contact field is provided
    const contactUpdate =
      args.phone || args.email
        ? {
            phone: (args.phone as string) || '',
            email: (args.email as string) || '',
          }
        : undefined

    await updateCustomerInDB(args.customerId as string, {
      firstName: args.firstName as string | undefined,
      lastName: args.lastName as string | undefined,
      companyName: args.companyName as string | undefined,
      address: addressUpdate,
      contact: contactUpdate,
      notes: args.notes as string | undefined,
    })
    return `✅ Kunde im Stamm aktualisiert.`
  } catch (error) {
    console.error('Error updating customer:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleCreateEmployee(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    const settings = await getCompanySettings()
    if (!settings?.id) return '❌ Bitte zuerst Firmenstammdaten anlegen.'

    const employeeFirstName = args.firstName as string
    const employeeLastName = args.lastName as string
    await saveEmployee({
      companyId: settings.id,
      firstName: employeeFirstName,
      lastName: employeeLastName,
      email: args.email as string | undefined,
      phone: args.phone as string | undefined,
      role: ((args.role as string) || 'other') as CompanyRole,
      commissionRate: (args.commissionRate as number) || 0,
      isActive: true,
    })
    return `✅ Mitarbeiter "${employeeFirstName} ${employeeLastName}" angelegt.`
  } catch (error) {
    console.error('Error creating employee:', error)
    return '❌ Fehler beim Anlegen des Mitarbeiters.'
  }
}

export async function handleUpdateEmployee(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    await saveEmployee({
      id: args.employeeId as string,
      firstName: args.firstName as string | undefined,
      lastName: args.lastName as string | undefined,
      email: args.email as string | undefined,
      phone: args.phone as string | undefined,
      role: args.role as CompanyRole | undefined,
      commissionRate: args.commissionRate as number | undefined,
      isActive: args.isActive as boolean | undefined,
    })
    return `✅ Mitarbeiter aktualisiert.`
  } catch (error) {
    console.error('Error updating employee:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleUpdateCompanySettings(ctx: HandlerContext): Promise<string> {
  const { args } = ctx

  try {
    const current = await getCompanySettings()
    await saveCompanySettings({
      ...current,
      companyName: (args.companyName as string) || current?.companyName,
      legalForm: (args.legalForm as string) || current?.legalForm,
      street: (args.street as string) || current?.street,
      houseNumber: (args.houseNumber as string) || current?.houseNumber,
      postalCode: (args.postalCode as string) || current?.postalCode,
      city: (args.city as string) || current?.city,
      phone: (args.phone as string) || current?.phone,
      email: (args.email as string) || current?.email,
      website: (args.website as string) || current?.website,
      uid: (args.uid as string) || current?.uid,
      companyRegisterNumber:
        (args.companyRegisterNumber as string) || current?.companyRegisterNumber,
      defaultPaymentTerms: (args.defaultPaymentTerms as number) || current?.defaultPaymentTerms,
    })
    return `✅ Firmenstammdaten aktualisiert.`
  } catch (error) {
    console.error('Error updating company settings:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}
