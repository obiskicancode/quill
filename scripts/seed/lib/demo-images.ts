import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const DEMO_ASSET_ROOT = path.join(
  process.cwd(),
  'public',
  'seed',
  'demo',
);

export interface DemoGalleryImage {
  url: string;
  thumbnailUrl: string;
  altText: string;
  caption: string;
  category: string;
  color: string;
  width: number;
  height: number;
}

export interface DemoProofImage {
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

const GALLERY = [
  {
    name: 'demo-room',
    category: 'rooms',
    color: '#7c8fa3',
    caption: 'DEMO room placeholder',
  },
  {
    name: 'demo-suite',
    category: 'rooms',
    color: '#a38b7c',
    caption: 'DEMO suite placeholder',
  },
  {
    name: 'demo-restaurant',
    category: 'dining',
    color: '#8fa37c',
    caption: 'DEMO dining placeholder',
  },
  {
    name: 'demo-pool',
    category: 'facilities',
    color: '#7ca3a0',
    caption: 'DEMO facility placeholder',
  },
  {
    name: 'demo-exterior',
    category: 'exterior',
    color: '#9a8fa3',
    caption: 'DEMO exterior placeholder',
  },
  {
    name: 'demo-surroundings',
    category: 'surroundings',
    color: '#a39a7c',
    caption: 'DEMO surroundings placeholder',
  },
];

function svg(
  width: number,
  height: number,
  color: string,
  label: string,
): Buffer {
  const fontSize = Math.round(Math.min(width, height) / 7);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <rect x="4%" y="4%" width="92%" height="92%" fill="none" stroke="#ffffff" stroke-width="8" stroke-dasharray="24 16"/>
      <text x="50%" y="47%" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">DEMO</text>
      <text x="50%" y="62%" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(fontSize / 3)}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>`,
  );
}

async function writeImage(
  filePath: string,
  width: number,
  height: number,
  color: string,
  label: string,
): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await sharp(svg(width, height, color, label))
    .webp({ quality: 82 })
    .toFile(filePath);
}

export async function generateDemoImages(): Promise<{
  gallery: DemoGalleryImage[];
  proof: DemoProofImage;
}> {
  await fs.promises.rm(DEMO_ASSET_ROOT, { recursive: true, force: true });

  const gallery: DemoGalleryImage[] = [];
  for (const item of GALLERY) {
    const fullPath = path.join(DEMO_ASSET_ROOT, 'gallery', `${item.name}.webp`);
    const thumbPath = path.join(
      DEMO_ASSET_ROOT,
      'gallery',
      `${item.name}-thumb.webp`,
    );
    await writeImage(fullPath, 1200, 800, item.color, item.caption);
    await writeImage(thumbPath, 400, 300, item.color, item.caption);
    gallery.push({
      url: `/seed/demo/gallery/${item.name}.webp`,
      thumbnailUrl: `/seed/demo/gallery/${item.name}-thumb.webp`,
      altText: `${item.caption} — demo placeholder image`,
      caption: `${item.caption} — demo placeholder image`,
      category: item.category,
      color: item.color,
      width: 1200,
      height: 800,
    });
  }

  const proofPath = path.join(
    DEMO_ASSET_ROOT,
    'proofs',
    'demo-bank-transfer-proof.webp',
  );
  await writeImage(proofPath, 800, 1000, '#6f7f8f', 'DEMO transfer proof');
  const stat = await fs.promises.stat(proofPath);

  return {
    gallery,
    proof: {
      storageKey: 'seed/demo/proofs/demo-bank-transfer-proof.webp',
      url: '/seed/demo/proofs/demo-bank-transfer-proof.webp',
      mimeType: 'image/webp',
      sizeBytes: stat.size,
    },
  };
}

export async function removeDemoImages(): Promise<void> {
  await fs.promises.rm(DEMO_ASSET_ROOT, { recursive: true, force: true });
}
