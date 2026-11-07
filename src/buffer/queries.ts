// Verified against developers.buffer.com/reference.html on 2026-10-25.
export const CHANNEL_FIELDS = `
  id organizationId name displayName service type timezone allowedActions
  isDisconnected isLocked isQueuePaused
`;

// No metrics: OAuth apps cannot use the personal-key-only metrics surface.
export const POST_FIELDS = `
  id text channelId channelService status dueAt isCustomScheduled shareMode schedulingType
  allowedActions updatedAt createdAt sentAt
  channel { ${CHANNEL_FIELDS} }
  tags { id name color }
  assets {
    __typename id source thumbnail mimeType type
    ... on ImageAsset { image { altText width height isAnimated userTags { handle x y } } }
  }
  metadata {
    __typename
    ... on CommonPostMetadata { type annotations { type text content indices url } }
    ... on FacebookPostMetadata {
      firstComment title
      linkAttachment { url title text thumbnail expandedUrl thumbnails }
    }
    ... on InstagramPostMetadata {
      firstComment geolocation { id text } isAiGenerated link shouldShareToFeed
      stickerFields { music other products text topics }
    }
  }
`;
export const ACCOUNT_QUERY = `query ChangeboardAccount { account { id name organizations { id name } } }`;
export const CHANNELS_QUERY = `query ChangeboardChannels($input: ChannelsInput!) { channels(input: $input) { ${CHANNEL_FIELDS} } }`;
export const POST_QUERY = `query ChangeboardPost($input: PostInput!) { post(input: $input) { ${POST_FIELDS} } }`;
export const POSTS_QUERY = `query ChangeboardPosts($input: PostsInput!, $first: Int!, $after: String) {
  posts(input: $input, first: $first, after: $after) {
    edges { node { ${POST_FIELDS} } }
    pageInfo { hasNextPage endCursor }
  }
}`;
export const EDIT_POST_MUTATION = `mutation ChangeboardEditPost($input: EditPostInput!) {
  editPost(input: $input) { __typename ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } }
}`;
export const CREATE_POST_MUTATION = `mutation ChangeboardCorrectionDraft($input: CreatePostInput!) {
  createPost(input: $input) { __typename ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } }
}`;
