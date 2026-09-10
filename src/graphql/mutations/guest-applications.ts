import { gql } from '@apollo/client';

export const SUBMIT_GUEST_APPLICATION = gql`
  mutation SubmitGuestApplication($input: SubmitGuestApplicationInput!) {
    submitGuestApplication(input: $input) {
      id
      name
      email
      status
      createdAt
    }
  }
`;

export const GUEST_APPLICATION_BY_INVITE_TOKEN = gql`
  query GuestApplicationByInviteToken($token: String!) {
    guestApplicationByInviteToken(token: $token) {
      name
      githubUsername
      portfolioUrl
    }
  }
`;

export const GET_GUEST_APPLICATIONS = gql`
  query GuestApplications($status: GuestApplicationStatus) {
    guestApplications(status: $status) {
      id
      name
      email
      phoneNumber
      githubUsername
      portfolioUrl
      reason
      status
      reviewedBy
      reviewedAt
      inviteId
      createdAt
    }
  }
`;

export const APPROVE_GUEST_APPLICATION = gql`
  mutation ApproveGuestApplication(
    $id: ID!
    $organizationId: String!
    $roleId: String
  ) {
    approveGuestApplication(
      id: $id
      organizationId: $organizationId
      roleId: $roleId
    ) {
      id
      status
      reviewedAt
      inviteId
    }
  }
`;

export const REJECT_GUEST_APPLICATION = gql`
  mutation RejectGuestApplication($id: ID!) {
    rejectGuestApplication(id: $id) {
      id
      status
      reviewedAt
    }
  }
`;
