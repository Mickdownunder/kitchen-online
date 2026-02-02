'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function OrderSignPage() {
  const params = useParams()
  const token = params.token as string
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [project, setProject] = useState<{
    orderNumber: string
    customerName: string
  } | null>(null)
  const [withdrawalWaived, setWithdrawalWaived] = useState(false)
  const [signedByName, setSignedByName] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const hasDrawn = useRef(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/customer/order/sign?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
          return
        }
        if (data.alreadySigned) {
          setAlreadySigned(true)
          setProject({ orderNumber: data.orderNumber, customerName: data.customerName })
          return
        }
        setProject({
          orderNumber: data.orderNumber,
          customerName: data.customerName,
        })
        setSignedByName(data.customerName || '')
      })
      .catch(() => setError('Fehler beim Laden'))
      .finally(() => setLoading(false))
  }, [token])

  const handleMouseDown = () => {
    setIsDrawing(true)
    hasDrawn.current = true
  }
  const handleMouseUp = () => setIsDrawing(false)
  const handleMouseLeave = () => setIsDrawing(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    hasDrawn.current = true
    const touch = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
      }
    }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !canvasRef.current) return
    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) {
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
      ctx.stroke()
    }
  }
  const handleTouchEnd = () => setIsDrawing(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !project || alreadySigned) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [project, alreadySigned])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !project || !canvasRef.current) return
    if (!withdrawalWaived) {
      setError('Bitte bestätigen Sie den Verzicht auf das Widerrufsrecht.')
      return
    }
    if (!signedByName.trim()) {
      setError('Bitte geben Sie Ihren Namen ein.')
      return
    }
    if (!hasDrawn.current) {
      setError('Bitte unterschreiben Sie im Feld oben.')
      return
    }

    const signature = canvasRef.current.toDataURL('image/png')
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/customer/order/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature,
          signedBy: signedByName.trim(),
          withdrawalWaived: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Fehler beim Speichern')
        return
      }
      setSuccess(true)
    } catch {
      setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-red-900">Link ungültig</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <p className="mt-4 text-sm text-red-600">
          Bitte fordern Sie einen neuen Link bei Ihrem Ansprechpartner an.
        </p>
      </div>
    )
  }

  if (alreadySigned) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-600" />
        <h2 className="text-xl font-bold text-emerald-900">Bereits unterschrieben</h2>
        <p className="mt-2 text-emerald-800">
          Der Auftrag {project?.orderNumber} wurde bereits von Ihnen bestätigt.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-600" />
        <h2 className="text-xl font-bold text-emerald-900">Vielen Dank!</h2>
        <p className="mt-2 text-emerald-800">
          Ihr Auftrag {project?.orderNumber} wurde erfolgreich unterschrieben.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <FileCheck className="h-10 w-10 text-teal-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Auftrag unterschreiben</h1>
            <p className="text-slate-600">
              Auftrag {project?.orderNumber} · {project?.customerName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Unterschrift *
            </label>
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50">
              <canvas
                ref={canvasRef}
                className="h-40 w-full cursor-crosshair touch-none"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="mt-2 text-sm text-slate-500 underline hover:text-slate-700"
            >
              Unterschrift löschen
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Name des Unterzeichners *
            </label>
            <input
              type="text"
              value={signedByName}
              onChange={e => setSignedByName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Vor- und Nachname"
              required
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={withdrawalWaived}
                onChange={e => setWithdrawalWaived(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-800">
                Ich bestätige den Auftrag und <strong>verzichte ausdrücklich</strong> auf mein
                14-tägiges Widerrufsrecht gemäß § 18 Abs 1 Z 3 FAGG (Maßanfertigung nach
                Kundenspezifikation).
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-teal-600 py-4 font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            ) : (
              'Auftrag bestätigen und unterschreiben'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
