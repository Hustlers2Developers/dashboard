import { gql } from '@apollo/client';

export const GET_PROJECT = gql`
  query GetProject($id: String!) {
    project(id: $id) {
      id
      name
      description
      organizationId
      githubRepoUrl
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROJECTS_BY_ORG = gql`
  query GetProjectsByOrganization($organizationId: String!) {
    projectsByOrganization(organizationId: $organizationId) {
      id
      name
      description
      organizationId
      githubRepoUrl
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
      githubRepoUrl
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
      githubRepoUrl
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: String!) {
    deleteProject(id: $id)
  }
`;

export const GET_PROJECT_CONTRIBUTORS = gql`
  query GetProjectContributors($projectId: String!) {
    projectContributors(projectId: $projectId) {
      username
      avatarUrl
      profileUrl
      contributions
    }
  }
`;

export const GET_TASKS_BY_PROJECT = gql`
  query GetTasksByProject($projectId: String!) {
    tasksByProject(projectId: $projectId) {
      id
      shortNumber
      title
      description
      status
      githubRepo
      githubBranch
      githubIssueUrl
      githubPrUrl
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
      shortNumber
      title
      description
      projectId
      status
      githubRepo
      githubBranch
      githubIssueUrl
      githubPrUrl
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
      shortNumber
      title
      description
      status
      githubRepo
      githubBranch
      githubIssueUrl
      githubPrUrl
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

export const GET_PROJECT_MEMBERS = gql`
  query GetProjectMembers($projectId: String!) {
    projectMembers(projectId: $projectId) {
      id
      projectId
      userId
      role
      createdAt
    }
  }
`;

export const ADD_PROJECT_MEMBER = gql`
  mutation AddProjectMember($input: AddProjectMemberInput!) {
    addProjectMember(input: $input) {
      id
      projectId
      userId
      role
      createdAt
    }
  }
`;

export const UPDATE_PROJECT_MEMBER = gql`
  mutation UpdateProjectMember($id: String!, $input: UpdateProjectMemberInput!) {
    updateProjectMember(id: $id, input: $input) {
      id
      userId
      role
      updatedAt
    }
  }
`;

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($id: String!) {
    removeProjectMember(id: $id)
  }
`;
