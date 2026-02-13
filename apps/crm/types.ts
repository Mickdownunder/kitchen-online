// Einheitliche Rollen für Mitarbeiter und Benutzer (deutsch)
export type CompanyRole =
  | 'geschaeftsfuehrer'
  | 'administration'
  | 'buchhaltung'
  | 'verkaeufer'
  | 'monteur'

// User Roles (deprecated - verwende CompanyRole)
export type UserRole = CompanyRole

// User Profile (extends Supabase Auth)
export interface UserProfile {
  id: string
  email: string
  fullName?: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export enum ProjectStatus {
  LEAD = 'Lead',
  PLANNING = 'Planung',
  MEASURING = 'Aufmaß',
  ORDERED = 'Bestellt',
  DELIVERY = 'Lieferung',
  INSTALLATION = 'Montage',
  COMPLETED = 'Abgeschlossen',
  COMPLAINT = 'Reklamation',
}

// Company Settings - Firmenstammdaten
export interface CompanySettings {
  id: string
  userId: string

  // Basic Company Info
  companyName: string
  displayName?: string // Anzeigename für UI (z.B. "Designstudio BaLeah")
  legalForm?: string // GmbH, AG, e.U., etc.

  // Address
  street: string
  houseNumber?: string
  postalCode: string
  city: string
  country: string

  // Contact
  phone: string
  fax?: string
  email: string
  inboundEmailAb?: string
  inboundEmailInvoices?: string
  voiceCaptureEnabled?: boolean
  voiceAutoExecuteEnabled?: boolean
  website?: string

  // Legal / Tax
  uid: string // UID-Nummer (ATU...)
  companyRegisterNumber?: string // Firmenbuchnummer (FN...)
  court?: string // Handelsgericht
  taxNumber?: string // Steuernummer

  // Logo
  logoUrl?: string
  logoBase64?: string

  // Invoice Settings
  invoicePrefix?: string // e.g., "R-"
  offerPrefix?: string // e.g., "A-"
  defaultPaymentTerms: number // Days
  defaultTaxRate: number // 20, 13, 10

  // Fortlaufende Nummern (Rechnung, Auftrag, Lieferschein)
  nextInvoiceNumber?: number // Nächste Rechnungsnummer (default: 1)
  orderPrefix?: string // z.B. "K-" für Auftragsnummern
  nextOrderNumber?: number // Nächste Auftragsnummer (default: 1)
  deliveryNotePrefix?: string // z.B. "LS-" für Lieferscheinnummern
  nextDeliveryNoteNumber?: number // Nächste Lieferscheinnummer (default: 1)

  // Payment Terms Options (customizable list)
  paymentTermsOptions?: number[] // e.g., [0, 7, 14, 30, 60]

  // Footer text for invoices
  invoiceFooterText?: string

  // AGB für Auftrags-PDF, mehrzeilig
  agbText?: string
  /** Textbausteine für den Auftrag-Fußtext („Vorlage einfügen“ im Stammdaten-Tab) */
  orderFooterTemplates?: { name: string; body: string }[]

  // Reminder Settings
  reminderDaysBetweenFirst?: number // Tage bis 1. Mahnung (Standard: 7)
  reminderDaysBetweenSecond?: number // Tage bis 2. Mahnung (Standard: 7)
  reminderDaysBetweenFinal?: number // Tage bis letzte Mahnung (Standard: 7)
  reminderLatePaymentInterest?: number // Verzugszinsen pro Jahr in % (Standard: 9.2)
  reminderEmailTemplate?: string // Anpassbare E-Mail-Vorlage für Mahnungen

  createdAt: string
  updatedAt: string
}

// Bank Account
export interface BankAccount {
  id: string
  companyId: string
  bankName: string
  accountHolder: string
  iban: string
  bic: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Bankabgleich: Kontobewegung aus Monatsliste
export interface BankTransaction {
  id: string
  userId: string
  bankAccountId: string | null
  transactionDate: string
  amount: number
  reference: string | null
  counterpartyName: string | null
  counterpartyIban: string | null
  supplierInvoiceId: string | null
  invoiceId: string | null
  createdAt: string
  updatedAt: string
}

// Employee / Verkäufer
export interface Employee {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  role: CompanyRole
  department?: string
  isActive: boolean
  commissionRate?: number // Provision in %
  notes?: string
  userId?: string // Verknüpfung zum Benutzer-Konto
  createdAt: string
  updatedAt: string
}

// Lieferant / Supplier (Stammdaten für Bestellungen)
export interface Supplier {
  id: string
  companyId: string
  name: string
  email?: string
  orderEmail?: string
  phone?: string
  /** Innendienst Ansprechpartner (Name) */
  contactPersonInternal?: string
  contactPersonInternalPhone?: string
  contactPersonInternalEmail?: string
  /** Außendienst Ansprechpartner (Name) */
  contactPersonExternal?: string
  contactPersonExternalPhone?: string
  contactPersonExternalEmail?: string
  street?: string
  houseNumber?: string
  postalCode?: string
  city?: string
  country?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Separate Customer Entity - Professional Stammdaten
export interface Customer {
  id: string
  userId?: string // Reference to user who created this customer
  firstName: string
  lastName: string
  companyName?: string // For B2B customers
  salutation?:
    | 'Herr'
    | 'Frau'
    | 'Familie'
    | 'Dr.'
    | 'Prof.'
    | 'Prof. Dr.'
    | 'Ing.'
    | 'Dipl.-Ing.'
    | 'Mag.'
    | 'Mag. Dr.'
    | 'Firma'
    | 'Herr und Frau'
  address: {
    street: string
    houseNumber?: string
    postalCode: string
    city: string
    country?: string
  }
  contact: {
    phone: string
    mobile?: string
    email: string
    alternativeEmail?: string
  }
  taxId?: string // UID/Steuernummer for invoices
  paymentTerms?: number // Payment terms in days
  notes?: string
  createdAt: string
  updatedAt: string
}

// Article/Product Catalog - Professional Artikelstamm
export interface Article {
  id: string
  userId?: string // Reference to user who created this article
  supplierId?: string | null // Standard-Lieferant für Bestellungen (optional)
  sku: string // Stock Keeping Unit / Artikelnummer
  manufacturer?: string // e.g., "Schüller", "Nolte", "Miele"
  modelNumber?: string // e.g., "Miele G 7000"
  category: 'Kitchen' | 'Appliance' | 'Accessory' | 'Service' | 'Material' | 'Other'
  name: string // Display name
  description?: string // Detailed description
  specifications?: Record<string, string> // e.g., { "Width": "60cm", "Color": "Weiß" }

  // Pricing
  defaultPurchasePrice: number // EK
  defaultSalePrice: number // VK
  taxRate: 10 | 13 | 20
  unit: 'Stk' | 'Pkg' | 'Std' | 'Paush' | 'm' | 'm²' | 'lfm'

  // Inventory (optional)
  inStock?: boolean
  stockQuantity?: number

  // Metadata
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

// Enhanced Invoice Item with Article Reference
export interface InvoiceItem {
  id: string
  articleId?: string // Reference to Article catalog
  position: number // Line number in invoice

  // Article Details (can be from catalog or custom)
  description: string
  modelNumber?: string // e.g., "Miele G 7000"
  manufacturer?: string
  specifications?: Record<string, string>

  quantity: number
  unit: 'Stk' | 'Pkg' | 'Std' | 'Paush' | 'm' | 'm²' | 'lfm'

  // Pricing
  pricePerUnit: number // Verkaufspreis (VK)
  /**
   * Brutto-Preis pro Einheit (wenn im BRUTTO-Modus eingegeben).
   * WICHTIG: Dieses Feld wird in der Datenbank gespeichert, um Rundungsfehler zu vermeiden.
   * Wenn der Benutzer einen Brutto-Preis eingibt (z.B. 100€), wird dieser Wert hier gespeichert,
   * damit Berechnungen wie 10 × 100 = 1000 exakt bleiben, auch wenn der Nettopreis eine periodische Dezimalzahl wäre.
   * Dies ist kritisch für die Buchhaltungsgenauigkeit.
   */
  grossPricePerUnit?: number
  purchasePricePerUnit?: number // Einkaufspreis (EK)
  taxRate: 10 | 13 | 20

  // Calculated
  netTotal: number // quantity * pricePerUnit
  taxAmount: number // netTotal * (taxRate / 100)
  grossTotal: number // netTotal + taxAmount

  // Delivery Status
  deliveryStatus?: 'not_ordered' | 'ordered' | 'partially_delivered' | 'delivered' | 'missing'
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  quantityOrdered?: number
  quantityDelivered?: number
  procurementType?: InvoiceItemProcurementType

  // Warranty / Appliance (für Kundenportal)
  showInPortal?: boolean // Im Kundenportal als Gerät anzeigen
  serialNumber?: string // E-Nummer / Seriennummer
  installationDate?: string // Installationsdatum
  warrantyUntil?: string // Garantie bis
  manufacturerSupportUrl?: string
  manufacturerSupportPhone?: string
  manufacturerSupportEmail?: string
  applianceCategory?: string // z.B. "Backofen", "Geschirrspüler"
}

export interface ProjectDocument {
  id: string
  name: string
  mimeType: string
  data: string // Base64 für Demo-Zwecke
  uploadedAt: string
  type?: 'Invoice' | 'Order' | 'Offer' | 'Contract' | 'Other'
}

// Reminder Interface
export interface Reminder {
  id: string
  type: 'first' | 'second' | 'final'
  sentAt: string
  sentByUserId?: string
  emailSent: boolean
  pdfGenerated: boolean
  notes?: string
}

export interface PartialPayment {
  id: string
  invoiceNumber: string
  amount: number
  date: string // Invoice date
  dueDate?: string // Payment due date
  description?: string // e.g., "40% Anzahlung", "40% vor Lieferung", "20% bei Lieferung"
  isPaid: boolean
  paidDate?: string
  notes?: string
  scheduleType?: 'first' | 'second' | 'manual' // Automatisch oder manuell erstellt?
  reminders?: Reminder[] // Array von gesendeten Mahnungen
  overdueDays?: number // Berechnete Anzahl überfälliger Tage
}

// Payment Schedule Configuration
export interface PaymentSchedule {
  firstPercent: number // z.B. 40
  secondPercent: number // z.B. 40
  finalPercent: number // z.B. 20
  secondDueDaysBeforeDelivery: number // z.B. 21 (3 Wochen)
  autoCreateFirst: boolean // Automatisch erste Anzahlung erstellen?
  autoCreateSecond: boolean // Automatisch zweite Anzahlung erstellen?
}

// ============================================
// RECHNUNGS-SYSTEM (Invoices) - Neue Struktur
// ============================================

export type InvoiceType = 'partial' | 'final' | 'credit'
export type InvoiceScheduleType = 'first' | 'second' | 'manual'

/**
 * Invoice - Zentrale Rechnungsentität
 * Ersetzt die JSONB-Felder partialPayments und finalInvoice in projects
 * 
 * Bei type='credit' (Stornorechnung):
 * - Alle Beträge (amount, netAmount, taxAmount) sind NEGATIV
 * - originalInvoiceId verweist auf die stornierte Rechnung
 */
export interface Invoice {
  id: string
  userId: string
  projectId: string

  // Rechnungsnummer (fortlaufend, eindeutig)
  invoiceNumber: string
  type: InvoiceType // 'partial' = Anzahlung, 'final' = Schlussrechnung, 'credit' = Stornorechnung

  // Beträge (bei Stornorechnung negativ!)
  amount: number // Brutto
  netAmount: number // Netto
  taxAmount: number // MwSt
  taxRate: number // 20, 13, 10

  // Datum
  invoiceDate: string
  dueDate?: string

  // Zahlungsstatus
  isPaid: boolean
  paidDate?: string

  // Beschreibung
  description?: string // z.B. "40% Anzahlung", "Schlussrechnung", "Stornorechnung zu RE-2025-0042"
  notes?: string
  scheduleType?: InvoiceScheduleType // 'first', 'second', 'manual'

  // Stornierung: Referenz zur Originalrechnung
  originalInvoiceId?: string // Bei Stornorechnung: ID der stornierten Rechnung
  originalInvoiceNumber?: string // Für Anzeige (aus JOIN oder manuell gesetzt)

  // Mahnungen
  reminders?: Reminder[]
  overdueDays?: number

  // Timestamps
  createdAt: string
  updatedAt: string

  // Relations (optional, für JOINs)
  project?: CustomerProject
}

// ============================================
// EINGANGSRECHNUNGEN (Supplier Invoices) - Buchhaltung
// ============================================

export type SupplierInvoiceCategory =
  | 'material' // Wareneinkauf
  | 'subcontractor' // Subunternehmer
  | 'tools' // Werkzeuge/Maschinen
  | 'rent' // Miete
  | 'insurance' // Versicherungen
  | 'vehicle' // Fahrzeugkosten
  | 'office' // Bürobedarf
  | 'marketing' // Werbung/Marketing
  | 'other' // Sonstiges

export type PaymentMethod = 'bank' | 'cash' | 'credit_card'

/**
 * SupplierInvoice - Eingangsrechnungen von Lieferanten
 * Wichtig für: Vorsteuerabzug, UVA, DATEV-Export
 */
export interface SupplierInvoice {
  id: string
  userId: string

  // Lieferanten-Informationen
  supplierName: string
  supplierUid?: string // UID-Nummer (wichtig für Vorsteuerabzug)
  supplierAddress?: string

  // Rechnungsdetails
  invoiceNumber: string // Rechnungsnummer des Lieferanten
  invoiceDate: string
  dueDate?: string

  // Beträge (alle in EUR)
  netAmount: number // Netto
  taxAmount: number // Vorsteuer
  grossAmount: number // Brutto
  taxRate: number // MwSt-Satz (20, 13, 10, 0)

  // Zahlungsstatus
  isPaid: boolean
  paidDate?: string
  paymentMethod?: PaymentMethod

  // Kategorisierung für Buchhaltung (Standard-Code oder benutzerdefinierter Name)
  category: SupplierInvoiceCategory | string
  // Skonto – für Steuerberater separat (Vorsteuer auf tatsächlich gezahlten Betrag)
  skontoPercent?: number
  skontoAmount?: number

  // Optionale Projekt-Zuordnung
  projectId?: string
  project?: CustomerProject

  // Dokument (hochgeladene Rechnung)
  documentUrl?: string
  documentName?: string

  // Notizen
  notes?: string

  // DATEV-spezifisch
  datevAccount?: string // Sachkonto (z.B. 3400 für Wareneinkauf)
  costCenter?: string // Kostenstelle

  // Timestamps
  createdAt: string
  updatedAt: string
}

// ============================================
// AUFTRAGS-SYSTEM (Orders) - Neue Struktur
// ============================================

export type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'cancelled'

/**
 * Order - Zentrale Auftragsentität
 * Ermöglicht Tracking von Auftragsstatus und Workflow
 */
export interface Order {
  id: string
  userId: string
  projectId: string

  // Auftragsnummer
  orderNumber: string
  orderDate?: string

  // Status-Tracking
  status: OrderStatus

  // Auftragsspezifische Texte
  footerText?: string // Hinweise für den Auftrag
  agbSnapshot?: string // AGB zum Zeitpunkt der Erstellung

  // Workflow-Timestamps
  sentAt?: string
  confirmedAt?: string

  // Timestamps
  createdAt: string
  updatedAt: string

  // Relations
  project?: CustomerProject
}

export interface Complaint {
  id: string
  projectId: string

  // Basis-Informationen
  description: string
  status: 'draft' | 'reported' | 'ab_confirmed' | 'delivered' | 'installed' | 'resolved'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Verknüpfungen
  affectedItemIds?: string[] // Welche Projekt-Items sind betroffen?
  supplierId?: string // Lieferant (aus Item oder manuell)
  supplierName?: string // Fallback
  originalOrderNumber?: string // AB-Nummer der ursprünglichen Bestellung
  complaintOrderNumber?: string // AB-Nummer der Reklamations-Bestellung

  // Workflow-Daten
  reportedAt?: string // Wann wurde Reklamation erfasst?
  emailSentAt?: string // Wann wurde Email an Lieferant gesendet?
  emailContent?: string // Generierter Email-Text
  abConfirmedAt?: string // Wann wurde Reklamations-AB bestätigt?
  abDocumentUrl?: string // PDF der Reklamations-AB
  deliveredAt?: string // Wann wurde Reklamation geliefert?
  deliveryNoteId?: string // Verknüpfung zu Lieferanten-Lieferschein
  installationAppointmentId?: string // Verknüpfung zu Nachmontage-Termin
  installedAt?: string // Wann wurde nachmontiert?
  resolvedAt?: string // Wann wurde Reklamation abgeschlossen?

  // Notizen & Kommunikation
  internalNotes?: string
  supplierNotes?: string
  customerNotes?: string

  // Metadaten
  createdAt: string
  updatedAt: string
  createdByUserId?: string

  // Legacy-Felder für Rückwärtskompatibilität
  resolutionNotes?: string // Alias für internalNotes
}

export interface PlanningAppointment {
  id: string
  customerId?: string // Reference to Customer
  customerName: string // Fallback if no customerId
  phone?: string
  date: string
  time?: string
  notes?: string
  type:
    | 'Consultation'
    | 'FirstMeeting'
    | 'Measurement'
    | 'Installation'
    | 'Service'
    | 'ReMeasurement'
    | 'Delivery'
    | 'Other'
  assignedUserId?: string // User assigned to this appointment
}

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskSource = 'manual' | 'voice' | 'system'

export interface Task {
  id: string
  companyId: string
  userId: string
  assignedUserId?: string
  completedByUserId?: string
  projectId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  source: TaskSource
  dueAt?: string
  completedAt?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type VoiceInboxStatus =
  | 'captured'
  | 'parsed'
  | 'needs_confirmation'
  | 'executed'
  | 'failed'
  | 'discarded'

export type VoiceIntentAction = 'create_task' | 'create_appointment' | 'add_project_note'
export type VoiceIntentConfidenceLevel = 'high' | 'medium' | 'low'

export interface VoiceIntentPayload {
  version: 'v1'
  action: VoiceIntentAction
  confidence: number
  confidenceLevel: VoiceIntentConfidenceLevel
  summary: string
  task?: {
    title: string
    description?: string
    priority?: TaskPriority
    dueAt?: string
    projectHint?: string
    customerHint?: string
  }
  appointment?: {
    customerName: string
    date: string
    time?: string
    type: PlanningAppointment['type']
    notes?: string
    phone?: string
    projectHint?: string
  }
  projectNote?: {
    projectHint: string
    note: string
  }
}

export interface VoiceInboxEntry {
  id: string
  companyId: string
  userId: string
  tokenId?: string
  source: string
  locale?: string
  idempotencyKey: string
  inputText: string
  contextHints?: Record<string, unknown>
  status: VoiceInboxStatus
  intentVersion: string
  intentPayload?: VoiceIntentPayload
  confidence?: number
  executionAction?: string
  executionResult?: Record<string, unknown>
  errorMessage?: string
  needsConfirmationReason?: string
  executionAttempts: number
  lastExecutedAt?: string
  executedTaskId?: string
  executedAppointmentId?: string
  confirmedByUserId?: string
  confirmedAt?: string
  discardedByUserId?: string
  discardedAt?: string
  createdAt: string
  updatedAt: string
}

export interface VoiceApiToken {
  id: string
  companyId: string
  userId: string
  label: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt?: string
  expiresAt: string
  revokedAt?: string
  revokedByUserId?: string
  createdAt: string
  updatedAt: string
}

export interface CreatedVoiceApiToken {
  token: VoiceApiToken
  secret: string
}

// Professional Project Structure
export interface CustomerProject {
  id: string
  userId?: string // Reference to user who created this project
  customerId?: string // Reference to Customer database
  salespersonId?: string // Reference to Employee (salesperson)
  salespersonName?: string // Display name of salesperson
  customerName: string // Fallback/display name

  // Salutation & Company (for B2B)
  salutation?:
    | 'Herr'
    | 'Frau'
    | 'Familie'
    | 'Dr.'
    | 'Prof.'
    | 'Prof. Dr.'
    | 'Ing.'
    | 'Dipl.-Ing.'
    | 'Mag.'
    | 'Mag. Dr.'
    | 'Herr und Frau'
    | 'Firma'
  companyName?: string // Company name for B2B
  taxId?: string // UID/Steuernummer
  contactPerson?: string // Ansprechpartner for B2B

  // Contact info (can come from Customer entity or be stored directly)
  address?: string
  /** Einzelfelder für Adresse im Formular (wie Stammdaten); beim Speichern zu address zusammengebaut */
  addressStreet?: string
  addressHouseNumber?: string
  addressPostalCode?: string
  addressCity?: string
  phone?: string
  email?: string

  // Order/Invoice Numbers
  orderNumber: string // Auftragsnummer
  offerNumber?: string // Angebotsnummer
  invoiceNumber?: string // Rechnungsnummer
  contractNumber?: string // Vertragsnummer

  status: ProjectStatus

  // Items & Finance
  items: InvoiceItem[]
  totalAmount: number // Gross total
  netAmount: number // Net total
  taxAmount: number // Total tax
  depositAmount: number // Summe der Anzahlungen (aus payment schedule oder invoices)
  isDepositPaid: boolean
  isFinalPaid: boolean

  /** Rechnungen aus der invoices-Tabelle */
  invoices?: Invoice[]
  /** Auftrag aus der orders-Tabelle */
  order?: Order

  // Payment Schedule Configuration
  paymentSchedule?: PaymentSchedule
  secondPaymentCreated?: boolean // Flag: wurde 2. Anzahlung bereits erstellt?

  // Workflow Dates
  offerDate?: string
  measurementDate?: string
  measurementTime?: string
  isMeasured: boolean
  orderDate?: string
  isOrdered: boolean
  deliveryDate?: string
  deliveryTime?: string
  isDelivered?: boolean // UI-only bis DB-Schema erweitert wird
  installationDate?: string
  installationTime?: string
  isInstallationAssigned: boolean
  completionDate?: string
  isCompleted?: boolean // UI-only bis DB-Schema erweitert wird

  // Assigned Employee/Salesperson
  assignedEmployeeId?: string

  // Assets
  documents: ProjectDocument[]
  complaints: Complaint[]
  notes: string
  /** Portal-Zugangscode für Kunden */
  accessCode?: string
  /** Hinweise für Auftrag (PDF): erscheint unter den Positionen, oberhalb der Unterschrift (z. B. Zahlungsmodalitäten, Reklamationen, Unterschrift Kunde, Schlusstext). */
  orderFooterText?: string

  /** Online-Unterschrift: Zeitpunkt der Kundenunterschrift */
  orderContractSignedAt?: string
  /** Online-Unterschrift: Name des Unterzeichners */
  orderContractSignedBy?: string
  /** Online-Unterschrift: Base64-Bild der Unterschrift (Nachweis) */
  customerSignature?: string
  /** Online-Unterschrift: Datum der Unterschrift (YYYY-MM-DD) */
  customerSignatureDate?: string
  /** Widerrufsverzicht: Zeitpunkt (§ 18 FAGG Maßanfertigung) */
  withdrawalWaivedAt?: string

  // Delivery Status
  deliveryStatus?:
    | 'not_ordered'
    | 'partially_ordered'
    | 'fully_ordered'
    | 'partially_delivered'
    | 'fully_delivered'
    | 'ready_for_assembly'
  allItemsDelivered?: boolean
  readyForAssemblyDate?: string

  // Delivery Type
  deliveryType?: 'delivery' | 'pickup' // 'delivery' = Lieferung und Montage, 'pickup' = Abholer

  // Metadata
  createdAt: string
  updatedAt: string
}

export type AppView =
  | 'dashboard'
  | 'projects'
  | 'complaints'
  | 'calendar'
  | 'customers'
  | 'articles'
  | 'settings'
  | 'deliveries'

// ============================================
// LIEFERSCHEIN & WARENEINGANG SYSTEM
// ============================================

export type DeliveryNoteStatus = 'received' | 'matched' | 'processed' | 'completed'
export type DeliveryNoteItemStatus = 'received' | 'verified' | 'booked'
export type GoodsReceiptStatus = 'pending' | 'verified' | 'booked'
export type GoodsReceiptItemStatus = 'received' | 'verified' | 'damaged' | 'missing'

// Lieferschein (Delivery Note)
export interface DeliveryNote {
  id: string
  userId: string

  // Lieferschein-Daten
  supplierName: string
  supplierDeliveryNoteNumber: string
  deliveryDate: string
  receivedDate: string

  // Status
  status: DeliveryNoteStatus
  aiMatched: boolean
  aiConfidence?: number // 0.00 - 1.00

  // Zuordnung
  matchedProjectId?: string
  matchedByUserId?: string
  matchedAt?: string
  supplierOrderId?: string

  // Dokument
  documentUrl?: string
  rawText?: string // OCR/Extrahierter Text für KI

  // Metadaten
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  items?: DeliveryNoteItem[]
  matchedProject?: CustomerProject
}

// Lieferschein-Position
export interface DeliveryNoteItem {
  id: string
  deliveryNoteId: string

  // Artikel-Daten vom Lieferschein
  positionNumber?: number
  description: string
  modelNumber?: string
  manufacturer?: string
  quantityOrdered: number
  quantityReceived: number
  unit: string

  // Zuordnung zu Auftrag
  matchedProjectItemId?: string
  aiMatched: boolean
  aiConfidence?: number

  // Status
  status: DeliveryNoteItemStatus

  // Metadaten
  notes?: string
  createdAt: string

  // Relations
  matchedProjectItem?: InvoiceItem
}

// Wareneingang
export interface GoodsReceipt {
  id: string
  projectId: string
  deliveryNoteId?: string
  supplierOrderId?: string
  userId: string

  // Wareneingang-Daten
  receiptDate: string
  receiptType: 'partial' | 'complete'
  idempotencyKey?: string

  // Status
  status: GoodsReceiptStatus

  // Metadaten
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  items?: GoodsReceiptItem[]
  project?: CustomerProject
  deliveryNote?: DeliveryNote
}

// Wareneingang-Position
export interface GoodsReceiptItem {
  id: string
  goodsReceiptId: string
  projectItemId: string
  deliveryNoteItemId?: string

  // Mengen
  quantityReceived: number
  quantityExpected: number

  // Status
  status: GoodsReceiptItemStatus

  // Metadaten
  notes?: string
  createdAt: string

  // Relations
  projectItem?: InvoiceItem
  deliveryNoteItem?: DeliveryNoteItem
}

// ============================================
// LIEFERANTEN-BESTELLUNGEN (Supplier Orders)
// ============================================

export type SupplierOrderCreatedByType = 'user' | 'ai'

export type SupplierOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'ab_received'
  | 'delivery_note_received'
  | 'goods_receipt_open'
  | 'goods_receipt_booked'
  | 'ready_for_installation'
  | 'cancelled'

export interface SupplierOrderDeviation {
  field: string
  itemId?: string
  expected?: string | number | null
  actual?: string | number | null
  note?: string
}

export interface SupplierOrderItem {
  id: string
  supplierOrderId: string
  invoiceItemId?: string
  articleId?: string
  positionNumber: number
  description: string
  modelNumber?: string
  manufacturer?: string
  quantity: number
  quantityConfirmed?: number
  unit: string
  expectedDeliveryDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierOrderDispatchLog {
  id: string
  supplierOrderId: string
  userId: string
  sentByType: SupplierOrderCreatedByType
  toEmail: string
  ccEmails: string[]
  subject: string
  templateVersion: string
  payload: Record<string, unknown>
  messageId?: string
  idempotencyKey?: string
  sentAt: string
  createdAt: string
}

export interface SupplierOrder {
  id: string
  userId: string
  projectId: string
  supplierId: string
  supplierName?: string
  supplierOrderEmail?: string
  projectOrderNumber?: string
  projectCustomerName?: string
  projectInstallationDate?: string
  orderNumber: string
  status: SupplierOrderStatus
  deliveryCalendarWeek?: string
  installationReferenceDate?: string
  createdByType: SupplierOrderCreatedByType
  approvedByUserId?: string
  approvedAt?: string
  sentToEmail?: string
  sentAt?: string
  bookedAt?: string
  idempotencyKey?: string
  templateVersion: string
  templateSnapshot?: Record<string, unknown>
  abNumber?: string
  abConfirmedDeliveryDate?: string
  abDeviations: SupplierOrderDeviation[]
  abReceivedAt?: string
  abDocumentUrl?: string
  abDocumentName?: string
  abDocumentMimeType?: string
  supplierDeliveryNoteId?: string
  goodsReceiptId?: string
  notes?: string
  createdAt: string
  updatedAt: string
  items?: SupplierOrderItem[]
  dispatchLogs?: SupplierOrderDispatchLog[]
}

export type InstallationReservationStatus = 'draft' | 'requested' | 'confirmed' | 'cancelled'

export interface InstallationReservation {
  id: string
  userId: string
  projectId: string
  supplierOrderId?: string
  installerCompany: string
  installerContact?: string
  installerEmail: string
  requestedInstallationDate?: string
  requestNotes?: string
  planDocumentIds: string[]
  requestEmailSubject?: string
  requestEmailTo?: string
  requestEmailMessage?: string
  requestEmailSentAt?: string
  confirmationReference?: string
  confirmationDate?: string
  confirmationNotes?: string
  confirmationDocumentUrl?: string
  confirmationDocumentName?: string
  confirmationDocumentMimeType?: string
  status: InstallationReservationStatus
  createdAt: string
  updatedAt: string
}

// ============================================
// KUNDEN-LIEFERSCHEIN SYSTEM (Customer Delivery Notes)
// ============================================

export interface CustomerDeliveryNote {
  id: string
  projectId: string
  userId: string

  // Lieferschein-Daten
  deliveryNoteNumber: string
  deliveryDate: string
  deliveryAddress?: string

  // Status
  status: 'draft' | 'sent' | 'delivered' | 'signed' | 'completed'

  // Unterschrift
  customerSignature?: string // Base64-encoded image
  customerSignatureDate?: string
  signedBy?: string // Name des Unterzeichners

  // Items (aus Projekt kopiert)
  items?: Array<{
    position: number
    description: string
    quantity: number
    unit: string
  }>

  // Metadaten
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  project?: CustomerProject
}
