import { gql } from "@apollo/client";

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($pagination: PaginationInput) {
    myNotifications(pagination: $pagination) {
      data {
        id
        type
        title
        message
        metadata
        isRead
        createdAt
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

export const MY_UNREAD_NOTIFICATION_COUNT = gql`
  query MyUnreadNotificationCount {
    myUnreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const SEND_ANNOUNCEMENT = gql`
  mutation SendAnnouncement($input: SendAnnouncementInput!) {
    sendAnnouncement(input: $input)
  }
`;

export const GRANT_ACHIEVEMENT = gql`
  mutation GrantAchievement($input: GrantAchievementInput!) {
    grantAchievement(input: $input) {
      id
      type
      title
      message
      createdAt
    }
  }
`;
