// Local-disk media storage abstraction. Swap this file for an S3-compatible
// backend later without touching callers — the interface is just
// saveImage(projectId, orden, buffer) -> public URL path.
const fs = require('fs');
const path = require('path');

const STORAGE_ROOT = path.join(__dirname, 'storage');

function projectDir(projectId) {
  const dir = path.join(STORAGE_ROOT, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveImage(projectId, orden, buffer) {
  const filename = `beat-${orden}.png`;
  fs.writeFileSync(path.join(projectDir(projectId), filename), buffer);
  return `/storage/${projectId}/${filename}`;
}

function saveAudio(projectId, orden, buffer) {
  const filename = `beat-${orden}.mp3`;
  fs.writeFileSync(path.join(projectDir(projectId), filename), buffer);
  return `/storage/${projectId}/${filename}`;
}

// Returns both the public URL path (for the frontend) and the absolute disk
// path (ffmpeg needs a real filesystem path, not a URL).
function videoPaths(projectId) {
  const filename = 'short.mp4';
  return {
    absolutePath: path.join(projectDir(projectId), filename),
    publicPath: `/storage/${projectId}/${filename}`
  };
}

function absolutePathFromPublic(publicPath) {
  // publicPath looks like /storage/<projectId>/<file> — strip the /storage prefix.
  return path.join(STORAGE_ROOT, publicPath.replace(/^\/storage\//, ''));
}

module.exports = { STORAGE_ROOT, saveImage, saveAudio, videoPaths, absolutePathFromPublic, projectDir };
