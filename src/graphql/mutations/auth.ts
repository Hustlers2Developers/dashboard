import { gql } from '@apollo/client';

// Note: login/refreshTokens/logout are NOT called through Apollo — the real
// auth flow (src/services/auth.service.ts) hand-rolls these as raw fetch()
// calls so it can run before the Apollo client's own token/refresh wiring
// exists yet. Apollo-based LOGIN_MUTATION/REFRESH_TOKENS_MUTATION/
// LOGOUT_MUTATION constants used to live here but were always dead code —
// removed rather than left as a confusing second (unused) path.

export const CURRENT_USER_QUERY = gql`
  query CurrentUser {
    currentUser {
      sub
      email
      systemRole
      orgId
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input)
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

// Consistent within a UTC day — safe to cache-first per day without
// refetching on every dashboard visit.
export const DAILY_QUOTE = gql`
  query DailyQuote {
    dailyQuote {
      text
      author
    }
  }
`;
