/**
 * アプリアイコン生成スクリプト
 * SVGファビコンからElectron用のPNGアイコンを生成
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// アイコンサイズ（electron-builderが必要とするサイズ）
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  const svgPath = join(rootDir, 'build', 'icon.svg');
  const buildDir = join(rootDir, 'build');

  // build ディレクトリ作成
  mkdirSync(buildDir, { recursive: true });

  const svgBuffer = readFileSync(svgPath);

  console.log('Generating app icons...');

  for (const size of sizes) {
    const outputPath = join(buildDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${size}x${size} -> ${outputPath}`);
  }

  // メインアイコン（512x512）をicon.pngとしてコピー（macOSは512x512以上が必要）
  const mainIconPath = join(buildDir, 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log(`  ✓ Main icon -> ${mainIconPath}`);

  console.log('\nDone! Icons generated in build/ directory.');
  console.log('Run "npm run build" to create the app with the new icons.');
}

generateIcons().catch(console.error);
