# Quest Studio / Quest JSON Editor

Quest Studio is a local browser-based editor for `Quest.json` files used by the **Quest System** plugin for Rust servers.

Plugin page: <https://codefling.com/plugins/quest-system>

This project is **not** the Quest System plugin itself. It does not replace the plugin, run quests, connect to your Rust server, or change server files automatically. It is only an editor/helper tool for preparing and reviewing the plugin's JSON configuration before you upload/copy the file back to your server.

## What it does

- Opens XDQuest / Quest System style `Quest.json` files in your browser.
- Shows a visual quest graph so questlines, permissions, unlocks, repeatable loops, and manual links are easier to understand.
- Lets you inspect and edit quest fields, missions, permissions, descriptions, and rewards.
- Helps find validation issues such as missing descriptions, reward problems, broken/weak links, and permission-chain problems.
- Supports local autosave in the browser so you do not lose work if you refresh the page.
- Exports/downloads a new `Quest.json` file when you are ready.
- Stores graph layout/manual graph links separately from the source quest JSON unless you explicitly export/download them.

## Important safety note

The editor is designed to be local-first:

- Your `Quest.json` file is loaded by your browser.
- The app does **not** upload your quest file to a remote server.
- The app does **not** write directly to your Rust server.
- The app does **not** automatically replace the plugin config.
- You must manually download/export the edited JSON and then place it where your Quest System plugin expects it.

The optional local Node/Express server in this repository is only used to serve the built web app and proxy Steam Workshop preview lookups. It is not a database and it does not persist your quest file server-side.

## How saving works

There are three different save concepts:

### 1. Browser autosave

While you work, the editor saves the current working state into your browser's `localStorage`.

This can include:

- loaded quest data
- current filename
- selected quest
- active tab
- search/filter state
- editor UI preferences
- manual graph positions/links
- local backup snapshots

This is only stored in the browser/profile you are using. If you switch browser, clear site data, use private browsing, or move to another computer, that autosave may not be available.

### 2. Downloaded `Quest.json`

The actual handoff file is created when you click:

```text
Save file / Download Quest.json
```

That downloads a JSON file to your computer. This is the file you should review and then copy/upload to your Rust server's Quest System plugin config location.

### 3. Map sidecar export

Manual graph positions and manual links are editor-only helper data. They are not part of the Quest System plugin's normal quest data.

Use the map export/download option if you want to keep or move that editor-only graph layout data separately.

## Requirements

- Node.js 18 or newer recommended
- npm
- A modern browser, for example Chrome, Edge, Firefox, or Safari

Check your installed versions:

```bash
node --version
npm --version
```

## Install from GitHub

Clone the repository:

```bash
git clone https://github.com/magnum-k/Quest-Studio.git
cd Quest-Studio
```

Install dependencies:

```bash
npm install
```

## Run in development mode

Start the Vite dev server:

```bash
npm run dev
```

Vite will print a local URL, usually something like:

```text
http://localhost:5173/
```

Open that URL in your browser, then use **Load Quest.json** to select your plugin config file.

## Build for local production use

Create a production build:

```bash
npm run build
```

Then run the included local server:

```bash
npm start
```

By default it listens on:

```text
http://localhost:4177/
```

You can choose another port with:

```bash
PORT=8080 npm start
```

## Test

Run the utility tests:

```bash
npm test
```

Run tests and build together:

```bash
npm test && npm run build
```

## Basic workflow

1. Make a backup of your original plugin `Quest.json`.
2. Start Quest Studio locally.
3. Click **Load Quest.json**.
4. Inspect the graph, validation tab, and quest inspector.
5. Edit quests/rewards/permissions as needed.
6. Use graph tools such as move nodes, connect quests, edge legend, and edge detail panel to understand chains.
7. Click **Save file / Download Quest.json**.
8. Review the downloaded file.
9. Copy/upload it to the correct Quest System plugin folder on your Rust server.
10. Reload/restart the plugin/server according to the Quest System plugin documentation.

## About the Quest System plugin

Quest Studio is made to help edit configuration files for the Codefling Quest System plugin:

<https://codefling.com/plugins/quest-system>

For plugin installation, server-side setup, permissions, commands, and where the config file belongs, use the official plugin documentation and Codefling page. This editor only helps with the JSON file.

## Steam Workshop previews

The local server includes a small API route used for Steam Workshop item preview lookups:

```text
/api/steam/workshop
```

This sends only requested Workshop IDs to Steam's public API so the editor can show preview information for skin/item rewards. It does not upload your full quest file.

## Privacy / local data

Quest Studio has no hosted backend in this repository. Normal usage is local:

- quest data stays in browser memory/localStorage
- downloaded files are created by your browser
- no account is required
- no API key is required
- no database is used

If you deploy this yourself to a public web host, remember that the static web app will run in each visitor's browser. You are responsible for that deployment and any server/proxy changes you add.

## Development note

This project was coded with help from OpenAI. In plain English: AI assistance was used while writing and improving the code, but the repository should still be reviewed, tested, and used carefully like any other tool that edits server configuration files. Very futuristic. Still needs backups.

## Repository notes

- `node_modules/` is intentionally ignored. Reinstall it with `npm install`.
- `dist/` is generated by `npm run build` and is intentionally ignored.
- Keep original plugin JSON backups before editing.
- Manual graph layout data is editor-only and separate from the plugin's normal `Quest.json` format.
