/**
 * Geo-tagging for Client Photo / ID Proof images — the browser counterpart of
 * the mobile app's `GeoTagger`: read the current location, reverse-geocode it
 * into an address + PIN, and burn that "geo tag" (address, coordinates,
 * date/time and device) into the bottom of the photo.
 */

/** Thrown with a user-readable message when the location can't be read. */
export class GeoTagError extends Error {}

/** Longest side of the stamped image — keeps files a sensible size. */
const MAX_IMAGE_SIDE = 1600;

export interface GeoAddress {
  title: string;
  address: string;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** The device's current position (high accuracy). Rejects with a [GeoTagError]. */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoTagError('This browser can’t provide a location, so photos can’t be geo-tagged.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoTagError('Location permission is required to geo-tag photos. Allow it in the browser and retry.'));
        } else {
          reject(new GeoTagError('Could not get your current location. Move to an open area and retry.'));
        }
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
    );
  });
}

/**
 * Address for a coordinate via OpenStreetMap's Nominatim; falls back to empty
 * fields when it's unreachable — the coordinates are still stamped.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoAddress> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return { title: '', address: '' };
    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? '';
    const title = [city, a.state, a.country].filter(Boolean).join(', ');
    return { title, address: data.display_name ?? '' };
  } catch {
    return { title: '', address: '' };
  }
}

/** A short device label for the stamp, e.g. "Chrome on Windows". */
function deviceName(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "dd/MM/yy hh:mm AM GMT+05:30". */
function dateLine(date: Date): string {
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(2)} ` +
    `${pad(hour12)}:${pad(date.getMinutes())} ${hours < 12 ? 'AM' : 'PM'} ` +
    `GMT${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new GeoTagError('Could not read the photo.'));
    };
    img.src = url;
  });
}

/** Wraps [text] into at most [maxLines] lines no wider than [maxWidth]. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,\s]+$/, '')}…`;
  }
  return lines;
}

const MAP_ZOOM = 17;
const TILE_SIZE = 256;

function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // OSM tiles are served with CORS enabled, so the canvas stays exportable.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  });
}

/**
 * A square map picture centred on the coordinate (a 3x3 block of OpenStreetMap
 * tiles, cropped around the point), or null when the tiles can't be fetched —
 * the stamp is then drawn without the map.
 */
async function loadMapSquare(latitude: number, longitude: number): Promise<HTMLCanvasElement | null> {
  const n = 2 ** MAP_ZOOM;
  const latRad = (latitude * Math.PI) / 180;
  const xt = ((longitude + 180) / 360) * n;
  const yt = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x0 = Math.floor(xt) - 1;
  const y0 = Math.floor(yt) - 1;

  const tiles = await Promise.all(
    [0, 1, 2].flatMap((dy) => [0, 1, 2].map((dx) => loadTile(MAP_ZOOM, x0 + dx, y0 + dy).then((img) => ({ img, dx, dy })))),
  );
  if (tiles.every((t) => t.img === null)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Pixel position of the point inside the 3x3 block, then shift so it sits at the centre.
  const px = (xt - x0) * TILE_SIZE;
  const py = (yt - y0) * TILE_SIZE;
  for (const { img, dx, dy } of tiles) {
    if (img) ctx.drawImage(img, dx * TILE_SIZE - (px - TILE_SIZE / 2), dy * TILE_SIZE - (py - TILE_SIZE / 2));
  }
  return canvas;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A map-pin glyph whose tip is at (x, y), [size] tall. */
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const r = size * 0.32;
  const cy = y - size + r;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - r * 1.5, cy + r * 1.2, x - r, cy - r * 0.2, x - r, cy);
  ctx.arc(x, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(x + r, cy - r * 0.2, x + r * 1.5, cy + r * 1.2, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/**
 * Stamps the current location/time onto [source] and returns the result as a
 * JPEG `File`, laid out like the mobile app's geo camera: a dark band along
 * the bottom with a map thumbnail on the left and the place name, address,
 * latitude / longitude, date and device on the right, plus a "DC Geo Camera"
 * badge. Rejects with a [GeoTagError] when the location can't be read.
 */
export async function geoTagImage(source: Blob): Promise<File> {
  const position = await getCurrentPosition();
  const capturedAt = new Date();
  const [address, img, map] = await Promise.all([
    reverseGeocode(position.latitude, position.longitude),
    loadImage(source),
    loadMapSquare(position.latitude, position.longitude),
  ]);

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new GeoTagError('Could not process the photo.');
  ctx.drawImage(img, 0, 0, width, height);

  // Everything scales with the image so the stamp stays readable at any resolution.
  const unit = Math.max(12, Math.round(width / 34));
  const pad = Math.round(unit * 0.55);
  const mapSize = Math.round(width * 0.21);
  const textX = pad * 2 + mapSize;
  const textWidth = width - textX - pad;

  ctx.textBaseline = 'top';
  ctx.font = `500 ${unit}px sans-serif`;
  const addressLines = address.address ? wrapText(ctx, address.address, textWidth, 3) : [];
  const lines: { text: string; bold: boolean; size: number }[] = [
    { text: address.title || 'Address unavailable', bold: true, size: unit * 1.25 },
    ...addressLines.map((text) => ({ text, bold: false, size: unit })),
    { text: `Lat ${position.latitude.toFixed(6)}°`, bold: false, size: unit },
    { text: `Long ${position.longitude.toFixed(6)}°`, bold: false, size: unit },
    { text: dateLine(capturedAt), bold: false, size: unit },
    { text: `Device: ${deviceName()}`, bold: false, size: unit * 0.85 },
  ];

  const lineGap = Math.round(unit * 0.22);
  const textHeight = lines.reduce((sum, l) => sum + l.size + lineGap, 0) - lineGap;
  const bandHeight = Math.max(textHeight, mapSize) + pad * 2;
  const bandTop = height - bandHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, bandTop, width, bandHeight);

  // Map thumbnail (left), with a red pin on the point and the OSM credit.
  const mapX = pad;
  const mapY = bandTop + (bandHeight - mapSize) / 2;
  ctx.save();
  roundedRectPath(ctx, mapX, mapY, mapSize, mapSize, unit * 0.35);
  ctx.clip();
  if (map) {
    ctx.drawImage(map, mapX, mapY, mapSize, mapSize);
  } else {
    ctx.fillStyle = '#d9dee3';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
  }
  const credit = '© OpenStreetMap';
  ctx.font = `500 ${Math.round(unit * 0.42)}px sans-serif`;
  const creditWidth = ctx.measureText(credit).width + unit * 0.3;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(mapX + mapSize - creditWidth, mapY + mapSize - unit * 0.65, creditWidth, unit * 0.65);
  ctx.fillStyle = '#333333';
  ctx.fillText(credit, mapX + mapSize - creditWidth + unit * 0.15, mapY + mapSize - unit * 0.55);
  ctx.restore();
  drawPin(ctx, mapX + mapSize / 2, mapY + mapSize / 2 + unit * 0.2, unit * 1.9, '#e53935');

  // Text block (right), vertically centred in the band.
  ctx.fillStyle = '#ffffff';
  let y = bandTop + (bandHeight - textHeight) / 2;
  for (const line of lines) {
    ctx.font = `${line.bold ? '700' : '500'} ${Math.round(line.size)}px sans-serif`;
    ctx.fillText(line.text, textX, y, textWidth);
    y += line.size + lineGap;
  }

  // "DC Geo Camera" badge, bottom-right just above the band.
  const badgeText = 'DC Geo Camera';
  const badgeFont = Math.round(unit * 1.05);
  ctx.font = `700 ${badgeFont}px sans-serif`;
  const badgePadX = unit * 0.7;
  const badgeH = badgeFont * 1.9;
  const pinW = unit * 1.1;
  const badgeW = badgePadX * 2 + pinW + unit * 0.4 + ctx.measureText(badgeText).width;
  const badgeX = width - badgeW - pad;
  const badgeY = bandTop - badgeH - pad * 0.6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2.4);
  ctx.fill();
  drawPin(ctx, badgeX + badgePadX + pinW / 2, badgeY + badgeH * 0.8, unit * 1.3, '#29a3ff');
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgePadX + pinW + unit * 0.4, badgeY + badgeH / 2);
  ctx.textBaseline = 'top';

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new GeoTagError('Could not process the photo.');
  return new File([blob], `geo_${capturedAt.getTime()}.jpg`, { type: 'image/jpeg' });
}
