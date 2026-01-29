'use client'

import React, { useRef, useEffect, useState } from 'react'
import { chartToImage } from './utils/chartToImage'

interface PDFChartRendererProps {
  children: React.ReactNode
  onImageReady?: (imageData: string) => void
  width?: number
  height?: number
  className?: string
}

/**
 * Component that renders a chart and converts it to an image
 * for use in PDF documents. The chart is rendered invisibly
 * and then captured as an image.
 */
const PDFChartRenderer: React.FC<PDFChartRendererProps> = ({
  children,
  onImageReady,
  width = 800,
  height = 400,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const [_imageData, setImageData] = useState<string | null>(null) // Used internally
  const [isRendering, setIsRendering] = useState(false)

  useEffect(() => {
    const captureChart = async () => {
      if (!chartRef.current || isRendering) return

      setIsRendering(true)

      // Wait a bit for the chart to fully render
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        const image = await chartToImage(chartRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        })

        setImageData(image)
        if (onImageReady) {
          onImageReady(image)
        }
      } catch (error) {
        console.error('Error capturing chart:', error)
      } finally {
        setIsRendering(false)
      }
    }

    captureChart()
  }, [children, width, height, onImageReady, isRendering])

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        visibility: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {children}
    </div>
  )
}

export default PDFChartRenderer
