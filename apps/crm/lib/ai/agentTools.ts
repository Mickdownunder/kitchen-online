import { Type, type FunctionDeclaration } from '@google/genai'

// Central source of truth for AI function declarations
export const agentTools: FunctionDeclaration[] = [
  // ==========================================
  // PROJEKT-MANAGEMENT
  // ==========================================
  {
    name: 'createProject',
    parameters: {
      type: Type.OBJECT,
      description:
        'Erstellt ein komplett neues Küchenprojekt. WICHTIG: Rufe diese Funktion NACH createCustomer auf, wenn du ein Dokument verarbeitest. Verwende den Kundenname, den du gerade mit createCustomer angelegt hast.',
      properties: {
        customerName: {
          type: Type.STRING,
          description: 'Name des Kunden (der Name, den du gerade mit createCustomer angelegt hast)',
        },
        address: {
          type: Type.STRING,
          description: 'Adresse des Kunden (aus Dokument extrahieren)',
        },
        phone: { type: Type.STRING, description: 'Telefonnummer (aus Dokument extrahieren)' },
        email: { type: Type.STRING, description: 'E-Mail-Adresse (aus Dokument extrahieren)' },
        totalAmount: {
          type: Type.NUMBER,
          description: 'Gesamtbetrag in Euro (aus Dokument extrahieren - Summe aller Artikel)',
        },
        orderNumber: {
          type: Type.STRING,
          description: 'Auftragsnummer (aus Dokument extrahieren)',
        },
        notes: { type: Type.STRING, description: 'Notizen zum Projekt' },
        salespersonName: {
          type: Type.STRING,
          description:
            'Name des zuständigen Verkäufers (aus Dokument extrahieren, falls vorhanden)',
        },
      },
      required: ['customerName'],
    },
  },
  {
    name: 'updateProjectDetails',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert Status, Termine oder andere Details eines Projekts.',
      properties: {
        projectId: { type: Type.STRING, description: 'ID oder Kundenname des Projekts' },
        newStatus: {
          type: Type.STRING,
          description:
            'Neuer Status (Planung, Aufmaß, Bestellt, Lieferung, Montage, Abgeschlossen)',
        },
        deliveryDate: { type: Type.STRING, description: 'Lieferdatum im Format YYYY-MM-DD' },
        installationDate: { type: Type.STRING, description: 'Montagedatum im Format YYYY-MM-DD' },
        notes: { type: Type.STRING, description: 'Zusätzliche Notizen' },
        salespersonName: { type: Type.STRING, description: 'Verkäufer zuweisen' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'updateCustomerInfo',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert Kundendaten eines Projekts (Name, Adresse, Telefon, E-Mail).',
      properties: {
        projectId: { type: Type.STRING, description: 'ID oder Kundenname' },
        customerName: { type: Type.STRING },
        address: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'updateWorkflowStatus',
    parameters: {
      type: Type.OBJECT,
      description:
        'Aktualisiert Workflow-Status wie Aufmaß erledigt, Bestellt, Montage terminiert.',
      properties: {
        projectId: { type: Type.STRING },
        isMeasured: { type: Type.BOOLEAN, description: 'Aufmaß erledigt?' },
        measurementDate: { type: Type.STRING, description: 'Aufmaßdatum YYYY-MM-DD' },
        isOrdered: { type: Type.BOOLEAN, description: 'Bestellt?' },
        orderDate: { type: Type.STRING, description: 'Bestelldatum YYYY-MM-DD' },
        isInstallationAssigned: { type: Type.BOOLEAN, description: 'Montage terminiert?' },
        installationDate: { type: Type.STRING, description: 'Montagetermin YYYY-MM-DD' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'addProjectNote',
    parameters: {
      type: Type.OBJECT,
      description:
        'Fügt einen Eintrag zum Projektverlauf/Notizfeld hinzu. JEDE Aktion sollte protokolliert werden!',
      properties: {
        projectId: { type: Type.STRING },
        note: { type: Type.STRING, description: 'Der Text der Notiz (was wurde gemacht?)' },
      },
      required: ['projectId', 'note'],
    },
  },

  // ==========================================
  // FINANZEN & ZAHLUNGEN
  // ==========================================
  {
    name: 'updateFinancialAmounts',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert finanzielle Beträge wie Gesamtsumme oder Anzahlung.',
      properties: {
        projectId: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER, description: 'Gesamtbetrag in Euro' },
        depositAmount: { type: Type.NUMBER, description: 'Anzahlungsbetrag' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'updatePaymentStatus',
    parameters: {
      type: Type.OBJECT,
      description: 'Markiert Anzahlung oder Schlussrechnung als bezahlt.',
      properties: {
        projectId: { type: Type.STRING },
        depositPaid: { type: Type.BOOLEAN, description: 'Anzahlung bezahlt?' },
        finalPaid: { type: Type.BOOLEAN, description: 'Schlussrechnung bezahlt?' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'createPartialPayment',
    parameters: {
      type: Type.OBJECT,
      description: 'Erstellt eine neue Anzahlung/Teilzahlung für ein Projekt.',
      properties: {
        projectId: { type: Type.STRING },
        amount: { type: Type.NUMBER, description: 'Betrag der Anzahlung in Euro' },
        description: { type: Type.STRING, description: 'Beschreibung z.B. "1. Anzahlung 40%"' },
        invoiceNumber: { type: Type.STRING, description: 'Rechnungsnummer' },
        date: { type: Type.STRING, description: 'Datum im Format YYYY-MM-DD' },
      },
      required: ['projectId', 'amount'],
    },
  },
  {
    name: 'updatePartialPayment',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert eine bestehende Anzahlung (z.B. als bezahlt markieren).',
      properties: {
        projectId: { type: Type.STRING },
        paymentId: { type: Type.STRING, description: 'ID der Anzahlung' },
        isPaid: { type: Type.BOOLEAN, description: 'Als bezahlt markieren?' },
        paidDate: { type: Type.STRING, description: 'Bezahlt am (YYYY-MM-DD)' },
        amount: { type: Type.NUMBER, description: 'Neuer Betrag' },
        description: { type: Type.STRING },
      },
      required: ['projectId', 'paymentId'],
    },
  },
  {
    name: 'createFinalInvoice',
    parameters: {
      type: Type.OBJECT,
      description: 'Erstellt die Schlussrechnung für ein Projekt.',
      properties: {
        projectId: { type: Type.STRING },
        invoiceNumber: { type: Type.STRING, description: 'Rechnungsnummer der Schlussrechnung' },
        date: { type: Type.STRING, description: 'Rechnungsdatum YYYY-MM-DD' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'sendReminder',
    parameters: {
      type: Type.OBJECT,
      description: 'Sendet eine Mahnung für eine überfällige Rechnung per E-Mail mit PDF.',
      properties: {
        projectId: { type: Type.STRING },
        invoiceId: {
          type: Type.STRING,
          description: 'ID der PartialPayment oder "final" für Schlussrechnung',
        },
        reminderType: {
          type: Type.STRING,
          description:
            'Typ der Mahnung: "first" (1. Mahnung), "second" (2. Mahnung) oder "final" (Letzte Mahnung). Wenn nicht angegeben, wird automatisch die nächste Mahnungsstufe bestimmt.',
        },
        recipientEmail: {
          type: Type.STRING,
          description:
            'Optional: E-Mail-Adresse des Empfängers. Falls nicht angegeben, wird die E-Mail-Adresse aus dem Projekt verwendet.',
        },
      },
      required: ['projectId', 'invoiceId'],
    },
  },
  {
    name: 'configurePaymentSchedule',
    parameters: {
      type: Type.OBJECT,
      description: 'Konfiguriert das Zahlungsschema für ein Projekt (z.B. 40-40-20).',
      properties: {
        projectId: { type: Type.STRING },
        firstPercent: {
          type: Type.NUMBER,
          description: 'Prozentsatz der ersten Anzahlung (z.B. 40)',
        },
        secondPercent: {
          type: Type.NUMBER,
          description: 'Prozentsatz der zweiten Anzahlung (z.B. 40)',
        },
        finalPercent: {
          type: Type.NUMBER,
          description: 'Prozentsatz der Restzahlung (z.B. 20)',
        },
        secondDueDaysBeforeDelivery: {
          type: Type.NUMBER,
          description: 'Tage vor Liefertermin für zweite Anzahlung (Standard: 21)',
        },
        autoCreateFirst: {
          type: Type.BOOLEAN,
          description: 'Automatisch erste Anzahlung bei Projekterstellung erstellen?',
        },
        autoCreateSecond: {
          type: Type.BOOLEAN,
          description: 'Automatisch zweite Anzahlung vor Liefertermin erstellen?',
        },
      },
      required: ['projectId', 'firstPercent', 'secondPercent', 'finalPercent'],
    },
  },
  {
    name: 'updateInvoiceNumber',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert die Rechnungsnummer eines Projekts.',
      properties: {
        projectId: { type: Type.STRING },
        invoiceNumber: { type: Type.STRING },
      },
      required: ['projectId', 'invoiceNumber'],
    },
  },

  // ==========================================
  // ARTIKEL IM PROJEKT
  // ==========================================
  {
    name: 'addItemToProject',
    parameters: {
      type: Type.OBJECT,
      description:
        'Fügt einen Artikel/Position zu einem Projekt hinzu. WICHTIG: Rufe diese Funktion für JEDEN Artikel aus dem Dokument auf! Wenn ein Dokument 10 Artikel hat, rufe diese Funktion 10x auf - einmal pro Artikel. Verwende die gleichen Daten wie bei createArticle. WICHTIG: Preis kann 0 sein, wenn nicht im Dokument gefunden - wird später nachgetragen. WICHTIG: Prüfe den Rückgabewert - nur ✅ bedeutet Erfolg! Bei Fehler: beschreibe genau was schiefgelaufen ist.',
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID des Projekts (das du gerade mit createProject erstellt hast)',
        },
        description: {
          type: Type.STRING,
          description: 'Artikelbeschreibung (aus Dokument extrahieren)',
        },
        quantity: { type: Type.NUMBER, description: 'Menge (aus Dokument extrahieren)' },
        unit: {
          type: Type.STRING,
          description:
            'Einheit (Stk, m², m für lfm/Laufmeter, etc.) - aus Dokument extrahieren. WICHTIG: Verwende "m" für lfm/Laufmeter, nicht "lfm"!',
        },
        pricePerUnit: {
          type: Type.NUMBER,
          description:
            'Verkaufspreis pro Einheit (aus Dokument extrahieren, kann 0 sein wenn nicht gefunden)',
        },
        purchasePricePerUnit: {
          type: Type.NUMBER,
          description: 'Einkaufspreis pro Einheit (aus Dokument extrahieren, optional)',
        },
        taxRate: {
          type: Type.NUMBER,
          description: 'MwSt-Satz (10, 13 oder 20) - aus Dokument extrahieren, Standard: 20',
        },
        modelNumber: {
          type: Type.STRING,
          description: 'Artikelnummer/Modellnummer (aus Dokument extrahieren, optional)',
        },
      },
      required: ['projectId', 'description', 'quantity'],
    },
  },
  {
    name: 'updateItem',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert einen bestehenden Artikel in einem Projekt.',
      properties: {
        projectId: { type: Type.STRING },
        itemId: { type: Type.STRING, description: 'ID des Artikels' },
        description: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        pricePerUnit: { type: Type.NUMBER },
        purchasePricePerUnit: { type: Type.NUMBER },
        taxRate: { type: Type.NUMBER },
      },
      required: ['projectId', 'itemId'],
    },
  },

  // ==========================================
  // REKLAMATIONEN
  // ==========================================
  {
    name: 'createComplaint',
    parameters: {
      type: Type.OBJECT,
      description: 'Erfasst eine neue Reklamation für ein Projekt.',
      properties: {
        projectId: { type: Type.STRING, description: 'ID oder Kundenname des Projekts' },
        description: { type: Type.STRING, description: 'Detaillierte Fehlerbeschreibung' },
        priority: { type: Type.STRING, description: 'Priorität: low, medium, high' },
      },
      required: ['projectId', 'description'],
    },
  },
  {
    name: 'updateComplaintStatus',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert den Status einer Reklamation (Open/InProgress/Resolved).',
      properties: {
        projectId: { type: Type.STRING },
        complaintId: { type: Type.STRING },
        status: { type: Type.STRING, description: 'Neuer Status: Open, InProgress, Resolved' },
        resolution: { type: Type.STRING, description: 'Lösung/Maßnahme die ergriffen wurde' },
      },
      required: ['projectId', 'complaintId', 'status'],
    },
  },

  // ==========================================
  // ARTIKELSTAMM (KATALOG)
  // ==========================================
  {
    name: 'createArticle',
    parameters: {
      type: Type.OBJECT,
      description:
        'Erstellt einen neuen Artikel im Artikelstamm/Katalog. WICHTIG: Rufe diese Funktion für JEDEN Artikel aus dem Dokument auf! Wenn ein Dokument 10 Artikel hat, rufe diese Funktion 10x auf - einmal pro Artikel. Extrahiere ALLE verfügbaren Daten (Name, Artikelnummer, Beschreibung, Preis, MwSt) aus dem Dokument. Wenn ein Lieferant im Stamm existiert, gib dessen ID als supplierId an.',
      properties: {
        name: { type: Type.STRING, description: 'Artikelname (aus Dokument extrahieren)' },
        articleNumber: {
          type: Type.STRING,
          description: 'Artikelnummer/Modellnummer (aus Dokument extrahieren)',
        },
        description: { type: Type.STRING, description: 'Beschreibung (aus Dokument extrahieren)' },
        category: {
          type: Type.STRING,
          description: 'Kategorie (z.B. Geräte, Arbeitsplatten, Zubehör) - aus Artikel ableiten',
        },
        unit: {
          type: Type.STRING,
          description: 'Einheit (Stk, m², lfm) - aus Dokument extrahieren',
        },
        purchasePrice: {
          type: Type.NUMBER,
          description: 'Einkaufspreis (EK) - aus Dokument extrahieren',
        },
        sellingPrice: {
          type: Type.NUMBER,
          description: 'Verkaufspreis (VK) - aus Dokument extrahieren',
        },
        taxRate: {
          type: Type.NUMBER,
          description: 'MwSt-Satz (10, 13 oder 20) - aus Dokument extrahieren',
        },
        supplier: {
          type: Type.STRING,
          description: 'Lieferant/Hersteller als Text (aus Dokument extrahieren)',
        },
        supplierId: {
          type: Type.STRING,
          description:
            'ID eines Lieferanten aus dem Lieferantenstamm (optional; nutze listSuppliers um vorhandene Lieferanten zu finden)',
        },
      },
      required: ['name', 'sellingPrice'],
    },
  },
  {
    name: 'updateArticle',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert einen Artikel im Artikelstamm.',
      properties: {
        articleId: { type: Type.STRING, description: 'ID des Artikels' },
        name: { type: Type.STRING },
        articleNumber: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING },
        purchasePrice: { type: Type.NUMBER },
        sellingPrice: { type: Type.NUMBER },
        taxRate: { type: Type.NUMBER },
        supplier: { type: Type.STRING },
        supplierId: { type: Type.STRING, description: 'ID eines Lieferanten aus dem Lieferantenstamm' },
        isActive: { type: Type.BOOLEAN, description: 'Artikel aktiv/deaktiviert' },
      },
      required: ['articleId'],
    },
  },

  // ==========================================
  // LIEFERANTENSTAMM
  // ==========================================
  {
    name: 'createSupplier',
    parameters: {
      type: Type.OBJECT,
      description:
        'Erstellt einen neuen Lieferanten in den Stammdaten. Nutze dies, wenn ein Lieferant für Bestellungen oder Artikel angelegt werden soll.',
      properties: {
        name: { type: Type.STRING, description: 'Name des Lieferanten (Firma oder Anbieter)' },
        email: { type: Type.STRING, description: 'E-Mail' },
        orderEmail: { type: Type.STRING, description: 'E-Mail für Bestellungen' },
        phone: { type: Type.STRING, description: 'Telefon' },
        contactPersonInternal: { type: Type.STRING, description: 'Innendienst Ansprechpartner (Name)' },
        contactPersonInternalPhone: { type: Type.STRING, description: 'Innendienst Ansprechpartner Telefon' },
        contactPersonInternalEmail: { type: Type.STRING, description: 'Innendienst Ansprechpartner E-Mail' },
        contactPersonExternal: { type: Type.STRING, description: 'Außendienst Ansprechpartner (Name)' },
        contactPersonExternalPhone: { type: Type.STRING, description: 'Außendienst Ansprechpartner Telefon' },
        contactPersonExternalEmail: { type: Type.STRING, description: 'Außendienst Ansprechpartner E-Mail' },
        street: { type: Type.STRING, description: 'Straße' },
        houseNumber: { type: Type.STRING, description: 'Hausnummer' },
        postalCode: { type: Type.STRING, description: 'PLZ' },
        city: { type: Type.STRING, description: 'Stadt' },
        country: { type: Type.STRING, description: 'Land (z.B. Österreich)' },
        notes: { type: Type.STRING, description: 'Notizen' },
      },
      required: ['name'],
    },
  },
  {
    name: 'listSuppliers',
    parameters: {
      type: Type.OBJECT,
      description:
        'Listet alle Lieferanten der Firma. Nutze dies, um vorhandene Lieferanten zu finden (z.B. vor createArticle oder für Bestellungen).',
      properties: {},
      required: [],
    },
  },

  // ==========================================
  // KUNDENSTAMM
  // ==========================================
  {
    name: 'createCustomer',
    parameters: {
      type: Type.OBJECT,
      description:
        'Erstellt einen neuen Kunden im Kundenstamm. WICHTIG: Rufe diese Funktion IMMER zuerst auf, wenn ein neuer Kunde aus einem Dokument extrahiert wird. Extrahiere ALLE verfügbaren Daten (Name, Adresse, Telefon, E-Mail) aus dem Dokument.',
      properties: {
        firstName: { type: Type.STRING, description: 'Vorname (aus Dokument extrahieren)' },
        lastName: { type: Type.STRING, description: 'Nachname (aus Dokument extrahieren)' },
        companyName: {
          type: Type.STRING,
          description: 'Firmenname (falls Firma, aus Dokument extrahieren)',
        },
        street: { type: Type.STRING, description: 'Straße (aus Dokument extrahieren)' },
        houseNumber: { type: Type.STRING, description: 'Hausnummer (aus Dokument extrahieren)' },
        postalCode: { type: Type.STRING, description: 'PLZ (aus Dokument extrahieren)' },
        city: { type: Type.STRING, description: 'Stadt (aus Dokument extrahieren)' },
        phone: { type: Type.STRING, description: 'Telefon (aus Dokument extrahieren)' },
        email: { type: Type.STRING, description: 'E-Mail (aus Dokument extrahieren)' },
        notes: { type: Type.STRING, description: 'Notizen zum Kunden' },
      },
      required: ['firstName', 'lastName'],
    },
  },
  {
    name: 'updateCustomer',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert einen Kunden im Kundenstamm.',
      properties: {
        customerId: { type: Type.STRING, description: 'ID des Kunden' },
        firstName: { type: Type.STRING },
        lastName: { type: Type.STRING },
        companyName: { type: Type.STRING },
        street: { type: Type.STRING },
        houseNumber: { type: Type.STRING },
        postalCode: { type: Type.STRING },
        city: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
      required: ['customerId'],
    },
  },

  // ==========================================
  // MITARBEITER
  // ==========================================
  {
    name: 'createEmployee',
    parameters: {
      type: Type.OBJECT,
      description: 'Erstellt einen neuen Mitarbeiter/Verkäufer.',
      properties: {
        firstName: { type: Type.STRING, description: 'Vorname' },
        lastName: { type: Type.STRING, description: 'Nachname' },
        email: { type: Type.STRING, description: 'E-Mail' },
        phone: { type: Type.STRING, description: 'Telefon' },
        role: {
          type: Type.STRING,
          description: 'Rolle: owner, manager, salesperson, installer, admin, other',
        },
        commissionRate: { type: Type.NUMBER, description: 'Provisionssatz in %' },
      },
      required: ['firstName', 'lastName', 'role'],
    },
  },
  {
    name: 'updateEmployee',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert Mitarbeiterdaten.',
      properties: {
        employeeId: { type: Type.STRING, description: 'ID des Mitarbeiters' },
        firstName: { type: Type.STRING },
        lastName: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        role: { type: Type.STRING },
        commissionRate: { type: Type.NUMBER },
        isActive: { type: Type.BOOLEAN, description: 'Mitarbeiter aktiv/inaktiv' },
      },
      required: ['employeeId'],
    },
  },

  // ==========================================
  // DOKUMENTE & ARCHIVIERUNG
  // ==========================================
  {
    name: 'archiveDocument',
    parameters: {
      type: Type.OBJECT,
      description:
        'Speichert eine AB oder Rechnung ab und aktualisiert die EK-Preise sowie Termine.',
      properties: {
        projectId: { type: Type.STRING, description: 'ID oder Name des Kunden' },
        documentType: { type: Type.STRING, description: 'z.B. AB, Rechnung, Angebot' },
        updatedItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              purchasePrice: { type: Type.NUMBER },
            },
          },
        },
        deliveryDate: {
          type: Type.STRING,
          description: 'Gefundenes Lieferdatum im Format YYYY-MM-DD',
        },
      },
      required: ['projectId', 'documentType'],
    },
  },

  // ==========================================
  // FIRMENSTAMMDATEN
  // ==========================================
  {
    name: 'updateCompanySettings',
    parameters: {
      type: Type.OBJECT,
      description: 'Aktualisiert die Firmenstammdaten (Adresse, Kontakt, Bankdaten).',
      properties: {
        companyName: { type: Type.STRING },
        legalForm: { type: Type.STRING, description: 'z.B. GmbH, e.U., KG' },
        street: { type: Type.STRING },
        houseNumber: { type: Type.STRING },
        postalCode: { type: Type.STRING },
        city: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        website: { type: Type.STRING },
        uid: { type: Type.STRING, description: 'UID-Nummer' },
        companyRegisterNumber: { type: Type.STRING, description: 'Firmenbuchnummer' },
        defaultPaymentTerms: { type: Type.NUMBER, description: 'Standard-Zahlungsziel in Tagen' },
      },
      required: [],
    },
  },

  // ==========================================
  // KALENDER & TERMINE
  // ==========================================
  {
    name: 'scheduleAppointment',
    parameters: {
      type: Type.OBJECT,
      description:
        'Plant einen Termin (Aufmaß, Montage, Beratung, Planung) für ein Projekt oder einen neuen Planungstermin. Für Planungstermine kann projectId weggelassen werden, dann customerName angeben.',
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID des Projekts (optional für neue Planungstermine)',
        },
        customerName: {
          type: Type.STRING,
          description: 'Kundenname (erforderlich wenn kein projectId)',
        },
        appointmentType: {
          type: Type.STRING,
          description: 'Typ: Aufmaß, Montage, Beratung, Planung, Lieferung',
        },
        date: { type: Type.STRING, description: 'Datum YYYY-MM-DD' },
        time: { type: Type.STRING, description: 'Uhrzeit HH:MM' },
        duration: { type: Type.NUMBER, description: 'Dauer in Minuten' },
        assignedTo: { type: Type.STRING, description: 'Zugewiesener Mitarbeiter' },
        notes: { type: Type.STRING },
      },
      required: ['appointmentType', 'date'],
    },
  },
  {
    name: 'updateAppointment',
    parameters: {
      type: Type.OBJECT,
      description:
        'Ändert einen bestehenden Kalender-Termin (Planung/Beratung). Die appointmentId findest du in den KALENDER-TERMINEN im Kontext (Format: id=...). Nur Planungstermine aus dem Kalender können geändert werden; Projekt-Termine (Aufmaß, Montage, Lieferung) gehören zum Projekt und werden dort gepflegt.',
      properties: {
        appointmentId: {
          type: Type.STRING,
          description: 'ID des Termins (aus user_calendar_appointments, z.B. id=xxx)',
        },
        date: { type: Type.STRING, description: 'Neues Datum YYYY-MM-DD (optional)' },
        time: { type: Type.STRING, description: 'Neue Uhrzeit HH:MM (optional)' },
        customerName: { type: Type.STRING, description: 'Neuer Kundenname (optional)' },
        type: { type: Type.STRING, description: 'Neuer Typ z.B. Consultation (optional)' },
        notes: { type: Type.STRING, description: 'Neue oder ergänzte Notizen (optional)' },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'deleteAppointment',
    parameters: {
      type: Type.OBJECT,
      description:
        'Löscht einen Kalender-Termin (Planung/Beratung). Nur für Absagen oder Dubletten. Die appointmentId findest du in den KALENDER-TERMINEN im Kontext (id=...). Projekt-Termine (Aufmaß, Montage, Lieferung) werden hier nicht gelöscht.',
      properties: {
        appointmentId: {
          type: Type.STRING,
          description: 'ID des Termins (aus user_calendar_appointments, z.B. id=xxx)',
        },
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'getCalendarView',
    parameters: {
      type: Type.OBJECT,
      description:
        'Liefert die Termine für einen Tag oder eine Woche (nur Planung/Beratung aus dem Kalender). So kannst du z.B. prüfen ob "morgen Vormittag frei" ist.',
      properties: {
        date: {
          type: Type.STRING,
          description: 'Datum YYYY-MM-DD (Starttag)',
        },
        range: {
          type: Type.STRING,
          description: 'Optional: "day" (nur dieser Tag) oder "week" (diese Woche). Standard: day',
        },
      },
      required: ['date'],
    },
  },

  // ==========================================
  // E-MAIL-VERSAND
  // ==========================================
  {
    name: 'sendEmail',
    parameters: {
      type: Type.OBJECT,
      description:
        'Versendet eine E-Mail an einen oder mehrere Empfänger. E-Mail MIT Lieferschein: pdfType "deliveryNote" setzen UND projectId angeben (aus getProject/Projektliste). E-Mail MIT Rechnung: pdfType "invoice" und projectId. Ohne pdfType nur Text-Mail. Bei pdfType ist projectId Pflicht.',
      properties: {
        to: {
          type: Type.STRING,
          description: 'E-Mail-Adresse des Empfängers (oder mehrere durch Komma getrennt)',
        },
        subject: { type: Type.STRING, description: 'Betreff der E-Mail' },
        body: {
          type: Type.STRING,
          description:
            'Text-Inhalt der E-Mail (wird als HTML formatiert). Wird automatisch durch Template ersetzt wenn pdfType gesetzt ist.',
        },
        projectId: {
          type: Type.STRING,
          description: 'Erforderlich wenn pdfType gesetzt ist: Projekt-ID für PDF-Generierung',
        },
        pdfType: {
          type: Type.STRING,
          description:
            'Optional: Typ des PDF-Anhangs. Wenn gesetzt, wird automatisch PDF generiert und angehängt. Mögliche Werte: "invoice" (Anzahlung/Schlussrechnung), "deliveryNote" (Lieferschein). Wenn nicht gesetzt, wird nur Text-E-Mail versendet.',
        },
        invoiceId: {
          type: Type.STRING,
          description:
            'Optional: Bei pdfType="invoice" - Index der Anzahlung (z.B. "0" für erste) oder ID. Wenn nicht gesetzt, wird neueste Anzahlung oder Schlussrechnung verwendet.',
        },
        deliveryNoteId: {
          type: Type.STRING,
          description:
            'Optional: Bei pdfType="deliveryNote" - ID des Lieferscheins. Wenn nicht gesetzt, wird aus Projekt-Daten generiert.',
        },
        emailType: {
          type: Type.STRING,
          description:
            'DEPRECATED: Verwende stattdessen pdfType. Wird nur noch für Rückwärtskompatibilität unterstützt.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'sendSupplierOrderEmail',
    parameters: {
      type: Type.OBJECT,
      description:
        'Bereitet den Versand einer Lieferanten-Bestellung vor. Der finale Versand erfolgt erst nach Nutzer-Freigabe mit der Frage: Darf ich an <email> senden?.',
      properties: {
        supplierOrderId: {
          type: Type.STRING,
          description: 'ID der Lieferanten-Bestellung aus supplier_orders',
        },
        toEmail: {
          type: Type.STRING,
          description:
            'Optional: Zieladresse überschreiben. Sonst wird order_email/email aus dem Lieferanten genutzt.',
        },
        idempotencyKey: {
          type: Type.STRING,
          description:
            'Optionaler Idempotency-Key für retry-sicheren Versand (z.B. ai-order-123).',
        },
      },
      required: ['supplierOrderId'],
    },
  },
  {
    name: 'confirmOrder',
    parameters: {
      type: Type.OBJECT,
      description:
        'Markiert die Auftragsbestätigung (AB) eines Lieferanten als eingegangen. Setzt Status der Bestellung auf ab_received.',
      properties: {
        supplierOrderId: {
          type: Type.STRING,
          description: 'ID der Lieferanten-Bestellung (supplier_orders)',
        },
        abNumber: {
          type: Type.STRING,
          description: 'AB-Nummer / Bestätigungsnummer vom Lieferanten',
        },
        confirmedDeliveryDate: {
          type: Type.STRING,
          description: 'Optional: bestätigtes Lieferdatum YYYY-MM-DD',
        },
        notes: { type: Type.STRING, description: 'Optional: Notizen zur AB' },
      },
      required: ['supplierOrderId', 'abNumber'],
    },
  },
  {
    name: 'getLeadTimes',
    parameters: {
      type: Type.OBJECT,
      description:
        'Liefert die hinterlegten Lieferzeiten (in Wochen) pro Lieferant. Nützlich um zu prüfen ob ein Montagetermin realistisch ist.',
      properties: {},
      required: [],
    },
  },
  {
    name: 'setLeadTime',
    parameters: {
      type: Type.OBJECT,
      description: 'Speichert die Lieferzeit (in Wochen) für einen Lieferanten.',
      properties: {
        supplierId: {
          type: Type.STRING,
          description: 'ID des Lieferanten (aus listSuppliers oder Kontext)',
        },
        leadTimeWeeks: {
          type: Type.NUMBER,
          description: 'Lieferzeit in Wochen (z.B. 8 für 8 Wochen)',
        },
      },
      required: ['supplierId', 'leadTimeWeeks'],
    },
  },
  {
    name: 'analyzeKitchenPlan',
    parameters: {
      type: Type.OBJECT,
      description:
        'Gibt eine Anleitung für die Küchenplan-Analyse (PDF von DAN, Blanco, Bosch etc.). Die eigentliche Extraktion erfolgt über Dokumentenanalyse; nutze diese Funktion wenn der Nutzer nach Küchenplan-Auswertung fragt.',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getFinancialReport',
    parameters: {
      type: Type.OBJECT,
      description:
        'Liefert eine Finanzübersicht: Umsatz (Rechnungen) und offene Anzahlungen für einen Monat oder das aktuelle Jahr.',
      properties: {
        year: {
          type: Type.NUMBER,
          description: 'Optional: Jahr (z.B. 2026). Ohne Angabe: aktuelles Jahr',
        },
        month: {
          type: Type.NUMBER,
          description: 'Optional: Monat 1–12. Ohne Angabe: Gesamtjahr oder aktueller Monat',
        },
      },
      required: [],
    },
  },
  {
    name: 'automaticPaymentMatch',
    parameters: {
      type: Type.OBJECT,
      description:
        'Versucht, nicht zugeordnete Bankbewegungen (Eingänge) mit offenen Kundenrechnungen zu matchen (exakter Betrag). Setzt gefundene Rechnungen auf bezahlt und verknüpft die Buchung.',
      properties: {
        dryRun: {
          type: Type.BOOLEAN,
          description: 'Optional: true = nur Vorschläge anzeigen, nichts buchen. Standard: false',
        },
      },
      required: [],
    },
  },

  // ==========================================
  // WORKFLOWS
  // ==========================================
  {
    name: 'executeWorkflow',
    parameters: {
      type: Type.OBJECT,
      description:
        'Führt einen komplexen Multi-Step-Workflow aus. Verwende dies für komplexe Aufgaben die mehrere Schritte erfordern.',
      properties: {
        workflowType: {
          type: Type.STRING,
          description:
            'Typ des Workflows: monthlyInstallationDelivery (Lieferscheine für nächsten Monat erstellen und versenden), invoiceWorkflow (Rechnungen versenden)',
        },
        recipientEmail: {
          type: Type.STRING,
          description: 'E-Mail-Adresse des Empfängers (z.B. Disponent)',
        },
        projectIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional: Liste von Projekt-IDs (für invoiceWorkflow)',
        },
      },
      required: ['workflowType', 'recipientEmail'],
    },
  },
  {
    name: 'findProjectsByCriteria',
    parameters: {
      type: Type.OBJECT,
      description: 'Findet Projekte nach bestimmten Kriterien (Datum, Status, etc.)',
      properties: {
        status: { type: Type.STRING, description: 'Optional: Projekt-Status' },
        installationDateFrom: {
          type: Type.STRING,
          description: 'Optional: Installation ab Datum (YYYY-MM-DD)',
        },
        installationDateTo: {
          type: Type.STRING,
          description: 'Optional: Installation bis Datum (YYYY-MM-DD)',
        },
        customerName: { type: Type.STRING, description: 'Optional: Kundenname' },
      },
      required: [],
    },
  },
]
