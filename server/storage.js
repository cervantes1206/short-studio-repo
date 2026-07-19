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

module.exports = { STORAGE_ROOT, saveImage };
