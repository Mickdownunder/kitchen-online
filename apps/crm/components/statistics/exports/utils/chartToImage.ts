/**
 * Utility functions for converting Recharts components to images
 * This allows embedding charts in PDF documents
 */

export interface ChartImageOptions {
  width?: number
  height?: number
  backgroundColor?: string
}

/**
 * Converts a Recharts chart component to a base64 PNG image
 * This uses html2canvas to capture the rendered chart
 */
export async function chartToImage(
  chartElement: HTMLElement,
  options: ChartImageOptions = {}
): Promise<string> {
  const { width = 800, height = 400, backgroundColor = '#ffffff' } = options

  try {
    // Dynamic import to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default

    const canvas = await html2canvas(chartElement, {
      width,
      height,
      backgroundColor,
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
    })

    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error converting chart to image:', error)
    // Return a placeholder image if conversion fails
    return createPlaceholderImage(width, height)
  }
}

/**
 * Creates a placeholder image when chart conversion fails
 */
function createPlaceholderImage(width: number, height: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#64748b'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Chart konnte nicht geladen werden', width / 2, height / 2)
  }

  return canvas.toDataURL('image/png')
}

/**
 * Converts multiple chart elements to images in parallel
 */
export async function chartsToImages(
  chartElements: HTMLElement[],
  options: ChartImageOptions = {}
): Promise<string[]> {
  return Promise.all(chartElements.map(element => chartToImage(element, options)))
}
