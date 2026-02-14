const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5173;
const rootDir = __dirname;

app.use(express.static(rootDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Terminal Pro dev server running at http://localhost:${port}`);
});
