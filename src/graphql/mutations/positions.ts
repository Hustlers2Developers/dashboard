import { gql } from '@apollo/client';

export const GET_POSITION = gql`
  query GetPosition($id: String!) {
    position(id: $id) {
      id
      name
      departmentId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_POSITIONS = gql`
  query GetAllPositions {
    allPositions {
      id
      name
      departmentId
      createdAt
      updatedAt
    }
  }
`;

export const GET_POSITIONS_BY_ORG = gql`
  query GetPositionsByOrganization($organizationId: String!) {
    positionsByOrganization(organizationId: $organizationId) {
      id
      name
      departmentId
      createdAt
      updatedAt
    }
  }
`;

export const GET_POSITIONS_BY_DEPARTMENT = gql`
  query GetPositionsByDepartment($departmentId: String!) {
    positionsByDepartment(departmentId: $departmentId) {
      id
      name
      departmentId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_POSITION = gql`
  mutation CreatePosition($input: CreatePositionInput!) {
    createPosition(input: $input) {
      id
      name
      departmentId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_POSITION = gql`
  mutation UpdatePosition($id: String!, $input: UpdatePositionInput!) {
    updatePosition(id: $id, input: $input) {
      id
      name
      updatedAt
    }
  }
`;

export const DELETE_POSITION = gql`
  mutation DeletePosition($id: String!) {
    deletePosition(id: $id)
  }
`;
