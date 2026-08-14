const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create minimal valid PNG with RGBA buffer
function createPNG(width, height, getPixelRGBA) {
  // Raw scanlines: each line starts with filter byte 0
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0; // Filter byte 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      rawBytes[offset++] = r;
      rawBytes[offset++] = g;
      rawBytes[offset++] = b;
      rawBytes[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawBytes);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// Simple CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Icon generator with purple/violet circular gradient & icon patterns
function createIconRenderer(name) {
  return (x, y, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = w * 0.45;

    // Background transparent outside circle
    if (dist > radius) {
      return [0, 0, 0, 0];
    }

    // Border glow
    if (dist > radius - 2) {
      return [167, 139, 250, 255]; // #A78BFA
    }

    // Purple Gradient base (#8B5CF6 to #6D28D9)
    const factor = y / h;
    let r = Math.round(139 * (1 - factor * 0.3));
    let g = Math.round(92 * (1 - factor * 0.4));
    let b = Math.round(246 * (1 - factor * 0.2));
    let a = 255;

    // Inner symbol shapes
    const nx = (x - cx) / radius; // -1 to 1
    const ny = (y - cy) / radius; // -1 to 1

    let isSymbol = false;

    switch (name) {
      case 'play':
        // Triangle pointing right
        if (nx > -0.3 && nx < 0.45 && Math.abs(ny) < (0.45 - nx * 0.5)) isSymbol = true;
        break;
      case 'pause':
        // Two vertical bars
        if (Math.abs(ny) < 0.45 && ((nx > -0.35 && nx < -0.1) || (nx > 0.1 && nx < 0.35))) isSymbol = true;
        break;
      case 'stop':
        // Square
        if (Math.abs(nx) < 0.35 && Math.abs(ny) < 0.35) isSymbol = true;
        break;
      case 'skip':
        // Fast forward arrows + bar
        if ((nx > -0.4 && nx < 0.1 && Math.abs(ny) < (0.3 - nx * 0.4)) || (nx >= 0.1 && nx < 0.45 && Math.abs(ny) < (0.35 - (nx - 0.2) * 0.4)) || (nx > 0.35 && nx < 0.45 && Math.abs(ny) < 0.4)) isSymbol = true;
        break;
      case 'previous':
        // Rewind arrows + bar
        if ((nx < 0.4 && nx > -0.1 && Math.abs(ny) < (0.3 + nx * 0.4)) || (nx <= -0.1 && nx > -0.45 && Math.abs(ny) < (0.35 + (nx + 0.2) * 0.4)) || (nx < -0.35 && nx > -0.45 && Math.abs(ny) < 0.4)) isSymbol = true;
        break;
      case 'volume_up':
      case 'volume_down':
      case 'shuffle':
      case 'repeat':
      case 'queue':
      case 'sub_controller':
      case 'remove_sub_controller':
      case 'main_controller':
      case 'help':
      case 'enzocord':
      case 'seek_back':
      case 'seek_forward':
      case 'clear_queue':
      case 'autoplay':
      case 'disconnect':
      case 'connect':
      default:
        // Render stylized geometric center symbol
        const centerDist = Math.sqrt(nx * nx + ny * ny);
        if (centerDist < 0.35 && centerDist > 0.15) isSymbol = true;
        if (Math.abs(nx) < 0.08 && Math.abs(ny) < 0.38) isSymbol = true;
        if (Math.abs(ny) < 0.08 && Math.abs(nx) < 0.38) isSymbol = true;
        break;
    }

    if (isSymbol) {
      return [255, 255, 255, 255]; // Crisp white icon
    }

    return [r, g, b, a];
  };
}

const emojiNames = [
  'play',
  'pause',
  'stop',
  'skip',
  'previous',
  'volume_up',
  'volume_down',
  'shuffle',
  'repeat',
  'queue',
  'sub_controller',
  'select_sub_controller',
  'remove_sub_controller',
  'main_controller',
  'help',
  'how_to_use',
  'enzocord',
  'seek_back',
  'seek_forward',
  'clear_queue',
  'delete_queue',
  'autoplay',
  'disconnect',
  'connect',
];

const targetDir = path.join(__dirname, '..', 'assets', 'emojis');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const name of emojiNames) {
  const renderer = createIconRenderer(name);
  const pngBuffer = createPNG(128, 128, renderer);
  const filePath = path.join(targetDir, `${name}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated: assets/emojis/${name}.png (${pngBuffer.length} bytes)`);
}

console.log(`Successfully generated all ${emojiNames.length} emoji PNG assets!`);
