import { type FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

type UnityState = "working" | "break" | "offline";

type UnityActivity = {
  id: string;
  state: UnityState;
  label: string;
  timestamp: string;
};

type UnityStatus = {
  state: UnityState;
  currentTask: string;
  activityType: string;
  sceneName: string;
  unityVersion: string;
  isPlayMode: boolean;
  totalTodayHours: number;
  totalWeekHours: number;
  productiveStreak: number;
  lastUpdated: string;
  history: UnityActivity[];
};

type LatestCommit = {
  id: string;
  message: string;
  author: string;
  url: string;
  repository: string;
  committedAt: string;
  branch?: string;
};

type NotificationTriggerResponse = {
  delivered: boolean;
  forwardedToAutomation: boolean;
};

const fallbackUnityStatus: UnityStatus = {
  state: "offline",
  currentTask: "Awaiting next development session",
  activityType: "Idle",
  sceneName: "-",
  unityVersion: "2022.3 LTS",
  isPlayMode: false,
  totalTodayHours: 0,
  totalWeekHours: 0,
  productiveStreak: 0,
  lastUpdated: new Date(0).toISOString(),
  history: [],
};

const milestoneTimeline = [
  {
    title: "Vertical Slice Complete",
    description: "Core gameplay loop playable end-to-end with temporary art.",
    date: "Q2 2024",
    status: "done",
  },
  {
    title: "Community Alpha",
    description: "Closed testing with Discord community and automated feedback loops.",
    date: "Q3 2024",
    status: "in-progress",
  },
  {
    title: "Narrative Overhaul",
    description: "Branching dialogue editor and localization workflows connected to n8n.",
    date: "Q4 2024",
    status: "planned",
  },
  {
    title: "Early Access Launch",
    description: "Stripe-powered store release with automated license distribution.",
    date: "Q1 2025",
    status: "planned",
  },
];

const featureHighlights = [
  {
    title: "Tactical Narrative Combat",
    detail:
      "Hybrid turn-based combat infused with branching dialogue choices that change outcomes in real-time.",
  },
  {
    title: "AI-driven Companions",
    detail:
      "Companion behaviours authored in Unity via Scriptable Objects and tracked through the Dev Status window.",
  },
  {
    title: "Immersive Audio",
    detail:
      "Original soundtrack dynamically mixed with FMOD and exposed in the Deluxe / Collector's editions.",
  },
  {
    title: "Mod-ready Architecture",
    detail:
      "Open data pipelines with Cloudflare R2 hosting for community-made missions and cosmetics.",
  },
];

type IntegrationLink =
  | {
      label: string;
      description: string;
      kind: "external";
      url: string;
    }
  | {
      label: string;
      description: string;
      kind: "route";
      route: Route;
    };

const integrationLinks: IntegrationLink[] = [
  {
    label: "Discord",
    description: "Live development chatter, patch notes and playtest coordination.",
    kind: "external",
    url: "https://discord.gg/",
  },
  {
    label: "GitHub",
    description: "Transparent commit history with webhook powered release notes.",
    kind: "external",
    url: "https://github.com/YoofeCZ/vite-react-dev-page",
  },
  {
    label: "Newsletter",
    description: "Gmail + n8n automations delivering milestone recaps and sneak peeks.",
    kind: "external",
    url: "mailto:team@yourstudio.dev",
  },
  {
    label: "Forum",
    description: "Community hub for bug reports, feature requests and fan creations.",
    kind: "route",
    route: "forum",
  },
  {
    label: "Admin Portal",
    description: "Secure operations console available via /admin for pipeline configuration.",
    kind: "route",
    route: "admin",
  },
];

const automationPipelines = [
  {
    name: "Unity → n8n → Discord",
    description:
      "Editor heartbeat triggers Discord notifications whenever a focused work session begins or ends.",
  },
  {
    name: "GitHub → Cloudflare → Newsletter",
    description:
      "New commits produce changelog drafts, stored in KV, reviewed in admin and emailed through Gmail API.",
  },
  {
    name: "Store → Stripe Webhooks",
    description:
      "Order confirmations deliver license keys instantly and update customer timelines in D1.",
  },
];

const unityActivityBadges: Record<UnityState, string> = {
  working: "🟢 Working",
  break: "🟡 On a Break",
  offline: "⚫ Offline",
};

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "forum", label: "Forum" },
  { id: "store", label: "Store" },
] as const;

type SiteView = (typeof navItems)[number]["id"];
type Route = SiteView | "admin";

function normalizePathname(pathname: string) {
  if (!pathname) {
    return "/";
  }
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

function routeFromPathname(pathname: string): Route {
  const normalized = normalizePathname(pathname);
  switch (normalized) {
    case "/forum":
      return "forum";
    case "/store":
      return "store";
    case "/admin":
      return "admin";
    case "/":
    default:
      return "overview";
  }
}

function pathnameFromRoute(route: Route) {
  switch (route) {
    case "forum":
      return "/forum";
    case "store":
      return "/store";
    case "admin":
      return "/admin";
    case "overview":
    default:
      return "/";
  }
}

type HeroContent = {
  eyebrow: string;
  title: string;
  accent: string;
  tagline: string;
  primaryAction?:
    | { type: "view"; label: string; target: Route }
    | { type: "link"; label: string; target: string };
  secondaryActionLabel: string;
};

const heroCopy: Record<SiteView, HeroContent> = {
  overview: {
    eyebrow: "Transparent pipeline",
    title: "Dev Command",
    accent: " Nexus",
    tagline:
      "Follow the journey in real-time across Unity sessions, GitHub activity, automation bridges and monetisation prep.",
    primaryAction: { type: "view", label: "Jump to store cockpit", target: "store" },
    secondaryActionLabel: "Trigger automation preview",
  },
  forum: {
    eyebrow: "Community intelligence",
    title: "Forum Steward",
    accent: " Suite",
    tagline:
      "Curate conversations, review reports and surface feature requests flowing in from the player community.",
    primaryAction: { type: "view", label: "Go to admin deck", target: "admin" },
    secondaryActionLabel: "Send update broadcast",
  },
  store: {
    eyebrow: "Commerce ready",
    title: "Storefront",
    accent: " Ops",
    tagline:
      "Track Stripe performance, fine-tune product tiers and sync fulfilment with n8n-driven automation.",
    primaryAction: {
      type: "link",
      label: "Open Stripe dashboard",
      target: "https://dashboard.stripe.com/test/payments",
    },
    secondaryActionLabel: "Dispatch launch teaser",
  },
};

const adminHero: HeroContent = {
  eyebrow: "Operator workspace",
  title: "Admin Control",
  accent: " Deck",
  tagline:
    "Configure automation, content pipelines and moderation tooling without leaving the Cloudflare edge ecosystem.",
  primaryAction: {
    type: "link",
    label: "Open Cloudflare D1",
    target: "https://dash.cloudflare.com/?to=/:account/workers/d1",
  },
  secondaryActionLabel: "Simulate Discord ping",
};

const adminMetrics = [
  { label: "Visitors", value: "15 847", change: "+4.2%", tone: "positive" },
  { label: "Forum Posts", value: "234", change: "+12 this week", tone: "positive" },
  { label: "Pre-orders", value: "89", change: "↑ 6 overnight", tone: "positive" },
  { label: "Unity Focus", value: "847 h", change: "+18 h this month", tone: "neutral" },
] as const;

const cmsQueue = [
  {
    title: "Devlog #27 — AI companion behaviours",
    status: "Scheduled • Today 18:00 CET",
  },
  {
    title: "Behind the Scenes: Concept Art Drop",
    status: "Draft • Needs soundtrack embed",
  },
  {
    title: "Patch Notes 0.5.1",
    status: "Awaiting QA sign-off",
  },
];

const automationRunbooks = [
  {
    name: "Milestone Broadcast",
    detail: "Unity heartbeat → n8n → Discord + Gmail multi-channel ping.",
  },
  {
    name: "Store Fulfilment",
    detail: "Stripe webhook triggers R2 build upload and license email.",
  },
  {
    name: "Forum Escalation",
    detail: "High priority reports sync to admin Discord channel with context.",
  },
];

const moderationTickets = [
  {
    user: "NovaFox",
    summary: "Flagged exploit report in Bug Reports",
    status: "In triage",
  },
  {
    user: "Synthwave",
    summary: "Fan art thread ready for spotlight",
    status: "Scheduled",
  },
  {
    user: "MythicByte",
    summary: "Toxic reply escalated for review",
    status: "Action required",
  },
];

const forumCategories = [
  {
    name: "General Discussion",
    threads: 128,
    pinned: 3,
    description: "Lore speculation, studio updates and dev AMAs.",
    latest: "2 minutes ago by Kira",
  },
  {
    name: "Bug Reports",
    threads: 86,
    pinned: 2,
    description: "Issue tracking with repro templates synced to GitHub.",
    latest: "8 minutes ago by Orik",
  },
  {
    name: "Feature Requests",
    threads: 61,
    pinned: 4,
    description: "Player-driven roadmap shaping automation triggers.",
    latest: "15 minutes ago by Helix",
  },
  {
    name: "Fan Art",
    threads: 48,
    pinned: 1,
    description: "Concept pieces, renders and cosplay spotlights.",
    latest: "32 minutes ago by Lumi",
  },
];

const trendingThreads = [
  {
    title: "Should companions react to morale shifts?",
    activity: "34 replies • 212 upvotes",
    owner: "Kestrel",
  },
  {
    title: "Speedrun build under 20 minutes!",
    activity: "19 replies • 154 upvotes",
    owner: "Rin",
  },
  {
    title: "[BUG] Dialogue wheel softlock when alt-tabbing",
    activity: "12 replies • 11 repros",
    owner: "Delta",
  },
];

const forumModerationQueue = [
  {
    item: "Lock spoiler thread after release",
    resolution: "Auto-lock 48h post release via n8n",
  },
  {
    item: "Archive outdated bug reports",
    resolution: "Bulk close after GitHub issue status sync",
  },
  {
    item: "Promote concept artist AMA",
    resolution: "Pin + Discord broadcast",
  },
];

const storeCatalog = [
  {
    name: "Standard Edition",
    price: "24.99€",
    includes: ["Base game", "Discord launch role"],
    inventory: "Unlimited digital",
  },
  {
    name: "Deluxe Edition",
    price: "39.99€",
    includes: ["Soundtrack", "Concept art book", "Dynamic wallpapers"],
    inventory: "1 250 keys remaining",
  },
  {
    name: "Collector's Edition",
    price: "59.99€",
    includes: ["Signed art prints", "Resin figurine", "Steelbook case"],
    inventory: "Pre-order batch #2 shipping",
  },
];

const merchItems = [
  {
    name: "Premium Tee",
    price: "19.99€",
    detail: "Organic cotton, glow-in-the-dark crest.",
  },
  {
    name: "Poster Set",
    price: "12.99€",
    detail: "Set of three limited edition lithographs.",
  },
  {
    name: "Sticker Pack",
    price: "5.99€",
    detail: "Holographic faction decals.",
  },
];

const storeStats = [
  { label: "Pre-orders", value: "89", detail: "+18 this week", tone: "positive" },
  { label: "Conversion", value: "4.7%", detail: "↑ 0.6% vs last sprint", tone: "positive" },
  { label: "Refund Rate", value: "0.4%", detail: "Stable", tone: "neutral" },
  { label: "Avg. Basket", value: "37.12€", detail: "Includes bundles", tone: "neutral" },
];

const orderQueue = [
  {
    id: "ORD-1056",
    customer: "Mira K.",
    item: "Deluxe Edition",
    status: "Ready for fulfilment",
  },
  {
    id: "ORD-1052",
    customer: "Leo A.",
    item: "Collector's Edition",
    status: "Awaiting figurine stock",
  },
  {
    id: "ORD-1049",
    customer: "Jin P.",
    item: "Soundtrack Add-on",
    status: "Delivered via email",
  },
];

const storeAutomation = [
  {
    name: "Stripe checkout success",
    detail: "Triggers license key email + Discord role assignment workflow.",
  },
  {
    name: "Inventory threshold",
    detail: "Alerts admin when Collector's Edition drops below 100 units.",
  },
  {
    name: "Gumroad backup",
    detail: "Mirrors digital extras for DRM-free customers.",
  },
];

const isBrowser = typeof window !== "undefined";

function formatRelativeTime(lastUpdated: string) {
  const updated = new Date(lastUpdated).getTime();
  if (!Number.isFinite(updated) || updated <= 0) {
    return "No activity tracked yet";
  }

  const diff = Date.now() - updated;
  const minutes = Math.round(diff / (60 * 1000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function App() {
  const [unityStatus, setUnityStatus] = useState<UnityStatus>(fallbackUnityStatus);
  const [latestCommit, setLatestCommit] = useState<LatestCommit | null>(null);
  const [notificationResult, setNotificationResult] =
    useState<NotificationTriggerResponse | null>(null);
  const [route, setRoute] = useState<Route>(() => {
    if (!isBrowser) {
      return "overview";
    }
    return routeFromPathname(window.location.pathname);
  });
  const [adminSettings, setAdminSettings] = useState({
    autoDiscord: true,
    autoNewsletter: false,
    showUnityScene: true,
    maintenanceWindow: "Sunday 22:00 CET",
  });
  const [releaseNotesDraft, setReleaseNotesDraft] = useState(
    "Preview: Collector's edition statues shipping schedule + bug fix round-up.",
  );
  const [lastAdminSave, setLastAdminSave] = useState<string | null>(null);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    const normalized = normalizePathname(window.location.pathname);
    const derived = routeFromPathname(normalized);
    const canonical = pathnameFromRoute(derived);
    if (canonical !== normalized) {
      window.history.replaceState(null, "", canonical);
    }
    setRoute(derived);

    const handlePopState = () => {
      setRoute(routeFromPathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUnityStatus() {
      try {
        const response = await fetch("/api/unity-status");
        if (!response.ok) {
          throw new Error(`Failed to load unity status: ${response.status}`);
        }
        const payload = (await response.json()) as { status: UnityStatus };
        if (!cancelled && payload?.status) {
          setUnityStatus(payload.status);
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchUnityStatus();
    const interval = setInterval(fetchUnityStatus, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchLatestCommit() {
      try {
        const response = await fetch("/api/latest-commit");
        if (!response.ok) {
          throw new Error(`Failed to fetch commit: ${response.status}`);
        }
        const payload = (await response.json()) as { commit: LatestCommit | null };
        if (!cancelled) {
          setLatestCommit(payload.commit ?? null);
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchLatestCommit();
    const interval = setInterval(fetchLatestCommit, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const derivedUnityBadge = useMemo(() => {
    const now = Date.now();
    const updated = new Date(unityStatus.lastUpdated).getTime();
    const stale = !Number.isFinite(updated) || now - updated > 10 * 60 * 1000;
    const baseState = stale ? "offline" : unityStatus.state;
    const badge = unityActivityBadges[baseState];
    const staleSuffix = stale ? " • last heartbeat >10m" : "";
    return `${badge}${staleSuffix}`;
  }, [unityStatus]);

  async function triggerDemoNotification() {
    try {
      const response = await fetch("/api/trigger-notification", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channel: "discord",
          title: "Showcase Notification",
          message: "This is what a Discord + Gmail workflow will deliver when a milestone ships.",
        }),
      });
      if (!response.ok) {
        throw new Error(`Trigger failed with status ${response.status}`);
      }
      const payload = (await response.json()) as NotificationTriggerResponse;
      setNotificationResult(payload);
    } catch (error) {
      console.error(error);
      setNotificationResult({ delivered: false, forwardedToAutomation: false });
    }
  }

  function navigate(to: Route) {
    if (!isBrowser) {
      setRoute(to);
      return;
    }

    const targetPath = pathnameFromRoute(to);
    const currentPath = normalizePathname(window.location.pathname);
    if (currentPath !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    setRoute(to);

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleAdminSettingsToggle(key: "autoDiscord" | "autoNewsletter" | "showUnityScene") {
    setAdminSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleMaintenanceChange(value: string) {
    setAdminSettings((prev) => ({ ...prev, maintenanceWindow: value }));
  }

  function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLastAdminSave(new Date().toLocaleTimeString());
  }

  const isAdminRoute = route === "admin";
  const hero = isAdminRoute ? adminHero : heroCopy[route as SiteView];
  const primaryAction = hero.primaryAction;

  return (
    <div className={`app-shell${isAdminRoute ? " app-shell--admin" : ""}`}>
      <nav className={`primary-nav${isAdminRoute ? " primary-nav--admin" : ""}`}>
        <button className="brand" type="button" onClick={() => navigate("overview")}>
          Yoofe Dev Portal
          {isAdminRoute ? <span className="brand__badge">Admin</span> : null}
        </button>
        {isAdminRoute ? (
          <div className="nav-links nav-links--admin">
            <button className="nav-button" type="button" onClick={() => navigate("overview")}>
              ← Back to overview
            </button>
          </div>
        ) : (
          <div className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-button${route === item.id ? " nav-button--active" : ""}`}
                type="button"
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <header className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">{hero.eyebrow}</p>
          <h1>
            {hero.title}
            <span className="accent">{hero.accent}</span>
          </h1>
          <p className="hero__tagline">{hero.tagline}</p>
          <div className="hero__cta">
            {primaryAction ? (
              primaryAction.type === "view" ? (
                <button
                  className="cta-button"
                  type="button"
                  onClick={() => navigate(primaryAction.target)}
                >
                  {primaryAction.label}
                </button>
              ) : (
                <a
                  className="cta-button"
                  href={primaryAction.target}
                  target="_blank"
                  rel="noreferrer"
                >
                  {primaryAction.label}
                </a>
              )
            ) : null}
            <button className="cta-secondary" onClick={triggerDemoNotification} type="button">
              {hero.secondaryActionLabel}
            </button>
          </div>
          {notificationResult && (
            <p className="cta-result">
              Automation relay: {notificationResult.delivered ? "✅" : "⚠️"} Worker, {" "}
              {notificationResult.forwardedToAutomation ? "✅" : "⚠️"} n8n
            </p>
          )}
        </div>
        <div className="hero__status">
          <div className="glass-card status-card">
            <h2>Unity Presence</h2>
            <p className="status-card__badge">{derivedUnityBadge}</p>
            <dl className="status-meta">
              <div>
                <dt>Current Task</dt>
                <dd>{unityStatus.currentTask}</dd>
              </div>
              <div>
                <dt>Activity Type</dt>
                <dd>{unityStatus.activityType}</dd>
              </div>
              <div>
                <dt>Scene</dt>
                <dd>{unityStatus.sceneName}</dd>
              </div>
              <div>
                <dt>Unity</dt>
                <dd>{unityStatus.unityVersion}</dd>
              </div>
              <div>
                <dt>Play Mode</dt>
                <dd>{unityStatus.isPlayMode ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Today</dt>
                <dd>{unityStatus.totalTodayHours.toFixed(1)} h</dd>
              </div>
              <div>
                <dt>This Week</dt>
                <dd>{unityStatus.totalWeekHours.toFixed(1)} h</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>{unityStatus.productiveStreak} productive days</dd>
              </div>
              <div>
                <dt>Last Update</dt>
                <dd>{formatRelativeTime(unityStatus.lastUpdated)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      {route === "overview" ? (
        <main className="content-grid">
          <section className="glass-card">
            <h2>Latest GitHub Activity</h2>
            {latestCommit ? (
              <article className="commit">
                <h3>{latestCommit.message}</h3>
                <p className="commit__meta">
                  <span>Repository: {latestCommit.repository}</span>
                  <span>Author: {latestCommit.author}</span>
                  {latestCommit.branch ? <span>Branch: {latestCommit.branch}</span> : null}
                  <span>Committed {formatRelativeTime(latestCommit.committedAt)}</span>
                </p>
                <a className="inline-link" href={latestCommit.url} target="_blank" rel="noreferrer">
                  View commit →
                </a>
              </article>
            ) : (
              <p>No commits captured yet. Push to the main repository to populate this feed.</p>
            )}
          </section>

          <section className="glass-card">
            <h2>Progress Timeline</h2>
            <ol className="timeline">
              {milestoneTimeline.map((milestone) => (
                <li key={milestone.title} className={`timeline__item timeline__item--${milestone.status}`}>
                  <div className="timeline__marker" />
                  <div>
                    <h3>{milestone.title}</h3>
                    <p>{milestone.description}</p>
                    <span className="timeline__date">{milestone.date}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="glass-card">
            <h2>Game Snapshot</h2>
            <div className="feature-grid">
              {featureHighlights.map((feature) => (
                <article key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Community & Integrations</h2>
            <div className="integration-grid">
              {integrationLinks.map((integration) => (
                integration.kind === "external" ? (
                  <a
                    key={integration.label}
                    className="integration-card"
                    href={integration.url}
                    target={integration.url.startsWith("http") ? "_blank" : undefined}
                    rel={integration.url.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <h3>{integration.label}</h3>
                    <p>{integration.description}</p>
                  </a>
                ) : (
                  <button
                    key={integration.label}
                    type="button"
                    className="integration-card integration-card--button"
                    onClick={() => navigate(integration.route)}
                  >
                    <h3>{integration.label}</h3>
                    <p>{integration.description}</p>
                    <span className="integration-card__hint">Opens {pathnameFromRoute(integration.route)}</span>
                  </button>
                )
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Automation Pipelines</h2>
            <ul className="automation-list">
              {automationPipelines.map((pipeline) => (
                <li key={pipeline.name}>
                  <h3>{pipeline.name}</h3>
                  <p>{pipeline.description}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Unity Activity Chronicle</h2>
            {unityStatus.history.length > 0 ? (
              <ul className="activity-list">
                {unityStatus.history.map((entry) => (
                  <li key={entry.id}>
                    <span className={`activity-badge activity-badge--${entry.state}`}>
                      {unityActivityBadges[entry.state]}
                    </span>
                    <p>{entry.label}</p>
                    <time dateTime={entry.timestamp}>{formatRelativeTime(entry.timestamp)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>As soon as the Unity editor connects, a rich timeline of activity will appear here.</p>
            )}
          </section>
        </main>
      ) : null}

      {route === "admin" ? (
        <main className="content-grid content-grid--admin">
          <section className="glass-card">
            <h2>Operations Pulse</h2>
            <div className="metrics-grid">
              {adminMetrics.map((metric) => (
                <article key={metric.label} className={`metric-card metric-card--${metric.tone}`}>
                  <h3>{metric.value}</h3>
                  <p>{metric.label}</p>
                  <span>{metric.change}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Content Pipeline</h2>
            <ul className="queue-list">
              {cmsQueue.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.status}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Automation Runbooks</h2>
            <ul className="automation-list">
              {automationRunbooks.map((runbook) => (
                <li key={runbook.name}>
                  <h3>{runbook.name}</h3>
                  <p>{runbook.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Moderation Radar</h2>
            <ul className="queue-list queue-list--compact">
              {moderationTickets.map((ticket) => (
                <li key={ticket.user}>
                  <div>
                    <h3>{ticket.user}</h3>
                    <p>{ticket.summary}</p>
                  </div>
                  <span className="tag tag--alert">{ticket.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Configuration</h2>
            <form className="admin-form" onSubmit={handleAdminSubmit}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adminSettings.autoDiscord}
                  onChange={() => handleAdminSettingsToggle("autoDiscord")}
                />
                <span>Auto-send Discord alerts when Unity session starts</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adminSettings.autoNewsletter}
                  onChange={() => handleAdminSettingsToggle("autoNewsletter")}
                />
                <span>Queue Gmail newsletter draft for every milestone</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adminSettings.showUnityScene}
                  onChange={() => handleAdminSettingsToggle("showUnityScene")}
                />
                <span>Expose Unity scene name publicly on the homepage</span>
              </label>

              <label className="admin-form__field">
                <span>Maintenance window</span>
                <input
                  type="text"
                  value={adminSettings.maintenanceWindow}
                  onChange={(event) => handleMaintenanceChange(event.target.value)}
                />
              </label>

              <label className="admin-form__field">
                <span>Release notes draft</span>
                <textarea
                  rows={4}
                  value={releaseNotesDraft}
                  onChange={(event) => setReleaseNotesDraft(event.target.value)}
                />
              </label>

              <button className="cta-button" type="submit">
                Save configuration
              </button>
              {lastAdminSave ? (
                <p className="form-save">Saved locally at {lastAdminSave}</p>
              ) : null}
            </form>
          </section>
        </main>
      ) : null}

      {route === "forum" ? (
        <main className="content-grid content-grid--forum">
          <section className="glass-card">
            <h2>Category Overview</h2>
            <div className="feature-grid feature-grid--forum">
              {forumCategories.map((category) => (
                <article key={category.name}>
                  <header className="feature-grid__header">
                    <h3>{category.name}</h3>
                    <span className="tag">{category.threads} threads</span>
                  </header>
                  <p>{category.description}</p>
                  <footer className="feature-grid__footer">
                    <span>{category.pinned} pinned</span>
                    <span>{category.latest}</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Trending Threads</h2>
            <ul className="queue-list queue-list--compact">
              {trendingThreads.map((thread) => (
                <li key={thread.title}>
                  <div>
                    <h3>{thread.title}</h3>
                    <p>by {thread.owner}</p>
                  </div>
                  <span className="tag">{thread.activity}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Moderator Playbook</h2>
            <ul className="automation-list">
              {forumModerationQueue.map((item) => (
                <li key={item.item}>
                  <h3>{item.item}</h3>
                  <p>{item.resolution}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Search Filters</h2>
            <form className="admin-form admin-form--filters" onSubmit={(event) => event.preventDefault()}>
              <label className="admin-form__field">
                <span>Keyword</span>
                <input type="search" placeholder="e.g. dialogue, crash, soundtrack" />
              </label>
              <label className="admin-form__field">
                <span>Category</span>
                <select defaultValue="all">
                  <option value="all">All</option>
                  {forumCategories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-form__field">
                <span>Status</span>
                <select defaultValue="open">
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <button className="cta-secondary" type="submit">
                Apply filters
              </button>
            </form>
          </section>
        </main>
      ) : null}

      {route === "store" ? (
        <main className="content-grid content-grid--store">
          <section className="glass-card">
            <h2>Store Metrics</h2>
            <div className="metrics-grid">
              {storeStats.map((stat) => (
                <article key={stat.label} className={`metric-card metric-card--${stat.tone}`}>
                  <h3>{stat.value}</h3>
                  <p>{stat.label}</p>
                  <span>{stat.detail}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Product Catalogue</h2>
            <div className="store-grid">
              {storeCatalog.map((product) => (
                <article key={product.name} className="store-card">
                  <header>
                    <h3>{product.name}</h3>
                    <span className="store-card__price">{product.price}</span>
                  </header>
                  <ul className="store-card__list">
                    {product.includes.map((include) => (
                      <li key={include}>{include}</li>
                    ))}
                  </ul>
                  <p className="store-card__meta">{product.inventory}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Merch Lineup</h2>
            <div className="feature-grid feature-grid--merch">
              {merchItems.map((item) => (
                <article key={item.name}>
                  <h3>{item.name}</h3>
                  <p>{item.detail}</p>
                  <span className="store-card__price">{item.price}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h2>Order Queue</h2>
            <ul className="queue-list queue-list--compact">
              {orderQueue.map((order) => (
                <li key={order.id}>
                  <div>
                    <h3>{order.id}</h3>
                    <p>
                      {order.customer} — {order.item}
                    </p>
                  </div>
                  <span className="tag">{order.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-card">
            <h2>Automation Hooks</h2>
            <ul className="automation-list">
              {storeAutomation.map((hook) => (
                <li key={hook.name}>
                  <h3>{hook.name}</h3>
                  <p>{hook.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : null}

      <footer className="footer">
        <p>
          Built with Vite, React, Hono and deployed edge-first on Cloudflare. Unity, n8n and Discord integrations are ready for
          production secrets.
        </p>
        <p>Operator console lives at /admin with a dedicated routing surface for configuration tasks.</p>
        <p>
          © {new Date().getFullYear()} Dev Command Center. Crafted by an indie team pushing AAA polish.
        </p>
      </footer>
    </div>
  );
}

export default App;
