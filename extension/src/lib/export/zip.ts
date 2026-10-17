/*
 * Minimal zip writer (stored entries, no compression). Enough for a folder of text
 * exports, with no dependency and no binary messaging: the panel builds the archive
 * itself from files the background worker formatted.
 */

export interface ZipEntry {
  /** Path inside the archive, with `/` separators. */
  path: string;
  content: string | Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const LOCAL_HEADER = 30;
const CENTRAL_HEADER = 46;
const END_RECORD = 22;
/** General purpose flag bit 11: names are UTF-8. */
const UTF8_FLAG = 0x0800;

export function buildZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const files = entries.map((e) => ({
    name: encoder.encode(e.path),
    data: typeof e.content === 'string' ? encoder.encode(e.content) : e.content,
  }));
  const localSize = files.reduce((n, f) => n + LOCAL_HEADER + f.name.length + f.data.length, 0);
  const centralSize = files.reduce((n, f) => n + CENTRAL_HEADER + f.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + END_RECORD);
  const view = new DataView(out.buffer);
  const u16 = (at: number, v: number) => view.setUint16(at, v, true);
  const u32 = (at: number, v: number) => view.setUint32(at, v, true);

  let offset = 0;
  const records: { offset: number; crc: number }[] = [];
  for (const f of files) {
    const crc = crc32(f.data);
    records.push({ offset, crc });
    u32(offset, 0x04034b50);
    u16(offset + 4, 20);
    u16(offset + 6, UTF8_FLAG);
    u16(offset + 8, 0);
    u16(offset + 10, time);
    u16(offset + 12, date);
    u32(offset + 14, crc);
    u32(offset + 18, f.data.length);
    u32(offset + 22, f.data.length);
    u16(offset + 26, f.name.length);
    u16(offset + 28, 0);
    out.set(f.name, offset + LOCAL_HEADER);
    out.set(f.data, offset + LOCAL_HEADER + f.name.length);
    offset += LOCAL_HEADER + f.name.length + f.data.length;
  }

  const centralStart = offset;
  files.forEach((f, i) => {
    const record = records[i] ?? { offset: 0, crc: 0 };
    u32(offset, 0x02014b50);
    u16(offset + 4, 20);
    u16(offset + 6, 20);
    u16(offset + 8, UTF8_FLAG);
    u16(offset + 10, 0);
    u16(offset + 12, time);
    u16(offset + 14, date);
    u32(offset + 16, record.crc);
    u32(offset + 20, f.data.length);
    u32(offset + 24, f.data.length);
    u16(offset + 28, f.name.length);
    u16(offset + 30, 0);
    u16(offset + 32, 0);
    u16(offset + 34, 0);
    u16(offset + 36, 0);
    u32(offset + 38, 0);
    u32(offset + 42, record.offset);
    out.set(f.name, offset + CENTRAL_HEADER);
    offset += CENTRAL_HEADER + f.name.length;
  });

  u32(offset, 0x06054b50);
  u16(offset + 4, 0);
  u16(offset + 6, 0);
  u16(offset + 8, files.length);
  u16(offset + 10, files.length);
  u32(offset + 12, offset - centralStart);
  u32(offset + 16, centralStart);
  u16(offset + 20, 0);
  return out;
}
