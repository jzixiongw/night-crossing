/* The Claude artifact host injects `window.claude` for cloud save and hot-reload.
   It is absent in a normal Vite build, so every use is guarded and the game falls
   back to localStorage. See state/save.ts. */
interface ClaudeHost {
  use(name: 'db' | 'user'): Promise<any>;
  hot?: {
    data?: any;
    ready?(fn: (data: any) => void): void;
    snapshot?(fn: () => any): void;
  };
}
interface Window { claude?: ClaudeHost; }
