import { useState, useCallback, useRef, useEffect } from 'react'

interface UsePriceInputOptions {
  initialValue: number | undefined
  onValueChange: (value: number | undefined) => void
  formatOnBlur?: boolean // default: true
  allowEmpty?: boolean // default: false
  min?: number
  max?: number
}

/**
 * Hook für konsistente Preis-Eingabe mit deutscher Formatierung
 * - Speichert rohen Input während der Eingabe (ohne Formatierung)
 * - Formatiert nur beim Blur
 * - Erhält Cursor-Position während der Eingabe
 * - Unterstützt Komma und Punkt als Dezimaltrennzeichen
 */
export function usePriceInput({
  initialValue,
  onValueChange,
  formatOnBlur = true,
  allowEmpty = false,
  min,
  max,
}: UsePriceInputOptions) {
  const [rawInput, setRawInput] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorPositionRef = useRef<number>(0)

  // Formatierung: Zahl zu deutschem Format (z.B. 100.5 → "100,50")
  const formatNumber = useCallback(
    (value: number | undefined | null, showZero: boolean = false): string => {
      if (value === undefined || value === null || isNaN(value)) return ''
      if (value === 0 && !showZero) return ''
      return value.toFixed(2).replace('.', ',')
    },
    []
  )

  // Parsing: Deutsches Format zu Zahl (z.B. "100,50" → 100.5)
  const parseNumber = useCallback((value: string): number => {
    if (!value || value.trim() === '') return 0

    // Entferne alle Zeichen außer Ziffern, Komma und Punkt
    let cleaned = value.replace(/[^\d,.-]/g, '')

    // WICHTIG: Tausenderpunkte entfernen BEVOR Komma umgewandelt wird!
    // Deutsche Formatierung: Punkt = Tausender, Komma = Dezimal

    if (cleaned.includes(',')) {
      // Komma vorhanden → Komma ist Dezimal, alle Punkte sind Tausender
      cleaned = cleaned.replace(/\./g, '') // Entferne alle Punkte (Tausender)
      cleaned = cleaned.replace(',', '.') // Komma zu Punkt (für parseFloat)
    } else if (cleaned.includes('.')) {
      // Nur Punkt vorhanden → Prüfe ob Tausenderpunkt oder Dezimalpunkt
      const parts = cleaned.split('.')

      if (parts.length > 2) {
        // Mehrere Punkte → alle sind Tausender (z.B. "1.000.000")
        cleaned = cleaned.replace(/\./g, '')
      } else if (parts.length === 2) {
        // Ein Punkt → Prüfe ob Tausenderpunkt oder Dezimalpunkt
        const afterDot = parts[1]

        // Wenn nach dem Punkt genau 3 Ziffern → wahrscheinlich Tausenderpunkt (z.B. "1.000", "100.000")
        // Wenn nach dem Punkt 1-2 Ziffern → Dezimalpunkt (z.B. "1.5", "1.50")
        if (afterDot.length === 3) {
          // 3 Ziffern → Tausenderpunkt (entfernen)
          cleaned = cleaned.replace(/\./g, '')
        }
        // 1-2 Ziffern → Dezimalpunkt (Punkt bleibt, wird von parseFloat korrekt behandelt)
      }
    }

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }, [])

  // Initialisiere rawInput wenn initialValue sich ändert (aber nicht während Fokus)
  useEffect(() => {
    if (!isFocused && initialValue !== undefined && initialValue !== null) {
      setRawInput(formatNumber(initialValue, true))
    } else if (!isFocused && (initialValue === undefined || initialValue === null)) {
      setRawInput('')
    }
  }, [initialValue, isFocused, formatNumber])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Speichere Cursor-Position
      cursorPositionRef.current = e.target.selectionStart || 0

      // Erlaube freie Eingabe während des Tippens
      setRawInput(newValue)

      // Parse und validiere
      const numValue = parseNumber(newValue)

      // Validierung
      if (min !== undefined && numValue < min) return
      if (max !== undefined && numValue > max) return

      // Wenn leer und allowEmpty=false, setze 0
      if (newValue === '' || newValue === ',' || newValue === '.') {
        if (allowEmpty) {
          onValueChange(undefined)
        } else {
          // Warte auf vollständige Eingabe
        }
        return
      }

      // Callback mit geparstem Wert (immer auf 2 Dezimalen runden für Geldbeträge)
      const rounded = Math.round(numValue * 100) / 100
      onValueChange(numValue > 0 || allowEmpty ? rounded : undefined)
    },
    [parseNumber, onValueChange, allowEmpty, min, max]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Wenn formatiert, zeige rohen Wert
    if (initialValue !== undefined && initialValue !== null) {
      // Entferne Formatierung für bessere Eingabe
      const unformatted = initialValue.toString().replace('.', ',')
      setRawInput(unformatted)
    }
  }, [initialValue])

  const handleBlur = useCallback(() => {
    setIsFocused(false)

    if (formatOnBlur) {
      // Formatiere beim Blur
      const numValue = parseNumber(rawInput)

      if (numValue > 0 || (allowEmpty && rawInput === '')) {
        if (rawInput === '' && allowEmpty) {
          setRawInput('')
          onValueChange(undefined)
        } else {
          const rounded = Math.round(numValue * 100) / 100
          const formatted = formatNumber(rounded, true)
          setRawInput(formatted)
          onValueChange(rounded)
        }
      } else {
        // Ungültiger Wert → zurücksetzen
        if (initialValue !== undefined && initialValue !== null) {
          setRawInput(formatNumber(initialValue, true))
        } else {
          setRawInput('')
        }
      }
    } else {
      // Keine Formatierung, aber trotzdem Wert setzen (auf 2 Dezimalen runden)
      const numValue = parseNumber(rawInput)
      if (rawInput === '' && allowEmpty) {
        onValueChange(undefined)
      } else {
        onValueChange(Math.round(numValue * 100) / 100)
      }
    }
  }, [rawInput, formatOnBlur, parseNumber, formatNumber, allowEmpty, onValueChange, initialValue])

  // Display-Wert: Während Fokus roher Input, sonst formatiert
  const displayValue = isFocused ? rawInput : rawInput || formatNumber(initialValue, true)

  return {
    value: displayValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ref: inputRef, // React erkennt 'ref' als Standard-Prop, nicht 'inputRef'
  }
}
