// Gera os ícones do app (cruz dourada + bola de futsal) em todos os tamanhos
// necessários para PWA, favicon e iOS. Executar: node scripts/generate-icons.mjs

import sharp from "sharp";
import { mkdirSync } from "node:fs";

/** Pontos de um pentágono regular. */
function pentagon(cx, cy, r, rotationDeg = -90) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = ((rotationDeg + i * 72) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * Bola estilizada (desenho original): gomo pentagonal central com costuras
 * radiais — visual limpo e vivo, com branco brilhante e reflexo marcante.
 */
function ballSvg() {
  const R = 94; // raio da bola
  const dark = "#16181d";
  const centerR = 40;

  // Costuras: dos vértices do pentágono até perto da borda
  let seams = "";
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const x1 = centerR * Math.cos(a);
    const y1 = centerR * Math.sin(a);
    const x2 = (R - 4) * Math.cos(a);
    const y2 = (R - 4) * Math.sin(a);
    seams += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }

  return `
    <g transform="translate(256,362)">
      <circle r="${R}" fill="url(#ballGrad)"/>
      <g clip-path="url(#ballClip)">
        <polygon points="${pentagon(0, 0, centerR)}" fill="${dark}" stroke="${dark}" stroke-width="10" stroke-linejoin="round"/>
        <g stroke="${dark}" stroke-width="9" stroke-linecap="round">${seams}</g>
        <!-- brilho vivo no topo -->
        <ellipse cx="-34" cy="-50" rx="36" ry="26" fill="url(#ballShine)" transform="rotate(-32 -34 -50)"/>
      </g>
      <circle r="${R}" fill="none" stroke="${dark}" stroke-width="9"/>
    </g>`;
}

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
    <radialGradient id="ballGrad" cx="36%" cy="28%" r="90%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="75%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e3e3df"/>
    </radialGradient>
    <radialGradient id="ballShade" cx="36%" cy="28%" r="98%">
      <stop offset="80%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.18"/>
    </radialGradient>
    <radialGradient id="ballShine" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ballClip"><circle cx="0" cy="0" r="92"/></clipPath>
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
    ${ballSvg()}
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
