# Analytics Backend Contract (MongoDB + GraphQL)

Frontend Analytics page (`/analytics`) and the embeddable tracker
(`public/track.js`) expect the following pieces on your GraphQL server.

## 1. HTTP Ingest Endpoint

The tracker POSTs JSON to a non-GraphQL HTTP route. Keep it simple, no auth
beyond the per-service API key — high write volume.

```
POST /analytics/collect
Content-Type: application/json

{
  "type": "pageview" | "event",
  "apiKey": "<service.apiKey>",
  "vid":   "<anonymous visitor uuid, stable per device>",
  "sid":   "<session id, 30min sliding>",
  "url":   "https://app.example.com/path?x=1",
  "path":  "/path",
  "referrer": "https://google.com" | null,
  "title": "Page title",
  "lang":  "en-US",
  "screen": "1920x1080",
  "viewport": "1440x900",
  "tz":    "Asia/Kolkata",
  "utm":   { "utm_source": "...", "utm_medium": "..." },
  "ts":    1715000000000,
  "name":  "button_click",     // only for type=event
  "props": { ... }              // only for type=event
}
```

Response: `204 No Content`. CORS: allow `*`.

### Server steps per request

1. Look up `Service` by `apiKey`. If not found or inactive → drop silently (204).
2. Resolve client IP and UA from request headers (do NOT trust client).
3. Insert into `analytics_events`.
4. Upsert `analytics_visitors` (unique per `(serviceId, vid)`).

## 2. MongoDB Collections

### `analytics_events`
```js
{
  _id: ObjectId,
  serviceId: ObjectId,        // indexed
  type: "pageview" | "event",
  vid: String,                // anonymous visitor id
  sid: String,                // session id
  path: String,
  url: String,
  referrer: String | null,
  title: String | null,
  utm: { source, medium, campaign, term, content },
  lang: String,
  screen: String,
  viewport: String,
  tz: String,
  country: String | null,     // from IP (optional)
  ua: String,                 // raw user-agent
  device: "desktop" | "mobile" | "tablet" | "bot",
  name: String | null,        // event name
  props: Object | null,
  ip: String,                 // hashed if you care about GDPR
  ts: Date                    // indexed (TTL-friendly)
}
```
Indexes:
- `{ serviceId: 1, ts: -1 }`
- `{ serviceId: 1, vid: 1, ts: -1 }`
- `{ ts: 1 }` (optional TTL e.g. 180 days)

### `analytics_visitors`
```js
{
  _id: ObjectId,
  serviceId: ObjectId,
  vid: String,
  firstSeenAt: Date,
  lastSeenAt: Date,
  pageviews: Number,
  sessions: Number
}
```
Unique index: `{ serviceId: 1, vid: 1 }`.

## 3. GraphQL Schema Additions

```graphql
enum AnalyticsRange {
  TODAY
  LAST_7_DAYS
  LAST_30_DAYS
  ALL_TIME
}

type ServiceAnalyticsRow {
  serviceId: ID!
  serviceName: String!
  pageviews: Int!
  uniqueVisitors: Int!
  sessions: Int!
  lastSeenAt: String
}

type AnalyticsTimePoint {
  date: String!
  pageviews: Int!
  uniqueVisitors: Int!
}

type AnalyticsOverview {
  totalPageviews: Int!
  totalUniqueVisitors: Int!
  totalSessions: Int!
  activeServices: Int!
  perService: [ServiceAnalyticsRow!]!
  timeseries: [AnalyticsTimePoint!]!
}

type TopPage {
  path: String!
  pageviews: Int!
  uniqueVisitors: Int!
}

type TopReferrer {
  referrer: String!
  count: Int!
}

type ServiceAnalytics {
  serviceId: ID!
  serviceName: String!
  pageviews: Int!
  uniqueVisitors: Int!
  sessions: Int!
  topPages: [TopPage!]!
  topReferrers: [TopReferrer!]!
  timeseries: [AnalyticsTimePoint!]!
}

extend type Query {
  analyticsOverview(range: AnalyticsRange = LAST_7_DAYS): AnalyticsOverview!
  serviceAnalytics(serviceId: ID!, range: AnalyticsRange = LAST_7_DAYS): ServiceAnalytics!
}
```

### Aggregation cheat-sheet (per service, given `from` Date)

```js
db.analytics_events.aggregate([
  { $match: { serviceId, ts: { $gte: from }, type: "pageview" } },
  { $group: {
      _id: "$serviceId",
      pageviews:      { $sum: 1 },
      uniqueVisitors: { $addToSet: "$vid" },
      sessions:       { $addToSet: "$sid" },
      lastSeenAt:     { $max: "$ts" }
  } },
  { $project: {
      pageviews: 1,
      uniqueVisitors: { $size: "$uniqueVisitors" },
      sessions:       { $size: "$sessions" },
      lastSeenAt: 1
  } }
])
```

Only `SUPER_ADMIN` should be able to query analytics resolvers.
