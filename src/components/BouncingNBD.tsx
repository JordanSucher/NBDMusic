"use client"

import { useState, useEffect } from 'react'

interface CursorEyesProps {
  size?: 'small' | 'normal'
  headerMode?: boolean
}

export default function CursorEyes({ size = 'normal', headerMode = false }: CursorEyesProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(true)
  const [isBlinking, setIsBlinking] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleResize = () => {
      setIsVisible(window.innerWidth > 768)
    }
    
    handleResize()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every second
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 150) // Blink duration
      }
    }, 1000)

    return () => clearInterval(blinkInterval)
  }, [])

  if (!isVisible || !isHydrated) return null

  const eyeSize = size === 'small' ? 18 : 38
  const pupilSize = size === 'small' ? 5 : 11
  const highlightSize = size === 'small' ? 2 : 3
  const borderWidth = size === 'small' ? 2 : 3
  const maxDistance = size === 'small' ? 4 : 8

  const Eye = ({ x, y }: { x: number, y: number }) => {
    // Calculate eye center based on positioning mode
    const eyeCenterX = headerMode 
      ? (window.innerWidth <= 800) 
        ? 20 + x + eyeSize / 2 
        : (window.innerWidth - 800) / 2 + 20 + x + eyeSize / 2
      : x + eyeSize / 2

    const eyeCenterY = headerMode 
      ? 10 + y + eyeSize / 2  // header padding
      : y + eyeSize / 2

    const deltaX = mousePos.x - eyeCenterX
    const deltaY = mousePos.y - eyeCenterY
    const angle = Math.atan2(deltaY, deltaX)
    const distance = Math.min(maxDistance, Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 10)

    const pupilX = Math.cos(angle) * distance
    const pupilY = Math.sin(angle) * distance

    return (
      <div
        style={{
          position: headerMode ? 'absolute' : 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          width: `${eyeSize}px`,
          height: `${eyeSize}px`,
          backgroundColor: '#FFFFFF',
          border: `${borderWidth}px solid #000000`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: headerMode ? 1 : 10,
          fontFamily: 'Times New Roman, serif'
        }}
      >
        <div
          style={{
            width: `${pupilSize}px`,
            height: isBlinking ? '2px' : `${pupilSize}px`,
            backgroundColor: '#000000',
            transform: `translate(${pupilX}px, ${pupilY}px)`,
            transition: 'transform 0.1s linear, height 0.1s ease',
            position: 'relative'
          }}
        />
      </div>
    )
  }

  const eyePositions = headerMode 
    ? [{ x: 47, y: 4 }, { x: 68, y: 4 }]
    : [{ x: 20, y: 200 }, { x: 80, y: 200 }]

  return (
    <>
      {eyePositions.map((pos, index) => (
        <Eye key={index} x={pos.x} y={pos.y} />
      ))}
    </>
  )
}
