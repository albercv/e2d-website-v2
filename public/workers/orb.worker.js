/**
 * Orb Web Worker
 * Handles 3D orb rendering using Three.js in a Web Worker with OffscreenCanvas
 */

// Import Three.js from CDN for worker compatibility
// Import Three.js from CDN
importScripts('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js');

let scene, camera, renderer, orb, animationId;

// Ensure config is always defined with safe defaults
let config = {
  width: 400,
  height: 400,
  hue: 220,
  hoverIntensity: 0,
  rotateOnHover: false,
  forceHoverState: false
};

// Ensure config is never null or undefined
function ensureConfig() {
  if (!config || typeof config !== 'object') {
    console.warn('Config was undefined or invalid, reinitializing...');
    config = {
      width: 400,
      height: 400,
      hue: 220,
      hoverIntensity: 0,
      rotateOnHover: false,
      forceHoverState: false
    };
  }
  return config;
}

let mouseX = 0;
let mouseY = 0;

function initOrb(canvas, initialConfig = {}) {
  try {
    // Verify Three.js is loaded
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js not loaded in worker');
    }

    // Validate canvas parameter
    if (!canvas) {
      throw new Error('Canvas parameter is required but was undefined or null');
    }
    
    if (!(canvas instanceof OffscreenCanvas)) {
      throw new Error('Canvas must be an OffscreenCanvas instance');
    }
    
    console.log('Canvas validation passed:', {
      type: canvas.constructor.name,
      width: canvas.width,
      height: canvas.height
    });

    // Ensure config is properly initialized
    config = ensureConfig();
    console.log('Config after ensureConfig:', config);

    // Validate and merge initial config
    if (initialConfig && typeof initialConfig === 'object') {
      console.log('Merging initial config:', initialConfig);
      
      // Validate critical properties
      if (typeof initialConfig.width === 'number' && initialConfig.width > 0) {
        config.width = initialConfig.width;
      }
      if (typeof initialConfig.height === 'number' && initialConfig.height > 0) {
        config.height = initialConfig.height;
      }
      
      // Merge other properties safely
      config = { ...config, ...initialConfig };
    }

    console.log('Final config for initialization:', config);

    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, config.width / config.height, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer setup with OffscreenCanvas
    console.log('Creating WebGL renderer with canvas:', canvas);
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    
    // Validate renderer was created successfully
    if (!renderer) {
      throw new Error('Failed to create WebGL renderer');
    }
    
    console.log('Renderer created successfully:', renderer);
    
    // Now safely call setSize
    renderer.setSize(config.width, config.height, false);
    renderer.setPixelRatio(Math.min(2, 2)); // Fixed devicePixelRatio for worker
    
    // Create ring (torus) geometry and material
    const geometry = new THREE.TorusGeometry(1.0, 0.35, 64, 128);
    
    // Create shader material for the orb effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        hue: { value: config.hue / 360 },
        hoverIntensity: { value: config.hoverIntensity },
        mouse: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float hue;
        uniform float hoverIntensity;
        uniform vec2 mouse;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          vec3 normal = normalize(vNormal);
          
          // Base color with hue
          vec3 baseColor = hsv2rgb(vec3(hue, 0.8, 0.9));
          
          // Fresnel effect
          float fresnel = pow(1.0 - dot(normal, vec3(0.0, 0.0, 1.0)), 2.0);
          
          // Animated glow
          float glow = sin(time * 2.0 + vPosition.x * 3.0) * 0.1 + 0.9;
          
          // Mouse interaction
          float mouseEffect = 1.0 + hoverIntensity * 0.5;
          
          vec3 finalColor = baseColor * glow * mouseEffect;
          finalColor += fresnel * 0.3;
          
          gl_FragColor = vec4(finalColor, 0.8 + fresnel * 0.2);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    orb = new THREE.Mesh(geometry, material);
    scene.add(orb);
    
    // Start animation loop
    animate();
    
    // Notify main thread that initialization is complete
    self.postMessage({ type: 'initialized' });
    
  } catch (error) {
    console.error('Error initializing orb:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

function animate() {
  if (!renderer || !scene || !camera) return;
  
  animationId = requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;
  
  // Update orb material uniforms
  if (orb && orb.material && orb.material.uniforms) {
    orb.material.uniforms.time.value = time;
    orb.material.uniforms.mouse.value.set(mouseX, mouseY);
    orb.material.uniforms.hoverIntensity.value = config.hoverIntensity;
    orb.material.uniforms.hue.value = config.hue / 360;
  }
  
  // Rotate orb
  if (orb) {
    orb.rotation.x = time * 0.1;
    orb.rotation.y = time * 0.15;
    
    if (config.rotateOnHover && config.hoverIntensity > 0) {
      orb.rotation.x += config.hoverIntensity * 0.02;
      orb.rotation.y += config.hoverIntensity * 0.02;
    }
  }
  
  renderer.render(scene, camera);
}

function updateConfig(newConfig) {
  console.log('updateConfig called with:', newConfig);
  
  // Ensure config exists
  config = ensureConfig();
  console.log('Config before update:', config);
  
  // Validate input
  if (!newConfig || typeof newConfig !== 'object') {
    console.warn('Invalid config provided to updateConfig:', newConfig);
    return;
  }
  
  // Merge configs safely
  config = { ...config, ...newConfig };
  console.log('Config after merge:', config);
  
  // Ensure width and height are valid numbers
  if (typeof config.width !== 'number' || config.width <= 0) {
    console.warn('Invalid width in config, using default:', config.width);
    config.width = 400;
  }
  if (typeof config.height !== 'number' || config.height <= 0) {
    console.warn('Invalid height in config, using default:', config.height);
    config.height = 400;
  }
  
  console.log('Final config after validation:', config);
  
  if (renderer) {
    renderer.setSize(config.width, config.height, false);
  }
  
  if (camera) {
    camera.aspect = config.width / config.height;
    camera.updateProjectionMatrix();
  }
}

function updateMouse(x, y) {
  mouseX = x;
  mouseY = y;
}

function resize(width, height) {
  console.log('resize called with:', width, height);
  
  // Validate parameters
  if (typeof width !== 'number' || width <= 0) {
    console.warn('Invalid width provided to resize:', width);
    width = 400;
  }
  if (typeof height !== 'number' || height <= 0) {
    console.warn('Invalid height provided to resize:', height);
    height = 400;
  }
  
  // Ensure config exists
  config = ensureConfig();
  console.log('Config before resize:', config);
  
  config.width = width;
  config.height = height;
  
  console.log('Config after resize:', config);
  
  if (renderer) {
    renderer.setSize(width, height, false);
  }
  
  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function destroy() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  
  if (orb) {
    if (orb.geometry) orb.geometry.dispose();
    if (orb.material) orb.material.dispose();
    orb = null;
  }
  
  scene = null;
  camera = null;
}

// Message handler
self.onmessage = function(e) {
  console.log('Worker received message:', e.data);
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'init':
        console.log('Init message data:', data);
        if (data && data.canvas) {
          // Extract canvas and config from data
          const { canvas, ...initialConfig } = data;
          console.log('Canvas:', canvas);
          console.log('Initial config:', initialConfig);
          console.log('Config before init:', config);
          initOrb(canvas, initialConfig);
        } else {
          throw new Error('Canvas not provided for initialization');
        }
        break;
        
      case 'update':
        console.log('Update message data:', data);
        if (data) {
          updateConfig(data);
        }
        break;
        
      case 'mouse':
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          updateMouse(data.x, data.y);
        }
        break;
        
      case 'resize':
        console.log('Resize message data:', data);
        if (data && data.width && data.height) {
          resize(data.width, data.height);
        }
        break;
        
      case 'destroy':
        destroy();
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    console.error('Error stack:', error.stack);
    self.postMessage({ type: 'error', error: error.message });
  }
};