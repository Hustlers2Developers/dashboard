import { gql } from "@apollo/client";

export const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      email
      name
      systemRole
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    getUserById(id: $id) {
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
        githubUsername
        linkedInUrl
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
      details {
        bio
        title
        githubUsername
        linkedInUrl
        portfolioUrl
      }
    }
  }
`;
