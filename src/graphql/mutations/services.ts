import { gql } from '@apollo/client';

export const GET_SERVICES = gql`
  query Services {
    services {
      id
      name
      description
      url
      githubUrl
      platforms
      platformLinks
      uptime
      goal
      apiKey
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_SERVICE = gql`
  query Service($id: String!) {
    service(id: $id) {
      id
      name
      description
      url
      githubUrl
      platforms
      platformLinks
      uptime
      goal
      apiKey
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SERVICE = gql`
  mutation CreateService($input: CreateServiceInput!) {
    createService(input: $input) {
      id
      name
      url
      apiKey
      isActive
      createdAt
    }
  }
`;

export const UPDATE_SERVICE = gql`
  mutation UpdateService($id: String!, $input: UpdateServiceInput!) {
    updateService(id: $id, input: $input) {
      id
      name
      uptime
      isActive
      updatedAt
    }
  }
`;

export const DELETE_SERVICE = gql`
  mutation DeleteService($id: String!) {
    deleteService(id: $id)
  }
`;

export const REGENERATE_API_KEY = gql`
  mutation RegenerateServiceApiKey($id: String!) {
    regenerateServiceApiKey(id: $id) {
      id
      name
      apiKey
      updatedAt
    }
  }
`;
