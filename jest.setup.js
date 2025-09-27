import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: {},
      drawingBufferWidth: 300,
      drawingBufferHeight: 150,
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      getShaderPrecisionFormat: jest.fn(() => ({
        precision: 1,
        rangeMin: 1,
        rangeMax: 1,
      })),
    }
  }
  return null
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16))
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id))

// Mock performance
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
}

// Suppress console warnings for tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is deprecated') ||
     args[0].includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return
  }
  originalWarn.call(console, ...args)
}