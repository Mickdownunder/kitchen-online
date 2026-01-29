'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'

interface SignatureCaptureProps {
  onSave: (signature: string) => void
  onCancel: () => void
  initialSignature?: string
  customerName?: string
}

export default function SignatureCapture({
  onSave,
  onCancel,
  initialSignature,
  customerName,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!initialSignature)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 200

    // Set drawing style
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const signature = canvas.toDataURL('image/png')
    onSave(signature)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="mb-1 text-lg font-black text-slate-900">Unterschrift erfassen</h3>
        {customerName && <p className="text-sm text-slate-600">Kunde: {customerName}</p>}
      </div>

      <div className="mb-4 rounded-xl border-2 border-slate-300 bg-slate-50 p-4">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none rounded-lg border border-slate-200 bg-white"
          style={{ height: '200px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={clearSignature}
          className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-300"
        >
          <RotateCcw className="h-4 w-4" />
          Löschen
        </button>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl bg-slate-300 px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-slate-400"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!hasSignature}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              hasSignature
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
