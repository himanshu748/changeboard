import type {
  Facts,
  Snapshot,
  Binding,
  ScheduleOptions,
  CaptionChange,
  DomainIssue,
  RelativeContext,
} from "./domain/types";
export type {
  Facts,
  Snapshot,
  Binding,
  ScheduleOptions,
  CaptionChange,
  DomainIssue,
  RelativeContext,
} from "./domain/types";
export type Stage = "choose" | "facts" | "review" | "results";
export type OperationStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "needs_review"
  | "failed"
  | "skipped"
  | "uncertain";
export interface MediaState {
  revision: number;
  status: "needs_review" | "accurate" | "poster" | "replacement";
  url?: string;
  altText?: string;
  acknowledged: boolean;
}
export interface LinkedPost {
  snapshot: Snapshot;
  bindings: Binding[];
  media: MediaState;
  schedule: ScheduleOptions;
  selected: boolean;
  baselineFacts: Facts;
}
export interface Proposal {
  postId: string;
  before: Snapshot;
  current?: Snapshot;
  after: Snapshot;
  changes: CaptionChange[];
  issues: DomainIssue[];
  eligible: boolean;
  selected: boolean;
  media: MediaState;
  bindings: Binding[];
  relativeContext?: RelativeContext;
  offset?: { days: number; minutes: number; description: string };
  action: "edit" | "move_to_draft";
}
export interface ChangeSet {
  id: string;
  revision: number;
  campaignVersion: number;
  createdAt: string;
  proposals: Proposal[];
  applied: boolean;
}
export interface Operation {
  id: string;
  changeSetId: string;
  postId: string;
  action: "edit" | "move_to_draft" | "correction";
  status: OperationStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
  before: Snapshot;
  after: Snapshot;
  remoteId?: string;
  attempts: number;
}
export interface Correction {
  announcementId: string;
  text: string;
  channelId: string;
  approved?: boolean;
  operationId?: string;
}
export interface Campaign {
  id: string;
  name: string;
  mode: "sample" | "live";
  organizationId: string;
  organizationName: string;
  stage: Stage;
  version: number;
  revision: number;
  originalFacts: Facts;
  facts: Facts;
  proposedFacts: Facts;
  factsConfirmed: boolean;
  posts: LinkedPost[];
  availablePosts: Snapshot[];
  announcement?: Snapshot;
  correction?: Correction;
  changeSet?: ChangeSet;
  operations: Operation[];
  createdAt: string;
}
export interface Organization {
  id: string;
  name: string;
}
export interface Channel {
  id: string;
  name: string;
  service: string;
  timezone: string;
}
export interface AppState {
  csrf: string;
  campaign?: Campaign;
  connection: {
    status: "not_connected" | "connected" | "expired" | "revoked" | "denied";
    configured: boolean;
    organizations: Organization[];
    channels: Channel[];
    organizationId?: string;
    message?: string;
    readReceipts?: {
      at: string;
      operation: string;
      httpStatus?: number;
      outcome: "response" | "transport_error";
      apiErrors: boolean;
      postsReturned?: number;
    }[];
  };
  liveVerifiedServices: string[];
}
