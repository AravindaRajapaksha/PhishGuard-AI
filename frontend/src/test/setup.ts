import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for Recharts in jsdom
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
