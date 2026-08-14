const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcImage = 'C:/Users/omarz/.gemini/antigravity-ide/brain/8031b17b-a5ed-4c6a-bf60-bc9db4d79f2a/.user_uploaded/media_1786668783267.jpg';
const outDir = path.resolve(__dirname, '..', 'assets', 'emojis');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Bounding boxes [left, top, width, height] for each icon in the 1024x571 source image
const iconBoxes = {
  // Row 1
  play: { left: 45, top: 32, width: 88, height: 95 },
  pause: { left: 195, top: 32, width: 85, height: 95 },
  stop: { left: 330, top: 32, width: 90, height: 95 },
  skip: { left: 460, top: 32, width: 110, height: 95 },
  previous: { left: 730, top: 32, width: 112, height: 95 },
  volume_up: { left: 875, top: 32, width: 120, height: 95 },

  // Row 2
  volume_down: { left: 25, top: 155, width: 120, height: 105 },
  shuffle: { left: 335, top: 155, width: 110, height: 105 },
  repeat: { left: 470, top: 155, width: 115, height: 105 },
  autoplay: { left: 865, top: 155, width: 140, height: 105 },

  // Row 3
  remove_sub_controller: { left: 30, top: 288, width: 115, height: 100 },
  main_controller: { left: 190, top: 288, width: 115, height: 100 },
  select_sub_controller: { left: 460, top: 288, width: 120, height: 100 },
  seek_back: { left: 720, top: 288, width: 110, height: 100 },
  seek_forward: { left: 880, top: 288, width: 110, height: 100 },

  // Row 4
  connect: { left: 30, top: 418, width: 115, height: 105 },
  delete_queue: { left: 200, top: 418, width: 100, height: 105 },
  enzocord: { left: 455, top: 418, width: 115, height: 105 },
  how_to_use: { left: 735, top: 418, width: 85, height: 105 },
  queue: { left: 880, top: 418, width: 110, height: 105 },
};

// Aliases mapping
const aliases = {
  clear_queue: 'delete_queue',
  sub_controller: 'select_sub_controller',
  set_sub: 'select_sub_controller',
  remove_sub: 'remove_sub_controller',
  help: 'how_to_use',
  disconnect: 'connect',
};

async function processIcon(name, box) {
  // 1. Extract crop with 3 channels
  const { data, info } = await sharp(srcImage)
    .extract({
      left: Math.max(0, box.left),
      top: Math.max(0, box.top),
      width: box.width,
      height: box.height,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const rgba = Buffer.alloc(w * h * 4);

  // Background color reference (dark purple/black)
  const bgR = 14, bgG = 10, bgB = 26;

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const maxVal = Math.max(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha = 0;
    if (maxVal > 30 || lum > 25) {
      if (maxVal >= 65) {
        alpha = 255;
      } else {
        // Smooth transition between 30 and 65
        alpha = Math.round(((maxVal - 30) / (65 - 30)) * 255);
      }
    }

    // Boost purple neon colors slightly for stunning vibrant Discord display
    let newR = r;
    let newG = g;
    let newB = b;

    if (alpha > 0) {
      // Color correction: remove dark bg tint and scale up vibrant purple
      newR = Math.min(255, Math.max(0, Math.round((r - bgR * (1 - alpha / 255)) * 1.15)));
      newG = Math.min(255, Math.max(0, Math.round((g - bgG * (1 - alpha / 255)) * 1.15)));
      newB = Math.min(255, Math.max(0, Math.round((b - bgB * (1 - alpha / 255)) * 1.15)));
    }

    rgba[i * 4] = newR;
    rgba[i * 4 + 1] = newG;
    rgba[i * 4 + 2] = newB;
    rgba[i * 4 + 3] = alpha;
  }

  // 2. Resize and fit into standard 128x128 PNG centered with transparent padding
  const targetBuffer = await sharp(rgba, {
    raw: {
      width: w,
      height: h,
      channels: 4,
    },
  })
    .resize(112, 112, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(128, 128, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  const outPath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(outPath, targetBuffer);
  console.log(`✓ Extracted: assets/emojis/${name}.png (${targetBuffer.length} bytes)`);
}

async function run() {
  console.log('--- Extracting exact glowing purple icons from uploaded user image ---');
  for (const [name, box] of Object.entries(iconBoxes)) {
    await processIcon(name, box);
  }

  // Create alias copies
  for (const [aliasName, targetName] of Object.entries(aliases)) {
    const targetPath = path.join(outDir, `${targetName}.png`);
    const aliasPath = path.join(outDir, `${aliasName}.png`);
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, aliasPath);
      console.log(`✓ Copied alias: assets/emojis/${aliasName}.png -> ${targetName}.png`);
    }
  }

  console.log('--- All emoji PNGs extracted and created successfully! ---');
}

run().catch(console.error);
