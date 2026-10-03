// GitHub Pages serves 404.html for unknown paths; reuse the app shell so deep links work.
import { copyFileSync } from 'node:fs';

const dir = 'dist/game-2048/browser';
copyFileSync(`${dir}/index.html`, `${dir}/404.html`);
