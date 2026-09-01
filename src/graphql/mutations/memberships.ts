import { gql } from "@apollo/client";

export const GET_MEMBERSHIPS = gql`
  query GetMemberships($userId: String, $organizationId: String) {
    memberships(userId: $userId, organizationId: $organizationId) {
      id
      userId
      organizationId
      roleId
      joinedAt
      isActive
    }
  }
`;

export const GET_ORG_ROLES = gql`
  query OrgRoles($organizationId: String!) {
    orgRoles(organizationId: $organizationId) {
      id
      name
      description
      isSystemRole
      createdAt
    }
  }
`;

export const CREATE_MEMBERSHIP = gql`
  mutation CreateMembership($input: CreateMembershipInput!) {
    createMembership(input: $input) {
      id
      userId
      organizationId
      roleId
      joinedAt
      isActive
    }
  }
`;

export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($input: UpdateMemberRoleInput!) {
    updateMemberRole(input: $input) {
      id
      userId
      organizationId
      roleId
      joinedAt
      isActive
    }
  }
`;

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($input: RemoveMemberInput!) {
    removeMember(input: $input)
  }
`;
