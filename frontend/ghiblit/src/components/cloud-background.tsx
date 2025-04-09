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
      // Add a centerOffset property to track position relative to center
      centerOffset: number

      constructor(centerOffset: number, y: number, width: number, height: number, speed: number) {
        this.centerOffset = centerOffset // Store offset from center
        this.width = width
        this.height = height
        this.speed = speed
        this.y = y
        
        // Set initial x based on center offset and current viewport
        this.x = (window.innerWidth / 2) + centerOffset
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

        // Move cloud based on speed
        this.x += this.speed
        
        // Update centerOffset based on current position
        this.centerOffset = this.x - (window.innerWidth / 2)
        
        // Wrap clouds relative to viewport center
        const viewportWidth = window.innerWidth
        
        // Left edge - If cloud moves completely off left edge
        if (this.x + this.width < 0) {
          // Place it just off the right edge
          this.x = viewportWidth + 10
          this.centerOffset = this.x - (viewportWidth / 2)
        }
        
        // Right edge - If cloud moves completely off right edge
        if (this.x - this.width > viewportWidth) {
          // Place it just off the left edge
          this.x = -this.width - 10
          this.centerOffset = this.x - (viewportWidth / 2)
        }
      }
      
      // When window resizes, reposition cloud relative to new center
      reposition() {
        const viewportWidth = window.innerWidth
        this.x = (viewportWidth / 2) + this.centerOffset
      }
    }

    // Create clouds with positions defined relative to center
    const clouds: Cloud[] = []
    const numClouds = 15 // Original number

    for (let i = 0; i < numClouds; i++) {
      // Keep original cloud sizes
      const width = Math.random() * 200 + 100
      const height = width * 0.6
      
      // Position clouds with offset from center
      const viewportWidth = window.innerWidth
      const centerOffset = (Math.random() * viewportWidth * 1.5) - (viewportWidth * 0.75)
      const y = Math.random() * canvas.height * 0.7
      
      const speed = (Math.random() - 0.5) * 0.5

      clouds.push(new Cloud(centerOffset, y, width, height, speed))
    }

    // Handle window resize by repositioning all clouds
    const handleResize = () => {
      resizeCanvas()
      clouds.forEach(cloud => cloud.reposition())
    }
    
    window.addEventListener("resize", handleResize)

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
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1 // Put it behind everything else
      }}
    />
  )
}