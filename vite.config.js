import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({ base: './', build: { manifest: true, chunkSizeWarningLimit: 1600, rollupOptions: { input: { retro: fileURLToPath(new URL('./index.html',import.meta.url)), juego: fileURLToPath(new URL('./juego/index.html',import.meta.url)) } } } });
