# ESO-Guild-Bank-Management

A React + Material UI web app for tracking Elder Scrolls Online guild bank gold flow.

## What changed for publishing

This app no longer stores account data in browser `localStorage`.

- Account data now lives in a server-side SQLite database at `data/guild-bank.db`
- Passwords are hashed on the server with Node's `crypto.scrypt`
- Sessions are stored in an HTTP-only cookie instead of browser-managed app state
- Guest mode is temporary and only meant for pre-login drafting
- Legacy browser data from the old localStorage-based version can be imported into the secure backend after login

## Features

- Guest mode for temporary entry drafting before sign-in
- Log deposits, withdrawals, and sales tax income
- Optional notes for each log entry
- Edit and delete entries
- Daily, weekly, monthly, and overall stats
- Multi-guild account support with create, rename, delete, and select actions
- Secure sign up and log in backed by the API server
- One-click import for legacy browser data from the previous localStorage version

## Run locally

Install dependencies:

```bash
npm install
```

Start the frontend and API server together for development:

```bash
npm run dev
```

Start only the production server locally:

```bash
npm run build
npm start
```

The API server listens on `http://localhost:3001` by default.

## Publish

For a simple single-server deployment:

1. Run `npm install`
2. Run `npm run build`
3. Set `NODE_ENV=production`
4. Run `npm start`

The production server will serve the built frontend from `dist/` and the API from the same process.

## Environment variables

- `PORT`: API and production web server port. Default: `3001`
- `DATABASE_FILE`: optional relative path for the SQLite database file
- `SESSION_COOKIE_NAME`: optional cookie name override
- `SESSION_TTL_DAYS`: session lifetime in days. Default: `14`

## Validation

```bash
npm run lint
npm run build
```
