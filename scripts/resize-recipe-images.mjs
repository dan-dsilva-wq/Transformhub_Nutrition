#!/usr/bin/env node
/**
 * Resize all photos in public/recipes/ to 800px wide max, JPEG q=80.
 * Idempotent — re-running on already-resized files just re-encodes them at the
 * same quality.
 *
 * Usage:
 *   node scripts/resize-recipe-images.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PHOTO_DIR = path.join(ROOT, "public/recipes");

const MAX_WIDTH = 800;
const QUALITY = 80;

async function main() {
  const files = fs
    .readdirSync(PHOTO_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  let beforeBytes = 0;
  let afterBytes = 0;
  let i = 0;

  for (const file of files) {
    i += 1;
    const full = path.join(PHOTO_DIR, file);
    const stat = fs.statSync(full);
    beforeBytes += stat.size;

    process.stdout.write(`[${i}/${files.length}] ${file} ... `);

    try {
      const buf = await sharp(full)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();

      // sharp can't write to the same file it's reading; write to .tmp then rename.
      const tmp = full + ".tmp";
      fs.writeFileSync(tmp, buf);
      // Force .jpg extension so the file matches recipe-images.json (which we
      // wrote with .jpg even when the source was .jpeg/.png).
      const finalPath = full.replace(/\.(jpe?g|png|webp)$/i, ".jpg");
      if (fs.existsSync(finalPath) && finalPath !== full) fs.unlinkSync(finalPath);
      fs.renameSync(tmp, finalPath);
      if (full !== finalPath && fs.existsSync(full)) fs.unlinkSync(full);

      afterBytes += buf.length;
      const pct = Math.round((1 - buf.length / stat.size) * 100);
      console.log(`${(stat.size / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB  (-${pct}%)`);
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }

  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log("");
  console.log(`Total before: ${mb(beforeBytes)} MB`);
  console.log(`Total after:  ${mb(afterBytes)} MB`);
  console.log(`Saved:        ${mb(beforeBytes - afterBytes)} MB (${Math.round((1 - afterBytes / beforeBytes) * 100)}% smaller)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
