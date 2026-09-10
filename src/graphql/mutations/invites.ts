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
      token
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

export const ACCEPT_INVITE = gql`
  mutation AcceptInvite($input: AcceptInviteInput!) {
    acceptInvite(input: $input) {
      accessToken
    }
  }
`;

export const RESEND_INVITE_LINK = gql`
  mutation ResendInviteLink($inviteId: ID!) {
    resendInviteLink(inviteId: $inviteId) {
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

export const DELETE_INVITE = gql`
  mutation DeleteInvite($inviteId: ID!) {
    deleteInvite(inviteId: $inviteId)
  }
`;
