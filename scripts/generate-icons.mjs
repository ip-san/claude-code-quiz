/**
 * アプリアイコン生成スクリプト
 * SVGファビコンからElectron用のPNGアイコンを生成
 */

import { mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// アイコンサイズ（electron-builderが必要とするサイズ）
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

async function generateIcons() {
  const svgPath = join(rootDir, 'build', 'icon.svg')
  const buildDir = join(rootDir, 'build')

  // build ディレクトリ作成
  mkdirSync(buildDir, { recursive: true })

  const svgBuffer = readFileSync(svgPath)

  console.log('Generating app icons...')

  for (const size of sizes) {
    const outputPath = join(buildDir, `icon-${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath)
    console.log(`  ✓ ${size}x${size} -> ${outputPath}`)
  }

  // メインアイコン（512x512）をicon.pngとしてコピー（macOSは512x512以上が必要）
  const mainIconPath = join(buildDir, 'icon.png')
  await sharp(svgBuffer).resize(512, 512).png().toFile(mainIconPath)
  console.log(`  ✓ Main icon -> ${mainIconPath}`)

  // Windows 用 .ico ファイル生成（256x256 PNG を ICO コンテナに格納）
  // electron-builder は PNG 形式の ICO を受け付ける
  const icoPath = join(buildDir, 'icon.ico')
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = await Promise.all(icoSizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer()))
  // ICO ファイルフォーマット: ヘッダー + ディレクトリエントリ + PNG データ
  const icoHeaderSize = 6
  const icoDirEntrySize = 16
  const dataOffset = icoHeaderSize + icoDirEntrySize * icoBuffers.length
  let currentOffset = dataOffset
  // ICO ヘッダー
  const header = Buffer.alloc(icoHeaderSize)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: 1 = ICO
  header.writeUInt16LE(icoBuffers.length, 4) // Number of images
  // ディレクトリエントリ
  const dirEntries = Buffer.alloc(icoDirEntrySize * icoBuffers.length)
  for (let i = 0; i < icoBuffers.length; i++) {
    const size = icoSizes[i]
    const offset = i * icoDirEntrySize
    dirEntries.writeUInt8(size < 256 ? size : 0, offset) // Width (0 = 256)
    dirEntries.writeUInt8(size < 256 ? size : 0, offset + 1) // Height (0 = 256)
    dirEntries.writeUInt8(0, offset + 2) // Color palette
    dirEntries.writeUInt8(0, offset + 3) // Reserved
    dirEntries.writeUInt16LE(1, offset + 4) // Color planes
    dirEntries.writeUInt16LE(32, offset + 6) // Bits per pixel
    dirEntries.writeUInt32LE(icoBuffers[i].length, offset + 8) // Image size
    dirEntries.writeUInt32LE(currentOffset, offset + 12) // Image offset
    currentOffset += icoBuffers[i].length
  }
  const { writeFileSync } = await import('fs')
  writeFileSync(icoPath, Buffer.concat([header, dirEntries, ...icoBuffers]))
  console.log(`  ✓ Windows ICO -> ${icoPath}`)

  console.log('\nDone! Icons generated in build/ directory.')
  console.log('Run "npm run build" to create the app with the new icons.')
}

generateIcons().catch(console.error)
