#!/usr/bin/env node
// Convert public/appicon.svg into PNGs (192x192, 512x512)
const fs = require("fs");
const path = require("path");
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  // sharp not available, will fallback to resvg
}

const root = process.cwd();
const publicDir = path.join(root, "public");
const srcSvg = path.join(publicDir, "appicon.svg");

const outputs = [
  { size: 192, file: "appicon-192.png" },
  { size: 512, file: "appicon-512.png" },
];

async function main() {
  if (!fs.existsSync(srcSvg)) {
    console.error(`Source SVG not found: ${srcSvg}`);
    process.exit(1);
  }

  if (sharp) {
    for (const { size, file } of outputs) {
      const outPath = path.join(publicDir, file);
      console.log(`Generating ${file} (${size}x${size}) with sharp...`);
      try {
        const image = sharp(srcSvg, { density: Math.max(72, size) });
        await image
          .resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(outPath);
      } catch (err) {
        console.error(`Failed to generate ${file}:`, err);
        process.exitCode = 1;
      }
    }
  } else {
    console.log("sharp not available, falling back to @resvg/resvg-js (WASM)");
    const { Resvg } = require("@resvg/resvg-js");
    const svg = fs.readFileSync(srcSvg, "utf8");
    for (const { size, file } of outputs) {
      const outPath = path.join(publicDir, file);
      console.log(`Generating ${file} (${size}x${size}) with resvg...`);
      try {
        const resvg = new Resvg(svg, {
          fitTo: { mode: "width", value: size },
          background: "rgba(0,0,0,0)",
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();
        fs.writeFileSync(outPath, pngBuffer);
      } catch (err) {
        console.error(`Failed to generate ${file}:`, err);
        process.exitCode = 1;
      }
    }
  }

  console.log("Icon generation complete.");
}

main();
