/**
 * Orb Web Worker
 * Moves all heavy OGL rendering logic off the main thread
 * Reduces Script Evaluation time significantly
 */

import { Renderer, Program, Mesh, Triangle, Vec3 } from "ogl";

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

class OrbWorkerRenderer {
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private canvas: OffscreenCanvas | null = null;
  private animationId: number | null = null;
  private config: OrbConfig = {
    width: 400,
    height: 400,
    hue: 200,
    hoverIntensity: 1.0,
    rotateOnHover: true,
    forceHoverState: false
  };

  private mouse = { x: 0, y: 0 };
  private targetMouse = { x: 0, y: 0 };

  init(canvas: OffscreenCanvas, config: Partial<OrbConfig>) {
    this.canvas = canvas;
    this.config = { ...this.config, ...config };

    // Initialize OGL renderer with OffscreenCanvas
    this.renderer = new Renderer({
      canvas: this.canvas as any, // OffscreenCanvas compatibility
      width: this.config.width,
      height: this.config.height,
      dpr: Math.min(globalThis.devicePixelRatio || 1, 2),
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });

    // Vertex shader
    const vertex = `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;

    // Fragment shader with optimizations
    const fragment = `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      uniform vec2 mouse;
      uniform float hue;
      uniform float hoverIntensity;
      varying vec2 vUv;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 st = vUv;
        vec2 center = vec2(0.5);
        float dist = distance(st, center);
        
        // Create orb effect
        float orb = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Add some movement based on time and mouse
        vec2 mouseInfluence = (mouse - center) * hoverIntensity * 0.1;
        float wave = sin(time * 2.0 + dist * 10.0 + mouseInfluence.x * 5.0) * 0.1;
        
        // Color based on hue
        vec3 color = hsv2rgb(vec3(hue / 360.0, 0.8, 1.0));
        
        // Add glow effect
        float glow = pow(orb, 2.0) + wave;
        color *= glow;
        
        // Add transparency
        float alpha = orb * 0.8;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Create program
    this.program = new Program(this.renderer.gl, {
      vertex,
      fragment,
      uniforms: {
        time: { value: 0 },
        resolution: { value: [this.config.width, this.config.height] },
        mouse: { value: [0.5, 0.5] },
        hue: { value: this.config.hue },
        hoverIntensity: { value: this.config.hoverIntensity }
      }
    });

    // Create geometry
    const geometry = new Triangle(this.renderer.gl);
    
    // Create mesh
    this.mesh = new Mesh(this.renderer.gl, { geometry, program: this.program });

    // Start animation loop
    this.startAnimation();

    // Notify main thread that initialization is complete
    self.postMessage({ type: 'initialized' });
  }

  private startAnimation() {
    const animate = (time: number) => {
      if (!this.renderer || !this.program || !this.mesh) return;

      // Update uniforms
      this.program.uniforms.time.value = time * 0.001;
      
      // Smooth mouse movement
      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;
      this.program.uniforms.mouse.value = [this.mouse.x, this.mouse.y];

      // Render
      this.renderer.render({ scene: this.mesh });

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  updateConfig(newConfig: Partial<OrbConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.program) {
      if (newConfig.hue !== undefined) {
        this.program.uniforms.hue.value = newConfig.hue;
      }
      if (newConfig.hoverIntensity !== undefined) {
        this.program.uniforms.hoverIntensity.value = newConfig.hoverIntensity;
      }
    }
  }

  updateMouse(x: number, y: number) {
    this.targetMouse.x = x;
    this.targetMouse.y = y;
  }

  resize(width: number, height: number) {
    if (this.renderer && this.program) {
      this.renderer.setSize(width, height);
      this.program.uniforms.resolution.value = [width, height];
      this.config.width = width;
      this.config.height = height;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Cleanup WebGL resources
    if (this.renderer) {
      this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    
    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.canvas = null;
  }
}

// Worker instance
const orbRenderer = new OrbWorkerRenderer();

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      orbRenderer.init(data.canvas, data.config);
      break;
    
    case 'update':
      if (data.config) {
        orbRenderer.updateConfig(data.config);
      }
      if (data.mouse) {
        orbRenderer.updateMouse(data.mouse.x, data.mouse.y);
      }
      break;
    
    case 'resize':
      orbRenderer.resize(data.width, data.height);
      break;
    
    case 'destroy':
      orbRenderer.destroy();
      break;
  }
});

// Export for TypeScript
export {};