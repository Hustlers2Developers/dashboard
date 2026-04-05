import { gql } from '@apollo/client';

export const GET_DEPARTMENTS_BY_ORG = gql`
  query GetDepartmentsByOrganization($organizationId: String!) {
    departmentsByOrganization(organizationId: $organizationId) {
      id
      name
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment($id: String!, $input: UpdateDepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id
      name
      updatedAt
    }
  }
`;

export const DELETE_DEPARTMENT = gql`
  mutation DeleteDepartment($id: String!) {
    deleteDepartment(id: $id)
  }
`;
