import '@testing-library/jest-dom'

jest.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key) => key,
  useFormatter: () => ({
    dateTime: (value) => String(value),
    number: (value) => String(value),
    relativeTime: (value) => String(value),
    list: (value) => String(value),
  }),
  NextIntlClientProvider: ({ children }) => children,
}))

// Mock IntersectionObserver
if (typeof global !== 'undefined' && typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
}

// Mock ResizeObserver
if (typeof global !== 'undefined' && typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
}

// Mock matchMedia
if (typeof window !== 'undefined') {
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
}

// Mock WebGL context
if (typeof HTMLCanvasElement !== 'undefined') {
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
}

// Mock requestAnimationFrame
if (typeof global !== 'undefined') {
  global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16))
  global.cancelAnimationFrame = jest.fn(id => clearTimeout(id))
}

// Mock performance
if (typeof global !== 'undefined') {
  global.performance = {
    ...global.performance,
    now: jest.fn(() => Date.now()),
  }
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
