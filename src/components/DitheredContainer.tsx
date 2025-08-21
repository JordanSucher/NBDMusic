import React from 'react'
import DitheredBackground from './DitheredBackground'

interface DitheredContainerProps {
  children: React.ReactNode
  variant?: 'card' | 'terminal' | 'button' | 'input' | 'subtle'
  className?: string
  style?: React.CSSProperties
  density?: number
}

export default function DitheredContainer({ 
  children, 
  variant = 'card',
  className = '',
  style = {},
  density = 0.2
}: DitheredContainerProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return {
          background: '#f8f8f8',
          backgroundImage: `
            linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
          `,
          backgroundSize: '4px 4px',
          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px',
          border: '2px solid #000',
          imageRendering: 'pixelated' as const
        }
      case 'terminal':
        return {
          background: '#000',
          color: '#00ff00',
          fontFamily: 'Courier New, monospace',
          border: '2px solid #333',
          position: 'relative' as const,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 2px,
              rgba(0, 255, 0, 0.05) 2px,
              rgba(0, 255, 0, 0.05) 4px
            )
          `
        }
      case 'button':
        return {
          background: '#ddd',
          backgroundImage: `
            linear-gradient(45deg, 
              #e0e0e0 25%, 
              transparent 25%, 
              transparent 50%, 
              #e0e0e0 50%, 
              #e0e0e0 75%, 
              transparent 75%)
          `,
          backgroundSize: '3px 3px',
          border: '2px outset #ddd',
          fontFamily: 'Courier New, monospace',
          imageRendering: 'pixelated' as const,
          cursor: 'pointer'
        }
      case 'input':
        return {
          background: '#fff',
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              #f8f8f8 0px,
              #f8f8f8 1px,
              #fff 1px,
              #fff 2px
            )
          `,
          border: '2px inset #ccc',
          fontFamily: 'Courier New, monospace',
          imageRendering: 'pixelated' as const
        }
      case 'subtle':
        return {
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(0,0,0,0.05) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
          imageRendering: 'pixelated' as const
        }
      default:
        return {}
    }
  }

  const containerStyle = {
    position: 'relative' as const,
    ...getVariantStyles(),
    ...style
  }

  return (
    <div className={className} style={containerStyle}>
      {/* Subtle dithered overlay for extra texture */}
      {variant !== 'terminal' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          opacity: variant === 'subtle' ? 0.03 : 0.02,
          zIndex: 0
        }}>
          <DitheredBackground 
            width={200} 
            height={100} 
            density={density} 
          />
        </div>
      )}
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Scanlines for terminal variant */}
      {variant === 'terminal' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 2px,
              rgba(0, 255, 0, 0.03) 2px,
              rgba(0, 255, 0, 0.03) 3px
            )
          `,
          pointerEvents: 'none',
          zIndex: 2
        }} />
      )}
    </div>
  )
}