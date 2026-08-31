/**
 * 从 SVG 生成 PWA / 桌面图标 PNG（需先 pip install cairosvg）
 * 用法: node scripts/generate-icons.mjs
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");

const jobs = [
  { svg: "icon.svg", out: "icon-512.png", size: 512 },
  { svg: "icon.svg", out: "icon-192.png", size: 192 },
  { svg: "icon-maskable.svg", out: "icon-512-maskable.png", size: 512 },
  { svg: "icon-maskable.svg", out: "icon-192-maskable.png", size: 192 },
  { svg: "icon.svg", out: "apple-touch-icon.png", size: 180 },
];

for (const { svg, out, size } of jobs) {
  const input = path.join(iconsDir, svg);
  const output = path.join(iconsDir, out);
  execFileSync("cairosvg", [input, "-o", output, "-W", String(size), "-H", String(size)], {
    stdio: "inherit",
  });
  console.log(`✓ ${out} (${size}px)`);
}
