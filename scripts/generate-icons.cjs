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
let toIco = null;
try {
  toIco = require("to-ico");
} catch (e) {
  // optional
}

const root = process.cwd();
const publicDir = path.join(root, "public");
const srcSvg = path.join(publicDir, "appicon.svg");

const outputs = [
  { size: 16, file: "favicon-16x16.png" },
  { size: 32, file: "favicon-32x32.png" },
  { size: 180, file: "apple-touch-icon.png" },
  { size: 192, file: "appicon-192.png" },
  { size: 512, file: "appicon-512.png" },
  // Maskable can reuse 512 if you don't have a special safe-zone version
  { size: 512, file: "appicon-maskable-512.png" },
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
  // Create favicon.ico if possible
  if (toIco) {
    try {
      const icoPath = path.join(publicDir, "favicon.ico");
      const png16 = fs.readFileSync(path.join(publicDir, "favicon-16x16.png"));
      const png32 = fs.readFileSync(path.join(publicDir, "favicon-32x32.png"));
      const buf = await toIco([png16, png32]);
      fs.writeFileSync(icoPath, buf);
      console.log("favicon.ico generated");
      // Also copy to app route so /favicon.ico served by app is updated
      const appFaviconPath = path.join(root, "src", "app", "favicon.ico");
      try {
        fs.copyFileSync(icoPath, appFaviconPath);
        console.log("src/app/favicon.ico updated");
      } catch (e) {
        console.warn("Could not update src/app/favicon.ico:", e.message);
      }
    } catch (e) {
      console.warn("Could not generate favicon.ico:", e.message);
    }
  } else {
    console.log("to-ico not installed, skipping favicon.ico");
  }
}

main();
