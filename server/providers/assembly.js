// Video assembly — turns each beat's (image + audio) pair into a short
// vertical (9:16) segment with a burned-in caption, then concatenates all
// segments into the final short. Uses the ffmpeg-full build (needs
// fontconfig/freetype/libass for drawtext — the plain "ffmpeg" Homebrew
// formula does NOT include these).
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { projectDir, videoPaths } = require('../storage');

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const CAPTION_FONT = process.env.CAPTION_FONT_PATH || '/System/Library/Fonts/Supplemental/Arial.ttf';
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;
const WRAP_CHARS = 28;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function probeDuration(filePath) {
  const { stdout } = await run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`No se pudo leer la duración de ${filePath}`);
  }
  return seconds;
}

function wrapCaption(text) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > WRAP_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

// Sidestep drawtext's gnarly quote-escaping by swapping straight quotes for a
// typographic one, and escaping the filter-graph-significant characters.
function escapeDrawtextValue(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '’')
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

async function buildSegment(imagePath, audioPath, duration, caption, outPath) {
  const captionValue = escapeDrawtextValue(wrapCaption(caption));
  const vf =
    `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
    `drawtext=fontfile='${CAPTION_FONT}':text='${captionValue}':fontcolor=white:fontsize=42:` +
    `line_spacing=8:box=1:boxcolor=black@0.55:boxborderw=18:x=(w-text_w)/2:y=h-text_h-110`;

  await run(FFMPEG, [
    '-y',
    '-loop', '1', '-i', imagePath,
    '-i', audioPath,
    '-t', String(duration),
    '-vf', vf,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest',
    outPath
  ]);
}

async function concatSegments(segmentPaths, outPath) {
  const listFile = path.join(os.tmpdir(), `shorts-concat-${Date.now()}.txt`);
  const listContent = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listFile, listContent);
  try {
    await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath]);
  } finally {
    fs.unlinkSync(listFile);
  }
}

// assembleVideo(projectId, beats) -> absolute path of the final MP4.
// Each beat must already have imagePath + audioPath (absolute disk paths).
async function assembleVideo(projectId, beats) {
  const workDir = projectDir(projectId);
  const segmentPaths = [];

  for (const beat of beats) {
    const duration = await probeDuration(beat.audioAbsolutePath);
    const segmentPath = path.join(workDir, `segment-${beat.orden}.mp4`);
    await buildSegment(beat.imageAbsolutePath, beat.audioAbsolutePath, duration, beat.texto, segmentPath);
    segmentPaths.push(segmentPath);
  }

  const { absolutePath, publicPath } = videoPaths(projectId);
  await concatSegments(segmentPaths, absolutePath);

  segmentPaths.forEach((p) => { try { fs.unlinkSync(p); } catch (e) {} });

  return publicPath;
}

module.exports = { assembleVideo, probeDuration };
