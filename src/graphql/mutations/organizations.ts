import { gql } from "@apollo/client";

export const GET_ALL_ORGANIZATIONS = gql`
  query GetAllOrganizations {
    organizations {
      id
      name
      slug
    }
  }
`;

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      id
      name
      slug
    }
  }
`;

export const UPDATE_ORGANIZATION = gql`
  mutation UpdateOrganization($id: String!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $id, input: $input) {
      id
      name
      slug
    }
  }
`;

export const DELETE_ORGANIZATION = gql`
  mutation DeleteOrganization($id: String!) {
    deleteOrganization(id: $id)
  }
`;