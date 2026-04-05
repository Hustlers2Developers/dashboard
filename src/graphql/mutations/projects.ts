import { gql } from '@apollo/client';

export const GET_PROJECTS_BY_ORG = gql`
  query GetProjectsByOrganization($organizationId: String!) {
    projectsByOrganization(organizationId: $organizationId) {
      id
      name
      description
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      organizationId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: String!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: String!) {
    deleteProject(id: $id)
  }
`;

export const GET_TASKS_BY_PROJECT = gql`
  query GetTasksByProject($projectId: String!) {
    tasksByProject(projectId: $projectId) {
      id
      title
      description
      status
      githubRepo
      githubBranch
      githubIssueUrl
      assignedUserId
      assignedTeamId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      projectId
      status
      githubRepo
      githubBranch
      githubIssueUrl
      assignedUserId
      assignedTeamId
      createdBy
      createdAt
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: String!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      title
      description
      status
      githubRepo
      githubBranch
      githubIssueUrl
      assignedUserId
      assignedTeamId
      updatedAt
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: String!) {
    deleteTask(id: $id)
  }
`;
