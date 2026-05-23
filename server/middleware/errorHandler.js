function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ error: 'Data sudah ada atau melanggar constraint database.' });
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Data dengan nilai tersebut sudah ada.' });
  }

  res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
}

module.exports = errorHandler;
