# terminal-pro

## Local Development

```bash
npm install
npm run dev
```

Open: http://localhost:5173

### Why not `file://`?

This project uses JavaScript ES modules (`type="module"`). Browsers enforce stricter security rules for modules, so opening `index.html` directly with `file://` can block imports and cause CORS-related loading errors.

Running the app through a local server provides the required `http://` origin, so modules, styles, and deep links all load correctly.
