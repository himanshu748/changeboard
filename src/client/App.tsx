import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileText,
  Image as ImageIcon,
  Link2,
  MapPin,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unplug,
  X,
  CalendarDays,
  Layers,
  AlertTriangle,
  Upload,
  ArrowLeft,
  Globe2,
  Download,
} from "lucide-react";
import type {
  AppState,
  Campaign,
  Facts,
  Snapshot,
  Binding,
  LinkedPost,
  Proposal,
  CaptionChange,
  ScheduleOptions,
  Operation,
  Stage,
} from "../shared";

type Action = (
  path: string,
  body?: unknown,
  method?: string,
) => Promise<unknown>;
type SharedProps = { campaign: Campaign; action: Action; busy: boolean };
const steps: Array<{ id: Stage; label: string }> = [
  { id: "choose", label: "Choose posts" },
  { id: "facts", label: "Connect facts" },
  { id: "review", label: "Review changes" },
  { id: "results", label: "Results" },
];
const factLabels: Record<string, string> = {
  date: "Event date",
  time: "Start time",
  venue: "Venue name",
  address: "Venue address",
};
const blankFacts: Facts = {
  date: "",
  time: "",
  venue: "",
  address: "",
  timezone: "Europe/London",
};
const iconSize = 16;

function readableDate(date: string, weekday = true) {
  if (!date) return "Date not set";
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.valueOf())
    ? date
    : new Intl.DateTimeFormat("en-GB", {
        weekday: weekday ? "short" : undefined,
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(d);
}
function readableTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const h = Number(time.slice(0, 2)),
    min = time.slice(3);
  return `${h % 12 || 12}${min === "00" ? "" : ":" + min} ${h < 12 ? "a.m." : "p.m."}`;
}
function scheduledLabel(post: Snapshot) {
  if (!post.scheduledAt)
    return post.mode === "queue" ? "Floating queue slot" : "Not scheduled";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: post.channelTimezone,
    }).format(new Date(post.scheduledAt));
  } catch {
    return post.scheduledAt;
  }
}
function isPublished(post: Snapshot) {
  return ["sent", "published"].includes(post.status);
}
function unsupported(post: Snapshot) {
  return post.structuredMentions
    ? "Structured mentions need positional metadata support."
    : post.assets.length > 1
      ? "Carousels are not supported yet."
      : post.assets.some((a) => a.type !== "image")
        ? "Video posts are not supported yet."
        : ["sending", "failed"].includes(post.status)
          ? `This post is ${post.status}.`
          : undefined;
}

function Badge({
  kind = "neutral",
  children,
  icon = true,
}: {
  kind?: "neutral" | "teal" | "amber" | "red";
  children: ReactNode;
  icon?: boolean;
}) {
  return (
    <span className={`badge badge-${kind}`}>
      {icon &&
        (kind === "teal" ? (
          <CircleCheck size={13} />
        ) : kind === "amber" || kind === "red" ? (
          <CircleAlert size={13} />
        ) : (
          <span className="status-dot" />
        ))}
      {children}
    </span>
  );
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      changeboard<span className="brand-period">.</span>
    </span>
  );
}
function ChannelMark({ service }: { service: string }) {
  return (
    <span
      className={`channel-mark channel-${service.toLowerCase()}`}
      aria-hidden="true"
    >
      {service.toLowerCase().includes("instagram") ? (
        <span className="instagram-glyph" />
      ) : service.toLowerCase().includes("facebook") ? (
        "f"
      ) : (
        <Layers size={16} />
      )}
    </span>
  );
}
function PostHeader({
  post,
  children,
}: {
  post: Snapshot;
  children?: ReactNode;
}) {
  return (
    <div className="post-header">
      <div className="channel-identity">
        <ChannelMark service={post.service} />
        <div>
          <strong>{post.channelName}</strong>
          <span>
            {post.service} ·{" "}
            {isPublished(post)
              ? "Published"
              : post.status === "draft"
                ? "Draft"
                : "Scheduled"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
function ScheduleLine({ post }: { post: Snapshot }) {
  return (
    <div className="schedule-line">
      <Clock3 size={14} />
      <span>
        {scheduledLabel(post)}{" "}
        <span className="zone">· {post.channelTimezone}</span>
      </span>
    </div>
  );
}
function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Layers size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reload = useCallback(async () => {
    const response = await fetch("/api/state", {
      credentials: "same-origin",
      signal: AbortSignal.timeout(20_000),
    });
    const json = await response.json();
    if (!response.ok)
      throw new Error(json.error || "Could not load your workspace.");
    setState(json);
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);
  const action: Action = useCallback(
    async (path, body = {}, method = "POST") => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const response = await fetch(path, {
          method,
          credentials: "same-origin",
          signal: AbortSignal.timeout(30_000),
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": state?.csrf || "",
          },
          body: method === "GET" ? undefined : JSON.stringify(body),
        });
        const json = await response.json();
        if (!response.ok)
          throw new Error(
            json.error ||
              "This change could not be saved. Your existing work is safe.",
          );
        if (json.csrf) setState(json);
        setNotice("Workspace saved.");
        return json;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
        // A mutation can commit before preview discovery or its response fails.
        // Re-read authoritative state; never retry the mutation automatically.
        try {
          await reload();
        } catch {
          /* The visible error remains; reconnect/reload is explicit. */
        }
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [state?.csrf, reload],
  );
  const campaign = state?.campaign;
  const running = campaign?.operations.some(
    (o) => o.status === "pending" || o.status === "running",
  );
  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => reload().catch((e) => setError(e.message)),
      1200,
    );
    return () => clearInterval(id);
  }, [running, reload]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [campaign?.stage]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <header className="site-header">
        <a href="/" className="brand-link" aria-label="Changeboard home">
          <Brand />
        </a>
        <div className="header-context">
          A little change. Everything in sync.
        </div>
        <div className="header-actions">
          {campaign?.mode === "sample" ? (
            <Badge kind="amber">Sample workspace</Badge>
          ) : state?.connection.status === "connected" ? (
            <Badge kind="teal">Buffer connected</Badge>
          ) : state?.connection.configured ? (
            <a className="text-link connect-link" href="/api/auth/buffer">
              Connect Buffer <ArrowUpRight size={14} />
            </a>
          ) : state ? (
            <button className="text-button" onClick={() => setSettings(true)}>
              Connection details
            </button>
          ) : null}
          <button
            className="icon-button"
            aria-label="Workspace settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      <div className="sr-only" role="status" aria-live="polite">
        {busy
          ? "Saving your change…"
          : running
            ? "Updates are running."
            : notice}
      </div>
      {error && (
        <div className="global-error" role="alert">
          <CircleAlert size={18} />
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
          {!state && (
            <button
              className="button small"
              onClick={() => reload().catch((e) => setError(e.message))}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {state &&
        ["expired", "revoked", "denied"].includes(state.connection.status) && (
          <div className="connection-banner">
            <CircleAlert size={18} />
            <span>
              {state.connection.message ||
                "Your Buffer connection needs attention. Your saved campaign is still here."}
            </span>
            <a href="/api/auth/buffer">
              Reconnect Buffer <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      <main id="main">
        {!state ? (
          <div className="loading-state" role="status">
            <Brand />
            <p>Opening your workspace…</p>
          </div>
        ) : !campaign ? (
          <Introduction
            action={action}
            busy={busy}
            state={state}
            onConnectionHelp={() => setSettings(true)}
          />
        ) : (
          <div className="workspace">
            <div className="workspace-top">
              <div className="breadcrumb">
                <span>Campaigns</span>
                <span>/</span>
                <strong>{campaign.name}</strong>
              </div>
              <span className="saved-note">
                <Check size={14} /> {busy ? "Saving…" : "Changes saved locally"}
                {campaign.mode === "live" ? " · Live account" : ""}
              </span>
            </div>
            <nav className="stepper" aria-label="Campaign repair steps">
              {steps.map((step, index) => {
                const current = steps.findIndex((s) => s.id === campaign.stage);
                return (
                  <button
                    key={step.id}
                    className={`step ${index === current ? "active" : index < current ? "complete" : ""}`}
                    aria-current={index === current ? "step" : undefined}
                    disabled={busy || index > current}
                    onClick={() =>
                      action("/api/campaign/stage", { stage: step.id })
                    }
                  >
                    <span className="step-number">
                      {index < current ? <Check size={14} /> : index + 1}
                    </span>
                    <span>{step.label}</span>
                    {index < steps.length - 1 && <span className="step-line" />}
                  </button>
                );
              })}
            </nav>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  CAMPAIGN REPAIR <span>/</span> 0
                  {steps.findIndex((s) => s.id === campaign.stage) + 1}
                </div>
                <h1 tabIndex={-1} ref={heading}>
                  {campaign.stage === "choose"
                    ? "Start with the posts you already wrote."
                    : campaign.stage === "facts"
                      ? "A few facts. Connected everywhere."
                      : campaign.stage === "review"
                        ? "Small changes. The whole picture."
                        : "Here’s where your campaign stands."}
                </h1>
                <p>
                  {campaign.stage === "choose"
                    ? "Choose the announcements and reminders that belong to this event."
                    : campaign.stage === "facts"
                      ? "Connect the details once. Keep the words that make them yours."
                      : campaign.stage === "review"
                        ? "Review every caption, image, and scheduled time before anything changes."
                        : "Every update has its own outcome. Anything unresolved stays right here."}
                </p>
              </div>
              <span className="revision-tag">
                REVISION {String(campaign.revision).padStart(2, "0")}
              </span>
            </div>
            {campaign.mode === "sample" && (
              <div className="sample-notice">
                <span>
                  <Sparkles size={15} />
                  <strong>Sample campaign</strong>
                  <span>Fictional posts. No Buffer posts will be changed.</span>
                </span>
                {state.connection.status === "connected" ? (
                  <button
                    className="text-button"
                    onClick={() => setSettings(true)}
                  >
                    Open live account <ArrowUpRight size={13} />
                  </button>
                ) : state.connection.configured ? (
                  <a href="/api/auth/buffer">
                    Connect your account <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => setSettings(true)}
                  >
                    Connection details
                  </button>
                )}
              </div>
            )}
            {campaign.mode === "sample" && <SampleGuide campaign={campaign} />}
            {campaign.mode === "live" && !state.liveVerifiedServices.length && (
              <div className="notice amber">
                <CircleAlert size={18} />
                <p>
                  <strong>
                    Live updates are not enabled on this installation yet.
                  </strong>{" "}
                  You can import posts and review proposed changes. Repairs stay
                  blocked until the connected formats have been tested.
                </p>
              </div>
            )}
            {campaign.mode === "live" && state.liveWriteNotice && (
              <div className="notice amber">
                <ShieldCheck size={18} />
                <p>{state.liveWriteNotice}</p>
              </div>
            )}
            {campaign.stage === "choose" && (
              <ChoosePosts
                key={campaign.id}
                campaign={campaign}
                action={action}
                busy={busy}
                state={state}
              />
            )}
            {campaign.stage === "facts" && (
              <ConnectFacts
                key={`${campaign.id}-${campaign.revision}`}
                campaign={campaign}
                action={action}
                busy={busy}
              />
            )}
            {campaign.stage === "review" && (
              <ReviewChanges campaign={campaign} action={action} busy={busy} />
            )}
            {campaign.stage === "results" && (
              <Results campaign={campaign} action={action} busy={busy} />
            )}
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <Brand />{" "}
          <span className="footer-tagline">Your words, kept in sync.</span>
        </span>
        <nav className="footer-actions" aria-label="Product information">
          <a className="text-button" href="/judge.html">
            Judge guide
          </a>
          <button className="text-button" onClick={() => setSettings(true)}>
            Privacy & connection
          </button>
        </nav>
      </footer>
      {settings && state && (
        <Settings
          state={state}
          action={action}
          busy={busy}
          close={() => setSettings(false)}
        />
      )}
    </>
  );
}

function Introduction({
  action,
  busy,
  state,
  onConnectionHelp,
}: {
  action: Action;
  busy: boolean;
  state: AppState;
  onConnectionHelp: () => void;
}) {
  return (
    <div className="introduction">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" /> FOR THE PLANS THAT CHANGE
          </div>
          <h1>
            Change one
            <br />
            event fact.
            <br />
            <em>Repair the campaign.</em>
          </h1>
          <p>
            The date moves. The venue changes. Connect the details in your
            existing Buffer posts, then put the whole campaign back in
            sync—without rewriting your voice.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => action("/api/sample")}
            >
              Try the sample campaign <ArrowRight size={17} />
            </button>
            {state.connection.configured ? (
              <a className="button subtle" href="/api/auth/buffer">
                Connect Buffer <ArrowUpRight size={16} />
              </a>
            ) : (
              <button className="button subtle" onClick={onConnectionHelp}>
                About live connection <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          <span className="hero-footnote">
            <ShieldCheck size={15} /> You review every change before it’s
            applied.
          </span>
          <p className="helper hero-availability">
            No account needed for the sample.{" "}
            {state.connection.configured
              ? "Connect your own Buffer account when you’re ready."
              : "Live connection is not configured on this installation."}
          </p>
        </div>
        <div className="hero-example">
          <div className="example-kicker">
            <span className="status-dot" /> A PLAN CHANGED
          </div>
          <div className="mini-event">
            <div className="mini-date">
              <span>NOV</span>
              <strong>22</strong>
            </div>
            <div>
              <span className="eyebrow">CLAY AFTER HOURS</span>
              <h3>
                A new place.
                <br />
                The same good evening.
              </h3>
            </div>
          </div>
          <div className="change-connection">
            <span className="old-value">Mill Studio</span>
            <span className="connection-arrow">
              <ArrowRight size={18} />
            </span>
            <span className="new-value">River Studio</span>
          </div>
          <div className="example-post">
            <div className="mini-post-header">
              <ChannelMark service="facebook" />
              <span>Clay After Hours</span>
              <span className="mini-link">
                <Link2 size={14} /> Connected fact
              </span>
            </div>
            <p>
              Join Clay After Hours at <mark>River Studio</mark> this Sunday.
              Materials and tea included.
            </p>
            <div className="example-foot">
              <CheckCheck size={14} /> A precise change. Your original words.
            </div>
          </div>
          <div className="example-label">
            FICTIONAL EXAMPLE · NO ACCOUNT NEEDED
          </div>
          <span className="hero-paper-index">01—03</span>
        </div>
      </section>
      <section className="principles">
        <div>
          <span className="principle-number">01</span>
          <h3>Bring the campaign.</h3>
          <p>
            Select up to six posts you already wrote. Drafts and scheduled
            reminders, together.
          </p>
        </div>
        <div>
          <span className="principle-number">02</span>
          <h3>Connect the facts.</h3>
          <p>
            Confirm the exact phrases. Change the event details and see only
            what needs to move.
          </p>
        </div>
        <div>
          <span className="principle-number">03</span>
          <h3>Review. Then repair.</h3>
          <p>
            Check captions, times, and images. Apply selected updates and keep
            unresolved work visible.
          </p>
        </div>
      </section>
      {state.connection.status === "connected" && (
        <div className="panel live-entry">
          <h2>Your Buffer account is connected</h2>
          <p>Choose the organization whose posts you want to work with.</p>
          <OrganizationPicker state={state} action={action} busy={busy} />
          <LiveImportControls state={state} action={action} busy={busy} />
        </div>
      )}
    </div>
  );
}

function SampleGuide({ campaign: c }: { campaign: Campaign }) {
  const pending = c.posts
    .flatMap((p) => p.bindings)
    .filter((b) => !b.confirmed && !b.ignored).length;
  const titles: Record<Stage, string> = {
    choose: "Your task: move Clay After Hours to a new plan.",
    facts: !c.factsConfirmed
      ? "First, confirm the details in the original posts."
      : pending
        ? `Review ${pending} suggested ${pending === 1 ? "phrase" : "phrases"}, then enter the new plan.`
        : "The phrases are reviewed. What changed?",
    review: "Check the whole post, then choose what to simulate.",
    results: "Check what worked and what still needs attention.",
  };
  const instructions: Record<Stage, string> = {
    choose:
      "Select the three scheduled posts, then Review facts. Include the published announcement if you want to try a separate correction draft.",
    facts: !c.factsConfirmed
      ? "Keep the current Saturday / Mill Studio details for now. Confirm current facts to unlock phrase review."
      : c.revision > 0
        ? "Confirmed phrases are reused. Try another venue, then Preview changes. Each attached image needs a new review for this plan. Nothing is applied yet."
        : "Confirm each exact phrase that refers to the event, or ignore it. Use the example change for Sunday, 4 p.m., River Studio, then Preview changes. Nothing is applied yet.",
    review:
      "Inspect the full captions. Generate and review a replacement poster for changed image details; confirm the publication context for “Tomorrow”. Only ready, selected posts will run. You can leave others unresolved to see a partial result.",
    results:
      "Skipped posts keep their schedules. Download the repair report for a handoff, or make another change to reuse the confirmed phrases. These outcomes are simulated.",
  };
  return (
    <aside className="sample-guide" aria-label="Sample walkthrough">
      <span className="eyebrow">
        TRY THE WORKFLOW · STEP {steps.findIndex((s) => s.id === c.stage) + 1}{" "}
        OF 4
      </span>
      <h2>{titles[c.stage]}</h2>
      <p>{instructions[c.stage]}</p>
    </aside>
  );
}

function ReceiptDownload() {
  return (
    <a
      className="button subtle small"
      href="/api/campaign/receipt"
      download="changeboard-repair-report.md"
    >
      <Download size={15} /> Download repair report
    </a>
  );
}

function LiveImportControls({
  state,
  action,
  busy,
  onLoaded,
}: {
  state: AppState;
  action: Action;
  busy: boolean;
  onLoaded?: () => void;
}) {
  const [channelId, setChannelId] = useState("");
  useEffect(() => setChannelId(""), [state.connection.organizationId]);
  if (!state.connection.organizationId)
    return (
      <p className="helper">
        Choose and confirm an organization to discover its channels.
      </p>
    );
  const empty = state.connection.channels.length === 0;
  return (
    <div className="live-import-controls">
      {empty ? (
        <div className="notice amber">
          <CircleAlert size={17} />
          <p>
            <strong>No channels available.</strong> Connect a channel in Buffer,
            then select this organization again to refresh access.
          </p>
        </div>
      ) : (
        <label>
          Read existing posts from
          <select
            value={channelId}
            onChange={(event) => setChannelId(event.target.value)}
          >
            <option value="">
              First {Math.min(state.connection.channels.length, 6)} accessible
              channels
            </option>
            {state.connection.channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name} · {channel.service}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className="button primary"
        disabled={busy || empty}
        onClick={async () => {
          const result = await action("/api/import", {
            channelId: channelId || undefined,
          });
          if (result) onLoaded?.();
        }}
      >
        Load existing posts <ArrowRight size={16} />
      </button>
      <p className="helper">
        Reads up to 20 posts at a time. You choose which posts belong to the
        campaign; nothing is changed by importing.
      </p>
    </div>
  );
}

function OrganizationPicker({
  state,
  action,
  busy,
}: {
  state: AppState;
  action: Action;
  busy: boolean;
}) {
  const [org, setOrg] = useState(state.connection.organizationId || "");
  return (
    <div className="inline-form">
      <label>
        Buffer organization
        <select value={org} onChange={(e) => setOrg(e.target.value)}>
          <option value="">Choose an organization</option>
          {state.connection.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button primary"
        disabled={!org || busy}
        onClick={() => action("/api/organization", { organizationId: org })}
      >
        Use organization <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ChoosePosts({
  campaign: c,
  action,
  busy,
  state,
}: SharedProps & { state: AppState }) {
  const [selected, setSelected] = useState<string[]>(
    c.posts.filter((p) => p.selected).map((p) => p.snapshot.id),
  );
  const [announcement, setAnnouncement] = useState(c.announcement?.id || "");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(
    (state as AppState & { nextCursor?: string | null }).nextCursor ||
      undefined,
  );
  const lastFilter = useRef([channel, status, dateFrom, dateTo].join("|"));
  useEffect(() => {
    const next = [channel, status, dateFrom, dateTo].join("|");
    if (next !== lastFilter.current) {
      setCursor(undefined);
      lastFilter.current = next;
    }
  }, [channel, status, dateFrom, dateTo]);
  const channels =
    c.mode === "live"
      ? state.connection.channels.map(
          (ch) => [ch.id, ch.name] as [string, string],
        )
      : [
          ...new Map(
            c.availablePosts.map((p) => [p.channelId, p.channelName]),
          ).entries(),
        ];
  const filtered = c.availablePosts.filter(
    (p) =>
      (channel === "all" || p.channelId === channel) &&
      (status === "all" ||
        (status === "draft"
          ? p.status === "draft"
          : ["scheduled", "buffer"].includes(p.status))) &&
      (!dateFrom || !p.scheduledAt || p.scheduledAt.slice(0, 10) >= dateFrom) &&
      (!dateTo || !p.scheduledAt || p.scheduledAt.slice(0, 10) <= dateTo),
  );
  const editable = filtered.filter((p) => !isPublished(p));
  const published = c.availablePosts.filter(isPublished);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 6
          ? [...s, id]
          : s,
    );
  async function loadMore() {
    const r = (await action("/api/import", {
      channelId: channel === "all" ? undefined : channel,
      status: status === "all" ? undefined : status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      after: cursor,
    })) as (AppState & { nextCursor?: string }) | undefined;
    if (r) setCursor(r.nextCursor || undefined);
  }
  return (
    <>
      <div className="choose-layout">
        <aside className="event-overview">
          <span className="eyebrow">THE EVENT</span>
          <div className="clay-emblem" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>{c.name}</h2>
          <p>
            {c.mode === "sample" ? (
              <>
                A little clay.
                <br />A good evening together.
              </>
            ) : (
              <>
                Your existing posts.
                <br />
                One set of event facts.
              </>
            )}
          </p>
          <div className="event-details">
            <span>
              <CalendarDays size={16} />
              {readableDate(c.facts.date)}
            </span>
            <span>
              <Clock3 size={16} />
              {readableTime(c.facts.time)}
            </span>
            <span>
              <MapPin size={16} />
              {c.facts.venue || "Venue to confirm"}
            </span>
            <span>
              <Globe2 size={16} />
              {c.facts.timezone}
            </span>
          </div>
          <div className="event-note">
            <Link2 size={16} />
            <p>
              Start with the current details. You’ll tell us what changed in the
              next step.
            </p>
          </div>
        </aside>
        <section className="posts-section" aria-label="Choose campaign posts">
          <div className="section-top">
            <div>
              <span className="eyebrow">YOUR BUFFER POSTS</span>
              <h2>{c.organizationName}</h2>
            </div>
            <Badge>{c.availablePosts.length} posts available</Badge>
          </div>
          {c.mode === "live" && state.connection.organizations.length > 1 && (
            <OrganizationPicker state={state} action={action} busy={busy} />
          )}
          <div className="filters">
            <label className="select-filter">
              <span className="sr-only">Filter by channel</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="all">All channels</option>
                {channels.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-filter">
              <span className="sr-only">Filter by status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Drafts & scheduled</option>
                <option value="scheduled">Scheduled only</option>
                <option value="draft">Drafts only</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <details className="date-filter">
              <summary>
                <CalendarDays size={14} /> Date range
              </summary>
              <div className="date-range">
                <label>
                  From
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>
            </details>
          </div>
          <div className="list-context">
            <span>
              {editable.length} suitable{" "}
              {editable.length === 1 ? "post" : "posts"} shown
            </span>
            <button
              className="text-button"
              onClick={() =>
                setSelected(
                  editable
                    .filter((p) => !unsupported(p))
                    .slice(0, 6)
                    .map((p) => p.id),
                )
              }
              disabled={busy || !editable.length}
            >
              Select up to six
            </button>
          </div>
          <div className="post-list">
            {editable.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                selected={selected.includes(post.id)}
                disabled={
                  busy ||
                  !!unsupported(post) ||
                  (!selected.includes(post.id) && selected.length >= 6)
                }
                onToggle={() => toggle(post.id)}
              />
            ))}
          </div>
          {!editable.length && (
            <EmptyState
              title={
                c.availablePosts.length
                  ? "No posts match these filters"
                  : "No suitable posts yet"
              }
            >
              Try another channel or date range. Changeboard currently repairs
              ordinary text and single-image drafts or scheduled posts.
            </EmptyState>
          )}
          {c.mode === "live" && (
            <button
              className="button subtle full-width"
              onClick={loadMore}
              disabled={busy}
            >
              Load {c.availablePosts.length ? "more" : "existing"} posts{" "}
              <RefreshCw size={15} />
            </button>
          )}
          {published.length > 0 && (
            <section className="published-section">
              <div className="section-top">
                <div>
                  <h3>A published announcement?</h3>
                  <p>Optionally prepare a separate correction draft.</p>
                </div>
                <FileText size={20} />
              </div>
              {published.map((p) => (
                <label
                  className={`published-option ${announcement === p.id ? "selected" : ""}`}
                  key={p.id}
                >
                  <input
                    type="checkbox"
                    checked={announcement === p.id}
                    onChange={() =>
                      setAnnouncement(announcement === p.id ? "" : p.id)
                    }
                  />
                  <div>
                    <span className="published-meta">
                      {p.channelName} <Badge>Already published</Badge>
                    </span>
                    <p>{p.text}</p>
                  </div>
                </label>
              ))}
              <p className="helper">
                The original public post will not be edited or deleted.
              </p>
            </section>
          )}
        </section>
      </div>
      <ActionBar
        summary={
          <>
            <strong>{selected.length} of 6</strong>
            <span>posts selected</span>
          </>
        }
      >
        <button
          className="button primary"
          disabled={busy || !selected.length}
          onClick={() =>
            action("/api/campaign/select", {
              postIds: selected,
              announcementId: announcement || undefined,
            })
          }
        >
          Review facts <ArrowRight size={17} />
        </button>
      </ActionBar>
    </>
  );
}

function PostCard({
  post,
  selected,
  disabled,
  onToggle,
}: {
  post: Snapshot;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const reason = unsupported(post);
  return (
    <article className={`post-card selectable ${selected ? "selected" : ""}`}>
      <label className="selection-control">
        <input
          type="checkbox"
          aria-label={`Select post: ${post.text.slice(0, 65)}`}
          checked={selected}
          onChange={onToggle}
          disabled={disabled}
        />
        <span className="sr-only">Include this post</span>
      </label>
      <div className="post-card-main">
        <PostHeader post={post}>
          <Badge kind={reason ? "amber" : "neutral"}>
            {reason
              ? "Unsupported format"
              : post.status === "draft"
                ? "Draft"
                : "Scheduled"}
          </Badge>
        </PostHeader>
        <div className="caption-and-media">
          <p className="caption">{post.text}</p>
          {post.assets[0] && (
            <img
              className="post-thumbnail"
              src={post.assets[0].url}
              alt={
                post.assets[0].altText ||
                "Attached image — accuracy needs review"
              }
            />
          )}
        </div>
        <ScheduleLine post={post} />
        {reason && (
          <p className="field-warning">
            <CircleAlert size={14} />
            {reason}
          </p>
        )}
        {post.assets.length > 0 && !reason && (
          <div className="media-footnote">
            <ImageIcon size={13} />
            Attached image will need a separate review
          </div>
        )}
      </div>
    </article>
  );
}

function FactsFields({
  facts,
  setFacts,
  disabled = false,
}: {
  facts: Facts;
  setFacts: (v: Facts) => void;
  disabled?: boolean;
}) {
  return (
    <div className="fact-fields">
      <label>
        Event date
        <input
          required
          type="date"
          value={facts.date}
          disabled={disabled}
          onChange={(e) => setFacts({ ...facts, date: e.target.value })}
        />
      </label>
      <label>
        Start time
        <input
          required
          type="time"
          value={facts.time}
          disabled={disabled}
          onChange={(e) => setFacts({ ...facts, time: e.target.value })}
        />
      </label>
      <label>
        Venue name
        <input
          required
          value={facts.venue}
          disabled={disabled}
          maxLength={200}
          onChange={(e) => setFacts({ ...facts, venue: e.target.value })}
          placeholder="e.g. Mill Studio"
        />
      </label>
      <label>
        Venue address <span className="optional">optional</span>
        <input
          value={facts.address}
          disabled={disabled}
          maxLength={400}
          onChange={(e) => setFacts({ ...facts, address: e.target.value })}
          placeholder="No address supplied"
        />
      </label>
      <label>
        Event timezone
        <input
          required
          value={facts.timezone}
          disabled={disabled}
          onChange={(e) => setFacts({ ...facts, timezone: e.target.value })}
          placeholder="Europe/London"
          list="timezones"
        />
      </label>
      <datalist id="timezones">
        <option value="Europe/London" />
        <option value="Asia/Kolkata" />
        <option value="America/New_York" />
        <option value="America/Los_Angeles" />
        <option value="Australia/Sydney" />
        <option value="UTC" />
      </datalist>
    </div>
  );
}

function ConnectFacts({ campaign: c, action, busy }: SharedProps) {
  const [name, setName] = useState(c.name);
  const [facts, setFacts] = useState<Facts>(c.facts || blankFacts);
  const [proposed, setProposed] = useState<Facts>(c.proposedFacts || c.facts);
  const [activeFact, setActiveFact] = useState("venue");
  const [editingFacts, setEditingFacts] = useState(!c.factsConfirmed);
  const bindings = c.posts.flatMap((p) => p.bindings);
  const confirmed = bindings.filter((b) => b.confirmed && !b.ignored).length;
  const pending = bindings.filter((b) => !b.confirmed && !b.ignored).length;
  async function confirmFacts(e: FormEvent) {
    e.preventDefault();
    const r = await action("/api/campaign/facts", {
      facts,
      confirmed: true,
      ...(c.revision === 0 ? { name } : {}),
    });
    if (r) {
      setEditingFacts(false);
      setProposed(facts);
    }
  }
  return (
    <>
      <div className="facts-layout">
        <aside className="fact-sheet">
          <div className="sheet-top">
            <span className="eyebrow">EVENT FACT SHEET</span>
            <Link2 size={17} />
          </div>
          <h2>{c.name}</h2>
          <p className="sheet-description">
            Select a fact to see where it appears.
          </p>
          {editingFacts ? (
            <form onSubmit={confirmFacts}>
              {c.revision === 0 && (
                <label className="campaign-name-label">
                  Campaign name
                  <input
                    required
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Name of your event"
                  />
                </label>
              )}
              <FactsFields facts={facts} setFacts={setFacts} />
              <button className="button primary full-width" disabled={busy}>
                Confirm current facts <Check size={16} />
              </button>
              <p className="helper">
                These are the details in your original campaign.
              </p>
            </form>
          ) : (
            <>
              <div className="fact-selector">
                {(["date", "time", "venue", "address"] as const).map((fact) => (
                  <button
                    key={fact}
                    className={`fact-item ${activeFact === fact ? "active" : ""}`}
                    aria-pressed={activeFact === fact}
                    onClick={() => setActiveFact(fact)}
                  >
                    <span className="fact-item-label">
                      {factLabels[fact]}
                      <span>
                        {
                          bindings.filter((b) => b.fact === fact && b.confirmed)
                            .length
                        }{" "}
                        <Link2 size={11} />
                      </span>
                    </span>
                    <strong>
                      {fact === "date"
                        ? readableDate(c.facts.date)
                        : fact === "time"
                          ? readableTime(c.facts.time)
                          : c.facts[fact] || "Not provided"}
                    </strong>
                  </button>
                ))}
              </div>
              <div className="timezone-note">
                <Globe2 size={14} />
                {c.facts.timezone}
              </div>
              <button
                className="text-button edit-source"
                onClick={() => setEditingFacts(true)}
              >
                Edit source facts
              </button>
              <div className="confirmed-note">
                <Check size={15} />
                Source facts confirmed
              </div>
            </>
          )}
          <div className="sheet-bottom">
            <ShieldCheck size={18} />
            <p>
              Your original facts and captions are retained. Nothing changes in
              Buffer yet.
            </p>
          </div>
        </aside>
        <div className="associations">
          <div className="section-top">
            <div>
              <h2>Connect the exact phrases</h2>
              <p>
                <span className="teal-text">{confirmed} confirmed</span> ·{" "}
                {pending} needing a decision
              </p>
            </div>
            <Badge kind={pending ? "amber" : "teal"}>
              {pending ? "Needs confirmation" : "References reviewed"}
            </Badge>
          </div>
          <div className="interpretation-note">
            <Link2 size={16} />
            <span>
              <strong>Exact-match suggestions · manual review</strong>
              <br />
              AI extraction is unavailable. Confirm only the phrases that refer
              to this event.
            </span>
          </div>
          {c.posts.map((linked) => (
            <article
              className="post-card association-card"
              key={linked.snapshot.id}
            >
              <PostHeader post={linked.snapshot}>
                <span className="small-muted">
                  {linked.bindings.filter((b) => b.confirmed).length} linked
                </span>
              </PostHeader>
              <HighlightedCaption
                text={linked.snapshot.text}
                bindings={linked.bindings}
                activeFact={activeFact}
                onFact={setActiveFact}
              />
              <ScheduleLine post={linked.snapshot} />
              <div className="binding-list">
                {linked.bindings.map((binding) => (
                  <FactReference
                    key={binding.id}
                    binding={binding}
                    active={activeFact === binding.fact}
                    disabled={busy || !c.factsConfirmed}
                    confirm={() =>
                      action("/api/campaign/binding", {
                        postId: linked.snapshot.id,
                        bindingId: binding.id,
                        confirmed: !binding.confirmed,
                        ignored: false,
                      })
                    }
                    ignore={() =>
                      action("/api/campaign/binding", {
                        postId: linked.snapshot.id,
                        bindingId: binding.id,
                        confirmed: false,
                        ignored: !binding.ignored,
                      })
                    }
                  />
                ))}
              </div>
              {!linked.bindings.length && (
                <p className="helper">
                  No exact matches yet. Add a phrase below or check the source
                  facts.
                </p>
              )}
              <ManualBinding
                post={linked.snapshot}
                action={action}
                disabled={busy || !c.factsConfirmed}
              />
              {linked.bindings.some((b) => b.kind === "relative") && (
                <div className="relative-explainer">
                  <CalendarDays size={16} />
                  <span>
                    <strong>Relative to publication, not today.</strong>{" "}
                    “Tomorrow” refers to the day after this post is published.
                    Its fixed publication time must be confirmed during review.
                  </span>
                </div>
              )}
            </article>
          ))}
          {c.factsConfirmed && (
            <section className="proposed-section">
              <div className="section-top">
                <div>
                  <span className="eyebrow">THE NEW PLAN</span>
                  <h2>What changed?</h2>
                  <p>Change only the details that have moved.</p>
                </div>
                {c.mode === "sample" && (
                  <button
                    className="button subtle small"
                    onClick={() =>
                      setProposed({
                        ...c.facts,
                        ...(c.revision === 0
                          ? {
                              date: "2026-11-22",
                              time: "16:00",
                              venue: "River Studio",
                            }
                          : {
                              venue:
                                c.facts.venue === "Garden Studio"
                                  ? "River Studio"
                                  : "Garden Studio",
                            }),
                      })
                    }
                  >
                    {c.revision === 0
                      ? "Use the example change"
                      : "Try another venue"}{" "}
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
              <FactsFields facts={proposed} setFacts={setProposed} />
              <p className="helper">
                Only confirmed associations can be updated. Unconfirmed wording
                stays as written.
              </p>
            </section>
          )}
        </div>
      </div>
      <ActionBar
        summary={
          <>
            <strong>{confirmed}</strong>
            <span>confirmed references · {c.posts.length} posts</span>
          </>
        }
      >
        <button
          className="button subtle"
          disabled={busy}
          onClick={() => action("/api/campaign/stage", { stage: "choose" })}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          className="button primary"
          disabled={busy || !c.factsConfirmed || editingFacts || !confirmed}
          onClick={() => action("/api/campaign/propose", { facts: proposed })}
        >
          Preview changes <ArrowRight size={17} />
        </button>
      </ActionBar>
    </>
  );
}

function HighlightedCaption({
  text,
  bindings,
  activeFact,
  onFact,
}: {
  text: string;
  bindings: Binding[];
  activeFact: string;
  onFact: (fact: string) => void;
}) {
  let cursor = 0;
  const parts: ReactNode[] = [];
  for (const b of [...bindings]
    .filter((b) => !b.ignored)
    .sort((a, b) => a.start - b.start)) {
    if (b.start < cursor || text.slice(b.start, b.end) !== b.text) continue;
    parts.push(text.slice(cursor, b.start));
    parts.push(
      <button
        type="button"
        key={b.id}
        className={`inline-reference ${b.confirmed ? "confirmed" : ""} ${activeFact === b.fact ? "reference-active" : ""}`}
        aria-label={`${b.text}: ${factLabels[b.fact]}, ${b.confirmed ? "confirmed" : "needs confirmation"}`}
        onClick={() => onFact(b.fact)}
      >
        {text.slice(b.start, b.end)}
      </button>,
    );
    cursor = b.end;
  }
  parts.push(text.slice(cursor));
  return <p className="caption highlighted-caption">{parts}</p>;
}

function FactReference({
  binding: b,
  active,
  disabled,
  confirm,
  ignore,
}: {
  binding: Binding;
  active: boolean;
  disabled: boolean;
  confirm: () => void;
  ignore: () => void;
}) {
  return (
    <div
      className={`fact-reference ${active ? "active" : ""} ${b.ignored ? "ignored" : ""}`}
    >
      <div className="binding-phrase">
        <Link2 size={14} />
        <strong>“{b.text}”</strong>
        <span>
          {factLabels[b.fact]} · characters {b.start + 1}–{b.end}
        </span>
      </div>
      <div className="binding-actions">
        <button
          className={`button tiny ${b.confirmed ? "confirmed-button" : "subtle"}`}
          disabled={disabled || b.ignored}
          onClick={confirm}
        >
          {b.confirmed ? (
            <>
              <Check size={13} /> Confirmed
            </>
          ) : (
            "Confirm"
          )}
        </button>
        <button
          className="text-button small-muted"
          disabled={disabled}
          onClick={ignore}
        >
          {b.ignored ? "Restore" : "Ignore"}
        </button>
      </div>
    </div>
  );
}

function ManualBinding({
  post,
  action,
  disabled,
}: {
  post: Snapshot;
  action: Action;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [fact, setFact] = useState("venue");
  const [occurrence, setOccurrence] = useState(1);
  const [kind, setKind] = useState("literal");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await action("/api/campaign/binding", {
      postId: post.id,
      text,
      fact,
      occurrence: occurrence - 1,
      kind,
    });
    if (r) setText("");
  }
  return (
    <details className="manual-binding">
      <summary>
        <Plus size={14} />
        Connect a phrase manually
      </summary>
      <form onSubmit={submit}>
        <label>
          Exact phrase
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder="Copy a phrase from this caption"
          />
        </label>
        <div className="form-grid-three">
          <label>
            Fact
            <select
              value={fact}
              onChange={(e) => {
                setFact(e.target.value);
                setKind(
                  e.target.value === "time"
                    ? "time"
                    : e.target.value === "date"
                      ? "date"
                      : "literal",
                );
              }}
            >
              {Object.entries(factLabels).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Occurrence
            <input
              type="number"
              min="1"
              max="30"
              value={occurrence}
              onChange={(e) => setOccurrence(Number(e.target.value))}
            />
          </label>
          <label>
            Interpret as
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="literal">Exact fact</option>
              <option value="date">Event date</option>
              <option value="weekday">Weekday</option>
              <option value="time">Start time</option>
              <option value="relative">Relative day</option>
            </select>
          </label>
        </div>
        <p className="helper">
          Occurrence 1 is the first exact match. Repeated phrases need the
          correct occurrence.
        </p>
        <button className="button subtle small" disabled={disabled || !text}>
          Add association <Plus size={14} />
        </button>
      </form>
    </details>
  );
}

function ReviewChanges({ campaign: c, action, busy }: SharedProps) {
  const allProposals = c.changeSet?.proposals || [];
  const draftMove = allProposals.find((p) => p.action === "move_to_draft");
  const proposals = draftMove ? [draftMove] : allProposals;
  const selected = proposals.filter((p) => p.selected && p.eligible);
  const unresolved = proposals.filter((p) => !p.eligible).length;
  async function toggle(id: string) {
    await action("/api/campaign/preview", {
      selectedPostIds: proposals
        .filter(
          (p) => p.eligible && (p.postId === id ? !p.selected : p.selected),
        )
        .map((p) => p.postId),
    });
  }
  return (
    <>
      <div className="revision-summary">
        <div>
          <span className="eyebrow">FROM THE ORIGINAL PLAN</span>
          <p>
            {readableDate(c.facts.date)} · {readableTime(c.facts.time)} ·{" "}
            {c.facts.venue}
          </p>
        </div>
        <ArrowRight size={21} />
        <div>
          <span className="eyebrow teal-text">TO THE NEW PLAN</span>
          <p>
            {readableDate(c.proposedFacts.date)} ·{" "}
            {readableTime(c.proposedFacts.time)} · {c.proposedFacts.venue}
          </p>
        </div>
      </div>
      <div className="review-heading-row">
        <span>
          <strong>{proposals.length}</strong> posts in this review{" "}
          <span className="muted">· {unresolved} needing attention</span>
        </span>
        <ReceiptDownload />
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            draftMove
              ? action("/api/campaign/move-to-draft", {
                  postId: draftMove.postId,
                  confirm: false,
                })
              : action("/api/campaign/preview", {})
          }
        >
          <RefreshCw size={14} />
          Refresh review
        </button>
      </div>
      <div className="review-list">
        {proposals.map((proposal, i) => {
          const linked = c.posts.find((p) => p.snapshot.id === proposal.postId);
          return (
            <article
              className={`post-card review-card ${!proposal.eligible ? "needs-attention" : ""}`}
              key={proposal.postId}
            >
              <div className="review-card-top">
                <label className="review-selection">
                  <input
                    type="checkbox"
                    checked={proposal.selected && proposal.eligible}
                    disabled={busy || !proposal.eligible || !!draftMove}
                    onChange={() => toggle(proposal.postId)}
                  />
                  <span className="sr-only">
                    Include update for {proposal.before.text.slice(0, 50)}
                  </span>
                  <span className="post-index">
                    POST {String(i + 1).padStart(2, "0")}
                  </span>
                </label>
                <Badge kind={proposal.eligible ? "teal" : "amber"}>
                  {proposal.eligible
                    ? "Ready to update"
                    : proposal.issues.some(
                          (issue) => issue.code === "EXTERNAL_EDIT",
                        )
                      ? "Changed in Buffer"
                      : proposal.media.status === "needs_review" &&
                          proposal.before.assets.length
                        ? "Image needs review"
                        : "Needs confirmation"}
                </Badge>
              </div>
              <PostHeader post={proposal.before} />
              <CaptionDiff
                before={proposal.before.text}
                after={proposal.after.text}
                changes={proposal.changes}
              />
              <div className="change-reasons">
                {proposal.changes.map((change) => (
                  <span key={change.bindingId}>
                    <Link2 size={13} />
                    {change.reason}
                  </span>
                ))}
              </div>
              {proposal.action === "move_to_draft" && (
                <div className="notice amber">
                  <CircleAlert size={17} />
                  <p>
                    This reviewed operation moves the post to Draft. It will no
                    longer be scheduled to publish.
                  </p>
                </div>
              )}
              {proposal.current &&
                proposal.issues.some(
                  (issue) => issue.code === "EXTERNAL_EDIT",
                ) && (
                  <ConflictPanel
                    proposal={proposal}
                    sample={c.mode === "sample"}
                    action={action}
                    busy={busy}
                  />
                )}
              {proposal.issues.length > 0 && (
                <ul className="issue-list">
                  {proposal.issues.map((issue, n) => (
                    <li key={`${issue.code}-${n}`}>
                      <CircleAlert size={14} />
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
              {linked && proposal.action === "edit" && (
                <>
                  <ScheduleChoice
                    linked={linked}
                    proposal={proposal}
                    action={action}
                    busy={busy}
                    facts={c.proposedFacts}
                  />
                  <MediaReview
                    linked={linked}
                    proposal={proposal}
                    revision={c.revision}
                    action={action}
                    busy={busy}
                  />
                </>
              )}
              {c.mode === "sample" &&
                !proposal.issues.some(
                  (issue) => issue.code === "EXTERNAL_EDIT",
                ) && (
                  <details className="sample-tools">
                    <summary>Test an external edit</summary>
                    <p>
                      Change the separately stored simulated Buffer copy after
                      import, then refresh the review. This only affects
                      fictional data.
                    </p>
                    <button
                      className="button subtle small"
                      disabled={busy}
                      onClick={async () => {
                        const result = await action("/api/sample/conflict", {
                          postId: proposal.postId,
                        });
                        if (result) await action("/api/campaign/preview", {});
                      }}
                    >
                      Simulate edit in Buffer <ArrowUpRight size={14} />
                    </button>
                  </details>
                )}
            </article>
          );
        })}
      </div>
      {!proposals.length && (
        <EmptyState title="Your review is ready to prepare">
          Generate a preview from your confirmed facts and associations.
        </EmptyState>
      )}
      {c.announcement && !draftMove && (
        <CorrectionReview campaign={c} action={action} busy={busy} />
      )}
      <div className="safety-note">
        <ShieldCheck size={17} />
        <p>
          Each post is checked again before an update. Changeboard withholds
          automatic repairs inside its 10-minute publication safety window.
          Later changes in Buffer require a new review.
        </p>
      </div>
      <ActionBar
        summary={
          <>
            <strong>{selected.length}</strong>
            <span>
              {draftMove
                ? "post selected to move to Draft"
                : "posts selected for update"}
              {unresolved > 0 ? ` · ${unresolved} unresolved` : ""}
            </span>
          </>
        }
      >
        <button
          className="button subtle"
          disabled={busy}
          onClick={() =>
            action("/api/campaign/stage", {
              stage: draftMove ? "results" : "facts",
            })
          }
        >
          <ArrowLeft size={16} />
          {draftMove ? "Back to results" : "Edit facts"}
        </button>
        <button
          className="button primary"
          disabled={
            busy || !selected.length || !c.changeSet || c.changeSet.applied
          }
          onClick={() =>
            action("/api/campaign/apply", {
              changeSetId: c.changeSet?.id,
              revision: c.changeSet?.revision,
            })
          }
        >
          {draftMove
            ? `Move ${selected.length} post to Draft`
            : `${c.mode === "sample" ? "Simulate updates to" : "Apply updates to"} ${selected.length} ${selected.length === 1 ? "post" : "posts"}`}{" "}
          <ArrowRight size={17} />
        </button>
      </ActionBar>
    </>
  );
}

function diffText(
  text: string,
  changes: CaptionChange[],
  side: "before" | "after",
) {
  let cursor = 0;
  const nodes: ReactNode[] = [];
  for (const change of [...changes].sort((a, b) =>
    side === "before" ? a.start - b.start : a.newStart - b.newStart,
  )) {
    const start = side === "before" ? change.start : change.newStart,
      end = side === "before" ? change.end : change.newEnd;
    if (start < cursor) continue;
    nodes.push(text.slice(cursor, start));
    nodes.push(
      side === "before" ? (
        <del key={change.bindingId}>
          <span className="sr-only">Removed: </span>
          {text.slice(start, end)}
        </del>
      ) : (
        <ins key={change.bindingId}>
          <span className="sr-only">Added: </span>
          {text.slice(start, end)}
        </ins>
      ),
    );
    cursor = end;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}
function CaptionDiff({
  before,
  after,
  changes,
}: {
  before: string;
  after: string;
  changes: CaptionChange[];
}) {
  return (
    <div className="caption-diff">
      <div className="diff-pane before">
        <span className="diff-label">
          BEFORE <span>Original caption</span>
        </span>
        <p className="caption">{diffText(before, changes, "before")}</p>
      </div>
      <div className="diff-pane after">
        <span className="diff-label">
          AFTER <span>Proposed caption</span>
        </span>
        <p className="caption">{diffText(after, changes, "after")}</p>
      </div>
    </div>
  );
}

function ConflictPanel({
  proposal: p,
  sample,
  action,
  busy,
}: {
  proposal: Proposal;
  sample: boolean;
  action: Action;
  busy: boolean;
}) {
  return (
    <div className="conflict-panel">
      <div className="conflict-title">
        <AlertTriangle size={18} />
        <h3>Changed in {sample ? "simulated Buffer" : "Buffer"}</h3>
      </div>
      <p>
        The current post no longer matches the imported source. This update is
        withheld.
      </p>
      <div className="conflict-version">
        <span>IMPORTED SOURCE</span>
        <p>{p.before.text}</p>
      </div>
      <div className="conflict-version">
        <span>CURRENT {sample ? "SIMULATED " : ""}BUFFER VERSION</span>
        <p>{p.current?.text}</p>
      </div>
      <div className="conflict-version">
        <span>WITHHELD PROPOSAL</span>
        <p>{p.after.text}</p>
      </div>
      <button
        className="button subtle small"
        disabled={busy}
        onClick={() => action("/api/campaign/refresh", { postId: p.postId })}
      >
        Refresh source and reconnect facts <RefreshCw size={14} />
      </button>
    </div>
  );
}

function ScheduleChoice({
  linked,
  proposal,
  action,
  busy,
  facts,
}: {
  linked: LinkedPost;
  proposal: Proposal;
  action: Action;
  busy: boolean;
  facts: Facts;
}) {
  const schedule = linked.schedule;
  const hasRelative = linked.bindings.some(
    (b) => b.confirmed && b.kind === "relative",
  );
  const [localTime, setLocalTime] = useState(schedule.fixedLocalTime || "");
  const update = (values: Partial<ScheduleOptions>) =>
    action("/api/campaign/schedule", {
      postId: linked.snapshot.id,
      schedule: { ...schedule, ...values },
    });
  return (
    <section className="schedule-review">
      <div className="subsection-title">
        <Clock3 size={17} />
        <h3>Publication time</h3>
        <span>
          {proposal.before.mode === "queue"
            ? "Floating queue"
            : proposal.before.mode === "draft"
              ? "Draft"
              : "Fixed schedule"}
        </span>
      </div>
      <div className="schedule-current">
        <span>Currently</span>
        <strong>{scheduledLabel(proposal.before)}</strong>
        <span>{proposal.before.channelTimezone}</span>
      </div>
      {proposal.before.mode !== "draft" && (
        <>
          <div className="radio-options">
            <label>
              <input
                type="radio"
                name={`schedule-${proposal.postId}`}
                checked={!schedule.strategy || schedule.strategy === "keep"}
                disabled={busy}
                onChange={() =>
                  update({ strategy: "keep", offsetConfirmed: false })
                }
              />
              <span>
                <strong>Keep publication time</strong>
                <small>Recompute the confirmed factual wording.</small>
              </span>
            </label>
            {proposal.before.mode === "customScheduled" && (
              <label>
                <input
                  type="radio"
                  name={`schedule-${proposal.postId}`}
                  checked={schedule.strategy === "preserve_offset"}
                  disabled={busy}
                  onChange={() =>
                    update({
                      strategy: "preserve_offset",
                      offsetConfirmed: false,
                    })
                  }
                />
                <span>
                  <strong>Preserve reminder offset</strong>
                  <small>
                    Move this fixed publication time with the event.
                  </small>
                </span>
              </label>
            )}
            {hasRelative && (
              <label>
                <input
                  type="radio"
                  name={`schedule-${proposal.postId}`}
                  checked={schedule.strategy === "explicit_date"}
                  disabled={busy}
                  onChange={() => update({ strategy: "explicit_date" })}
                />
                <span>
                  <strong>Use the explicit event date</strong>
                  <small>
                    Replace relative wording with a stable calendar date.
                  </small>
                </span>
              </label>
            )}
            {proposal.before.mode === "queue" && (
              <label>
                <input
                  type="radio"
                  name={`schedule-${proposal.postId}`}
                  checked={schedule.strategy === "fix_time"}
                  disabled={busy}
                  onChange={() =>
                    update({ strategy: "fix_time", fixedTimeConfirmed: false })
                  }
                />
                <span>
                  <strong>Choose a fixed publication time</strong>
                  <small>
                    Leave the floating queue slot only with your approval.
                  </small>
                </span>
              </label>
            )}
          </div>
          {proposal.offset && (
            <p className="reminder-offset">
              <Clock3 size={14} />
              <span>
                <strong>Original reminder offset:</strong>{" "}
                {proposal.offset.description}.
              </span>
            </p>
          )}
          {schedule.strategy === "preserve_offset" && (
            <label className="acknowledgement">
              <input
                type="checkbox"
                checked={!!schedule.offsetConfirmed}
                disabled={busy}
                onChange={(e) => update({ offsetConfirmed: e.target.checked })}
              />
              <span>
                {proposal.offset
                  ? `I confirm this reminder should stay ${proposal.offset.description}.`
                  : "I confirm this reminder should keep the same calendar-day and wall-clock offset from the event."}
              </span>
            </label>
          )}
          {schedule.strategy === "fix_time" && (
            <div className="fixed-time">
              <label>
                Fixed time in {facts.timezone}
                <input
                  type="datetime-local"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                />
              </label>
              <button
                className="button subtle small"
                disabled={!localTime || busy}
                onClick={() =>
                  update({
                    fixedLocalTime: localTime,
                    fixedTimeConfirmed: true,
                  })
                }
              >
                Confirm fixed time
              </button>
            </div>
          )}
          {hasRelative &&
            proposal.before.mode === "customScheduled" &&
            schedule.strategy !== "explicit_date" && (
              <label className="acknowledgement">
                <input
                  type="checkbox"
                  checked={!!schedule.fixedTimeConfirmed}
                  disabled={busy}
                  onChange={(e) =>
                    update({ fixedTimeConfirmed: e.target.checked })
                  }
                />
                <span>
                  I confirm the fixed publication time above for interpreting
                  relative dates.
                </span>
              </label>
            )}
        </>
      )}
      {proposal.relativeContext && (
        <div className="relative-context">
          <span>
            <strong>Publication date</strong>
            {readableDate(proposal.relativeContext.publicationDate)}
          </span>
          <ArrowRight size={17} />
          <span>
            <strong>Event date</strong>
            {readableDate(proposal.relativeContext.eventDate)}
          </span>
          <span className="relative-days">
            {proposal.relativeContext.days}{" "}
            {proposal.relativeContext.days === 1 ? "day" : "days"} apart
          </span>
        </div>
      )}
      {proposal.before.scheduledAt !== proposal.after.scheduledAt && (
        <div className="schedule-proposal">
          <Check size={14} />
          <span>
            Proposed: <strong>{scheduledLabel(proposal.after)}</strong> ·{" "}
            {proposal.after.channelTimezone}
          </span>
        </div>
      )}
      {proposal.before.channelTimezone !== facts.timezone && (
        <p className="helper">
          Event zone: {facts.timezone}. Channel zone:{" "}
          {proposal.before.channelTimezone}. Calendar wording is calculated in
          the event zone.
        </p>
      )}
    </section>
  );
}

function MediaReview({
  linked,
  proposal,
  revision,
  action,
  busy,
}: {
  linked: LinkedPost;
  proposal: Proposal;
  revision: number;
  action: Action;
  busy: boolean;
}) {
  const [upload, setUpload] = useState(false);
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File>();
  const [uploadError, setUploadError] = useState("");
  if (!linked.snapshot.assets.length)
    return (
      <div className="no-media">
        <ImageIcon size={14} />
        Text-only post · no image to review
      </div>
    );
  const media = proposal.media;
  const source = media.url || linked.snapshot.assets[0].url;
  const update = (status: string, acknowledged: boolean, extra = {}) =>
    action("/api/campaign/media", {
      postId: proposal.postId,
      status,
      acknowledged,
      ...extra,
    });
  async function uploadFile(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Choose an image smaller than 5 MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("Choose PNG, JPEG, or WebP.");
      return;
    }
    setUploadError("");
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const result = (await action("/api/assets", {
      data,
      mime: file.type,
      altText: alt,
    })) as { url: string; altText: string } | undefined;
    if (result?.url) {
      await update("replacement", false, {
        url: result.url,
        altText: result.altText,
      });
      setUpload(false);
    }
  }
  return (
    <section className="media-review">
      <div className="subsection-title">
        <ImageIcon size={17} />
        <h3>Attached image</h3>
        <Badge
          kind={
            media.acknowledged && media.revision === revision ? "teal" : "amber"
          }
        >
          {media.acknowledged && media.revision === revision
            ? "Reviewed for this revision"
            : "Image needs review"}
        </Badge>
      </div>
      <div className="media-review-content">
        <a
          className="media-preview-link"
          href={source}
          target="_blank"
          rel="noreferrer"
          aria-label="Open full image preview"
        >
          <img
            className="media-preview"
            src={source}
            alt={
              media.altText ||
              linked.snapshot.assets[0].altText ||
              "Attached event image awaiting review"
            }
          />
          <span>
            View full image <ArrowUpRight size={12} />
          </span>
        </a>
        <div>
          <p className="media-explanation">
            A corrected caption doesn’t make an image accurate. Check every
            event detail in the image.
          </p>
          <div className="media-actions">
            <button
              className={`button subtle small ${media.status === "accurate" ? "chosen" : ""}`}
              disabled={busy}
              onClick={() => update("accurate", true)}
            >
              <Check size={14} />
              Image is still accurate
            </button>
            <button
              className="button subtle small"
              disabled={busy}
              onClick={() => update("poster", false)}
            >
              <ImageIcon size={14} />
              Use updated event poster
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setUpload(!upload)}
            >
              <Upload size={14} />
              Replace image
            </button>
          </div>
          {(media.status === "poster" || media.status === "replacement") && (
            <>
              <p className="helper">
                {media.status === "poster"
                  ? "Generated poster"
                  : "Replacement image"}{" "}
                · Revision {revision}. Preview this exact image before approval.
              </p>
              <label className="acknowledgement">
                <input
                  type="checkbox"
                  checked={media.acknowledged}
                  disabled={busy}
                  onChange={(e) =>
                    update(media.status, e.target.checked, {
                      url: media.url,
                      altText: media.altText,
                    })
                  }
                />
                <span>
                  I reviewed this image and its event details are accurate.
                </span>
              </label>
              {media.altText && (
                <p className="image-alt">
                  <strong>Alt text:</strong> {media.altText}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {upload && (
        <form className="upload-form" onSubmit={uploadFile}>
          <label>
            Replacement image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </label>
          <label>
            Image description (alt text)
            <textarea
              required
              value={alt}
              maxLength={1000}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image and its important event details."
            />
          </label>
          <p className="helper">
            PNG, JPEG, or WebP · up to 5 MB. Only upload material you intend to
            publish.
          </p>
          {uploadError && (
            <p role="alert" className="field-warning">
              {uploadError}
            </p>
          )}
          <button className="button subtle" disabled={busy || !file || !alt}>
            Upload for review <Upload size={15} />
          </button>
        </form>
      )}
    </section>
  );
}

function CorrectionReview({ campaign: c, action, busy }: SharedProps) {
  const announcement = c.announcement!;
  const defaultText = `An update for ${c.name}: we’ve moved from ${readableDate(c.originalFacts.date)} at ${readableTime(c.originalFacts.time)}, ${c.originalFacts.venue}, to ${readableDate(c.proposedFacts.date)} at ${readableTime(c.proposedFacts.time)}, ${c.proposedFacts.venue}. We hope to see you there.`;
  const [text, setText] = useState(c.correction?.text || defaultText);
  const [reviewed, setReviewed] = useState(false);
  const [savedText, setSavedText] = useState<string>();
  const saved =
    savedText === text &&
    c.correction?.text === text &&
    c.correction.channelId === announcement.channelId;
  const created = c.operations.find(
    (o) =>
      o.action === "correction" &&
      ["succeeded", "pending", "running", "uncertain"].includes(o.status),
  );
  return (
    <section className="correction-review">
      <div className="section-top">
        <div>
          <span className="eyebrow">A SEPARATE FOLLOW-UP</span>
          <h2>Correct the published announcement.</h2>
          <p>Create a new draft. The original public post stays as it is.</p>
        </div>
        <FileText size={23} />
      </div>
      <div className="correction-original">
        <Badge>Already published</Badge>
        <p>{announcement.text}</p>
      </div>
      <label>
        Correction draft
        <textarea
          className="correction-text"
          value={text}
          disabled={!!created}
          onChange={(e) => {
            setText(e.target.value);
            setReviewed(false);
          }}
        />
      </label>
      <div className="destination">
        <ChannelMark service={announcement.service} />
        <span>
          Destination: <strong>{announcement.channelName}</strong>
        </span>
        <Badge>Draft only</Badge>
      </div>
      <label className="acknowledgement">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={!!created}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        <span>I reviewed the correction text and its destination.</span>
      </label>
      <div className="correction-action">
        {!saved && !created && (
          <button
            className="button subtle"
            disabled={busy || !text.trim()}
            onClick={async () => {
              const result = await action("/api/campaign/correction", {
                text,
                channelId: announcement.channelId,
                approve: false,
              });
              if (result) setSavedText(text);
            }}
          >
            Save correction preview <Check size={16} />
          </button>
        )}
        <button
          className="button subtle"
          disabled={busy || !reviewed || !saved || !!created || !text.trim()}
          onClick={() =>
            action("/api/campaign/correction", {
              text,
              channelId: announcement.channelId,
              approve: true,
            })
          }
        >
          {created
            ? created.status === "succeeded"
              ? c.mode === "sample"
                ? "Draft created in sample"
                : "Draft created and verified"
              : created.status === "uncertain"
                ? "Draft outcome uncertain"
                : "Creating draft…"
            : "Create correction draft"}{" "}
          <FileText size={16} />
        </button>
        {c.mode === "sample" && (
          <span className="helper">
            Simulated draft creation. No public post is changed.
          </span>
        )}
      </div>
    </section>
  );
}

function Results({ campaign: c, action, busy }: SharedProps) {
  const allRegular = c.operations.filter((o) => o.action !== "correction");
  // A later attempt supersedes an earlier outcome for the same campaign post.
  // Keep the earlier receipts available without treating old failures as current.
  const latestByPost = new Map<string, Operation>();
  for (const operation of [...allRegular].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  )) {
    latestByPost.set(operation.postId, operation);
  }
  const regular = [...latestByPost.values()];
  const history = allRegular
    .filter(
      (operation) => latestByPost.get(operation.postId)?.id !== operation.id,
    )
    .reverse();
  const corrections = c.operations.filter((o) => o.action === "correction");
  const working = c.operations.some((operation) =>
    ["pending", "running"].includes(operation.status),
  );
  const counts = {
    succeeded: regular.filter((o) => o.status === "succeeded").length,
    review: regular.filter((o) =>
      ["needs_review", "failed", "uncertain", "skipped"].includes(o.status),
    ).length,
    skipped: regular.filter((o) => o.status === "skipped").length,
    running: regular.filter((o) => ["pending", "running"].includes(o.status))
      .length,
  };
  return (
    <>
      <div className="result-summary">
        <div className="result-metric good">
          <CircleCheck size={21} />
          <strong>{counts.succeeded}</strong>
          <span>
            {c.mode === "sample"
              ? "verified in sample"
              : "updated and verified"}
          </span>
        </div>
        <div className="result-metric attention">
          <CircleAlert size={21} />
          <strong>{counts.review}</strong>
          <span>need attention · includes skipped</span>
        </div>
        <div className="result-metric">
          <Clock3 size={21} />
          <strong>{counts.skipped}</strong>
          <span>skipped · unchanged</span>
        </div>
        {counts.running > 0 && (
          <div className="result-metric">
            <RefreshCw size={21} />
            <strong>{counts.running}</strong>
            <span>in progress</span>
          </div>
        )}
      </div>
      {c.mode === "sample" && (
        <div className="notice sample-result">
          <ShieldCheck size={18} />
          <p>
            <strong>No Buffer posts changed.</strong> These are persisted
            outcomes against the simulated account in your sample workspace.
          </p>
        </div>
      )}
      <div className="section-top results-section-title">
        <h2>Individual outcomes</h2>
        <ReceiptDownload />
      </div>
      <div className="results-list">
        {regular.map((operation) => (
          <ResultRow
            key={operation.id}
            operation={operation}
            sample={c.mode === "sample"}
            action={action}
            busy={busy}
          />
        ))}
      </div>
      {!regular.length && (
        <EmptyState title="No updates have been applied">
          Return to review, select eligible posts, and approve the exact change
          set.
        </EmptyState>
      )}
      {history.length > 0 && (
        <details className="operation-history">
          <summary>
            Receipt history{" "}
            <span>
              {history.length} earlier{" "}
              {history.length === 1 ? "outcome" : "outcomes"}
            </span>
            <ChevronDown size={16} />
          </summary>
          <p className="helper">
            These earlier attempts are retained for reference. The latest
            outcome above determines each post’s current status.
          </p>
          <div className="results-list">
            {history.map((operation) => (
              <ResultRow
                key={operation.id}
                operation={operation}
                sample={c.mode === "sample"}
                action={action}
                busy={busy}
                historical
              />
            ))}
          </div>
        </details>
      )}
      {corrections.length > 0 && (
        <section className="correction-results">
          <h2>Correction drafts</h2>
          <p className="helper">
            The original published announcements were not edited or deleted.
          </p>
          {corrections.map((operation) => (
            <ResultRow
              key={operation.id}
              operation={operation}
              sample={c.mode === "sample"}
              action={action}
              busy={busy}
            />
          ))}
        </section>
      )}
      {c.announcement && !corrections.length && (
        <CorrectionReview campaign={c} action={action} busy={busy} />
      )}
      <ActionBar
        summary={
          <>
            <ShieldCheck size={18} />
            <span>
              {working
                ? "Verifying individual outcomes…"
                : "Your work is saved. Unresolved posts stay visible."}
            </span>
          </>
        }
      >
        <button
          className="button subtle"
          disabled={busy || working}
          onClick={() => action("/api/campaign/preview", {})}
        >
          Review remaining work
        </button>
        <button
          className="button primary"
          disabled={busy || working}
          onClick={() => action("/api/campaign/next")}
        >
          Make another change <ArrowRight size={17} />
        </button>
      </ActionBar>
    </>
  );
}

function ResultRow({
  operation: op,
  sample,
  action,
  busy,
  historical = false,
}: {
  operation: Operation;
  sample: boolean;
  action: Action;
  busy: boolean;
  historical?: boolean;
}) {
  const statusLabel: Record<Operation["status"], string> = {
    pending: "Waiting to update",
    running: "Checking and updating",
    succeeded: sample
      ? "Verified in sample"
      : op.action === "correction"
        ? "Draft created and verified"
        : "Updated and verified",
    needs_review: /changed in (simulated )?buffer|external/i.test(op.message)
      ? "Changed in Buffer"
      : "Needs review",
    failed: "Update failed",
    skipped: "Skipped",
    uncertain: "Outcome uncertain",
  };
  const kind =
    op.status === "succeeded"
      ? "teal"
      : op.status === "failed"
        ? "red"
        : ["needs_review", "uncertain"].includes(op.status)
          ? "amber"
          : "neutral";
  return (
    <article className={`result-row result-${op.status}`}>
      <div className="result-icon">
        {op.status === "succeeded" ? (
          <CheckCheck size={22} />
        ) : ["pending", "running"].includes(op.status) ? (
          <Clock3 size={22} />
        ) : (
          <CircleAlert size={22} />
        )}
      </div>
      <div className="result-content">
        <div className="result-title">
          <strong>{op.before.channelName}</strong>
          <Badge kind={kind}>{statusLabel[op.status]}</Badge>
        </div>
        <p className="result-caption">
          {op.status === "succeeded" ? op.after.text : op.before.text}
        </p>
        <p className="result-message">{op.message}</p>
        {op.status === "skipped" && op.before.scheduledAt && (
          <p className="field-warning">
            <Clock3 size={14} />
            {historical
              ? `This earlier attempt left the post scheduled in ${sample ? "sample" : "Buffer"}.`
              : `Still scheduled in ${sample ? "sample" : "Buffer"}. Skipping does not stop publication.`}
          </p>
        )}
        <span className="result-time">
          {new Date(op.updatedAt).toLocaleString("en-GB")} ·{" "}
          {op.action === "correction"
            ? "Separate correction draft"
            : op.action === "move_to_draft"
              ? "Move to Draft"
              : "Post update"}
        </span>
        {!historical &&
          ["needs_review", "failed", "uncertain", "skipped"].includes(
            op.status,
          ) && (
            <div className="result-actions">
              {op.status === "uncertain" && (
                <button
                  className="button subtle small"
                  disabled={busy}
                  onClick={() =>
                    action("/api/campaign/reconcile", { operationId: op.id })
                  }
                >
                  Check outcome <RefreshCw size={14} />
                </button>
              )}
              {op.action !== "correction" && op.status !== "uncertain" && (
                <button
                  className="button subtle small"
                  disabled={busy}
                  onClick={() =>
                    action("/api/campaign/refresh", { postId: op.postId })
                  }
                >
                  Refresh and review <RefreshCw size={14} />
                </button>
              )}
              {op.before.scheduledAt &&
                op.action !== "correction" &&
                op.status !== "uncertain" && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      action("/api/campaign/move-to-draft", {
                        postId: op.postId,
                        confirm: false,
                      })
                    }
                  >
                    Review Move to Draft
                  </button>
                )}
            </div>
          )}
      </div>
    </article>
  );
}

function ActionBar({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="action-bar">
      <div className="action-summary">{summary}</div>
      <div className="action-buttons">{children}</div>
    </div>
  );
}

function Settings({
  state,
  action,
  busy,
  close,
}: {
  state: AppState;
  action: Action;
  busy: boolean;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const d = dialog.current;
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="settings-dialog"
      onCancel={close}
      aria-labelledby="settings-title"
    >
      <div className="dialog-title">
        <h2 id="settings-title">Your workspace</h2>
        <button
          className="icon-button"
          aria-label="Close settings"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <section>
        <span className="eyebrow">BUFFER CONNECTION</span>
        <p>
          <Badge
            kind={state.connection.status === "connected" ? "teal" : "neutral"}
          >
            {state.connection.status === "connected"
              ? "Connected"
              : state.connection.status === "not_connected"
                ? "Not connected"
                : state.connection.status}
          </Badge>
        </p>
        <p>
          Changeboard uses your own Buffer account through OAuth. Tokens stay
          encrypted on the server and are never stored in your browser.
        </p>
        {!state.connection.configured && (
          <div className="notice amber">
            <CircleAlert size={17} />
            <p>
              Live account connection is not configured on this installation
              yet. The sample workspace is available.
            </p>
          </div>
        )}
        {state.connection.status === "connected" ? (
          <>
            <OrganizationPicker state={state} action={action} busy={busy} />
            <LiveImportControls
              state={state}
              action={action}
              busy={busy}
              onLoaded={close}
            />
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => action("/api/disconnect")}
            >
              <Unplug size={15} />
              Disconnect Buffer
            </button>
          </>
        ) : state.connection.configured ? (
          <a className="button primary" href="/api/auth/buffer">
            Connect Buffer <ArrowUpRight size={15} />
          </a>
        ) : null}
        <p className="helper">
          Disconnecting removes the locally stored credentials. Your Buffer
          posts remain unchanged and scheduled. Revoke app access in Buffer
          settings as well if needed.
        </p>
        <div className="read-evidence">
          <h3>Recent Buffer read receipts</h3>
          <p className="helper">
            Account requests are separate from sample repairs. An HTTP response
            does not prove a successful repair.
          </p>
          {state.connection.readReceipts?.length ? (
            <ul>
              {state.connection.readReceipts.map((receipt, index) => (
                <li key={`${receipt.at}-${index}`}>
                  <strong>
                    {
                      (
                        {
                          account: "Account discovery",
                          channels: "Channel discovery",
                          posts: "Post import",
                          post: "Post read",
                          read: "Read request",
                        } as Record<string, string>
                      )[receipt.operation]
                    }
                  </strong>
                  <span>
                    {receipt.outcome === "transport_error"
                      ? "No response"
                      : `HTTP ${receipt.httpStatus ?? "unknown"}`}
                    {receipt.apiErrors ? " · API errors returned" : ""}
                    {receipt.postsReturned !== undefined
                      ? ` · ${receipt.postsReturned} posts returned`
                      : ""}
                  </span>
                  <time dateTime={receipt.at}>
                    {new Date(receipt.at).toLocaleString("en-GB")}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="helper">
              No live read receipts are recorded in this workspace yet.
            </p>
          )}
        </div>
      </section>
      <section>
        <span className="eyebrow">PRIVACY & DATA</span>
        <p>
          We store only the selected campaign, confirmed facts, source
          snapshots, association positions and operation outcomes needed to
          repair your posts. Public poster and replacement-image URLs contain
          material you choose to publish.
        </p>
        <p>
          Deleting local data does not delete or alter posts in Buffer. Public
          assets may be retained while a scheduled post still references them.
        </p>
        <label className="acknowledgement">
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(e) => setDeleteConfirmed(e.target.checked)}
          />
          <span>I want to delete this local workspace and connection.</span>
        </label>
        <button
          className="button danger"
          disabled={busy || !deleteConfirmed}
          onClick={async () => {
            const r = await action("/api/data", {}, "DELETE");
            if (r) close();
          }}
        >
          Delete local workspace
        </button>
      </section>
      <p className="small-muted">
        Changeboard is an independent application. It is not an official Buffer
        product.
      </p>
    </dialog>
  );
}
