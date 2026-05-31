import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;


export const REFRESH_TOKENS_MUTATION = gql`
  mutation RefreshTokens {
    refreshTokens {
      accessToken
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

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
