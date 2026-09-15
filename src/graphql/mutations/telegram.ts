import { gql } from "@apollo/client";

export const LINK_TELEGRAM_ACCOUNT = gql`
  mutation LinkTelegramAccount($input: TelegramLoginWidgetInput!) {
    linkTelegramAccount(input: $input) {
      id
      telegramUserId
      telegramUsername
      telegramLinkedAt
    }
  }
`;

export const UNLINK_TELEGRAM_ACCOUNT = gql`
  mutation UnlinkTelegramAccount {
    unlinkTelegramAccount {
      id
      telegramUserId
      telegramUsername
      telegramLinkedAt
    }
  }
`;
