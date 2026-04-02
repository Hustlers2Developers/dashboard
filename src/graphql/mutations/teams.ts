import { gql } from '@apollo/client';

export const GET_TEAMS_BY_ORG = gql`
  query GetTeamsByOrganization($organizationId: String!) {
    teamsByOrganization(organizationId: $organizationId) {
      id
      name
      organizationId
      projectId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($input: CreateTeamInput!) {
    createTeam(input: $input) {
      id
      name
      organizationId
      projectId
      createdAt
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation UpdateTeam($id: String!, $input: UpdateTeamInput!) {
    updateTeam(id: $id, input: $input) {
      id
      name
      projectId
      updatedAt
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation DeleteTeam($id: String!) {
    deleteTeam(id: $id)
  }
`;

export const GET_TEAM_MEMBERS = gql`
  query GetTeamMembersByTeam($teamId: String!) {
    teamMembersByTeam(teamId: $teamId) {
      id
      teamId
      userId
      role
      createdAt
    }
  }
`;

export const CREATE_TEAM_MEMBER = gql`
  mutation CreateTeamMember($input: CreateTeamMemberInput!) {
    createTeamMember(input: $input) {
      id
      teamId
      userId
      role
      createdAt
    }
  }
`;

export const DELETE_TEAM_MEMBER = gql`
  mutation DeleteTeamMember($id: String!) {
    deleteTeamMember(id: $id)
  }
`;
