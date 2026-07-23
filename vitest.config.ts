import { resolve } from 'node:path';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    // Server-only modules (marked via the `server-only` package) resolve to
    // a no-op here, mirroring how Next.js's RSC layer treats them at build
    // time — the alternative is every test that touches a server service
    // module throwing "cannot be imported from a Client Component".
    //
    // `server-only` throws unless resolved under the react-server condition,
    // and several services import it. Vite replaces array config rather than
    // merging it, so the defaults must be spread back in explicitly —
    // otherwise every package in the test run loses `module`/`node`/
    // `development` resolution and silently falls back to `default`.
    conditions: ['react-server', ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: ['react-server', ...defaultServerConditions],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
