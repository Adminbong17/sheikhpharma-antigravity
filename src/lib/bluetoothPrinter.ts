/**
 * MX05 / MXW01 Cat Printer Protocol
 * Based on https://github.com/dropalltables/catprinter
 * These printers use a proprietary bitmap-based protocol, NOT ESC/POS.
 * Service: 0000ae30, Control: ae01, Notify: ae02, Data: ae03
 */

declare global {
  interface Navigator { bluetooth: any; }
}

// ── CRC-8 (Polynomial 0x07, Init 0x00) ─────────────────────────────────
const CRC8_TABLE = [
  0x00,0x07,0x0E,0x09,0x1C,0x1B,0x12,0x15,0x38,0x3F,0x36,0x31,0x24,0x23,0x2A,0x2D,
  0x70,0x77,0x7E,0x79,0x6C,0x6B,0x62,0x65,0x48,0x4F,0x46,0x41,0x54,0x53,0x5A,0x5D,
  0xE0,0xE7,0xEE,0xE9,0xFC,0xFB,0xF2,0xF5,0xD8,0xDF,0xD6,0xD1,0xC4,0xC3,0xCA,0xCD,
  0x90,0x97,0x9E,0x99,0x8C,0x8B,0x82,0x85,0xA8,0xAF,0xA6,0xA1,0xB4,0xB3,0xBA,0xBD,
  0xC7,0xC0,0xC9,0xCE,0xDB,0xDC,0xD5,0xD2,0xFF,0xF8,0xF1,0xF6,0xE3,0xE4,0xED,0xEA,
  0xB7,0xB0,0xB9,0xBE,0xAB,0xAC,0xA5,0xA2,0x8F,0x88,0x81,0x86,0x93,0x94,0x9D,0x9A,
  0x27,0x20,0x29,0x2E,0x3B,0x3C,0x35,0x32,0x1F,0x18,0x11,0x16,0x03,0x04,0x0D,0x0A,
  0x57,0x50,0x59,0x5E,0x4B,0x4C,0x45,0x42,0x6F,0x68,0x61,0x66,0x73,0x74,0x7D,0x7A,
  0x89,0x8E,0x87,0x80,0x95,0x92,0x9B,0x9C,0xB1,0xB6,0xBF,0xB8,0xAD,0xAA,0xA3,0xA4,
  0xF9,0xFE,0xF7,0xF0,0xE5,0xE2,0xEB,0xEC,0xC1,0xC6,0xCF,0xC8,0xDD,0xDA,0xD3,0xD4,
  0x69,0x6E,0x67,0x60,0x75,0x72,0x7B,0x7C,0x51,0x56,0x5F,0x58,0x4D,0x4A,0x43,0x44,
  0x19,0x1E,0x17,0x10,0x05,0x02,0x0B,0x0C,0x21,0x26,0x2F,0x28,0x3D,0x3A,0x33,0x34,
  0x4E,0x49,0x40,0x47,0x52,0x55,0x5C,0x5B,0x76,0x71,0x78,0x7F,0x6A,0x6D,0x64,0x63,
  0x3E,0x39,0x30,0x37,0x22,0x25,0x2C,0x2B,0x06,0x01,0x08,0x0F,0x1A,0x1D,0x14,0x13,
  0xAE,0xA9,0xA0,0xA7,0xB2,0xB5,0xBC,0xBB,0x96,0x91,0x98,0x9F,0x8A,0x8D,0x84,0x83,
  0xDE,0xD9,0xD0,0xD7,0xC2,0xC5,0xCC,0xCB,0xE6,0xE1,0xE8,0xEF,0xFA,0xFD,0xF4,0xF3,
];

function crc8(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = CRC8_TABLE[(crc ^ data[i]) & 0xFF];
  }
  return crc;
}

// ── Protocol constants ──────────────────────────────────────────────────
const PRINTER_WIDTH = 384;
const BYTES_PER_ROW = PRINTER_WIDTH / 8; // 48
const MIN_DATA_BYTES = 90 * BYTES_PER_ROW; // 4320

const SERVICE_UUID = "0000ae30-0000-1000-8000-00805f9b34fb";
const SERVICE_UUID_ALT = "0000af30-0000-1000-8000-00805f9b34fb";
const CONTROL_UUID = "0000ae01-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID  = "0000ae02-0000-1000-8000-00805f9b34fb";
const DATA_UUID    = "0000ae03-0000-1000-8000-00805f9b34fb";

const CMD = {
  GET_STATUS: 0xA1,
  SET_INTENSITY: 0xA2,
  PRINT: 0xA9,
  PRINT_COMPLETE: 0xAA,
  FLUSH: 0xAD,
};

function createCommand(cmdId: number, payload: Uint8Array): Uint8Array {
  const len = payload.length;
  const header = [0x22, 0x21, cmdId & 0xFF, 0x00, len & 0xFF, (len >> 8) & 0xFF];
  const crcVal = crc8(payload);
  return new Uint8Array([...header, ...Array.from(payload), crcVal, 0xFF]);
}

// ── Notification handling ───────────────────────────────────────────────
const pendingResolvers = new Map<number, (payload: Uint8Array) => void>();

function handleNotification(event: any) {
  const data = new Uint8Array(event.target.value.buffer);
  if (data[0] !== 0x22 || data[1] !== 0x21) return;

  const cmdId = data[2];
  const len = data[4] | (data[5] << 8);
  const payload = data.slice(6, 6 + len);

  console.log(`[CAT] Notify cmd=0x${cmdId.toString(16)}, len=${len}`,
    Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '));

  const resolver = pendingResolvers.get(cmdId);
  if (resolver) {
    resolver(payload);
    pendingResolvers.delete(cmdId);
  }
}

function waitForNotification(cmdId: number, timeoutMs = 10000): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingResolvers.delete(cmdId);
      console.warn(`[CAT] Timeout waiting for 0x${cmdId.toString(16)}`);
      resolve(null); // Don't reject, just continue
    }, timeoutMs);

    pendingResolvers.set(cmdId, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// ── BLE connection ──────────────────────────────────────────────────────
let device: any = null;
let controlChar: any = null;
let dataChar: any = null;

async function connectPrinter() {
  if (device?.gatt?.connected && controlChar && dataChar) return;

  if (!navigator.bluetooth) {
    throw new Error("এই ব্রাউজার Web Bluetooth সাপোর্ট করে না। Chrome ব্যবহার করুন।");
  }

  // Try with service filter first, fallback to acceptAllDevices
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [SERVICE_UUID] },
        { services: [SERVICE_UUID_ALT] },
      ],
      optionalServices: [SERVICE_UUID, SERVICE_UUID_ALT],
    });
  } catch {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID, SERVICE_UUID_ALT],
    });
  }

  console.log("[CAT] Device:", device.name);

  device.addEventListener("gattserverdisconnected", () => {
    device = null; controlChar = null; dataChar = null;
    console.log("[CAT] Disconnected");
  });

  const server = await device.gatt.connect();

  // Try main UUID, then alternate
  let svc;
  try {
    svc = await server.getPrimaryService(SERVICE_UUID);
  } catch {
    svc = await server.getPrimaryService(SERVICE_UUID_ALT);
  }

  controlChar = await svc.getCharacteristic(CONTROL_UUID);
  dataChar = await svc.getCharacteristic(DATA_UUID);

  // Enable notifications
  const notifyChar = await svc.getCharacteristic(NOTIFY_UUID);
  await notifyChar.startNotifications();
  notifyChar.addEventListener("characteristicvaluechanged", handleNotification);

  console.log("[CAT] Connected & ready");
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Render invoice to bitmap ────────────────────────────────────────────
export interface BTInvoiceData {
  storeName: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  total: number;
  notes?: string;
}

function renderInvoiceToCanvas(data: BTInvoiceData): HTMLCanvasElement {
  const W = PRINTER_WIDTH;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  const ctx = canvas.getContext("2d")!;

  const lineHeight = 20;
  const smallLine = 16;
  const lines: Array<{ text: string; y: number; bold?: boolean; big?: boolean; center?: boolean; right?: string }> = [];
  let y = 10;

  lines.push({ text: data.storeName, y, bold: true, big: true, center: true }); y += 28;
  lines.push({ text: "INVOICE / RECEIPT", y, center: true }); y += lineHeight;
  lines.push({ text: data.invoiceNumber, y, center: true }); y += lineHeight;
  lines.push({ text: data.date, y, center: true }); y += lineHeight;
  lines.push({ text: "-".repeat(48), y }); y += smallLine;

  if (data.customerName) { lines.push({ text: `Name: ${data.customerName}`, y }); y += smallLine; }
  if (data.customerPhone) { lines.push({ text: `Phone: ${data.customerPhone}`, y }); y += smallLine; }
  if (data.customerAddress) { lines.push({ text: `Addr: ${data.customerAddress.slice(0, 40)}`, y }); y += smallLine; }
  if (data.paymentMethod) { lines.push({ text: `Pay: ${data.paymentMethod}`, y }); y += smallLine; }

  lines.push({ text: "-".repeat(48), y }); y += smallLine;

  for (const item of data.items) {
    lines.push({ text: item.name.slice(0, 30), y, bold: true }); y += smallLine;
    lines.push({ text: `  ${item.qty} x ${item.price}`, y, right: `${item.qty * item.price}Tk` }); y += smallLine;
  }

  lines.push({ text: "-".repeat(48), y }); y += smallLine;
  lines.push({ text: "Subtotal:", y, right: `${data.subtotal}Tk` }); y += smallLine;
  if (data.discount && data.discount > 0) {
    lines.push({ text: "Discount:", y, right: `-${data.discount}Tk` }); y += smallLine;
  }
  if (data.deliveryCharge && data.deliveryCharge > 0) {
    lines.push({ text: "Delivery:", y, right: `+${data.deliveryCharge}Tk` }); y += smallLine;
  }
  lines.push({ text: "-".repeat(48), y }); y += smallLine;
  lines.push({ text: "TOTAL:", y, bold: true, big: true, right: `${data.total}Tk` }); y += 28;

  if (data.notes) {
    lines.push({ text: "-".repeat(48), y }); y += smallLine;
    lines.push({ text: `Note: ${data.notes.slice(0, 40)}`, y }); y += smallLine;
  }

  lines.push({ text: "-".repeat(48), y }); y += smallLine;
  lines.push({ text: "Thank you!", y, center: true }); y += lineHeight;
  lines.push({ text: data.storeName, y, center: true }); y += lineHeight + 20;

  canvas.height = y;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, y);
  ctx.fillStyle = "black";

  for (const l of lines) {
    const fontSize = l.big ? 18 : 12;
    const weight = l.bold ? "bold" : "normal";
    ctx.font = `${weight} ${fontSize}px monospace`;

    if (l.center) {
      const w = ctx.measureText(l.text).width;
      ctx.fillText(l.text, (W - w) / 2, l.y);
    } else if (l.right) {
      ctx.fillText(l.text, 8, l.y);
      const rw = ctx.measureText(l.right).width;
      ctx.fillText(l.right, W - rw - 8, l.y);
    } else {
      ctx.fillText(l.text, 8, l.y);
    }
  }

  return canvas;
}

/** Convert canvas to 1-bit bitmap, rotate 180°, pad to minimum */
function canvasTo1bit(canvas: HTMLCanvasElement): { data: Uint8Array; lineCount: number } {
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;
  const lineCount = canvas.height;

  // Build boolean rows
  const rowsBool: boolean[][] = [];
  for (let row = 0; row < lineCount; row++) {
    const boolRow: boolean[] = new Array(PRINTER_WIDTH).fill(false);
    for (let col = 0; col < PRINTER_WIDTH; col++) {
      const pixelIdx = (row * canvas.width + col) * 4;
      const lum = 0.299 * pixels[pixelIdx] + 0.587 * pixels[pixelIdx + 1] + 0.114 * pixels[pixelIdx + 2];
      boolRow[col] = lum < 128;
    }
    rowsBool.push(boolRow);
  }

  // Rotate 180° (flip rows and reverse each row)
  const rotatedRows = rowsBool.reverse().map(row => row.slice().reverse());

  // Encode to bytes
  let buffer = new Uint8Array(0);
  for (const row of rotatedRows) {
    const rowBytes = new Uint8Array(BYTES_PER_ROW);
    for (let byteIdx = 0; byteIdx < BYTES_PER_ROW; byteIdx++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (row[byteIdx * 8 + bit]) {
          byteVal |= 1 << bit;
        }
      }
      rowBytes[byteIdx] = byteVal;
    }
    const newBuf = new Uint8Array(buffer.length + rowBytes.length);
    newBuf.set(buffer);
    newBuf.set(rowBytes, buffer.length);
    buffer = newBuf;
  }

  // Pad to minimum
  if (buffer.length < MIN_DATA_BYTES) {
    const padded = new Uint8Array(MIN_DATA_BYTES);
    padded.set(buffer);
    buffer = padded;
  }

  return { data: buffer, lineCount };
}

// ── Main print function ─────────────────────────────────────────────────
export async function printViaBluetooth(invoiceData: BTInvoiceData): Promise<void> {
  await connectPrinter();

  // 1. Render invoice as bitmap
  const canvas = renderInvoiceToCanvas(invoiceData);
  const { data: bitmapData, lineCount } = canvasTo1bit(canvas);
  console.log(`[CAT] Image: ${PRINTER_WIDTH}x${lineCount}, ${bitmapData.length} bytes`);

  // 2. Set intensity
  console.log("[CAT] Step 1: Set intensity");
  await controlChar.writeValueWithoutResponse(createCommand(CMD.SET_INTENSITY, Uint8Array.of(0x5D)));
  await sleep(50);

  // 3. Check status (A1) and wait for response
  console.log("[CAT] Step 2: Check status");
  await controlChar.writeValueWithoutResponse(createCommand(CMD.GET_STATUS, Uint8Array.of(0x00)));
  const statusPayload = await waitForNotification(CMD.GET_STATUS, 5000);

  if (statusPayload && statusPayload.length >= 13 && statusPayload[12] !== 0) {
    const errCode = statusPayload.length >= 14 ? statusPayload[13] : 0;
    throw new Error(`প্রিন্টার এরর কোড: ${errCode} (1/9=কাগজ নেই, 4=অতিরিক্ত গরম, 8=ব্যাটারি কম)`);
  }
  console.log("[CAT] Status OK");

  // 4. Send print request (A9) and wait for ACK
  console.log("[CAT] Step 3: Print request");
  const printPayload = new Uint8Array(4);
  printPayload[0] = lineCount & 0xFF;
  printPayload[1] = (lineCount >> 8) & 0xFF;
  printPayload[2] = 0x30;
  printPayload[3] = 0x00; // 1bpp mode
  await controlChar.writeValueWithoutResponse(createCommand(CMD.PRINT, printPayload));
  const printAck = await waitForNotification(CMD.PRINT, 5000);

  if (printAck && printAck[0] !== 0) {
    throw new Error(`প্রিন্ট রিকোয়েস্ট প্রত্যাখ্যান হয়েছে: ${printAck[0]}`);
  }
  console.log("[CAT] Print request accepted");

  // 5. Transfer image data in 48-byte chunks (one row at a time)
  console.log("[CAT] Step 4: Sending data...");
  const chunkSize = BYTES_PER_ROW; // 48 bytes per chunk
  let pos = 0;
  let chunkCount = 0;
  const totalChunks = Math.ceil(bitmapData.length / chunkSize);

  while (pos < bitmapData.length) {
    const chunk = bitmapData.slice(pos, pos + chunkSize);
    await dataChar.writeValueWithoutResponse(chunk);
    pos += chunk.length;
    chunkCount++;
    await sleep(15); // Prevent buffer overrun
  }
  console.log(`[CAT] Data sent: ${chunkCount}/${totalChunks} chunks, ${pos} bytes`);

  // 6. Flush
  console.log("[CAT] Step 5: Flush");
  await controlChar.writeValueWithoutResponse(createCommand(CMD.FLUSH, Uint8Array.of(0x00)));

  // 7. Wait for print complete (AA)
  console.log("[CAT] Step 6: Waiting for print completion...");
  const complete = await waitForNotification(CMD.PRINT_COMPLETE, 20000);
  if (complete) {
    console.log("[CAT] ✅ Print completed!");
  } else {
    console.log("[CAT] ⚠️ No completion notification, but data was sent");
  }
}

export async function testBluetoothPrint(): Promise<void> {
  const testData: BTInvoiceData = {
    storeName: "Test Store",
    invoiceNumber: "#TEST-001",
    date: new Date().toLocaleDateString(),
    items: [{ name: "Test Product", qty: 1, price: 100 }],
    subtotal: 100,
    total: 100,
  };
  await printViaBluetooth(testData);
}

export function isBluetoothSupported(): boolean {
  return !!navigator.bluetooth;
}

// Keep old export for compatibility
export function buildInvoiceEscPos(): Uint8Array {
  return new Uint8Array([]);
}

export function connectBluetoothPrinter() {
  return connectPrinter();
}

export {};
