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

  // Mouse tracking for hover effects
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!canvasRef.current || !rotateOnHover) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    workerManagerRef.current.updateMouse(x, y);
  }, [rotateOnHover]);

  // Initialize Web Worker or fallback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const workerManager = workerManagerRef.current;

    // Check if Web Workers are supported
    if (!workerManager.supported) {
      setFallbackToMainThread(true);
      return;
    }

    const initializeWorker = async () => {
      try {
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);

        await workerManager.init(canvas, {
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
        setFallbackToMainThread(true);
      }
    };

    initializeWorker();

    return () => {
      if (rotateOnHover && canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      workerManager.destroy();
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, onLoad, handleMouseMove]);

  // Update config when props change
  useEffect(() => {
    if (isLoaded) {
      workerManagerRef.current.updateConfig({
        hue,
        hoverIntensity,
        rotateOnHover,
        forceHoverState
      });
    }
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState, isLoaded]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !isLoaded) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width * (window.devicePixelRatio || 1);
      const height = rect.height * (window.devicePixelRatio || 1);

      canvas.width = width;
      canvas.height = height;

      workerManagerRef.current.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded]);

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