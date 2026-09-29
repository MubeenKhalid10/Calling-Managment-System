<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Calling Management System

This is a Vite + React application with Firebase Firestore synchronization.

## Requirements

- Node.js 20 or newer
- npm
- Firebase Anonymous Authentication enabled for the configured Firebase project
- Firestore enabled and available to the configured Firebase project

## Run locally on Windows

Open PowerShell in the project folder (`D:\CMS`) and run:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 in your browser. Keep the terminal running while using the app.

## Verify or build the app

```powershell
npm run lint     # TypeScript check
npm run build    # Create the production files in dist/
npm run preview  # Preview the production build locally
```

The project configuration is in `firebase-applet-config.json`. This app does not currently read `GEMINI_API_KEY` during local startup, so `.env.local` is not required to run it.

If npm reports missing modules, run `npm install` from the folder containing `package.json`. The `esbuild` version in `package.json` is already aligned with Vite 8 to avoid npm peer-dependency errors.
