import { useEffect, useMemo, useState } from "react";
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

const integrationLinks = [
  {
    label: "Discord",
    description: "Live development chatter, patch notes and playtest coordination.",
    url: "https://discord.gg/",
  },
  {
    label: "GitHub",
    description: "Transparent commit history with webhook powered release notes.",
    url: "https://github.com/YoofeCZ/vite-react-dev-page",
  },
  {
    label: "Newsletter",
    description: "Gmail + n8n automations delivering milestone recaps and sneak peeks.",
    url: "mailto:team@yourstudio.dev",
  },
  {
    label: "Forum",
    description: "Community hub for bug reports, feature requests and fan creations.",
    url: "/forum",
  },
];

const adminHighlights = [
  {
    title: "Observability Dashboard",
    detail:
      "Realtime stats for visitors, forum health and Unity focus hours backed by Cloudflare D1 analytics.",
  },
  {
    title: "Content Pipeline",
    detail:
      "Headless CMS workflow with scheduled posts, SEO controls and media uploads to R2 buckets.",
  },
  {
    title: "Store Operations",
    detail:
      "Stripe powered catalog, pre-order flows, discount automation and fulfillment state tracking.",
  },
  {
    title: "Moderation Toolkit",
    detail:
      "Forum curation with ban lists, topic pinning, quick replies and Discord sync for staff alerts.",
  },
];

const storeProducts = [
  {
    name: "Standard Edition",
    price: "24.99€",
    description: "Base game + exclusive Discord role on launch.",
  },
  {
    name: "Deluxe Edition",
    price: "39.99€",
    description: "Includes soundtrack, concept art book and dynamic wallpapers.",
  },
  {
    name: "Collector's Edition",
    price: "59.99€",
    description: "Physical loot crate with signed art prints and resin figurine.",
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Transparent game development pipeline</p>
          <h1>
            Dev Command Center<span className="accent">.</span>
          </h1>
          <p className="hero__tagline">
            Follow the journey of the game in real-time across Unity, GitHub, community hubs and
            the Cloudflare powered storefront.
          </p>
          <div className="hero__cta">
            <a className="cta-button" href="/store">
              Pre-order on the store
            </a>
            <button className="cta-secondary" onClick={triggerDemoNotification} type="button">
              Trigger automation preview
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
            ))}
          </div>
        </section>

        <section className="glass-card">
          <h2>Admin Control Center</h2>
          <div className="feature-grid">
            {adminHighlights.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card">
          <h2>Game Store Preview</h2>
          <div className="store-grid">
            {storeProducts.map((product) => (
              <article key={product.name} className="store-card">
                <header>
                  <h3>{product.name}</h3>
                  <span className="store-card__price">{product.price}</span>
                </header>
                <p>{product.description}</p>
                <p className="store-card__meta">Stripe Checkout • Instant key delivery</p>
              </article>
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

      <footer className="footer">
        <p>
          Built with Vite, React, Hono and deployed edge-first on Cloudflare. Unity, n8n and
          Discord integrations are ready for production secrets.
        </p>
        <p>
          © {new Date().getFullYear()} Dev Command Center. Crafted by an indie team pushing AAA polish.
        </p>
      </footer>
    </div>
  );
}

export default App;
