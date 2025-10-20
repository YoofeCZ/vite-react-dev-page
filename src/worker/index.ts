import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const UNITY_STATUS_KEY = "unity-status";
const LATEST_COMMIT_KEY = "latest-commit";

const allowedUnityStates = ["working", "break", "offline"] as const;
type UnityState = (typeof allowedUnityStates)[number];
const allowedUnityStateSet = new Set<UnityState>(allowedUnityStates);

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

type UnityStatusUpdate = {
  state: UnityState;
  currentTask?: string;
  activityType?: string;
  sceneName?: string;
  unityVersion?: string;
  isPlayMode?: boolean;
  totalTodayHours?: number;
  totalWeekHours?: number;
  productiveStreak?: number;
  isHeartbeat?: boolean;
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

type GitHubWebhookPayload = {
  ref?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
  };
  head_commit?: {
    id?: string;
    message?: string;
    timestamp?: string;
    url?: string;
    author?: {
      name?: string;
    };
  };
};

type NotificationBody = {
  channel: string;
  title?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type StoredState = {
  unityStatus?: UnityStatus;
  latestCommit?: LatestCommit | null;
};

type GlobalState = typeof globalThis & {
  __DEV_PORTAL_CACHE__?: StoredState;
};

const defaultUnityStatus: UnityStatus = {
  state: "offline",
  currentTask: "Awaiting editor activity",
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

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  c.res.headers.set("Access-Control-Allow-Origin", "*");
  c.res.headers.set("Access-Control-Allow-Headers", "content-type");
  c.res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
});

async function readFromKV<T>(env: Env, key: string): Promise<T | null> {
  if (env.UNITY_STATUS_KV && key === UNITY_STATUS_KEY) {
    const stored = await env.UNITY_STATUS_KV.get(key);
    return stored ? (JSON.parse(stored) as T) : null;
  }

  if (env.COMMIT_CACHE_KV && key === LATEST_COMMIT_KEY) {
    const stored = await env.COMMIT_CACHE_KV.get(key);
    return stored ? (JSON.parse(stored) as T) : null;
  }

  const globalState = globalThis as GlobalState;
  const cache = (globalState.__DEV_PORTAL_CACHE__ ??= {});
  if (key === UNITY_STATUS_KEY) {
    return (cache.unityStatus ?? null) as T | null;
  }
  if (key === LATEST_COMMIT_KEY) {
    return (cache.latestCommit ?? null) as T | null;
  }
  return null;
}

async function writeToKV<T>(env: Env, key: string, value: T): Promise<void> {
  if (env.UNITY_STATUS_KV && key === UNITY_STATUS_KEY) {
    await env.UNITY_STATUS_KV.put(key, JSON.stringify(value));
    return;
  }
  if (env.COMMIT_CACHE_KV && key === LATEST_COMMIT_KEY) {
    await env.COMMIT_CACHE_KV.put(key, JSON.stringify(value));
    return;
  }
  const globalState = globalThis as GlobalState;
  const cache = (globalState.__DEV_PORTAL_CACHE__ ??= {});
  if (key === UNITY_STATUS_KEY) {
    cache.unityStatus = value as UnityStatus;
  }
  if (key === LATEST_COMMIT_KEY) {
    cache.latestCommit = value as LatestCommit | null;
  }
}

function validateUnityPayload(payload: UnityStatusUpdate): UnityStatusUpdate {
  if (!allowedUnityStateSet.has(payload.state)) {
    throw new HTTPException(400, { message: "Invalid Unity status state" });
  }
  return payload;
}

function mergeUnityStatus(previous: UnityStatus, update: UnityStatusUpdate): UnityStatus {
  const now = new Date().toISOString();
  const isHeartbeat = update.isHeartbeat ?? false;
  const next: UnityStatus = {
    ...previous,
    ...update,
    currentTask: update.currentTask ?? previous.currentTask,
    activityType: update.activityType ?? previous.activityType,
    sceneName: update.sceneName ?? previous.sceneName,
    unityVersion: update.unityVersion ?? previous.unityVersion,
    isPlayMode: update.isPlayMode ?? previous.isPlayMode,
    totalTodayHours: update.totalTodayHours ?? previous.totalTodayHours,
    totalWeekHours: update.totalWeekHours ?? previous.totalWeekHours,
    productiveStreak: update.productiveStreak ?? previous.productiveStreak,
    lastUpdated: now,
  };

  if (!isHeartbeat) {
    const historyEntry: UnityActivity = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      state: next.state,
      label: `${next.activityType} — ${next.currentTask}`,
      timestamp: now,
    };
    next.history = [historyEntry, ...previous.history].slice(0, 10);
  } else {
    next.history = previous.history;
  }

  return next;
}

app.get("/api/unity-status", async (c) => {
  const stored = (await readFromKV<UnityStatus>(c.env, UNITY_STATUS_KEY)) ?? defaultUnityStatus;
  return c.json({ status: stored });
});

app.post("/api/unity-status", async (c) => {
  const payload = (await c.req.json()) as UnityStatusUpdate;
  validateUnityPayload(payload);
  const current = (await readFromKV<UnityStatus>(c.env, UNITY_STATUS_KEY)) ?? defaultUnityStatus;
  const merged = mergeUnityStatus(current, payload);
  await writeToKV(c.env, UNITY_STATUS_KEY, merged);
  return c.json({ stored: merged });
});

app.get("/api/latest-commit", async (c) => {
  const commit = (await readFromKV<LatestCommit | null>(c.env, LATEST_COMMIT_KEY)) ?? null;
  return c.json({ commit });
});

app.post("/api/github-webhook", async (c) => {
  const payload = (await c.req.json()) as GitHubWebhookPayload;
  if (!payload?.head_commit) {
    throw new HTTPException(400, { message: "Missing head_commit in GitHub payload" });
  }

  const commit: LatestCommit = {
    id: payload.head_commit.id ?? "unknown",
    message: payload.head_commit.message ?? "No commit message",
    author: payload.head_commit.author?.name ?? "Unknown",
    url: payload.head_commit.url ?? payload.repository?.html_url ?? "",
    repository: payload.repository?.full_name ?? "unknown",
    committedAt: payload.head_commit.timestamp ?? new Date().toISOString(),
    branch: payload.ref?.replace("refs/heads/", ""),
  };

  await writeToKV(c.env, LATEST_COMMIT_KEY, commit);
  return c.json({ stored: true });
});

app.post("/api/trigger-notification", async (c) => {
  const body = (await c.req.json()) as NotificationBody;
  if (!body?.channel || !body?.message) {
    throw new HTTPException(400, { message: "channel and message are required" });
  }

  let forwarded = false;
  if (c.env.N8N_WEBHOOK_URL) {
    const response = await fetch(c.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    forwarded = response.ok;
  }

  return c.json({ delivered: true, forwardedToAutomation: forwarded });
});

app.options("*", (c) => c.body(null, 204));

export type { LatestCommit, UnityActivity, UnityState, UnityStatus, UnityStatusUpdate };

export default app;
