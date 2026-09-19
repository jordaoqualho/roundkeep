import { execSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

// 1. Master Favicon SVG (Transparent, adaptive for dark/light browser tabs)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    path, circle { fill: #3ecf8e; }
    @media (prefers-color-scheme: light) {
      path, circle { fill: #00c573; }
    }
  </style>
  <path fill-rule="evenodd" d="M8 12 H20 V19 H26 V12 H38 V19 H44 V12 H56 V35 C56 48 32 58 32 58 C32 58 8 48 8 35 Z M32 23.5 A10.5 10.5 0 1 0 32.001 23.5 Z" fill="#3ecf8e"/>
  <circle cx="32" cy="34" r="4.5" fill="#3ecf8e"/>
  <path d="M30 34 H34 L32 25 Z" fill="#3ecf8e"/>
</svg>
`;

writeFileSync(resolve(root, "public/favicon.svg"), faviconSvg);
console.log("✓ Updated public/favicon.svg");

// 2. Master App Icon SVG (512x512 on #121212 Obsidian Canvas with safe zone for Apple/PWA)
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#121212"/>
  <g transform="translate(96, 96) scale(5)">
    <path fill-rule="evenodd" d="M8 12 H20 V19 H26 V12 H38 V19 H44 V12 H56 V35 C56 48 32 58 32 58 C32 58 8 48 8 35 Z M32 23.5 A10.5 10.5 0 1 0 32.001 23.5 Z" fill="#3ecf8e"/>
    <circle cx="32" cy="34" r="4.5" fill="#3ecf8e"/>
    <path d="M30 34 H34 L32 25 Z" fill="#3ecf8e"/>
  </g>
</svg>
`;

const tempAppSvgPath = resolve(root, "temp-app-icon.svg");
writeFileSync(tempAppSvgPath, appIconSvg);

// 3. Rasterize standard icons using native macOS sips
const targets = [
  // Browser tabs & Google SERP (from transparent favicon.svg)
  { src: resolve(root, "public/favicon.svg"), out: "public/favicon-16x16.png", size: 16 },
  { src: resolve(root, "public/favicon.svg"), out: "public/favicon-32x32.png", size: 32 },
  { src: resolve(root, "public/favicon.svg"), out: "public/favicon-48x48.png", size: 48 },
  // Apple iOS Safari & PWA (from solid dark app-icon)
  { src: tempAppSvgPath, out: "public/apple-touch-icon.png", size: 180 },
  { src: tempAppSvgPath, out: "public/icon-192.png", size: 192 },
  { src: tempAppSvgPath, out: "public/icon-512.png", size: 512 },
];

for (const t of targets) {
  const outPath = resolve(root, t.out);
  execSync(`sips -s format png -z ${t.size} ${t.size} "${t.src}" --out "${outPath}"`, { stdio: "ignore" });
  console.log(`✓ Generated ${t.out} (${t.size}x${t.size})`);
}

unlinkSync(tempAppSvgPath);

// 4. Web App Manifest for PWA & Google Android
const manifest = {
  name: "RoundKeep",
  short_name: "RoundKeep",
  description: "Tactical D&D 5e combat table and initiative tracker.",
  start_url: "/",
  display: "standalone",
  theme_color: "#121212",
  background_color: "#121212",
  icons: [
    {
      src: "/favicon-48x48.png",
      sizes: "48x48",
      type: "image/png",
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};

writeFileSync(resolve(root, "public/manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
console.log("✓ Created public/manifest.webmanifest");
