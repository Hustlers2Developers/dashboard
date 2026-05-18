import { gql } from "@apollo/client";

/**
 * Backend contract — implement these in your GraphQL server (MongoDB).
 * See BACKEND_ANALYTICS.md at project root for schema + resolver guidance.
 */

export const GET_ANALYTICS_OVERVIEW = gql`
  query AnalyticsOverview($range: AnalyticsRange) {
    analyticsOverview(range: $range) {
      totalPageviews
      totalUniqueVisitors
      totalSessions
      activeServices
      perService {
        serviceId
        serviceName
        pageviews
        uniqueVisitors
        sessions
        lastSeenAt
      }
      timeseries {
        date
        pageviews
        uniqueVisitors
      }
    }
  }
`;

export const GET_SERVICE_ANALYTICS = gql`
  query ServiceAnalytics($serviceId: ID!, $range: AnalyticsRange) {
    serviceAnalytics(serviceId: $serviceId, range: $range) {
      serviceId
      serviceName
      pageviews
      uniqueVisitors
      sessions
      topPages {
        path
        pageviews
        uniqueVisitors
      }
      topReferrers {
        referrer
        count
      }
      timeseries {
        date
        pageviews
        uniqueVisitors
      }
    }
  }
`;
