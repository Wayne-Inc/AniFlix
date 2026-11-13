import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "public/favicon.png";
const OUT_DIR = "public/icons";

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

fs.mkdirSync(OUT_DIR, { recursive: true });

const image = sharp(SRC);

await Promise.all(
  SIZES.map(async (size) => {
    await image
      .clone()
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}x${size}.png`));
  }),
);

// Maskable icon (safe zone) at 512x512
await image
  .clone()
  .resize(448, 448, { fit: "inside" })
  .extend({ top: 32, bottom: 32, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(OUT_DIR, "icon-512x512-maskable.png"));

// Apple touch icon
await image
  .clone()
  .resize(180, 180, { fit: "cover" })
  .png()
  .toFile(path.join(OUT_DIR, "apple-touch-icon.png"));

console.log("PWA icons generated in", OUT_DIR);
