export async function readTextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const encoding = detectEncoding(bytes) ?? "utf-8";

  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer);
}

function detectEncoding(bytes: Uint8Array): string | null {
  // UTF-32 BE (BOM: 00 00 FE FF)
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0xfe && bytes[3] === 0xff) {
    return "utf-32be";
  }
  // UTF-32 LE (BOM: FF FE 00 00)
  if (bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return "utf-32le";
  }
  // UTF-8 (BOM: EF BB BF)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  // UTF-16 BE (BOM: FE FF)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }
  // UTF-16 LE (BOM: FF FE)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return "utf-16le";
  }

  // No BOM — sniff the raw bytes heuristically
  return sniffEncoding(bytes);
}

function sniffEncoding(bytes: Uint8Array): string | null {
  const sample = bytes.slice(0, 4096);

  // Presence of null bytes suggests UTF-16 without BOM
  const hasNullBytes = sample.some((b) => b === 0x00);
  if (hasNullBytes) {
    let nullOdd = 0;
    let nullEven = 0;
    for (let i = 0; i < sample.length - 1; i += 2) {
      if (sample[i] === 0x00) nullEven++;
      if (sample[i + 1] === 0x00) nullOdd++;
    }
    return nullOdd > nullEven ? "utf-16le" : "utf-16be";
  }

  if (isValidUtf8(sample)) {
    return "utf-8";
  }

  // Analyze high bytes to distinguish legacy encodings
  return classifySingleByteEncoding(sample);
}

function classifySingleByteEncoding(bytes: Uint8Array): string {
  let arabic1256 = 0; // Windows-1256 Arabic letter range
  let greek1253 = 0; // Windows-1253 Greek letter range
  let cyrillic1251 = 0; // Windows-1251 Cyrillic letter range
  let hebrew1255 = 0; // Windows-1255 Hebrew letter range
  let highBytes = 0;

  for (const b of bytes) {
    if (b <= 0x7f) continue;
    highBytes++;

    // Windows-1256: Arabic letters sit in 0xC1–0xFA
    // Distinctive bytes: 0xC7=ا, 0xE1=ل, 0xE6=و, 0xC8=ب, 0xCA=ت
    if ((b >= 0xc1 && b <= 0xda) || (b >= 0xe1 && b <= 0xfa)) arabic1256++;

    // Windows-1251: Cyrillic sits in 0xC0–0xFF and 0x80–0x9F
    if (b >= 0xc0 && b <= 0xff) cyrillic1251++;

    // Windows-1253: Greek letters in 0xC0–0xCE and 0xD0–0xFE
    if ((b >= 0xc0 && b <= 0xce) || (b >= 0xd0 && b <= 0xfe)) greek1253++;

    // Windows-1255: Hebrew letters in 0xE0–0xFA
    if (b >= 0xe0 && b <= 0xfa) hebrew1255++;
  }

  if (highBytes === 0) return "utf-8"; // Pure ASCII

  // Score each encoding as a ratio of matching bytes
  const scores: [string, number][] = [
    ["windows-1256", arabic1256 / highBytes],
    ["windows-1251", cyrillic1251 / highBytes],
    ["windows-1253", greek1253 / highBytes],
    ["windows-1255", hebrew1255 / highBytes],
    ["windows-1252", 0.3], // Baseline score for Western Latin fallback
  ];

  // Also boost Arabic score if we see common Arabic spacing patterns
  // (short words separated by spaces — Arabic averages 4–5 bytes/word)
  const arabicBoost = hasArabicWordPattern(bytes) ? 0.2 : 0;
  scores[0][1] += arabicBoost;

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}

function hasArabicWordPattern(bytes: Uint8Array): boolean {
  // Arabic text has frequent spaces (0x20) breaking short high-byte runs
  // Look for runs of 2–8 high bytes separated by spaces
  let matches = 0;
  let run = 0;

  for (const b of bytes) {
    if (b > 0x7f) {
      run++;
    } else if (b === 0x20) {
      if (run >= 2 && run <= 8) matches++;
      run = 0;
    } else {
      run = 0;
    }
  }

  return matches >= 3;
}

function isValidUtf8(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];

    if (byte <= 0x7f) {
      // Single-byte ASCII character
      i += 1;
    } else if (byte >= 0xc2 && byte <= 0xdf) {
      // 2-byte sequence
      if (i + 1 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80) return false;
      i += 2;
    } else if (byte >= 0xe0 && byte <= 0xef) {
      // 3-byte sequence
      if (i + 2 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80 || (bytes[i + 2] & 0xc0) !== 0x80)
        return false;
      i += 3;
    } else if (byte >= 0xf0 && byte <= 0xf4) {
      // 4-byte sequence
      if (
        i + 3 >= bytes.length ||
        (bytes[i + 1] & 0xc0) !== 0x80 ||
        (bytes[i + 2] & 0xc0) !== 0x80 ||
        (bytes[i + 3] & 0xc0) !== 0x80
      )
        return false;
      i += 4;
    } else {
      return false; // Invalid UTF-8 start byte
    }
  }
  return true;
}
