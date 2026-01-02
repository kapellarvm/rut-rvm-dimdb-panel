import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(process.cwd(), 'public', 'icons')

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const svgPath = path.join(iconsDir, 'icon.svg')

async function generateIcons() {
  console.log('Generating PWA icons...')

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`)

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    console.log(`Generated: icon-${size}x${size}.png`)
  }

  // Generate Apple touch icon
  await sharp(svgPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'))

  console.log('Generated: apple-touch-icon.png')

  // Generate favicon
  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'))

  await sharp(svgPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(iconsDir, 'favicon-16x16.png'))

  console.log('Generated: favicon-32x32.png, favicon-16x16.png')

  // Generate shortcut icons (router and rvm)
  // These use the same base icon for now
  await sharp(svgPath)
    .resize(96, 96)
    .png()
    .toFile(path.join(iconsDir, 'router-shortcut.png'))

  await sharp(svgPath)
    .resize(96, 96)
    .png()
    .toFile(path.join(iconsDir, 'rvm-shortcut.png'))

  console.log('Generated: shortcut icons')

  console.log('All icons generated successfully!')
}

generateIcons().catch(console.error)
