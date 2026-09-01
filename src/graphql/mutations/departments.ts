import { gql } from '@apollo/client';

export const GET_DEPARTMENT = gql`
  query GetDepartment($id: String!) {
    department(id: $id) {
      id
      name
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_DEPARTMENTS = gql`
  query GetAllDepartments {
    allDepartments {
      id
      name
      organizationId
      createdAt
      updatedAt
    }
  }
`;

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

export const GET_DEPARTMENT_USERS = gql`
  query GetDepartmentUsers($departmentId: String!) {
    departmentUsers(departmentId: $departmentId) {
      id
      userId
      departmentId
      positionId
      createdAt
    }
  }
`;

export const ASSIGN_USER_TO_DEPARTMENT = gql`
  mutation AssignUserToDepartment($input: AssignUserDepartmentInput!) {
    assignUserToDepartment(input: $input) {
      id
      userId
      departmentId
      positionId
      createdAt
    }
  }
`;

export const REMOVE_USER_FROM_DEPARTMENT = gql`
  mutation RemoveUserFromDepartment($id: String!) {
    removeUserFromDepartment(id: $id)
  }
`;
