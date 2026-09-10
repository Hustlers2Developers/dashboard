# Backend change needed: Community directory

The dashboard's `/community` page wants to show, for every org member:
name, profile picture, email, GitHub, LinkedIn, job title, and bio.

**Currently impossible from the frontend.** Verified directly against the
live API (`api.godevelopers.space/graphql`) via introspection on
2026-09-10:

- The `User` type (returned by `getAllUsers`, `allPlatformUsers`,
  `getUserById`) has only: `id, email, name, systemRole, createdAt,
  updatedAt, hashedRefreshToken`. No `details` field.
- `UserDetails` (profilePicUrl, githubUsername, linkedInUrl, title, bio,
  etc.) is only reachable via `myProfile`, which has no `userId` argument —
  it always resolves to the caller's own account.
- No other query (`userProfile(id)`, `getUserDetails`, etc.) exists.

## Minimal fix (either works)

**Option A — add a field to `User`:**
```graphql
type User {
  # ...existing fields...
  details: UserDetails
}
```
Then `getAllUsers`/`allPlatformUsers` resolvers need to join/batch-load
`UserDetails` per returned user (a DataLoader avoids an N+1 query).

**Option B — a dedicated public-directory query**, if exposing
`hashedRefreshToken`-adjacent fields on `User` broadly is undesirable:
```graphql
type PublicProfile {
  id: ID!
  name: String
  email: String!
  title: String
  bio: String
  profilePicUrl: String
  githubUsername: String
  linkedInUrl: String
}

directoryUsers(orgId: String): [PublicProfile!]!
```

Either way, once live, the frontend change is small: extend the
`GET_ALL_USERS` query in `src/graphql/mutations/users.ts` with the new
field(s), and update `src/pages/Community.tsx`'s member cards to render
avatar/title/bio/GitHub/LinkedIn when present — the page already renders
name+email today and is structured to extend easily.
