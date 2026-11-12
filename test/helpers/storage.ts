type GlobalWithWindow = typeof globalThis & { window?: unknown };

const undoStack: unknown[] = [];

/**
 * Instala un `window.localStorage` en memoria para los tests que no corren en
 * navegador. `restore()` devuelve el globalThis a su estado anterior y es
 * idempotente, para poder llamarlo también desde `afterEach`.
 */
export function installMemoryStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  const target = globalThis as GlobalWithWindow;
  undoStack.push(target.window);
  target.window = { localStorage };

  let restored = false;
  return {
    store,
    restore() {
      if (restored) return;
      restored = true;
      const previous = undoStack.pop();
      if (previous === undefined) delete target.window;
      else target.window = previous;
    },
  };
}