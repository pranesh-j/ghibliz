"use client"

import { useEffect, useRef } from "react"

export function CloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight * 1.2 // Make it a bit taller to ensure coverage
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Cloud class
    class Cloud {
      x: number
      y: number
      width: number
      height: number
      speed: number

      constructor(x: number, y: number, width: number, height: number, speed: number) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.speed = speed
      }

      draw() {
        if (!ctx) return

        ctx.save()
        ctx.translate(this.x, this.y)

        // Draw cloud
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.beginPath()
        ctx.arc(this.width * 0.3, this.height * 0.5, this.height * 0.4, 0, Math.PI * 2)
        ctx.arc(this.width * 0.5, this.height * 0.3, this.height * 0.4, 0, Math.PI * 2)
        ctx.arc(this.width * 0.7, this.height * 0.5, this.height * 0.4, 0, Math.PI * 2)
        ctx.arc(this.width * 0.5, this.height * 0.6, this.height * 0.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      update() {
        if (!canvas) return

        this.x += this.speed

        if (this.speed > 0 && this.x > canvas.width + this.width) {
          this.x = -this.width
        } else if (this.speed < 0 && this.x < -this.width) {
          this.x = canvas.width + this.width
        }
      }
    }

    // Create clouds
    const clouds: Cloud[] = []
    const numClouds = 15

    for (let i = 0; i < numClouds; i++) {
      const width = Math.random() * 200 + 100
      const height = width * 0.6
      const x = Math.random() * (canvas.width + width * 2) - width
      const y = Math.random() * canvas.height * 0.7
      const speed = (Math.random() - 0.5) * 0.5

      clouds.push(new Cloud(x, y, width, height, speed))
    }

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "#87CEEB") // Sky blue at top
      gradient.addColorStop(1, "#B0E0E6") // Lighter blue at bottom
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw clouds
      clouds.forEach((cloud) => {
        cloud.update()
        cloud.draw()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh', 
        maxWidth: '100%', 
        display: 'block', 
        zIndex: -1 
      }}
    />
  )
}