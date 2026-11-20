# Frontend

Next.js App Router storefront frontend for the Django project in
`..\projectFirst`.

## Requirements

- Node.js 20.9 or newer
- npm

## Getting started

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The storefront is available at both `/` and `/index`. Categories and products
are loaded from the Django API, and the basket is saved in browser storage.
Product listings use `/api/products/`; category pages pass the selected
category slug as the `category` query parameter. Product detail pages are
available at `/products/<id>` and load `/api/products/<id>/`, including stock
availability. The registration page posts
`first_name`, `last_name`, `email`, `password`, and `confirm_password` to
`/auth/register/` on the API base URL. The login page posts `email` and
`password` to `/auth/api/login/`.

On successful login, the access token, refresh token, and user profile are kept
in `sessionStorage` for the current browser tab session. JavaScript-accessible
storage is suitable only for this frontend-only development flow; production
authentication should use secure, HTTP-only cookies.

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the Django server origin.
The default is `http://127.0.0.1:8000`. Restart the Next.js dev server after
changing this value. The Django server must allow the frontend origin through
CORS.

## Scripts

- `npm run dev` starts the local development server.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.
- `npm start` serves the production build.

The app uses TypeScript, the Next.js App Router, and CSS Modules. Other API
integrations can be added as endpoint requirements are provided.
