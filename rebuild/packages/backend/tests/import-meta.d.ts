// The test bundler supplies glob; production backend code needs no Vite client types.
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
