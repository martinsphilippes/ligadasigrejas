// Gera os ícones do app (cruz dourada + bola de futsal) em todos os tamanhos
// necessários para PWA, favicon e iOS. Executar: node scripts/generate-icons.mjs

import sharp from "sharp";
import { mkdirSync } from "node:fs";

/**
 * @param {number} contentScale escala do conteúdo (1 = normal; <1 para maskable)
 * @param {boolean} rounded cantos arredondados (false para maskable, que é full-bleed)
 */
function iconSvg(contentScale = 1, rounded = true) {
  const s = contentScale;
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="30%" cy="18%" r="95%">
      <stop offset="0%" stop-color="#1f7f51"/>
      <stop offset="55%" stop-color="#14432f"/>
      <stop offset="100%" stop-color="#0a251a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5c451"/>
      <stop offset="100%" stop-color="#d1951a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="url(#bg)"/>
  <g transform="translate(256,256) scale(${s}) translate(-256,-256)">
    <!-- cruz dourada -->
    <g fill="url(#gold)">
      <rect x="220" y="48" width="72" height="320" rx="16"/>
      <rect x="152" y="124" width="208" height="72" rx="16"/>
    </g>
    <!-- brilho sutil na cruz -->
    <rect x="228" y="56" width="16" height="304" rx="8" fill="#ffffff" opacity="0.28"/>
    <!-- bola de futsal -->
    <g transform="translate(256,362)">
      <circle r="94" fill="#ffffff"/>
      <circle r="94" fill="none" stroke="#0a251a" stroke-width="10"/>
      <polygon points="0,-40 38,-12 23,34 -23,34 -38,-12" fill="#0a251a"/>
      <g stroke="#0a251a" stroke-width="9" fill="none" stroke-linecap="round">
        <path d="M0,-40 L0,-90"/>
        <path d="M38,-12 L86,-30"/>
        <path d="M23,34 L54,74"/>
        <path d="M-23,34 L-54,74"/>
        <path d="M-38,-12 L-86,-30"/>
      </g>
      <!-- reflexo -->
      <circle cx="-34" cy="-48" r="20" fill="#ffffff" opacity="0.5"/>
    </g>
  </g>
</svg>`;
}

async function render(svg, size, path) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(path);
  console.log(`✓ ${path} (${size}x${size})`);
}

mkdirSync("public/icons", { recursive: true });

const normal = iconSvg(1, true);
const maskable = iconSvg(0.76, false); // conteúdo dentro da zona segura do Android

await render(normal, 512, "public/icons/icon-512.png");
await render(normal, 192, "public/icons/icon-192.png");
await render(maskable, 512, "public/icons/icon-maskable-512.png");
await render(maskable, 192, "public/icons/icon-maskable-192.png");
await render(normal, 512, "src/app/icon.png"); // favicon servido pelo Next
await render(iconSvg(1, false), 180, "src/app/apple-icon.png"); // iOS (o sistema arredonda)

console.log("Ícones gerados.");
