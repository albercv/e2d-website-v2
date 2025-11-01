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
  private _supported: boolean;

  constructor() {
    // More robust support detection
    this._supported = this.checkSupport();
    
    if (!this._supported) {
      console.warn('Web Workers, OffscreenCanvas, or WebGL not fully supported, falling back to main thread');
    }
  }

  private checkSupport(): boolean {
    try {
      // Check Web Workers
      if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported');
        return false;
      }

      // Check OffscreenCanvas
      if (typeof OffscreenCanvas === 'undefined') {
        console.warn('OffscreenCanvas not supported');
        return false;
      }

      // Test OffscreenCanvas WebGL context creation
      const testCanvas = new OffscreenCanvas(1, 1);
      const testContext = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      
      if (!testContext) {
        console.warn('WebGL context not available on OffscreenCanvas');
        return false;
      }

      // Test transferControlToOffscreen (some browsers have partial support)
      const testHTMLCanvas = document.createElement('canvas');
      if (typeof testHTMLCanvas.transferControlToOffscreen !== 'function') {
        console.warn('transferControlToOffscreen not supported');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error checking OffscreenCanvas/WebGL support:', error);
      return false;
    }
  }

  async init(canvas: HTMLCanvasElement, config: Partial<OrbConfig>, onLoad?: () => void) {
    // Early return if not supported
    if (!this._supported) {
      console.warn('Orb Worker not supported, skipping initialization');
      return Promise.reject(new Error('Worker not supported'));
    }

    this.canvas = canvas;
    this.onLoadCallback = onLoad;

    try {
      // Create Web Worker with error handling
      // Use static worker file in production for better compatibility
      const workerUrl = process.env.NODE_ENV === 'production' 
        ? '/workers/orb.worker.js'
        : new URL('../workers/orb.worker.ts', import.meta.url);
        
      this.worker = new Worker(workerUrl, {
        type: process.env.NODE_ENV === 'production' ? 'classic' : 'module'
      });

      // Set up error handling before transferring canvas
      this.worker.onerror = (error) => {
        console.error('Orb Worker error:', error);
        this.destroy();
        throw new Error('Worker initialization failed');
      };

      this.worker.onmessageerror = (error) => {
        console.error('Orb Worker message error:', error);
        this.destroy();
        throw new Error('Worker message error');
      };

      // Transfer canvas control to worker with additional safety checks
      if (!canvas.transferControlToOffscreen) {
        throw new Error('transferControlToOffscreen not available');
      }

      this.offscreenCanvas = canvas.transferControlToOffscreen();

      // Set up message handling
      this.worker.onmessage = (event) => {
        const { type } = event.data;
        
        if (type === 'initialized') {
          this.isInitialized = true;
          this.onLoadCallback?.();
        } else if (type === 'error') {
          console.error('Worker reported error:', event.data.error);
          this.destroy();
        }
      };

      // Calculate initial dimensions safely
      const rect = canvas.getBoundingClientRect();
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x
      const initialWidth = Math.max(100, Math.min(4096, Math.floor(rect.width * devicePixelRatio)));
      const initialHeight = Math.max(100, Math.min(4096, Math.floor(rect.height * devicePixelRatio)));

      console.log('Orb initialization:', { 
        rectWidth: rect.width, 
        rectHeight: rect.height, 
        devicePixelRatio, 
        initialWidth, 
        initialHeight 
      });

      // Initialize worker with canvas and config
      this.worker.postMessage({
        type: 'init',
        data: {
          canvas: this.offscreenCanvas,
          width: initialWidth,
          height: initialHeight,
          hue: 200,
          hoverIntensity: 1.0,
          rotateOnHover: true,
          forceHoverState: false,
          ...config
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
      data: config
    });
  }

  updateMouse(x: number, y: number) {
    if (!this.worker || !this.isInitialized) return;

    this.worker.postMessage({
      type: 'mouse',
      data: { x, y }
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
    return this._supported;
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