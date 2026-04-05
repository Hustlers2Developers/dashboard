import { gql } from '@apollo/client';
export const CREATE_INVITE_LINK = gql`
  mutation CreateInviteLink($input: CreateInviteInput!) {
    createInviteLink(input: $input) {
      inviteId
      inviteLink
      email
      roleId
      expiresAt
      invitedById
      organizationId
    }
  }
`;
export const ACCEPT_INVITE = gql`
  mutation AcceptInvite($input: AcceptInviteInput!) {
    acceptInvite(input: $input) {
      accessToken
      refreshToken
    }
  }
`;
