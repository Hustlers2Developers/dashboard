/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }": typeof types.LoginDocument,
    "mutation SendLoginOtp($input: SendLoginOtpInput!) { sendLoginOtp(input: $input) }": typeof types.SendLoginOtpDocument,
    "mutation LoginWithOtp($input: LoginWithOtpInput!) { loginWithOtp(input: $input) { accessToken } }": typeof types.LoginWithOtpDocument,
    "mutation RefreshTokens { refreshTokens { accessToken } }": typeof types.RefreshTokensDocument,
    "mutation Logout { logout }": typeof types.LogoutDocument,
    "query CurrentUser { currentUser { sub email systemRole orgId } }": typeof types.CurrentUserDocument,
};
const documents: Documents = {
    "mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }": types.LoginDocument,
    "mutation SendLoginOtp($input: SendLoginOtpInput!) { sendLoginOtp(input: $input) }": types.SendLoginOtpDocument,
    "mutation LoginWithOtp($input: LoginWithOtpInput!) { loginWithOtp(input: $input) { accessToken } }": types.LoginWithOtpDocument,
    "mutation RefreshTokens { refreshTokens { accessToken } }": types.RefreshTokensDocument,
    "mutation Logout { logout }": types.LogoutDocument,
    "query CurrentUser { currentUser { sub email systemRole orgId } }": types.CurrentUserDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }"): (typeof documents)["mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation SendLoginOtp($input: SendLoginOtpInput!) { sendLoginOtp(input: $input) }"): (typeof documents)["mutation SendLoginOtp($input: SendLoginOtpInput!) { sendLoginOtp(input: $input) }"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation LoginWithOtp($input: LoginWithOtpInput!) { loginWithOtp(input: $input) { accessToken } }"): (typeof documents)["mutation LoginWithOtp($input: LoginWithOtpInput!) { loginWithOtp(input: $input) { accessToken } }"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation RefreshTokens { refreshTokens { accessToken } }"): (typeof documents)["mutation RefreshTokens { refreshTokens { accessToken } }"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Logout { logout }"): (typeof documents)["mutation Logout { logout }"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query CurrentUser { currentUser { sub email systemRole orgId } }"): (typeof documents)["query CurrentUser { currentUser { sub email systemRole orgId } }"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;