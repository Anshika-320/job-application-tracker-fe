# Job Application Tracker (web client)

A React single page app for tracking job applications. It records what you applied
to, where each application stands, and what you noted about it.

This repository holds the browser client only. It reads and writes through the
[Job Application Tracker API](https://github.com/Anshika-320/job-application-tracker),
a Spring Boot service backed by PostgreSQL. The client has no local storage of its
own, so the API must be running before you start it.

![Dashboard](https://raw.githubusercontent.com/Anshika-320/job-application-tracker-fe/main/docs/screenshots/dashboard.png)

## What it does

You sign in with an email and password. The API returns a JSON Web Token, which the
client keeps for the session and sends as a bearer token on every later request. If
the token expires, the client signs you out and says why.

The dashboard lists every application with its company, role, status, location and
timestamps, and counts totals across the top. You can add, edit and delete
applications. Deleting names the record and asks you to confirm.

The search box matches company, role and location as you type. Two dropdowns filter
by status and by location. Any column header sorts the table, and results page ten
rows at a time.

Each row opens a panel where you can read, add and delete notes for that application.

The layout holds down to 390px wide, where the table turns into stacked cards.

![Sign in](https://raw.githubusercontent.com/Anshika-320/job-application-tracker-fe/main/docs/screenshots/login.png)

## Built with

| Concern | Choice |
| --- | --- |
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Plain CSS with custom properties |
| Tests | Vitest 5 and React Testing Library |
| Linting | ESLint 10, flat config |

There is no UI kit, CSS framework, state library or router. The app has two screens,
so the sign-in state decides which one renders.

## Requirements

| Software | Version | Check with |
| --- | --- | --- |
| Node.js | 20.19+, 22.13+ or 24+ | `node -v` |
| npm | 10 or newer | `npm -v` |

Vite 8 and ESLint 10 set that Node range. Older versions fail at install time.

You also need the API running. It needs Java 17 and PostgreSQL, which the
[API repository](https://github.com/Anshika-320/job-application-tracker) covers,
including how to create a sign-in account and load demo data.

## Running it

Start the API first, on port 8080. Then:

```bash
git clone https://github.com/Anshika-320/job-application-tracker-fe.git
cd job-application-tracker-fe
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the account you created in the API.

There is no sign-up screen. The API has no registration endpoint, so the account has
to exist before you can sign in.

## Pointing the client at the API

In development the Vite server proxies `/api` to `http://localhost:8080`, so the
browser only ever makes same origin requests and CORS never comes up. Override the
target when the API runs elsewhere:

```bash
VITE_API_PROXY_TARGET=http://localhost:9090 npm run dev
```

A built bundle has no proxy. The browser calls the API directly and the API decides
whether to allow it, so add this client's origin to the API's `FRONTEND_ORIGIN`
setting before deploying:

```bash
FRONTEND_ORIGIN=https://your-client-host
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5173 with the API proxy |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the Vitest suite |

## How search and filtering work

The client loads the whole list once from `GET /api/applications` and keeps it. That
one response feeds the totals, the location dropdown, the text search, the sorting
and the pagination, all of which run in the browser so filters combine without a
round trip.

Two filters match API routes exactly, so the server does that work:

| Filter | Route |
| --- | --- |
| Status | `GET /api/applications/status?status=` |
| Location | `GET /api/applications/location?location=` |

No route takes both at once. When you set both, the server filters by status and the
client narrows that result by location.

While a filtered request is in flight, the client narrows the cached list itself
instead of showing the previous response. Without that step the table flashes rows
belonging to the filter you just left.

Note counts per row come from `GET /api/applications/note-counts`.

## Project layout

```
src/
  api/
    client.js         fetch wrapper: auth header, error shapes, aborts
    endpoints.js      one function per API route
  auth/
    AuthProvider.jsx  session state, sign in, sign out
    token.js          JWT decoding, expiry, storage
    useAuth.js        context hook
  components/         screens and UI pieces
  constants/          status values and their labels
  hooks/
    useApplications.js  list loading, server filters, local narrowing
  utils/              formatting helpers
  styles.css          design tokens and component styles
```

Every network call lives in `src/api`. No component calls `fetch` directly.

## Tests

```bash
npm test
```

49 tests across six files:

The API client tests cover auth headers, `204` responses, the two different error
shapes the backend returns, expired sessions, network failures and aborted requests.

The token tests cover decoding, expiry and malformed input.

The login tests cover field validation, trimmed submission, rejected credentials,
backend field errors and an unreachable API.

The dashboard tests cover totals, empty and error states, search across all three
fields, both server filters, the create and edit payloads, and delete confirmation.
One test pins the filter switching behaviour described above.

The notes tests cover listing, the empty state, blank note rejection, adding,
deleting and closing with Escape.

## Accessibility

Every input has a visible label. Errors attach to their field with `aria-describedby`
and `aria-invalid`. Dialogs use `role="dialog"` with `aria-modal`, keep focus inside,
close on Escape and return focus to whatever opened them. Sortable headers report
`aria-sort`. Row buttons carry an `aria-label`, so Edit announces as "Edit Atlassian"
rather than "Edit". Status and error text uses `role="status"` and `role="alert"`.
