"use client"

import { useEffect, useRef, useState } from "react"

// Define Cloud class outside component or ensure stability if component could re-render often.
// Since the main effect runs once, defining it inside is okay here.
class Cloud {
  x: number
  y: number
  width: number
  height: number
  speed: number
  centerOffset: number // Store offset relative to the center

  constructor(centerOffset: number, y: number, width: number, height: number, speed: number) {
    this.centerOffset = centerOffset
    this.width = width
    this.height = height
    this.speed = speed
    this.y = y
    // Initial position based on current window width
    this.x = (window.innerWidth / 2) + centerOffset
  }

  draw(ctx: CanvasRenderingContext2D) { // Pass ctx as an argument
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
    this.x += this.speed
    this.centerOffset = this.x - (window.innerWidth / 2)
    const viewportWidth = window.innerWidth;

    if (this.speed < 0 && this.x + this.width < 0) {
      this.x = viewportWidth + Math.abs(this.speed); // Add a small buffer
      this.centerOffset = this.x - (viewportWidth / 2)
    } else if (this.speed > 0 && this.x > viewportWidth) {
      this.x = -this.width - Math.abs(this.speed); // Add a small buffer
      this.centerOffset = this.x - (viewportWidth / 2)
    }
  }

  reposition() {
      const viewportWidth = window.innerWidth;
      this.x = (viewportWidth / 2) + this.centerOffset;
  }
}


export function CloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudsRef = useRef<Cloud[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const isReducedMotionRef = useRef<boolean>(false); // Use ref to share state with animate loop
  const cachedGradient = useRef<CanvasGradient | null>(null); // Use ref for gradient cache

  // Use state only to trigger re-renders if absolutely necessary,
  // but here we just need to know the preference, ref is fine.
  // We use a dummy state just to potentially re-run the effect that sets speeds if needed.
  const [reduceMotionState, setReduceMotionState] = useState(false);

  // Effect 1: Handle Reduced Motion Preference Changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMotionPreference = () => {
      const prefersReducedMotion = mediaQuery.matches;
      isReducedMotionRef.current = prefersReducedMotion;
      setReduceMotionState(prefersReducedMotion); // Update state if needed elsewhere

      // Optional: Adjust speed immediately if clouds already exist
      // This prevents needing the main effect to re-run entirely
      if (cloudsRef.current.length > 0) {
         console.log("Adjusting cloud speeds for reduced motion:", prefersReducedMotion);
         cloudsRef.current.forEach(cloud => {
             // Re-calculate or set speed based on preference
             // This assumes you have access to the original random factor or base speed
             // For simplicity, let's just modify the existing speed:
             const baseSpeedMagnitude = Math.abs(cloud.speed / (cloud.speed > 0 ? 0.5 : -0.5)); // Estimate base magnitude
             const direction = Math.sign(cloud.speed) || (Math.random() - 0.5);
             cloud.speed = prefersReducedMotion ?
                 direction * baseSpeedMagnitude * 0.3 : // Slower
                 direction * baseSpeedMagnitude * 0.5; // Normal
         });
      }
    };

    updateMotionPreference(); // Set initial value

    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []); // Runs once on mount


  // Effect 2: Main Canvas Animation Setup & Control
  useEffect(() => {
    console.log("Setting up canvas animation effect");
    const canvas = canvasRef.current;
    if (!canvas) {
        console.error("Canvas ref not found");
        return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("Canvas context not found");
        return;
    }

    // --- Gradient Cache ---
    const getBackgroundGradient = () => {
      // Use canvas dimensions from the ref directly if needed, or pass them
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return null; // Should not happen if effect runs

      if (!cachedGradient.current) {
        console.log("Creating background gradient");
        const gradient = ctx.createLinearGradient(0, 0, 0, currentCanvas.height);
        gradient.addColorStop(0, "#87CEEB");
        gradient.addColorStop(1, "#B0E0E6");
        cachedGradient.current = gradient;
      }
      return cachedGradient.current;
    }

    // --- Canvas Resize ---
    const resizeCanvas = () => {
      const currentCanvas = canvasRef.current;
      const currentCtx = currentCanvas?.getContext('2d'); // Re-get context in case it was lost
      if (!currentCanvas || !currentCtx) return;

      currentCanvas.width = window.innerWidth;
      currentCanvas.height = window.innerHeight * 1.2;
      cachedGradient.current = null; // Invalidate gradient cache on resize

      // Reposition clouds immediately
      cloudsRef.current.forEach(cloud => cloud.reposition());

      // Draw immediately after resize for responsiveness (especially if paused)
      drawFrame(currentCtx, currentCanvas); // Use a dedicated draw function
      console.log(`Resized canvas to ${currentCanvas.width}x${currentCanvas.height}`);
    }

    // --- Cloud Initialization (only once) ---
    if (cloudsRef.current.length === 0) {
        console.log("Initializing clouds");
        const numClouds = 15;
        for (let i = 0; i < numClouds; i++) {
            const width = Math.random() * 200 + 100;
            const height = width * 0.6;
            const viewportWidth = window.innerWidth;
            const centerOffset = (Math.random() * viewportWidth * 1.5) - (viewportWidth * 0.75);
            // Use initial canvas height for y calculation
            const initialCanvasHeight = window.innerHeight * 1.2;
            const y = Math.random() * initialCanvasHeight * 0.7;

            // Determine speed based on initial reduced motion preference
            const speed = isReducedMotionRef.current ?
                (Math.random() - 0.5) * 0.3 : // Slower speed
                (Math.random() - 0.5) * 0.5;  // Normal speed

            cloudsRef.current.push(new Cloud(centerOffset, y, width, height, speed));
        }
    }

    // --- Drawing Function ---
    // Encapsulates drawing a single frame
    const drawFrame = (context: CanvasRenderingContext2D, targetCanvas: HTMLCanvasElement) => {
        context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        const gradient = getBackgroundGradient();
        if (gradient) {
            context.fillStyle = gradient;
            context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        } else {
             // Fallback background color if gradient fails
             context.fillStyle = "#87CEEB";
             context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        }


        cloudsRef.current.forEach((cloud) => {
            cloud.draw(context);
        });
    }


    // --- Animation Loop ---
    const animate = () => {
      // Re-check canvas and context validity each frame
      const currentCanvas = canvasRef.current;
      const currentCtx = currentCanvas?.getContext('2d');
      if (!currentCanvas || !currentCtx) {
          console.warn("Canvas or context lost, stopping animation.");
          stopAnimation();
          return;
      }

      // Update cloud positions ONLY if motion is NOT reduced
      if (!isReducedMotionRef.current) {
        cloudsRef.current.forEach((cloud) => {
          cloud.update();
        });
      }

      // Draw the frame (background + clouds)
      drawFrame(currentCtx, currentCanvas);

      // Request next frame
      animationFrameId.current = requestAnimationFrame(animate);
    }

    // --- Start/Stop Animation ---
    const startAnimation = () => {
      if (!animationFrameId.current) {
        console.log("Starting animation");
        animationFrameId.current = requestAnimationFrame(animate);
      }
    }

    const stopAnimation = () => {
      if (animationFrameId.current) {
        console.log("Stopping animation");
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    // --- Event Handlers ---
    const handleResize = () => {
        // No debounce/throttle for immediate visual feedback
        resizeCanvas();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        // Important: Re-check context validity before restarting
         if (canvasRef.current?.getContext('2d')) {
            startAnimation();
         } else {
             console.warn("Cannot restart animation, context not available after visibility change.");
         }
      }
    }

    // --- Setup ---
    resizeCanvas(); // Initial size calculation & draw
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start animation only if the tab is initially visible
    if (!document.hidden) {
      startAnimation();
    } else {
        // Ensure initial frame is drawn even if tab starts hidden
         const currentCtx = canvasRef.current?.getContext('2d');
         if (currentCtx && canvasRef.current) {
             drawFrame(currentCtx, canvasRef.current);
         }
    }

    // --- Cleanup ---
    return () => {
      console.log("Cleaning up CloudBackground animation effect");
      stopAnimation(); // Stop animation on unmount
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

    }
  }, []); // Run this main setup effect only ONCE on mount


  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        // CSS hint for browsers to potentially optimize scrolling/transforms
        // Less likely to cause flicker than JS hacks.
        willChange: 'transform',
      }}
      aria-hidden="true" // Good for accessibility as it's decorative
    />
  )
}