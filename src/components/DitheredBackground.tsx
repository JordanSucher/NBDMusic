import { useEffect, useRef } from 'react'

interface DitheredBackgroundProps {
  width?: number
  height?: number
  density?: number
  className?: string
}

export default function DitheredBackground({ 
  width = 100, 
  height = 100, 
  density = 0.3,
  className = ""
}: DitheredBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Create dithering pattern
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    
    // Floyd-Steinberg inspired pattern
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if (Math.random() < density) {
          ctx.fillRect(x, y, 1, 1)
        }
        
        // Offset pattern for second row
        if (Math.random() < density * 0.7) {
          ctx.fillRect(x + 1, y + 1, 1, 1)
        }
      }
    }
  }, [width, height, density])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        imageRendering: 'pixelated',
        opacity: 0.1
      }}
    />
  )
}