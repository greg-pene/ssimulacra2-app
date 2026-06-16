import express from 'express'
import cors from 'cors'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, mkdirSync, unlinkSync, existsSync, statSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import { pipeline } from 'stream/promises'
import { createHash } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const execFileAsync = promisify(execFile)
const app = express()
app.use(cors())
app.use(express.json())

const SSIMULACRA2_BIN = process.env.SSIMULACRA2_BIN || '/opt/homebrew/bin/ssimulacra2'
const FFMPEG_BIN = process.env.FFMPEG_BIN || '/opt/homebrew/bin/ffmpeg'
const FFPROBE_BIN = process.env.FFPROBE_BIN || '/opt/homebrew/bin/ffprobe'
const TMP_DIR = join(tmpdir(), 'ssimulacra2')
mkdirSync(TMP_DIR, { recursive: true })

const BROWSER_PROFILES = {
  chrome: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  safari: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
    'Accept': 'image/webp,image/avif,video/*;q=0.8,image/*;q=0.7,*/*;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
  },
}

function detectFileType(contentType, filePath) {
  // Prefer Content-Type header
  if (contentType) {
    const ct = contentType.split(';')[0].trim().toLowerCase()
    const map = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'WebP',
      'image/avif': 'AVIF',
      'image/jxl': 'JXL',
      'image/gif': 'GIF',
      'image/heic': 'HEIC',
      'image/heif': 'HEIF',
      'image/tiff': 'TIFF',
    }
    if (map[ct]) return map[ct]
  }
  // Fallback: magic bytes
  try {
    const buf = readFileSync(filePath)
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'JPEG'
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'PNG'
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'GIF'
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return 'AVIF'
    if (buf[0] === 0xFF && buf[1] === 0x0A) return 'JXL'
    if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x0C && buf[4] === 0x4A && buf[5] === 0x58) return 'JXL'
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'WebP'
  } catch {}
  return 'Unknown'
}

async function downloadImage(url, headers) {
  const hash = createHash('md5').update(url + headers['User-Agent']).digest('hex')
  const filePath = join(TMP_DIR, `${hash}.bin`)

  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status}): ${response.statusText}`)

  const contentType = response.headers.get('content-type') || ''
  const fileStream = createWriteStream(filePath)
  await pipeline(response.body, fileStream)

  const stats = statSync(filePath)
  const fileType = detectFileType(contentType, filePath)
  const resolution = await getResolution(filePath)
  return { filePath, fileSize: stats.size, fileType, resolution }
}

async function getResolution(filePath) {
  try {
    const { stdout } = await execFileAsync(FFPROBE_BIN, [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0', filePath
    ])
    const [w, h] = stdout.trim().split(',').map(Number)
    if (w && h) return { width: w, height: h }
  } catch {}
  return null
}

const NATIVE_TYPES = new Set(['JPEG', 'PNG'])

async function toPng(srcPath) {
  const pngPath = srcPath + '.png'
  await execFileAsync(FFMPEG_BIN, [
    '-y', '-i', srcPath, '-frames:v', '1', '-update', '1', pngPath
  ])
  return pngPath
}

async function prepareForSsim(filePath, fileType) {
  if (NATIVE_TYPES.has(fileType)) return { path: filePath, temp: false }
  console.log(`  converting ${fileType} → PNG for ssimulacra2…`)
  const pngPath = await toPng(filePath)
  return { path: pngPath, temp: true }
}

async function runSsimulacra2(originalInfo, distortedInfo) {
  const [orig, dist] = await Promise.all([
    prepareForSsim(originalInfo.filePath, originalInfo.fileType),
    prepareForSsim(distortedInfo.filePath, distortedInfo.fileType),
  ])
  try {
    const { stdout } = await execFileAsync(SSIMULACRA2_BIN, [orig.path, dist.path]).catch(err => {
      const msg = err.stderr || err.stdout || ''
      if (msg.includes('Image size mismatch')) {
        throw new Error('Image size mismatch: all images must have the same dimensions as the original.')
      }
      throw err
    })
    const score = parseFloat(stdout.trim())
    if (isNaN(score)) throw new Error(`Invalid score output: ${stdout}`)
    return score
  } finally {
    if (orig.temp) cleanup(orig.path)
    if (dist.temp) cleanup(dist.path)
  }
}

function cleanup(...paths) {
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p) } catch {}
  }
}

function qualityLabel(score) {
  if (score >= 90) return { label: 'Visually Lossless', color: '#22c55e' }
  if (score >= 80) return { label: 'Very High Quality', color: '#86efac' }
  if (score >= 70) return { label: 'High Quality', color: '#bef264' }
  if (score >= 50) return { label: 'Medium Quality', color: '#fbbf24' }
  if (score >= 30) return { label: 'Low Quality', color: '#f97316' }
  return { label: 'Very Low Quality', color: '#ef4444' }
}

app.post('/api/analyze', async (req, res) => {
  const { originalUrl, cloudinaryUrl, competitorUrl, userAgent: uaKey } = req.body

  if (!originalUrl || !cloudinaryUrl || !competitorUrl) {
    return res.status(400).json({ error: 'All three image URLs are required' })
  }

  const uaLabel = uaKey || 'chrome'
  const profile = BROWSER_PROFILES[uaLabel] || BROWSER_PROFILES.chrome

  console.log('\n── Analyze request ──────────────────────────')
  console.log(`  Browser:    ${uaLabel}`)
  console.log(`  User-Agent: ${profile['User-Agent']}`)
  console.log(`  Accept:     ${profile['Accept']}`)
  console.log(`  original:   ${originalUrl}`)
  console.log(`  cloudinary: ${cloudinaryUrl}`)
  console.log(`  competitor: ${competitorUrl}`)

  let originalPath, cloudinaryPath, competitorPath
  try {
    const [original, cloudinary, competitor] = await Promise.all([
      downloadImage(originalUrl, profile),
      downloadImage(cloudinaryUrl, profile),
      downloadImage(competitorUrl, profile)
    ])

    originalPath = original.filePath
    cloudinaryPath = cloudinary.filePath
    competitorPath = competitor.filePath

    console.log('\n── Downloaded images ────────────────────────')
    for (const [label, img] of [['original', original], ['cloudinary', cloudinary], ['competitor', competitor]]) {
      const res = img.resolution ? `${img.resolution.width}×${img.resolution.height}` : 'unknown'
      console.log(`  ${label.padEnd(10)} ${img.fileType.padEnd(6)} ${(img.fileSize / 1024).toFixed(1)} KB  ${res}  ${img.filePath}`)
    }

    const [cloudinaryScore, competitorScore] = await Promise.all([
      runSsimulacra2(original, cloudinary),
      runSsimulacra2(original, competitor)
    ])

    const response = {
      cloudinary: {
        score: cloudinaryScore,
        fileSize: cloudinary.fileSize,
        fileType: cloudinary.fileType,
        resolution: cloudinary.resolution,
        ...qualityLabel(cloudinaryScore)
      },
      competitor: {
        score: competitorScore,
        fileSize: competitor.fileSize,
        fileType: competitor.fileType,
        resolution: competitor.resolution,
        ...qualityLabel(competitorScore)
      },
      original: {
        fileSize: original.fileSize,
        fileType: original.fileType,
        resolution: original.resolution,
      }
    }

    console.log('\n── Scores ───────────────────────────────────')
    console.log(`  cloudinary  ${cloudinaryScore.toFixed(4)}  (${response.cloudinary.label})`)
    console.log(`  competitor  ${competitorScore.toFixed(4)}  (${response.competitor.label})`)
    console.log('─────────────────────────────────────────────\n')

    res.json(response)
  } catch (err) {
    console.error(`\n── Error ────────────────────────────────────`)
    console.error(`  ${err.message}`)
    console.error('─────────────────────────────────────────────\n')
    res.status(500).json({ error: err.message })
  } finally {
    cleanup(originalPath, cloudinaryPath, competitorPath)
  }
})

// Serve Vite build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
