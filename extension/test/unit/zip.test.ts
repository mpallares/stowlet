import { describe, expect, it } from 'vitest';
import { buildZip, crc32 } from '@/lib/export';

/** Reads back the archive's directory the way an unzip tool does. */
function readZip(bytes: Uint8Array): { name: string; size: number; crc: number; data: string }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const localNameLen = view.getUint16(local + 26, true);
    const start = local + 30 + localNameLen;
    out.push({ name, size, crc, data: decoder.decode(bytes.subarray(start, start + size)) });
    at += 46 + nameLen;
  }
  return out;
}

describe('zip writer', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes stored entries that a reader can walk back', () => {
    const zip = buildZip(
      [
        { path: 'a.md', content: '# A\n' },
        { path: 'sub/b.json', content: '{"b":1}\n' },
        { path: 'ünïcode.md', content: 'olá\n' },
      ],
      new Date(2026, 9, 17, 12, 0, 0),
    );
    const entries = readZip(zip);
    expect(entries.map((e) => e.name)).toEqual(['a.md', 'sub/b.json', 'ünïcode.md']);
    expect(entries[0]?.data).toBe('# A\n');
    expect(entries[2]?.data).toBe('olá\n');
    expect(entries[1]?.crc).toBe(crc32(new TextEncoder().encode('{"b":1}\n')));
  });

  it('handles an empty archive', () => {
    expect(readZip(buildZip([]))).toEqual([]);
  });
});
