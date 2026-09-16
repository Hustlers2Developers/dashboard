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
