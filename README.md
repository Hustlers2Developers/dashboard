# Connect Your Code

A React + Vite dashboard application for managing organizations, teams, departments, and positions — backed by a GraphQL API.

---

## Dashboard

The dashboard is the main landing page after login. It gives users a high-level overview of their organization's activity.

### What it shows

**Welcome header**
Greets the logged-in user by name (derived from their email address).

**Stats cards**
Four summary cards displayed in a responsive grid:

| Card | Description |
|---|---|
| Total Projects | Count of all projects in the organization |
| Active Teams | Count of all teams in the organization |
| Recent Activity | Latest activity count |
| Growth | Fixed indicator (+12%) |

**Recent Projects**
A list of the 5 most recent projects in the organization. Each entry shows the project name, description, and creation date.

**Your Teams**
A grid of up to 6 teams in the organization. Each card shows the team name and when it was created.

### Data fetching

The dashboard fetches two queries on load, both scoped to the user's organization (`orgId` from the auth token):

- `GET_PROJECTS_BY_ORG` — retrieves all projects for the organization
- `GET_TEAMS_BY_ORG` — retrieves all teams for the organization

---

## Navigation

The sidebar is present on all protected pages and adapts based on the user's role.

| Link | Path | Access |
|---|---|---|
| Dashboard | `/dashboard` | All users |
| Projects | `/projects` | All users |
| Teams | `/teams` | All users |
| Departments | `/departments` | All users |
| Positions | `/positions` | All users |
| Invites | `/invites` | All users |
| Organizations | `/organizations` | SUPER_ADMIN only |

The active route is highlighted in the sidebar. On mobile, the sidebar is hidden behind a hamburger toggle.

---

## Authentication

All dashboard routes are protected. Unauthenticated users are redirected to `/login`.

Tokens are stored in `localStorage` via Zustand persist middleware. On app startup, the access token is proactively refreshed. If a request returns `Unauthorized`, the Apollo error link automatically refreshes the token and retries the operation — concurrent requests are queued so only one refresh call is made at a time.

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite**
- **Apollo Client v4** (GraphQL)
- **Zustand** (auth state)
- **Tailwind CSS** + **shadcn/ui**
- **React Router v6**
