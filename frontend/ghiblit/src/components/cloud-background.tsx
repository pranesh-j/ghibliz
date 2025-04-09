"use client"

import { useEffect, useRef } from "react"

export function CloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight * 1.2
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    class Cloud {
      x: number
      y: number
      width: number
      height: number
      speed: number
      centerOffset: number

      constructor(centerOffset: number, y: number, width: number, height: number, speed: number) {
        this.centerOffset = centerOffset
        this.width = width
        this.height = height
        this.speed = speed
        this.y = y
        this.x = (window.innerWidth / 2) + centerOffset
      }

      draw() {
        if (!ctx) return

        ctx.save()
        ctx.translate(this.x, this.y)

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
        this.centerOffset = this.x - (window.innerWidth / 2)
        const viewportWidth = window.innerWidth
        
        if (this.x + this.width < 0) {
          this.x = viewportWidth + 10
          this.centerOffset = this.x - (viewportWidth / 2)
        }
        
        if (this.x - this.width > viewportWidth) {
          this.x = -this.width - 10
          this.centerOffset = this.x - (viewportWidth / 2)
        }
      }
      
      reposition() {
        const viewportWidth = window.innerWidth
        this.x = (viewportWidth / 2) + this.centerOffset
      }
    }

    const clouds: Cloud[] = []
    const numClouds = 15

    for (let i = 0; i < numClouds; i++) {
      const width = Math.random() * 200 + 100
      const height = width * 0.6
      const viewportWidth = window.innerWidth
      const centerOffset = (Math.random() * viewportWidth * 1.5) - (viewportWidth * 0.75)
      const y = Math.random() * canvas.height * 0.7
      const speed = (Math.random() - 0.5) * 0.5

      clouds.push(new Cloud(centerOffset, y, width, height, speed))
    }

    const handleResize = () => {
      resizeCanvas()
      clouds.forEach(cloud => cloud.reposition())
    }
    
    window.addEventListener("resize", handleResize)

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "#87CEEB")
      gradient.addColorStop(1, "#B0E0E6")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

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
        zIndex: -1
      }}
    />
  )
}