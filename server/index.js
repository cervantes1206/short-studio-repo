require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const express = require('express');
const projectsRouter = require('./routes/projects');

const app = express();
app.use(express.json());

app.use('/api/projects', projectsRouter);

// Serve the existing static frontend (index.html, manifest.json, sw.js, icons/)
// from the repo root, so the whole app runs from a single `npm start`.
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Shorts Studio server listening on http://localhost:${PORT}`);
});
