# Quest JSON Editor

Local browser editor for XDQuest-style `Quest.json` files. It provides a visual quest graph, inspector, validation, local autosave, map sidecar export, reward editing, and safe JSON download flow.

## Requirements

- Node.js
- npm

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite serves the editor locally. Load a `Quest.json` file in the browser.

## Test and build

```bash
npm test
npm run build
```

## Notes

- Source `Quest.json` data stays local in the browser; the app does not upload it.
- Manual graph positions/links are editor-only and exported separately as a map sidecar.
- `node_modules/` and `dist/` are intentionally ignored; rebuild them locally.
