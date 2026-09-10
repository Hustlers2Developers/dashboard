import { gql } from '@apollo/client';

export const GET_SERVICES = gql`
  query Services {
    services {
      id
      name
      slug
      domain
      serviceType
      description
      url
      githubUrl
      platforms
      platformLinks
      uptime
      goal
      frontendFramework
      styling
      deploymentPlatform
      proxyProvider
      version
      tags
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
      slug
      domain
      serviceType
      url
      apiKey
      isActive
      createdAt
    }
  }
`;

export const UPDATE_SERVICE = gql`
  mutation UpdateService($id: ID!, $input: UpdateServiceInput!) {
    updateService(id: $id, input: $input) {
      id
      name
      description
      url
      githubUrl
      platforms
      platformLinks
      uptime
      goal
      isActive
      updatedAt
    }
  }
`;

export const DELETE_SERVICE = gql`
  mutation DeleteService($id: ID!) {
    deleteService(id: $id)
  }
`;

export const REGENERATE_API_KEY = gql`
  mutation RegenerateServiceApiKey($id: ID!) {
    regenerateServiceApiKey(id: $id) {
      id
      name
      apiKey
      updatedAt
    }
  }
`;
