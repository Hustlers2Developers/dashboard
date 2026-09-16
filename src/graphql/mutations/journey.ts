import { gql } from "@apollo/client";

export const MY_JOURNEY_PROGRESS = gql`
  query MyJourneyProgress($userId: ID!) {
    journeyProgress(userId: $userId) {
      userId
      progress
      syncedAt
      lastSyncError
    }
  }
`;
