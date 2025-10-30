"use client"

import { useEffect, useRef, useState, useCallback } from "react";
import { getOrbWorkerManager } from "@/lib/orb-worker-manager";
import "@/styles/orb.css";

interface OrbOptimizedProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  onLoad?: () => void;
}

export function OrbOptimized({
  hue = 200,
  hoverIntensity = 1.0,
  rotateOnHover = true,
  forceHoverState = false,
  onLoad
}: OrbOptimizedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerManagerRef = useRef(getOrbWorkerManager());
  const [isLoaded, setIsLoaded] = useState(false);
  const [fallbackToMainThread, setFallbackToMainThread] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Mouse tracking for hover effects
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current || !rotateOnHover || hasError) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    try {
      workerManagerRef.current.updateMouse(x, y);
    } catch (error) {
      console.warn('Error updating mouse position:', error);
    }
  }, [rotateOnHover, hasError]);

  // Initialize Web Worker or fallback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || hasError) return;

    const workerManager = workerManagerRef.current;

    // Check if Web Workers are supported
    if (!workerManager.supported) {
      console.log('Worker not supported, using fallback');
      setFallbackToMainThread(true);
      return;
    }

    const initializeWorker = async () => {
      try {
        // Compute initial size but DO NOT set canvas.width/height after Offscreen transfer
        const rect = canvas.getBoundingClientRect();
        const initialWidth = rect.width * (window.devicePixelRatio || 1);
        const initialHeight = rect.height * (window.devicePixelRatio || 1);

        await workerManager.init(canvas, {
          width: initialWidth,
          height: initialHeight,
          hue,
          hoverIntensity,
          rotateOnHover,
          forceHoverState
        }, () => {
          setIsLoaded(true);
          onLoad?.();
        });

        // Add mouse event listeners
        if (rotateOnHover) {
          canvas.addEventListener('mousemove', handleMouseMove);
        }

      } catch (error) {
        console.error('Failed to initialize Orb Worker, falling back to main thread:', error);
        setHasError(true);
        setFallbackToMainThread(true);
        // Clean up any partial initialization
        workerManager.destroy();
      }
    };

    initializeWorker();

    return () => {
      try {
        if (rotateOnHover && canvas) {
          canvas.removeEventListener('mousemove', handleMouseMove);
        }
        workerManager.destroy();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, onLoad, handleMouseMove, hasError]);

  // Update config when props change
  useEffect(() => {
    if (isLoaded && !hasError) {
      try {
        workerManagerRef.current.updateConfig({
          hue,
          hoverIntensity,
          rotateOnHover,
          forceHoverState
        });
      } catch (error) {
        console.warn('Error updating config:', error);
        setHasError(true);
        setFallbackToMainThread(true);
      }
    }
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, isLoaded, hasError]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !isLoaded || hasError) return;

      try {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width * (window.devicePixelRatio || 1);
        const height = rect.height * (window.devicePixelRatio || 1);

        // Do NOT attempt to set canvas.width/height after transferControlToOffscreen()
        workerManagerRef.current.resize(width, height);
      } catch (error) {
        console.warn('Error during resize:', error);
        setHasError(true);
        setFallbackToMainThread(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded, hasError]);

  // Dynamic import for fallback component - always declare hooks
  const [OrbFallback, setOrbFallback] = useState<React.ComponentType<any> | null>(null);

  // Load fallback component when needed
  useEffect(() => {
    if (fallbackToMainThread && !OrbFallback) {
      import("./orb").then(module => {
        setOrbFallback(() => module.Orb);
      });
    }
  }, [fallbackToMainThread, OrbFallback]);

  // Render fallback if Web Workers not supported
  if (fallbackToMainThread) {
    if (OrbFallback) {
      return (
        <OrbFallback
          hue={hue}
          hoverIntensity={hoverIntensity}
          rotateOnHover={rotateOnHover}
          forceHoverState={forceHoverState}
          onLoad={onLoad}
        />
      );
    }

    return (
      <div className="orb-container">
        <div className="orb-fallback">
          <div className="orb-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="orb-container">
      <canvas
        ref={canvasRef}
        className="orb-canvas"
        style={{
          width: '100%',
          height: '100%',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      {!isLoaded && (
        <div className="orb-loading">
          <div className="orb-spinner"></div>
        </div>
      )}
    </div>
  );
}