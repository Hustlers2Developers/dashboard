import { gql } from "@apollo/client";

export const COMMUNITY_POSTS = gql`
  query CommunityPosts($organizationId: String!, $pagination: PaginationInput) {
    communityPosts(organizationId: $organizationId, pagination: $pagination) {
      data {
        id
        organizationId
        authorId
        title
        content
        replyCount
        createdAt
        updatedAt
      }
      pageInfo {
        page
        limit
        total
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const COMMUNITY_POST = gql`
  query CommunityPost($id: String!) {
    communityPost(id: $id) {
      id
      organizationId
      authorId
      title
      content
      replyCount
      createdAt
      updatedAt
    }
  }
`;

export const COMMUNITY_REPLIES = gql`
  query CommunityReplies($postId: String!, $pagination: PaginationInput) {
    communityReplies(postId: $postId, pagination: $pagination) {
      data {
        id
        postId
        authorId
        content
        createdAt
        updatedAt
      }
      pageInfo {
        page
        limit
        total
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const CREATE_COMMUNITY_POST = gql`
  mutation CreateCommunityPost($input: CreateCommunityPostInput!) {
    createCommunityPost(input: $input) {
      id
      organizationId
      authorId
      title
      content
      replyCount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_COMMUNITY_POST = gql`
  mutation UpdateCommunityPost($id: String!, $input: UpdateCommunityPostInput!) {
    updateCommunityPost(id: $id, input: $input) {
      id
      title
      content
      updatedAt
    }
  }
`;

export const DELETE_COMMUNITY_POST = gql`
  mutation DeleteCommunityPost($id: String!) {
    deleteCommunityPost(id: $id)
  }
`;

export const CREATE_COMMUNITY_REPLY = gql`
  mutation CreateCommunityReply($input: CreateCommunityReplyInput!) {
    createCommunityReply(input: $input) {
      id
      postId
      authorId
      content
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_COMMUNITY_REPLY = gql`
  mutation UpdateCommunityReply($id: String!, $input: UpdateCommunityReplyInput!) {
    updateCommunityReply(id: $id, input: $input) {
      id
      content
      updatedAt
    }
  }
`;

export const DELETE_COMMUNITY_REPLY = gql`
  mutation DeleteCommunityReply($id: String!) {
    deleteCommunityReply(id: $id)
  }
`;
