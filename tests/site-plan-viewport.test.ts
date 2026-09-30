import { expect, it } from "bun:test";

const viewportModule = await import("../apps/web/src/features/site-plan/hooks/use-site-plan-viewport.js");
const observeContainer = (viewportModule as unknown as Record<string, unknown>).observeSitePlanContainer as
  ((element: HTMLDivElement | null, onResize: (size: { w: number; h: number }) => void) => () => void) | undefined;

it("observes the canvas after it mounts following the loading state", () => {
  expect(typeof observeContainer).toBe("function");
  if (!observeContainer) return;

  const originalResizeObserver = globalThis.ResizeObserver;
  let resize: ResizeObserverCallback | undefined;
  let observed: Element | null = null;
  let disconnected = false;
  class TestResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resize = callback;
    }
    observe(element: Element) {
      observed = element;
    }
    unobserve() {}
    disconnect() {
      disconnected = true;
    }
    takeRecords(): ResizeObserverEntry[] {
      return [];
    }
  }

  globalThis.ResizeObserver = TestResizeObserver;
  try {
    let size = { w: 0, h: 0 };
    const setSize = (next: { w: number; h: number }) => {
      size = next;
    };
    observeContainer(null, setSize)();

    const element = {} as HTMLDivElement;
    const disconnect = observeContainer(element, setSize);
    expect(observed).toBe(element);
    resize?.([{ contentRect: { width: 800, height: 520 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(size).toEqual({ w: 800, h: 520 });
    disconnect();
    expect(disconnected).toBe(true);
  } finally {
    globalThis.ResizeObserver = originalResizeObserver;
  }
});
