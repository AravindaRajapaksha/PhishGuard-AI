import "@testing-library/jest-dom";

// Polyfill ResizeObserver for Recharts in jsdom
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
