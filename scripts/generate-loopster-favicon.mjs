import { writeFileSync } from "node:fs";

const size = 32;
const scale = 4;
const highSize = size * scale;
const pixels = new Uint8ClampedArray(highSize * highSize * 4);

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= highSize || y >= highSize) return;
  const index = (y * highSize + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function strokeCircle(cx, cy, radius, color) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(x, y, color);
    }
  }
}

function strokeLine(x1, y1, x2, y2, width, color) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance * 2));
  const radius = width / 2;
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    strokeCircle(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress, radius, color);
  }
}

function cubic(from, controlA, controlB, to, color, width) {
  let previous = from;
  for (let index = 1; index <= 32; index += 1) {
    const t = index / 32;
    const inverse = 1 - t;
    const point = {
      x: inverse ** 3 * from.x + 3 * inverse ** 2 * t * controlA.x + 3 * inverse * t ** 2 * controlB.x + t ** 3 * to.x,
      y: inverse ** 3 * from.y + 3 * inverse ** 2 * t * controlA.y + 3 * inverse * t ** 2 * controlB.y + t ** 3 * to.y,
    };
    strokeLine(previous.x, previous.y, point.x, point.y, width, color);
    previous = point;
  }
}

const background = [9, 11, 16, 255];
for (let y = 0; y < highSize; y += 1) {
  for (let x = 0; x < highSize; x += 1) {
    const edge = Math.min(x, y, highSize - x - 1, highSize - y - 1);
    const radius = 5 * scale;
    if (edge >= radius || Math.hypot(Math.max(radius - x, 0), Math.max(radius - y, 0)) <= radius) {
      setPixel(x, y, background);
    }
  }
}

const white = [255, 255, 255, 255];
const cyan = [103, 232, 249, 255];
const stroke = 3.2 * scale;
strokeLine(9 * scale, 6 * scale, 9 * scale, 20 * scale, stroke, white);
strokeLine(9 * scale, 20 * scale, 16 * scale, 20 * scale, stroke, white);
cubic({ x: 8 * scale, y: 16 * scale }, { x: 10 * scale, y: 10 * scale }, { x: 14 * scale, y: 10 * scale }, { x: 16 * scale, y: 16 * scale }, cyan, stroke);
cubic({ x: 16 * scale, y: 16 * scale }, { x: 18 * scale, y: 22 * scale }, { x: 22 * scale, y: 22 * scale }, { x: 24 * scale, y: 16 * scale }, cyan, stroke);
cubic({ x: 24 * scale, y: 16 * scale }, { x: 22 * scale, y: 10 * scale }, { x: 18 * scale, y: 10 * scale }, { x: 16 * scale, y: 16 * scale }, cyan, stroke);
cubic({ x: 16 * scale, y: 16 * scale }, { x: 14 * scale, y: 22 * scale }, { x: 10 * scale, y: 22 * scale }, { x: 8 * scale, y: 16 * scale }, cyan, stroke);

const pixelBytes = size * size * 4;
const maskBytes = size * size / 8;
const output = Buffer.alloc(22 + 40 + pixelBytes + maskBytes);
output.writeUInt16LE(0, 0);
output.writeUInt16LE(1, 2);
output.writeUInt16LE(1, 4);
output.writeUInt8(size, 6);
output.writeUInt8(size, 7);
output.writeUInt8(0, 8);
output.writeUInt8(0, 9);
output.writeUInt16LE(1, 10);
output.writeUInt16LE(32, 12);
output.writeUInt32LE(output.length - 22, 14);
output.writeUInt32LE(22, 18);
output.writeUInt32LE(40, 22);
output.writeInt32LE(size, 26);
output.writeInt32LE(size * 2, 30);
output.writeUInt16LE(1, 34);
output.writeUInt16LE(32, 36);
output.writeUInt32LE(0, 38);
output.writeUInt32LE(pixelBytes, 42);
output.writeInt32LE(0, 46);
output.writeInt32LE(0, 50);
output.writeUInt32LE(0, 54);
output.writeUInt32LE(0, 58);

let offset = 62;
for (let y = size - 1; y >= 0; y -= 1) {
  for (let x = 0; x < size; x += 1) {
    const highX = Math.min(highSize - 1, x * scale + Math.floor(scale / 2));
    const highY = Math.min(highSize - 1, y * scale + Math.floor(scale / 2));
    const source = (highY * highSize + highX) * 4;
    output[offset++] = pixels[source + 2];
    output[offset++] = pixels[source + 1];
    output[offset++] = pixels[source];
    output[offset++] = pixels[source + 3];
  }
}
output.fill(0, offset);
writeFileSync("public/favicon.ico", output);
