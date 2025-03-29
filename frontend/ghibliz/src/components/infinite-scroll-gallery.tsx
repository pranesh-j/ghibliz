"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GalleryItem {
  id: number
  original: string
  processed: string
}

interface InfiniteScrollGalleryProps {
  items: GalleryItem[]
  className?: string
}

export function InfiniteScrollGallery({ items, className }: InfiniteScrollGalleryProps) {
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Duplicate items for seamless looping
  const duplicatedItems = [...items, ...items, ...items]

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    // Initial width calculation
    updateWidth()

    // Update on resize
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  // Calculate item width based on screen size
  const getItemWidth = () => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) return 250 // Mobile
      if (window.innerWidth < 1024) return 300 // Tablet
      return 350 // Desktop
    }
    return 300 // Default
  }

  const itemWidth = getItemWidth()
  const totalWidth = duplicatedItems.length * (itemWidth + 16) // width + gap

  // Calculate animation duration based on number of items
  const duration = items.length * 20 // seconds

  return (
    <div className={cn("relative w-full overflow-hidden", className)} ref={containerRef}>
      {/* Top row - moving left */}
      <div className="relative w-full overflow-hidden mb-6 h-[220px]">
        {/* Fade overlay - left */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-ghibli-cream/30 to-transparent pointer-events-none" />

        <motion.div
          className="flex gap-4"
          initial={{ x: 0 }}
          animate={{ x: -totalWidth / 2 }}
          transition={{
            duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
            repeatType: "loop",
          }}
          style={{ width: totalWidth }}
        >
          {duplicatedItems.map((item, index) => (
            <div
              key={`top-${item.id}-${index}`}
              className="shrink-0 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-md"
              style={{ width: itemWidth }}
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={item.original || "/placeholder.svg?height=300&width=400"}
                  alt={`Original ${item.id}`}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Fade overlay - right */}
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-ghibli-cream/30 to-transparent pointer-events-none" />
      </div>

      {/* Bottom row - moving right */}
      <div className="relative w-full overflow-hidden h-[220px]">
        {/* Fade overlay - left */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-ghibli-cream/30 to-transparent pointer-events-none" />

        <motion.div
          className="flex gap-4"
          initial={{ x: -totalWidth / 2 }}
          animate={{ x: 0 }}
          transition={{
            duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
            repeatType: "loop",
          }}
          style={{ width: totalWidth }}
        >
          {duplicatedItems.map((item, index) => (
            <div
              key={`bottom-${item.id}-${index}`}
              className="shrink-0 bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-md"
              style={{ width: itemWidth }}
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={item.processed || "/placeholder.svg?height=300&width=400"}
                  alt={`Processed ${item.id}`}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Fade overlay - right */}
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-ghibli-cream/30 to-transparent pointer-events-none" />
      </div>
    </div>
  )
}

