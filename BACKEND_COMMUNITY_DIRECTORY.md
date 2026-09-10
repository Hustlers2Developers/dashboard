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

## Also needed: a public/private toggle on `UserDetails`

Add a boolean, e.g. `UserDetails.isPublic: Boolean!` (default `true`, or
`false` if you want opt-in rather than opt-out), settable via
`UpdateProfileInput.isPublic`. This controls whether the extra fields above
(avatar/title/bio/GitHub/LinkedIn) are included for that user in whichever
directory query you build (Option A/B) — name + email stay visible either
way (Community already shows those regardless), only the additional detail
fields are gated by this flag. Resolver-side: when `isPublic` is `false`,
omit/null those fields for that user in the directory response rather than
relying on the frontend to hide them (a private user's data shouldn't leave
the server at all).

Frontend (already built, currently a no-op until this field exists — see
`src/pages/Profile.tsx`'s "Profile visibility" toggle): once
`UserDetails.isPublic` exists, add `isPublic` to the `MY_PROFILE` query and
`updateProfile` mutation call in `src/pages/Profile.tsx`, and wire the
toggle's `onCheckedChange` to actually save it.
