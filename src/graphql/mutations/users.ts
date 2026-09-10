import { gql } from "@apollo/client";

export const GET_ALL_USERS = gql`
  query GetAllUsers($orgId: String) {
    getAllUsers(orgId: $orgId) {
      id
      email
      name
      systemRole
      createdAt
      updatedAt
    }
  }
`;

export const ALL_PLATFORM_USERS = gql`
  query AllPlatformUsers($search: String) {
    allPlatformUsers(search: $search) {
      id
      email
      name
      systemRole
      createdAt
    }
  }
`;

export const MY_PROFILE = gql`
  query MyProfile {
    myProfile {
      id
      name
      email
      systemRole
      createdAt
      updatedAt
      details {
        phoneNumber
        bio
        title
        dob
        address
        profilePicUrl
        avatarUrl
        githubUsername
        linkedInUrl
        leetcodeUsername
        gfgUsername
        instagramUrl
        portfolioUrl
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      systemRole
      updatedAt
      details {
        phoneNumber
        bio
        title
        dob
        address
        profilePicUrl
        avatarUrl
        githubUsername
        linkedInUrl
        leetcodeUsername
        gfgUsername
        instagramUrl
        portfolioUrl
      }
    }
  }
`;

// Note: the live User type does not expose an isActive field (deactivation is
// enforced server-side at login/refresh time), so this mutation's response
// can't be used to read back active state — the frontend tracks the toggle
// optimistically after a successful call instead.
export const SET_USER_ACTIVE = gql`
  mutation SetUserActive($userId: ID!, $isActive: Boolean!) {
    setUserActive(userId: $userId, isActive: $isActive) {
      id
      email
    }
  }
`;

export const UPDATE_USER_SYSTEM_ROLE = gql`
  mutation UpdateUserSystemRole($userId: ID!, $systemRole: SystemRole!) {
    updateUserSystemRole(userId: $userId, systemRole: $systemRole) {
      id
      email
      systemRole
    }
  }
`;
