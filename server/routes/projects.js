const express = require('express');
const db = require('../db');
const { callClaude } = require('../providers/llm');
const { buildScriptPrompt } = require('../director/prompt');

const router = express.Router();

function loadBeats(projectId) {
  return db
    .prepare('SELECT tiempo, texto, visual FROM beats WHERE project_id = ? ORDER BY orden ASC')
    .all(projectId);
}

function serializeProject(row) {
  return {
    id: row.id,
    tema: row.tema,
    tono: row.tono,
    duracion: row.duracion,
    audiencia: row.audiencia,
    stage: row.stage,
    hook: row.hook,
    beats: loadBeats(row.id),
    titulos: JSON.parse(row.titulos || '[]'),
    tituloSeleccionado: row.titulo_seleccionado,
    descripcion: row.descripcion,
    hashtags: JSON.parse(row.hashtags || '[]'),
    miniaturaTexto: row.miniatura_texto,
    checklist: JSON.parse(row.checklist || '{}'),
    iaGenerativa: !!row.ia_generativa,
    titleForList: (JSON.parse(row.titulos || '[]'))[row.titulo_seleccionado] || row.tema || 'Short sin título'
  };
}

function replaceBeats(projectId, beats) {
  db.prepare('DELETE FROM beats WHERE project_id = ?').run(projectId);
  const insert = db.prepare(
    'INSERT INTO beats (project_id, orden, tiempo, texto, visual) VALUES (?, ?, ?, ?, ?)'
  );
  (beats || []).forEach((b, i) => {
    insert.run(projectId, i, b.tiempo || '', b.texto || '', b.visual || '');
  });
}

// POST /api/projects — create a project and run the script-generation job.
router.post('/', async (req, res) => {
  const { tema, tono, duracion, audiencia } = req.body || {};
  const temaTrimmed = (tema || '').trim();
  if (!temaTrimmed) {
    return res.status(400).json({ error: 'Escribe un tema antes de generar.' });
  }

  const params = {
    tema: temaTrimmed,
    tono: tono || 'Cercano y directo',
    duracion: duracion || '30 segundos',
    audiencia: (audiencia || '').trim()
  };

  const insertProject = db.prepare(`
    INSERT INTO projects (tema, tono, duracion, audiencia, stage)
    VALUES (@tema, @tono, @duracion, @audiencia, 1)
  `);
  const info = insertProject.run(params);
  const projectId = info.lastInsertRowid;

  const insertJob = db.prepare(
    "INSERT INTO jobs (project_id, stage, status) VALUES (?, 'script', 'running')"
  );
  const jobInfo = insertJob.run(projectId);

  try {
    const prompt = buildScriptPrompt(params);
    const result = await callClaude(prompt);

    db.prepare(`
      UPDATE projects SET
        hook = ?, titulos = ?, descripcion = ?, hashtags = ?, miniatura_texto = ?,
        stage = 2, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      result.hook || '',
      JSON.stringify(result.titulos || [temaTrimmed]),
      result.descripcion || '',
      JSON.stringify(result.hashtags || []),
      result.miniaturaTexto || '',
      projectId
    );
    replaceBeats(projectId, result.beats || []);

    db.prepare("UPDATE jobs SET status = 'done', updated_at = datetime('now') WHERE id = ?").run(
      jobInfo.lastInsertRowid
    );

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.json(serializeProject(row));
  } catch (e) {
    db.prepare(
      "UPDATE jobs SET status = 'error', error_message = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(String(e.message || e), jobInfo.lastInsertRowid);
    res.status(502).json({ error: e.message || 'No se pudo generar el borrador.' });
  }
});

// GET /api/projects — list, newest first (replaces the localStorage draft list).
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, tema, titulos, titulo_seleccionado, stage FROM projects ORDER BY updated_at DESC')
    .all();
  res.json(
    rows.map((row) => ({
      id: row.id,
      title: (JSON.parse(row.titulos || '[]'))[row.titulo_seleccionado] || row.tema || 'Short sin título',
      stage: row.stage
    }))
  );
});

// GET /api/projects/:id — full project detail (replaces hydrating a draft from localStorage).
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(serializeProject(row));
});

// PATCH /api/projects/:id — persist edits made in later stages (hook/beats text,
// selected title, checklist, stage progression) — mirrors the old saveDraft() behavior.
router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const body = req.body || {};
  db.prepare(`
    UPDATE projects SET
      hook = @hook, titulos = @titulos, titulo_seleccionado = @tituloSeleccionado,
      descripcion = @descripcion, hashtags = @hashtags, miniatura_texto = @miniaturaTexto,
      stage = @stage, checklist = @checklist, ia_generativa = @iaGenerativa,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: row.id,
    hook: body.hook ?? row.hook,
    titulos: JSON.stringify(body.titulos ?? JSON.parse(row.titulos || '[]')),
    tituloSeleccionado: body.tituloSeleccionado ?? row.titulo_seleccionado,
    descripcion: body.descripcion ?? row.descripcion,
    hashtags: JSON.stringify(body.hashtags ?? JSON.parse(row.hashtags || '[]')),
    miniaturaTexto: body.miniaturaTexto ?? row.miniatura_texto,
    stage: body.stage ?? row.stage,
    checklist: JSON.stringify(body.checklist ?? JSON.parse(row.checklist || '{}')),
    iaGenerativa: body.iaGenerativa != null ? (body.iaGenerativa ? 1 : 0) : row.ia_generativa
  });

  if (body.beats) replaceBeats(row.id, body.beats);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(row.id);
  res.json(serializeProject(updated));
});

module.exports = router;
