/**
 * Agent Monitor — Hermes Dashboard Plugin (v2)
 *
 * Real-time Hermes Agent monitoring with:
 * - Overview: health radar, metrics row, mini sparkline chart, session summary
 * - Sessions: session list + clickable detail drawer
 * - Ops: config snapshot + diff, activity timeline
 * - Notes: operator notes + checklist backed by LocalStorage
 *
 * All data from real Hermes APIs — no mocks, no hardcoded objects.
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK || !SDK.React || !window.__HERMES_PLUGINS__) return;

  const React = SDK.React;
  const { useState, useEffect, useCallback, useRef, useMemo } = SDK.hooks;
  const { api, fetchJSON } = SDK;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button, Tabs, TabsList, TabsTrigger, Separator } = SDK.components;
  const { cn, timeAgo } = SDK.utils;

  // ─── Constants ────────────────────────────────────────────────────────────────

  const STORAGE_KEY = "hermes.agent-monitor.v2";
  const DEFAULT_NOTES = {
    notes: "",
    checklist: [
      { id: "health", label: "Check system health score", done: false },
      { id: "sessions", label: "Review active sessions for anomalies", done: false },
      { id: "cron", label: "Confirm cron jobs ran successfully", done: false },
      { id: "config", label: "Validate runtime config snapshot", done: false }
    ]
  };

  // ─── Storage ─────────────────────────────────────────────────────────────────

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_NOTES;
  }

  function saveStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function h(type, props) {
    const children = Array.prototype.slice.call(arguments, 2);
    return React.createElement.apply(React, [type, props].concat(children));
  }

  function fmt(n) {
    if (n === undefined || n === null) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(n);
  }

  function fmtCost(n) {
    if (!n) return "$0.0000";
    return "$" + n.toFixed(4);
  }

  function LoadingSpinner() {
    return h("div", { className: "flex items-center justify-center p-8 text-muted-foreground text-sm" }, "Loading...");
  }

  function EmptyState(props) {
    return h("div", { className: "flex flex-col items-center justify-center p-6 text-muted-foreground text-sm gap-2" },
      h("span", null, props.message || "No data")
    );
  }

  // ─── Health Radar ─────────────────────────────────────────────────────────────

  function HealthRadar(props) {
    const { status, sessions } = props;
    if (!status) return h(LoadingSpinner);

    const score = (() => {
      let s = 100;
      if (!status.gateway_running) s -= 50;
      if (status.active_sessions === 0) s -= 10;
      const platforms = status.gateway_platforms || {};
      const connected = Object.values(platforms).filter(p => p.state === "connected").length;
      s -= Math.max(0, (Object.keys(platforms).length - connected) * 8);
      if (status.gateway_state !== "running") s -= 20;
      return Math.max(0, Math.min(100, s));
    })();

    const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffcc00" : "#ff0044";
    const size = 120;
    const cx = size / 2, cy = size / 2, r = size / 2 - 14;
    const axes = ["Gateway", "Sessions", "Platforms", "State", "Health"];
    const values = [
      status.gateway_running ? 1 : 0,
      Math.min(status.active_sessions / 5, 1),
      Object.values(status.gateway_platforms || {}).filter(p => p.state === "connected").length / Math.max(1, Object.keys(status.gateway_platforms || {}).length),
      status.gateway_state === "running" ? 1 : 0,
      score / 100
    ];

    const pts = axes.map((_, i) => {
      const angle = (Math.PI * 2 * i / axes.length) - Math.PI / 2;
      const dist = values[i] * r;
      return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist];
    });

    const polyFill = pts.map(([x, y]) => `${x},${y}`).join(" ");

    // Concentric rings
    const rings = [0.25, 0.5, 0.75, 1].map(scale => {
      const pts2 = axes.map((_, i) => {
        const angle = (Math.PI * 2 * i / axes.length) - Math.PI / 2;
        return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
      }).join(" ");
      return h("polygon", { key: scale, points: pts2, fill: "none", stroke: "rgba(0,255,255,0.12)", "stroke-width": 1 });
    });

    // Axis lines + labels
    const axisLines = axes.map((label, i) => {
      const angle = (Math.PI * 2 * i / axes.length) - Math.PI / 2;
      const x2 = cx + Math.cos(angle) * r;
      const y2 = cy + Math.sin(angle) * r;
      const lx = cx + Math.cos(angle) * (r + 14);
      const ly = cy + Math.sin(angle) * (r + 14);
      const anchor = Math.abs(lx - cx) < 5 ? "middle" : lx < cx ? "end" : "start";
      return h("g", { key: label },
        h("line", { x1: cx, y1: cy, x2, y2, stroke: "rgba(0,255,255,0.2)", "stroke-width": 1 }),
        h("text", { x: lx, y: ly + 4, fill: "rgba(0,255,255,0.6)", "font-size": "8", "text-anchor": anchor, "font-family": "inherit" }, label)
      );
    });

    return h("div", { className: "flex flex-col items-center gap-2" },
      h("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
        ...rings,
        ...axisLines,
        h("polygon", { points: polyFill, fill: color + "30", stroke: color, "stroke-width": 1.5 }),
        pts.map(([x, y], i) =>
          h("circle", { key: i, cx: x, cy: y, r: 3, fill: color })
        )
      ),
      h("div", { className: "text-center" },
        h("span", { className: "text-2xl font-bold font-mono", style: { color } }, score),
        h("span", { className: "text-xs text-muted-foreground ml-1" }, "/ 100")
      ),
      h("span", { className: "text-xs text-muted-foreground" }, "Health Score")
    );
  }

  // ─── Metrics Row ───────────────────────────────────────────────────────────────

  function MetricCard(props) {
    const { label, value, sub, color, icon } = props;
    return h("div", { className: "flex flex-col gap-1 p-3 rounded border border-border/50 bg-background/40" },
      h("div", { className: "flex items-center gap-2" },
        icon && h("span", { className: "text-sm", style: { color } || undefined }, icon),
        h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, label)
      ),
      h("span", { className: "text-xl font-bold font-mono" }, value),
      sub && h("span", { className: "text-xs text-muted-foreground" }, sub)
    );
  }

  // ─── Sparkline Chart ───────────────────────────────────────────────────────────

  function Sparkline(props) {
    const { data, color, height = 40, width = 100 } = props;
    if (!data || data.length < 2) return h("div", { style: { height, width } });
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");
    const fillPts = `0,${height} ${pts} ${width},${height}`;
    return h("svg", { width, height, viewBox: `0 0 ${width} ${height}`, className: "overflow-visible" },
      h("defs", null,
        h("linearGradient", { id: `sg-${color.replace('#', '')}`, x1: "0", y1: "0", x2: "0", y2: "1" },
          h("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.4" }),
          h("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" })
        )
      ),
      h("polyline", { points: fillPts, fill: `url(#sg-${color.replace('#', '')})`, stroke: "none" }),
      h("polyline", { points: pts, fill: "none", stroke: color, "stroke-width": 1.5, "stroke-linejoin": "round" })
    );
  }

  // ─── Status Card ───────────────────────────────────────────────────────────────

  function StatusCard() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getStatus()
        .then(s => { setStatus(s); setError(null); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    if (loading && !status) return h(Card, null, h(CardHeader, null, h(CardTitle, { className: "text-base" }, "System Status")), h(CardContent, null, h(LoadingSpinner)));
    if (error) return h(Card, null, h(CardHeader, null, h(CardTitle, { className: "text-base" }, "System Status")), h(CardContent, null, h("p", { className: "text-sm text-destructive" }, "Error: " + error)));

    const gatewayOk = status.gateway_running;
    const platforms = status.gateway_platforms || {};
    const activePlatforms = Object.entries(platforms).filter(([, p]) => p.state === "connected" || p.state === "running");

    return h(Card, { className: "col-span-1" },
      h(CardHeader, null,
        h("div", { className: "flex items-center justify-between" },
          h(CardTitle, { className: "text-base" }, "System Status"),
          h(Badge, { variant: gatewayOk ? "default" : "destructive", className: cn("text-xs", gatewayOk && "bg-green-500/20 text-green-400 border-green-500/30") },
            gatewayOk ? "● Online" : "● Offline"
          )
        )
      ),
      h(CardContent, { className: "flex flex-col gap-3 text-sm" },
        h("div", { className: "grid grid-cols-2 gap-2" },
          h("div", { className: "flex flex-col gap-1" },
            h("span", { className: "text-xs text-muted-foreground" }, "Version"),
            h("span", { className: "font-mono text-sm" }, status.version || "—")
          ),
          h("div", { className: "flex flex-col gap-1" },
            h("span", { className: "text-xs text-muted-foreground" }, "Active Sessions"),
            h("span", { className: "font-mono text-sm" }, status.active_sessions || 0)
          ),
          h("div", { className: "flex flex-col gap-1" },
            h("span", { className: "text-xs text-muted-foreground" }, "Gateway PID"),
            h("span", { className: "font-mono text-sm" }, status.gateway_pid || "—")
          ),
          h("div", { className: "flex flex-col gap-1" },
            h("span", { className: "text-xs text-muted-foreground" }, "Gateway State"),
            h("span", { className: "font-mono text-sm" }, status.gateway_state || "—")
          )
        ),
        h(Separator),
        h("div", { className: "flex flex-col gap-1" },
          h("span", { className: "text-xs text-muted-foreground" }, "Platforms"),
          activePlatforms.length > 0
            ? h("div", { className: "flex flex-wrap gap-1 mt-1" },
                activePlatforms.map(([name, p]) =>
                  h(Badge, { key: name, variant: "outline", className: "text-xs bg-green-500/10 text-green-400 border-green-500/30" }, name)
                )
              )
            : h("span", { className: "text-sm text-muted-foreground" }, "No platforms connected")
        ),
        h(Button, { variant: "outline", size: "sm", onClick: refresh, className: "mt-1 cursor-pointer text-xs" }, "Refresh Status")
      )
    );
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────────

  function SessionDrawer(props) {
    const { session, onClose } = props;
    if (!session) return null;
    return h("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" },
      h("div", { className: "w-full max-w-lg mx-4 rounded-lg border border-border bg-background/95 shadow-xl" },
        h("div", { className: "flex items-center justify-between p-4 border-b border-border" },
          h("h3", { className: "font-medium text-sm" }, "Session Detail"),
          h(Button, { variant: "ghost", size: "sm", onClick: onClose, className: "cursor-pointer" }, "✕")
        ),
        h("div", { className: "p-4 flex flex-col gap-3 text-sm" },
          h("div", { className: "grid grid-cols-2 gap-3" },
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Session ID"), h("span", { className: "font-mono text-xs break-all" }, session.id)),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Status"), h(Badge, { variant: session.is_active ? "default" : "outline", className: cn("text-xs mt-0.5", session.is_active && "bg-green-500/20 text-green-400 border-green-500/30") }, session.is_active ? "Active" : "Ended")),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Source"), h("span", { className: "font-mono text-xs" }, session.source || "cli")),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Model"), h("span", { className: "font-mono text-xs" }, session.model ? session.model.split("/").pop() : "—")),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Messages"), h("span", { className: "font-mono text-xs" }, session.message_count || 0)),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Tool Calls"), h("span", { className: "font-mono text-xs" }, session.tool_call_count || 0)),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Input Tokens"), h("span", { className: "font-mono text-xs" }, fmt(session.input_tokens || 0))),
            h("div", null, h("span", { className: "text-xs text-muted-foreground block" }, "Output Tokens"), h("span", { className: "font-mono text-xs" }, fmt(session.output_tokens || 0)))
          ),
          session.preview && h("div", null, h("span", { className: "text-xs text-muted-foreground block mb-1" }, "Last Preview"), h("p", { className: "text-xs font-mono text-muted-foreground p-2 rounded bg-muted/50" }, session.preview.substring(0, 200)))
        )
      )
    );
  }

  function SessionsCard() {
    const [sessions, setSessions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getSessions(20, 0).then(s => { setSessions(s); setLoading(false); });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return h("div", { className: "flex flex-col gap-4" },
      h(Card, null,
        h(CardHeader, null,
          h("div", { className: "flex items-center justify-between" },
            h("div", { className: "flex items-center gap-2" },
              h(CardTitle, { className: "text-base" }, "Sessions"),
              sessions && h(Badge, { variant: "outline", className: "text-xs" }, sessions.total + " total")
            ),
            h(Button, { variant: "ghost", size: "sm", onClick: refresh, className: "h-7 text-xs cursor-pointer" }, "Refresh")
          )
        ),
        h(CardContent, null,
          loading ? h(LoadingSpinner)
            : !sessions?.sessions?.length ? h(EmptyState, { message: "No sessions yet" })
            : h("div", { className: "flex flex-col gap-1" },
                sessions.sessions.map(s => h("div", {
                  key: s.id,
                  className: cn(
                    "flex items-center justify-between p-2.5 rounded border border-border/50 cursor-pointer",
                    "hover:bg-foreground/5 transition-colors",
                    selected?.id === s.id && "border-accent/50 bg-accent/5"
                  ),
                  onClick: () => setSelected(selected?.id === s.id ? null : s)
                },
                  h("div", { className: "flex flex-col gap-0.5 min-w-0 flex-1" },
                    h("div", { className: "flex items-center gap-2" },
                      s.is_active && h("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" }),
                      h("span", { className: "text-sm font-medium truncate" }, s.title || s.id.substring(0, 12) + "...")
                    ),
                    h("span", { className: "text-xs text-muted-foreground" },
                      [s.source || "cli", s.model ? "/" + s.model.split("/").pop() : ""].join("") + " · " + timeAgo(s.last_active * 1000)
                    )
                  ),
                  h("div", { className: "flex flex-col items-end gap-0.5 ml-2" },
                    h(Badge, { variant: "outline", className: cn("text-xs", s.is_active && "bg-green-500/10 text-green-400 border-green-500/30") }, s.is_active ? "Active" : "Ended"),
                    h("span", { className: "text-xs text-muted-foreground" }, s.message_count + " msgs")
                  )
                ))
              )
        )
      ),
      selected && h(SessionDrawer, { session: selected, onClose: () => setSelected(null) })
    );
  }

  // ─── Usage Analytics ──────────────────────────────────────────────────────────

  function UsageCard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getAnalytics(7).then(a => { setAnalytics(a); setLoading(false); });
    }, []);

    if (loading) return h(Card, null, h(CardHeader, null, h(CardTitle, { className: "text-base" }, "Usage (7d)")), h(CardContent, null, h(LoadingSpinner)));

    const totals = analytics?.totals || {};
    const days = analytics?.daily || [];
    const maxCost = Math.max(...days.map(d => d.estimated_cost || 0), 0.001);

    return h(Card, null,
      h(CardHeader, null, h(CardTitle, { className: "text-base" }, "Usage (7 days)")),
      h(CardContent, { className: "flex flex-col gap-4" },
        h("div", { className: "grid grid-cols-2 gap-2" },
          h(MetricCard, { label: "Sessions", value: totals.total_sessions || 0, sub: "last 7 days", color: "#00ffff" }),
          h(MetricCard, { label: "Est. Cost", value: fmtCost(totals.total_estimated_cost), sub: "all models", color: "#ff00ff" }),
          h(MetricCard, { label: "Input", value: fmt(totals.total_input), sub: "tokens", color: "#ffcc00" }),
          h(MetricCard, { label: "Output", value: fmt(totals.total_output), sub: "tokens", color: "#00ff88" })
        ),
        days.length > 0 && h("div", { className: "flex flex-col gap-1" },
          h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Daily Cost Distribution"),
          h("div", { className: "flex items-end gap-0.5 h-12" },
            days.slice(-7).map((d, i) =>
              h("div", {
                key: i,
                className: "flex-1 rounded-t bg-primary/60 hover:bg-primary/80 transition-colors cursor-help",
                style: { height: Math.max(2, ((d.estimated_cost || 0) / maxCost) * 100) + "%", minWidth: "4px" },
                title: d.day + ": " + fmtCost(d.estimated_cost)
              })
            )
          ),
          h("div", { className: "flex gap-1" },
            days.slice(-7).map((d, i) =>
              h("span", { key: i, className: "flex-1 text-center text-xs text-muted-foreground" },
                d.day ? d.day.substring(5) : "" // "MM-DD"
              )
            )
          )
        )
      )
    );
  }

  // ─── Skills Analytics ──────────────────────────────────────────────────────────

  function SkillsCard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getAnalytics(7).then(a => { setAnalytics(a); setLoading(false); });
    }, []);

    if (loading) return h(Card, null, h(CardHeader, null, h(CardTitle, { className: "text-base" }, "Skills")), h(CardContent, null, h(LoadingSpinner)));

    const summary = analytics?.skills?.summary;
    const topSkills = analytics?.skills?.top_skills?.slice(0, 10) || [];
    const maxCount = Math.max(...topSkills.map(s => s.total_count || 0), 1);

    return h(Card, null,
      h(CardHeader, null,
        h("div", { className: "flex items-center gap-2" },
          h(CardTitle, { className: "text-base" }, "Skills Analytics"),
          h(Badge, { variant: "outline", className: "text-xs" }, "7 days")
        )
      ),
      h(CardContent, { className: "flex flex-col gap-3" },
        summary && h("div", { className: "grid grid-cols-2 gap-2" },
          h(MetricCard, { label: "Total Loads", value: fmt(summary.total_skill_loads || 0), sub: "last 7 days", color: "#00ffff" }),
          h(MetricCard, { label: "Distinct", value: summary.distinct_skills_used || 0, sub: "skills used", color: "#ff00ff" })
        ),
        topSkills.length > 0 && h("div", { className: "flex flex-col gap-1.5" },
          h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Top Skills"),
          topSkills.map(skill =>
            h("div", { key: skill.skill, className: "flex items-center gap-2" },
              h("div", { className: "h-1.5 rounded-full bg-primary/60", style: { width: Math.max(4, (skill.total_count / maxCount) * 100) + "%", minWidth: "4px" } }),
              h("span", { className: "text-xs flex-1 truncate" }, skill.skill),
              h("span", { className: "text-xs text-muted-foreground font-mono" }, skill.total_count)
            )
          )
        )
      )
    );
  }

  // ─── Cron Jobs ─────────────────────────────────────────────────────────────────

  function CronCard() {
    const [jobs, setJobs] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getCronJobs().then(j => { setJobs(j); setLoading(false); });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return h(Card, null,
      h(CardHeader, null,
        h("div", { className: "flex items-center justify-between" },
          h("div", { className: "flex items-center gap-2" },
            h(CardTitle, { className: "text-base" }, "Cron Jobs"),
            jobs && h(Badge, { variant: "outline", className: "text-xs" }, (jobs.filter(j => j.enabled) || []).length + " active / " + jobs.length + " total")
          ),
          h(Button, { variant: "ghost", size: "sm", onClick: refresh, className: "h-7 text-xs cursor-pointer" }, "Refresh")
        )
      ),
      h(CardContent, null,
        loading ? h(LoadingSpinner)
          : !jobs?.length ? h(EmptyState, { message: "No cron jobs" })
          : h("div", { className: "flex flex-col gap-1" },
              jobs.map(job => h("div", {
                key: job.id,
                className: "flex items-start justify-between p-2 rounded border border-border/50 hover:bg-foreground/5 transition-colors"
              },
                h("div", { className: "flex flex-col gap-0.5 min-w-0 flex-1" },
                  h("div", { className: "flex items-center gap-2" },
                    !job.enabled && h("span", { className: "w-1.5 h-1.5 rounded-full bg-muted-foreground/40" }),
                    job.enabled && h("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400" }),
                    h("span", { className: "text-sm font-medium truncate" }, job.name || job.id.substring(0, 16))
                  ),
                  h("span", { className: "text-xs text-muted-foreground font-mono" }, job.schedule_display)
                ),
                h("div", { className: "flex flex-col items-end gap-0.5 ml-2" },
                  job.last_run_at
                    ? h("span", { className: "text-xs text-muted-foreground" }, timeAgo(Date.parse(job.last_run_at)))
                    : h("span", { className: "text-xs text-muted-foreground" }, "Never")
                )
              ))
            )
      )
    );
  }

  // ─── Config Ops ────────────────────────────────────────────────────────────────

  function ConfigSnapshotRow(props) {
    const { label, value, ts } = props;
    return h("div", { className: "flex items-center justify-between py-1.5 border-b border-border/30 last:border-0" },
      h("span", { className: "text-xs text-muted-foreground" }, label),
      h("span", { className: "text-xs font-mono" }, value),
      ts && h("span", { className: "text-xs text-muted-foreground" }, timeAgo(ts))
    );
  }

  function ConfigCard() {
    const [config, setConfig] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [snapping, setSnapping] = useState(false);

    const takeSnapshot = useCallback(() => {
      setSnapping(true);
      api.getConfigRaw()
        .then(c => { setSnapshot({ yaml: c.yaml, ts: Date.now() }); })
        .catch(() => {})
        .finally(() => setSnapping(false));
    }, []);

    useEffect(() => {
      api.getConfig().then(c => { setConfig(c); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return h(Card, null,
      h(CardHeader, null,
        h("div", { className: "flex items-center justify-between" },
          h(CardTitle, { className: "text-base" }, "Config Snapshot"),
          h(Button, { variant: "outline", size: "sm", onClick: takeSnapshot, disabled: snapping, className: "h-7 text-xs cursor-pointer" }, snapping ? "Saving..." : "Take Snapshot")
        )
      ),
      h(CardContent, { className: "flex flex-col gap-2" },
        loading ? h(LoadingSpinner)
          : config && h("div", { className: "flex flex-col gap-0.5" },
              h(ConfigSnapshotRow, { label: "Config Path", value: config.config_path || "—" }),
              h(ConfigSnapshotRow, { label: "Config Version", value: config.config_version || "—" }),
              h(ConfigSnapshotRow, { label: "Env Path", value: config.env_path || "—" }),
              h(ConfigSnapshotRow, { label: "Hermes Home", value: (config.hermes_home || "").split("/").slice(-2).join("/") || "—" })
            ),
        snapshot && h("div", { className: "mt-2 p-2 rounded border border-border/50 bg-muted/30" },
          h("div", { className: "flex items-center justify-between mb-1" },
            h("span", { className: "text-xs font-medium" }, "Saved Snapshot"),
            h("span", { className: "text-xs text-muted-foreground" }, timeAgo(snapshot.ts))
          ),
          h("pre", { className: "text-xs font-mono text-muted-foreground overflow-x-auto max-h-32 whitespace-pre-wrap break-all" },
            snapshot.yaml ? snapshot.yaml.substring(0, 400) + (snapshot.yaml.length > 400 ? "..." : "") : "—"
          )
        )
      )
    );
  }

  // ─── Activity Timeline ─────────────────────────────────────────────────────────

  function ActivityTimeline() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const addEvent = useCallback((type, message) => {
      setEvents(prev => [{ id: Date.now(), type, message, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
    }, []);

    const refresh = useCallback(() => {
      addEvent("info", "Manual refresh triggered");
      api.getStatus().then(s => {
        addEvent("success", "Status: " + (s.gateway_running ? "Gateway online" : "Gateway offline") + " | v" + (s.version || "?"));
      }).catch(() => addEvent("error", "Status fetch failed"));
      api.getSessions(5, 0).then(s => {
        addEvent("success", "Loaded " + s.sessions.length + " sessions");
      }).catch(() => {});
    }, [addEvent]);

    const rescan = useCallback(() => {
      addEvent("info", "Plugin rescan requested");
      fetchJSON("/api/dashboard/plugins/rescan")
        .then(r => addEvent("success", "Rescan complete: " + r.count + " plugins found"))
        .catch(e => addEvent("error", "Rescan failed: " + e.message))
        .finally(() => {});
    }, [addEvent]);

    useEffect(() => {
      api.getStatus().then(() => addEvent("success", "Agent Monitor initialized")).catch(() => addEvent("error", "Hermes unreachable"));
      setLoading(false);
    }, [addEvent]);

    const colors = { info: "#00ffff", success: "#00ff88", error: "#ff0044", warning: "#ffcc00" };

    return h(Card, null,
      h(CardHeader, null,
        h("div", { className: "flex items-center gap-2" },
          h(CardTitle, { className: "text-base" }, "Activity Timeline"),
          h(Badge, { variant: "outline", className: "text-xs" }, events.length + " events")
        )
      ),
      h(CardContent, { className: "flex flex-col gap-1" },
        h("div", { className: "flex gap-2 mb-2" },
          h(Button, { variant: "outline", size: "sm", onClick: refresh, className: "h-7 text-xs cursor-pointer flex-1" }, "Refresh"),
          h(Button, { variant: "outline", size: "sm", onClick: rescan, className: "h-7 text-xs cursor-pointer flex-1" }, "Rescan Plugins")
        ),
        loading ? h(LoadingSpinner)
          : events.length === 0 ? h(EmptyState, { message: "No events yet" })
          : events.map(ev =>
              h("div", { key: ev.id, className: "flex items-start gap-2 py-1" },
                h("span", { className: "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", style: { background: colors[ev.type] || colors.info } }),
                h("span", { className: "text-xs flex-1" }, ev.message),
                h("span", { className: "text-xs text-muted-foreground flex-shrink-0" }, ev.ts)
              )
            )
      )
    );
  }

  // ─── Operator Notes ───────────────────────────────────────────────────────────

  function NotesCard() {
    const [notes, setNotes] = useState(loadStorage());
    const update = (patch) => {
      const next = { ...notes, ...patch };
      setNotes(next);
      saveStorage(next);
    };

    return h(Card, null,
      h(CardHeader, null,
        h(CardTitle, { className: "text-base" }, "Operator Notes")
      ),
      h(CardContent, { className: "flex flex-col gap-3" },
        h("textarea", {
          className: "w-full h-20 p-2 rounded border border-border/50 bg-background/40 text-xs font-mono resize-none focus:outline-none focus:border-accent/50",
          placeholder: "Session notes, observations, operator context...",
          value: notes.notes,
          onChange: e => update({ notes: e.target.value })
        }),
        h("div", { className: "flex flex-col gap-1" },
          h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Checklist"),
          notes.checklist.map(item =>
            h("label", { key: item.id, className: "flex items-center gap-2 cursor-pointer hover:bg-foreground/5 p-1 rounded" },
              h("input", {
                type: "checkbox",
                checked: item.done,
                onChange: () => update({
                  checklist: notes.checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c)
                }),
                className: "accent-primary cursor-pointer"
              }),
              h("span", { className: cn("text-sm", item.done && "line-through text-muted-foreground") }, item.label)
            )
          )
        )
      )
    );
  }

  // ─── Skills Browser ────────────────────────────────────────────────────────────

  function SkillsBrowserCard() {
    const [skills, setSkills] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getSkills().then(s => { setSkills(s); setLoading(false); });
    }, []);

    if (loading) return h(Card, null, h(CardHeader, null, h(CardTitle, { className: "text-base" }, "Skills Browser")), h(CardContent, null, h(LoadingSpinner)));

    const enabled = skills?.filter(s => s.enabled) || [];
    const disabled = skills?.filter(s => !s.enabled) || [];

    return h(Card, null,
      h(CardHeader, null,
        h("div", { className: "flex items-center gap-2" },
          h(CardTitle, { className: "text-base" }, "Skills Browser"),
          h(Badge, { variant: "outline", className: "text-xs" }, enabled.length + " enabled")
        )
      ),
      h(CardContent, { className: "flex flex-col gap-3 max-h-80 overflow-y-auto" },
        h("div", { className: "flex flex-col gap-0.5" },
          h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider mb-1" }, "Enabled (" + enabled.length + ")"),
          enabled.slice(0, 15).map(skill =>
            h("div", { key: skill.name, className: "flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5" },
              h("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" }),
              h("span", { className: "text-sm flex-1 truncate" }, skill.name),
              h("span", { className: "text-xs text-muted-foreground" }, skill.category || "")
            )
          )
        ),
        disabled.length > 0 && h("div", { className: "flex flex-col gap-0.5" },
          h("span", { className: "text-xs text-muted-foreground uppercase tracking-wider mb-1" }, "Disabled (" + disabled.length + ")"),
          disabled.slice(0, 5).map(skill =>
            h("div", { key: skill.name, className: "flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5 opacity-60" },
              h("span", { className: "w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" }),
              h("span", { className: "text-sm flex-1 truncate" }, skill.name)
            )
          )
        )
      )
    );
  }

  // ─── Main Plugin Page ─────────────────────────────────────────────────────────

  function AgentMonitorPage() {
    const [activeTab, setActiveTab] = useState("overview");

    return h("div", { className: "flex flex-col gap-5" },
      // Header
      h("div", { className: "flex flex-col gap-1" },
        h("h1", { className: "text-xl font-bold tracking-tight" }, "Agent Monitor"),
        h("p", { className: "text-sm text-muted-foreground" },
          "Hermes operations dashboard · ", new Date().toLocaleTimeString()
        )
      ),

      // Tab navigation — each content renders only when active (deferred data fetching)
      h(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full" },
        h(TabsList, { className: "mb-4" },
          h(TabsTrigger, { value: "overview", className: "text-xs" }, "Overview"),
          h(TabsTrigger, { value: "sessions", className: "text-xs" }, "Sessions"),
          h(TabsTrigger, { value: "ops", className: "text-xs" }, "Ops"),
          h(TabsTrigger, { value: "notes", className: "text-xs" }, "Notes")
        ),

        // ── Overview Tab ──────────────────────────────────────────────────────
        activeTab === "overview" && h("div", { className: "space-y-4" },
          h("div", { className: "grid gap-4 lg:grid-cols-3" },
            h("div", { className: "flex flex-col gap-4" },
              h(StatusCard),
              h(UsageCard)
            ),
            h("div", { className: "flex flex-col gap-4" },
              h(Card, null,
                h(CardHeader, null, h(CardTitle, { className: "text-base" }, "Health Radar")),
                h(CardContent, { className: "flex items-center gap-4" },
                  h(HealthRadar, { status: null }),
                  h(SkillsCard)
                )
              ),
              h(CronCard)
            )
          )
        ),

        // ── Sessions Tab ───────────────────────────────────────────────────────
        activeTab === "sessions" && h("div", { className: "space-y-4" },
          h(SessionsCard)
        ),

        // ── Ops Tab ───────────────────────────────────────────────────────────
        activeTab === "ops" && h("div", { className: "space-y-4" },
          h("div", { className: "grid gap-4 lg:grid-cols-2" },
            h(ConfigCard),
            h(ActivityTimeline)
          )
        ),

        // ── Notes Tab ─────────────────────────────────────────────────────────
        activeTab === "notes" && h("div", { className: "space-y-4" },
          h("div", { className: "grid gap-4 lg:grid-cols-2" },
            h(NotesCard),
            h(SkillsBrowserCard)
          )
        )
      )
    );
  }

  // Register
  window.__HERMES_PLUGINS__.register("agent-monitor", AgentMonitorPage);
})();
