import { gql } from "@apollo/client";

export const GITHUB_CONTRIBUTIONS = gql`
  query GithubContributions {
    githubContributions {
      githubUsername
      commits
      syncedAt
      linkedUserId
      linkedUserName
    }
  }
`;

export const SYNC_GITHUB_CONTRIBUTIONS = gql`
  mutation SyncGithubContributions {
    syncGithubContributions {
      synced
    }
  }
`;
