/**
 * Orb Worker Manager
 * Manages communication with the Orb Web Worker
 * Handles OffscreenCanvas transfer and message passing
 */

interface OrbConfig {
  width: number;
  height: number;
  hue: number;
  hoverIntensity: number;
  rotateOnHover: boolean;
  forceHoverState: boolean;
}

interface WorkerMessage {
  type: 'init' | 'update' | 'resize' | 'destroy';
  data?: any;
}

export class OrbWorkerManager {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private isInitialized = false;
  private onLoadCallback?: () => void;

  constructor() {
    // Check if Web Workers and OffscreenCanvas are supported
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      console.warn('Web Workers or OffscreenCanvas not supported, falling back to main thread');
      return;
    }
  }

  async init(canvas: HTMLCanvasElement, config: Partial<OrbConfig>, onLoad?: () => void) {
    this.canvas = canvas;
    this.onLoadCallback = onLoad;

    try {
      // Create Web Worker
      this.worker = new Worker(new URL('../workers/orb.worker.ts', import.meta.url), {
        type: 'module'
      });

      // Transfer canvas control to worker
      this.offscreenCanvas = canvas.transferControlToOffscreen();

      // Set up message handling
      this.worker.onmessage = (event) => {
        const { type } = event.data;
        
        if (type === 'initialized') {
          this.isInitialized = true;
          this.onLoadCallback?.();
        }
      };

      this.worker.onerror = (error) => {
        console.error('Orb Worker error:', error);
        // Fallback to main thread if worker fails
        this.destroy();
      };

      // Initialize worker with canvas and config
      this.worker.postMessage({
        type: 'init',
        data: {
          canvas: this.offscreenCanvas,
          config: {
            width: canvas.width,
            height: canvas.height,
            hue: 200,
            hoverIntensity: 1.0,
            rotateOnHover: true,
            forceHoverState: false,
            ...config
          }
        }
      }, [this.offscreenCanvas]);

    } catch (error) {
      console.error('Failed to initialize Orb Worker:', error);
      this.destroy();
      throw error;
    }
  }

  updateConfig(config: Partial<OrbConfig>) {
    if (!this.worker || !this.isInitialized) return;

    this.worker.postMessage({
      type: 'update',
      data: { config }
    });
  }

  updateMouse(x: number, y: number) {
    if (!this.worker || !this.isInitialized) return;

    this.worker.postMessage({
      type: 'update',
      data: { mouse: { x, y } }
    });
  }

  resize(width: number, height: number) {
    if (!this.worker || !this.isInitialized) return;

    this.worker.postMessage({
      type: 'resize',
      data: { width, height }
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.postMessage({ type: 'destroy' });
      this.worker.terminate();
      this.worker = null;
    }
    
    this.offscreenCanvas = null;
    this.canvas = null;
    this.isInitialized = false;
    this.onLoadCallback = undefined;
  }

  get supported() {
    return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
  }
}

// Singleton instance for reuse
let orbWorkerManager: OrbWorkerManager | null = null;

export function getOrbWorkerManager(): OrbWorkerManager {
  if (!orbWorkerManager) {
    orbWorkerManager = new OrbWorkerManager();
  }
  return orbWorkerManager;
}