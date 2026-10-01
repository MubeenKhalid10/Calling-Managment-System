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

Copy `.env.example` to `.env.local` for local development and fill in the Firebase `VITE_FIREBASE_*` values. In Vercel, add the same variables under **Project Settings > Environment Variables** for Preview and Production. Do not commit `.env.local`.

## Enable authentication

In Firebase Console, open **Authentication > Sign-in method**, enable **Email/Password**, and save. Open the deployed app and use **Register** to create the first user. Existing users can use **Sign in**.

The Firestore rules in `firestore.rules` require an authenticated Firebase user. Deploy those rules from Firebase Console under **Firestore Database > Rules**, or with the Firebase CLI after linking the project:

```powershell
firebase deploy --only firestore:rules --project gen-lang-client-0987467842
```

If npm reports missing modules, run `npm install` from the folder containing `package.json`. The `esbuild` version in `package.json` is already aligned with Vite 8 to avoid npm peer-dependency errors.
