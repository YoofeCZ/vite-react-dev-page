#if UNITY_EDITOR
using System;
using System.Globalization;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;

/// <summary>
/// Unity Editor window that synchronises development presence information with the Cloudflare Worker API.
/// </summary>
public sealed class DevStatusTracker : EditorWindow
{
    private const string WindowTitle = "Dev Status Tracker";
    private const string EndpointPrefsKey = "DevStatusTracker.Endpoint";
    private const string StatePrefsKey = "DevStatusTracker.State";
    private static readonly TimeSpan HeartbeatInterval = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan PersistInterval = TimeSpan.FromSeconds(30);
    private static readonly string DefaultEndpoint = "https://your-domain.com/api/unity-status";

    private enum ActivityType
    {
        Coding,
        Art,
        Design,
        Testing,
        Documentation,
    }

    [Serializable]
    private class PersistedState
    {
        public double todaySeconds;
        public double weekSeconds;
        public string dayIso;
        public string weekIso;
        public int streak;
    }

    [Serializable]
    private class UnityStatusRequest
    {
        public string state = "offline";
        public string currentTask = string.Empty;
        public string activityType = string.Empty;
        public string sceneName = string.Empty;
        public string unityVersion = string.Empty;
        public bool isPlayMode;
        public double totalTodayHours;
        public double totalWeekHours;
        public int productiveStreak;
        public bool isHeartbeat;
    }

    private string workerEndpoint = DefaultEndpoint;
    private string currentTask = "Planning next sprint";
    private ActivityType activity = ActivityType.Coding;
    private bool isWorking = true;

    private double todaySeconds;
    private double weekSeconds;
    private DateTime currentDay = DateTime.UtcNow.Date;
    private DateTime currentWeekAnchor = GetWeekAnchor(DateTime.UtcNow);
    private int productiveStreak;

    private DateTime lastEditorUpdate = DateTime.UtcNow;
    private DateTime lastHeartbeat = DateTime.MinValue;
    private DateTime lastPersist = DateTime.UtcNow;
    private DateTime? lastSyncTime;
    private string statusMessage = "Awaiting first synchronisation.";
    private bool sendInFlight;

    [MenuItem("Window/Dev Status Tracker")]
    public static void ShowWindow()
    {
        var window = GetWindow<DevStatusTracker>(WindowTitle);
        window.minSize = new Vector2(420f, 360f);
        window.Show();
    }

    private void OnEnable()
    {
        LoadPreferences();
        lastEditorUpdate = DateTime.UtcNow;
        lastHeartbeat = DateTime.UtcNow;
        EditorApplication.update += OnEditorUpdate;
    }

    private void OnDisable()
    {
        EditorApplication.update -= OnEditorUpdate;
        SavePreferences();
        SendStatusUpdate(offline: true, heartbeat: false);
    }

    private void OnGUI()
    {
        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Cloudflare Worker Endpoint", EditorStyles.boldLabel);

        EditorGUI.BeginChangeCheck();
        workerEndpoint = EditorGUILayout.TextField("Webhook URL", workerEndpoint);
        if (EditorGUI.EndChangeCheck())
        {
            EditorPrefs.SetString(EndpointPrefsKey, workerEndpoint);
        }

        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Current Focus", EditorStyles.boldLabel);
        currentTask = EditorGUILayout.TextField("Task", currentTask);
        activity = (ActivityType)EditorGUILayout.EnumPopup("Activity", activity);

        EditorGUI.BeginChangeCheck();
        isWorking = EditorGUILayout.ToggleLeft("Working session active", isWorking);
        if (EditorGUI.EndChangeCheck())
        {
            SendStatusUpdate();
        }

        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Session Metrics", EditorStyles.boldLabel);
        EditorGUILayout.LabelField("Today", $"{todaySeconds / 3600d:F2} h");
        EditorGUILayout.LabelField("This Week", $"{weekSeconds / 3600d:F2} h");
        EditorGUILayout.LabelField("Productive Streak", productiveStreak.ToString());

        EditorGUILayout.Space();
        if (GUILayout.Button("Sync status now"))
        {
            SendStatusUpdate();
        }

        if (GUILayout.Button("Mark break"))
        {
            isWorking = false;
            SendStatusUpdate();
        }

        EditorGUILayout.Space();
        if (!string.IsNullOrWhiteSpace(statusMessage))
        {
            EditorGUILayout.HelpBox(statusMessage, MessageType.Info);
        }

        if (lastSyncTime.HasValue)
        {
            EditorGUILayout.LabelField("Last synced", lastSyncTime.Value.ToLocalTime().ToString("g"));
        }
    }

    private void OnEditorUpdate()
    {
        var now = DateTime.UtcNow;
        var delta = now - lastEditorUpdate;
        lastEditorUpdate = now;

        RollCalendars(now);
        if (isWorking)
        {
            todaySeconds += delta.TotalSeconds;
            weekSeconds += delta.TotalSeconds;
        }

        if (now - lastPersist > PersistInterval)
        {
            SavePreferences();
            lastPersist = now;
        }

        if (now - lastHeartbeat >= HeartbeatInterval)
        {
            SendStatusUpdate(heartbeat: true);
        }

        Repaint();
    }

    private void RollCalendars(DateTime now)
    {
        if (now.Date != currentDay)
        {
            if (todaySeconds >= 1800)
            {
                productiveStreak += 1;
            }
            else
            {
                productiveStreak = 0;
            }

            todaySeconds = 0;
            currentDay = now.Date;
        }

        var anchor = GetWeekAnchor(now);
        if (anchor != currentWeekAnchor)
        {
            weekSeconds = 0;
            currentWeekAnchor = anchor;
        }
    }

    private void LoadPreferences()
    {
        workerEndpoint = EditorPrefs.GetString(EndpointPrefsKey, DefaultEndpoint);

        if (EditorPrefs.HasKey(StatePrefsKey))
        {
            try
            {
                var json = EditorPrefs.GetString(StatePrefsKey);
                var state = JsonUtility.FromJson<PersistedState>(json);
                if (state != null)
                {
                    todaySeconds = state.todaySeconds;
                    weekSeconds = state.weekSeconds;
                    currentDay = ParseDate(state.dayIso, DateTime.UtcNow.Date);
                    currentWeekAnchor = ParseDate(state.weekIso, GetWeekAnchor(DateTime.UtcNow));
                    productiveStreak = state.streak;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"DevStatusTracker: Failed to parse saved state {ex.Message}");
            }
        }
    }

    private void SavePreferences()
    {
        var state = new PersistedState
        {
            todaySeconds = todaySeconds,
            weekSeconds = weekSeconds,
            dayIso = currentDay.ToString("O"),
            weekIso = currentWeekAnchor.ToString("O"),
            streak = productiveStreak,
        };

        EditorPrefs.SetString(StatePrefsKey, JsonUtility.ToJson(state));
    }

    private void SendStatusUpdate(bool offline = false, bool heartbeat = false)
    {
        if (sendInFlight)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(workerEndpoint))
        {
            statusMessage = "Please configure a valid Cloudflare Worker endpoint.";
            return;
        }

        var payload = new UnityStatusRequest
        {
            state = offline ? "offline" : (isWorking ? "working" : "break"),
            currentTask = string.IsNullOrWhiteSpace(currentTask) ? "Unspecified task" : currentTask,
            activityType = activity.ToString(),
            sceneName = SceneManager.GetActiveScene().name,
            unityVersion = Application.unityVersion,
            isPlayMode = EditorApplication.isPlaying,
            totalTodayHours = Math.Round(todaySeconds / 3600d, 2),
            totalWeekHours = Math.Round(weekSeconds / 3600d, 2),
            productiveStreak = productiveStreak,
            isHeartbeat = heartbeat,
        };

        var json = JsonUtility.ToJson(payload);
        var request = new UnityWebRequest(workerEndpoint, UnityWebRequest.kHttpVerbPOST)
        {
            uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json)),
            downloadHandler = new DownloadHandlerBuffer()
        };
        request.SetRequestHeader("Content-Type", "application/json");

        sendInFlight = true;
        lastHeartbeat = DateTime.UtcNow;

        var operation = request.SendWebRequest();
        operation.completed += _ =>
        {
            sendInFlight = false;
            lastSyncTime = DateTime.UtcNow;
            if (request.result == UnityWebRequest.Result.Success)
            {
                statusMessage = heartbeat
                    ? "Heartbeat delivered"
                    : offline
                        ? "Status set to offline"
                        : "Status synchronised";
            }
            else
            {
                statusMessage = $"Sync failed: {request.error}";
            }

            request.Dispose();
            SavePreferences();
        };
    }

    private static DateTime GetWeekAnchor(DateTime time)
    {
        var date = time.Date;
        var diff = ((int)date.DayOfWeek + 6) % 7; // Monday anchored week
        return date.AddDays(-diff);
    }

    private static DateTime ParseDate(string value, DateTime fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
        {
            return parsed;
        }

        return fallback;
    }
}
#endif
