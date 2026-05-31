import { gql } from '@apollo/client';

export const GET_INVITES = gql`
  query GetInvites($organizationId: String, $email: String, $status: String) {
    invites(organizationId: $organizationId, email: $email, status: $status) {
      id
      email
      organizationId
      roleId
      invitedById
      expiresAt
      acceptedAt
      createdAt
    }
  }
`;

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
export const VALIDATE_INVITE = gql`
  query ValidateInvite($token: String!) {
    validateInvite(token: $token) {
      email
      organizationId
      roleId
      expiresAt
    }
  }
`;
