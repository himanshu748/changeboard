/** All caption positions are JavaScript UTF-16 code-unit offsets; never code points. */
export type FactId = "date" | "time" | "venue" | "address";

export interface Facts {
  date: string;
  time: string;
  venue: string;
  address: string;
  timezone: string;
}

export interface Asset {
  id?: string;
  url: string;
  type: "image" | "video" | string;
  altText?: string;
  metadata?: Record<string, unknown>;
}

export type ScheduleMode = "customScheduled" | "queue" | "draft";

export interface Snapshot {
  id: string;
  channelId: string;
  channelName: string;
  service: string;
  status: string;
  text: string;
  scheduledAt: string | null;
  mode: ScheduleMode;
  assets: Asset[];
  metadata: Record<string, unknown>;
  allowedActions: string[];
  channelTimezone: string;
  structuredMentions?: boolean;
  fingerprint?: string;
}

export type BindingKind = "literal" | "weekday" | "date" | "time" | "relative";
export interface Binding {
  id: string;
  fact: FactId;
  start: number;
  end: number;
  text: string;
  kind: BindingKind;
  confirmed: boolean;
  sourceFingerprint: string;
  /** A deliberately ignored suggestion is not treated as an association. */
  ignored?: boolean;
  format?: string;
}

export interface DomainIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  bindingId?: string;
}

export interface BindingInput {
  fact: FactId;
  text: string;
  /** Zero-based occurrence, required when text occurs more than once. */
  occurrence?: number;
  kind?: BindingKind;
}

export interface ScheduleOptions {
  strategy?: "keep" | "preserve_offset" | "explicit_date" | "fix_time";
  /** Required to interpret relative expressions against a fixed instant. */
  fixedTimeConfirmed?: boolean;
  /** Required for preserve_offset; offset is measured in calendar days and local wall-clock minutes. */
  offsetConfirmed?: boolean;
  /** ISO local date/time in the event timezone, interpreted with disambiguation=reject. */
  fixedLocalTime?: string;
  now?: string;
  cutoffMinutes?: number;
}

export interface CaptionChange {
  bindingId: string;
  fact: FactId;
  start: number;
  end: number;
  before: string;
  after: string;
  newStart: number;
  newEnd: number;
  reason: string;
}

export interface RelativeContext {
  publicationDate: string;
  eventDate: string;
  channelDate: string;
  eventTimezone: string;
  channelTimezone: string;
  days: number;
}

export interface RepairResult {
  text: string;
  scheduledAt: string | null;
  mode: ScheduleMode;
  changes: CaptionChange[];
  bindings: Binding[];
  issues: DomainIssue[];
  eligible: boolean;
  relativeContext?: RelativeContext;
  offset?: { days: number; minutes: number; description: string };
}

export interface EligibilityOptions {
  now?: string;
  cutoffMinutes?: number;
  /** Omit only for local samples/tests. Live adapters must supply verified service names. */
  liveVerifiedServices?: string[];
}
