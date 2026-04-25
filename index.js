/**
 * Agent Monitor — Hermes Dashboard Plugin
 *
 * A comprehensive real-time monitoring dashboard for the Hermes Agent system.
 * Shows: system status, active sessions, skills analytics, cron jobs, and recent logs.
 *
 * Built with the Hermes Plugin SDK — plain IIFE, no build step required.
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const { React } = SDK;
  const { useState, useEffect, useCallback } = SDK.hooks;
  const { api } = SDK;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button, Tabs, TabsList, TabsTrigger, Separator } = SDK.components;
  const { cn, timeAgo } = SDK.utils;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function LoadingSpinner() {
    return React.createElement("div", {
      className: "flex items-center justify-center p-8 text-muted-foreground",
    }, "Loading...");
  }

  function SectionHeader(props) {
    return React.createElement("div", {
      className: "flex items-center gap-2 mb-3",
    },
      React.createElement("span", { className: "text-sm font-medium opacity-70" }, props.label),
      props.badge && React.createElement(Badge, { variant: "outline", className: "text-xs" }, props.badge)
    );
  }

  // ─── System Status Card ───────────────────────────────────────────────────────

  function StatusCard() {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
      api.getStatus().then(setStatus).catch(e => setError(e.message));
    }, []);

    if (error) return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement(CardTitle, { className: "text-base" }, "System Status")
      ),
      React.createElement(CardContent, null,
        React.createElement("p", { className: "text-sm text-destructive" }, "Error: " + error)
      )
    );

    if (!status) return React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: "text-base" }, "System Status")),
      React.createElement(CardContent, null, React.createElement(LoadingSpinner))
    );

    const gatewayOk = status.gateway_running;
    const platforms = status.gateway_platforms || {};
    const activePlatforms = Object.entries(platforms).filter(([, p]) => p.state === "connected" || p.state === "running");

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement(CardTitle, { className: "text-base" }, "System Status"),
          React.createElement(Badge, {
            variant: gatewayOk ? "default" : "destructive",
            className: cn("text-xs", gatewayOk && "bg-green-500/20 text-green-400 border-green-500/30")
          }, gatewayOk ? "Gateway Online" : "Gateway Offline")
        )
      ),
      React.createElement(CardContent, { className: "flex flex-col gap-3 text-sm" },
        React.createElement("div", { className: "grid grid-cols-2 gap-2" },
          React.createElement("div", { className: "flex flex-col gap-1" },
            React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Version"),
            React.createElement("span", { className: "font-mono text-sm" }, status.version || "unknown")
          ),
          React.createElement("div", { className: "flex flex-col gap-1" },
            React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Active Sessions"),
            React.createElement("span", { className: "font-mono text-sm" }, status.active_sessions || 0)
          ),
          React.createElement("div", { className: "flex flex-col gap-1" },
            React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Gateway PID"),
            React.createElement("span", { className: "font-mono text-sm" }, status.gateway_pid || "—")
          ),
          React.createElement("div", { className: "flex flex-col gap-1" },
            React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Gateway State"),
            React.createElement("span", { className: "font-mono text-sm" }, status.gateway_state || "—")
          )
        ),
        React.createElement(Separator),
        React.createElement("div", { className: "flex flex-col gap-1" },
          React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Connected Platforms"),
          activePlatforms.length > 0
            ? React.createElement("div", { className: "flex flex-wrap gap-1 mt-1" },
                activePlatforms.map(([name, p]) =>
                  React.createElement(Badge, {
                    key: name, variant: "outline",
                    className: "text-xs bg-green-500/10 text-green-400 border-green-500/30"
                  }, name)
                )
              )
            : React.createElement("span", { className: "text-sm text-muted-foreground" }, "No platforms connected")
        )
      )
    );
  }

  // ─── Sessions Card ────────────────────────────────────────────────────────────

  function SessionsCard() {
    const [sessions, setSessions] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getSessions(10, 0).then(s => { setSessions(s); setLoading(false); });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(CardTitle, { className: "text-base" }, "Recent Sessions"),
            sessions && React.createElement(Badge, { variant: "outline", className: "text-xs" },
              sessions.total + " total"
            )
          ),
          React.createElement(Button, {
            variant: "ghost", size: "sm", onClick: refresh,
            className: "h-7 text-xs cursor-pointer"
          }, "Refresh")
        )
      ),
      React.createElement(CardContent, null,
        loading ? React.createElement(LoadingSpinner)
          : !sessions?.sessions?.length ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "No sessions")
          : React.createElement("div", { className: "flex flex-col gap-2" },
              sessions.sessions.map(s => React.createElement(SessionRow, { key: s.id, session: s }))
            )
      )
    );
  }

  function SessionRow(props) {
    const { session } = props;
    const isActive = session.is_active;
    const mins = Math.round((Date.now() - session.started_at * 1000) / 60000);

    return React.createElement("div", {
      className: cn(
        "flex items-center justify-between p-2 rounded border border-border/50",
        "hover:bg-foreground/5 transition-colors"
      )
    },
      React.createElement("div", { className: "flex flex-col gap-0.5 min-w-0 flex-1" },
        React.createElement("div", { className: "flex items-center gap-2" },
          isActive && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" }),
          React.createElement("span", {
            className: "text-sm font-medium truncate",
            title: session.id
          }, session.title || session.id.substring(0, 12) + "...")
        ),
        React.createElement("span", { className: "text-xs text-muted-foreground" },
          [session.source || "cli", session.model ? "/" + session.model.split("/").pop() : ""].join("") +
          " · " + (isActive ? "active now" : timeAgo(session.last_active * 1000))
        )
      ),
      React.createElement("div", { className: "flex flex-col items-end gap-0.5 ml-2" },
        React.createElement(Badge, {
          variant: "outline",
          className: cn("text-xs", isActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "")
        }, isActive ? "Active" : "Ended"),
        React.createElement("span", { className: "text-xs text-muted-foreground" },
          session.message_count + " msgs"
        )
      )
    );
  }

  // ─── Skills Analytics Card ───────────────────────────────────────────────────

  function SkillsCard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getAnalytics(7).then(a => { setAnalytics(a); setLoading(false); });
    }, []);

    if (loading) return React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: "text-base" }, "Skills (7d)")),
      React.createElement(CardContent, null, React.createElement(LoadingSpinner))
    );

    const summary = analytics?.skills?.summary;
    const topSkills = analytics?.skills?.top_skills?.slice(0, 8) || [];

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement(CardTitle, { className: "text-base" }, "Skills Analytics"),
          React.createElement(Badge, { variant: "outline", className: "text-xs" }, "7 days")
        )
      ),
      React.createElement(CardContent, { className: "flex flex-col gap-4" },
        summary && React.createElement("div", { className: "grid grid-cols-2 gap-3" },
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "Total Loads"),
            React.createElement("span", { className: "font-mono text-lg" }, summary.total_skill_loads.toLocaleString())
          ),
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "Distinct Skills"),
            React.createElement("span", { className: "font-mono text-lg" }, summary.distinct_skills_used)
          )
        ),
        topSkills.length > 0 && React.createElement("div", { className: "flex flex-col gap-2" },
          React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Top Skills"),
          topSkills.map(skill =>
            React.createElement("div", {
              key: skill.skill,
              className: "flex items-center gap-2"
            },
              React.createElement("div", {
                className: "h-1.5 rounded-full bg-primary/60",
                style: { width: Math.max(4, skill.percentage) + "%", minWidth: "4px" }
              }),
              React.createElement("span", { className: "text-xs flex-1 truncate" }, skill.skill),
              React.createElement("span", { className: "text-xs text-muted-foreground font-mono" }, skill.total_count)
            )
          )
        )
      )
    );
  }

  // ─── Cron Jobs Card ──────────────────────────────────────────────────────────

  function CronCard() {
    const [jobs, setJobs] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getCronJobs().then(j => { setJobs(j); setLoading(false); });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(CardTitle, { className: "text-base" }, "Cron Jobs"),
            jobs && React.createElement(Badge, { variant: "outline", className: "text-xs" },
              (jobs.filter(j => j.enabled) || []).length + " active")
          ),
          React.createElement(Button, {
            variant: "ghost", size: "sm", onClick: refresh,
            className: "h-7 text-xs cursor-pointer"
          }, "Refresh")
        )
      ),
      React.createElement(CardContent, null,
        loading ? React.createElement(LoadingSpinner)
          : !jobs?.length ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "No cron jobs configured")
          : React.createElement("div", { className: "flex flex-col gap-2" },
              jobs.map(job => React.createElement(CronRow, { key: job.id, job: job, onToggle: refresh }))
            )
      )
    );
  }

  function CronRow(props) {
    const { job, onToggle } = props;

    return React.createElement("div", {
      className: cn(
        "flex items-start justify-between p-2 rounded border border-border/50",
        "hover:bg-foreground/5 transition-colors"
      )
    },
      React.createElement("div", { className: "flex flex-col gap-0.5 min-w-0 flex-1" },
        React.createElement("div", { className: "flex items-center gap-2" },
          !job.enabled && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-muted-foreground/40" }),
          job.enabled && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400" }),
          React.createElement("span", { className: "text-sm font-medium truncate" }, job.name || job.id.substring(0, 16))
        ),
        React.createElement("span", { className: "text-xs text-muted-foreground font-mono" }, job.schedule_display)
      ),
      React.createElement("div", { className: "flex items-center gap-1 ml-2" },
        job.last_run_at
          ? React.createElement("span", { className: "text-xs text-muted-foreground" }, timeAgo(Date.parse(job.last_run_at)))
          : React.createElement("span", { className: "text-xs text-muted-foreground" }, "Never")
      )
    );
  }

  // ─── Usage Analytics Card ─────────────────────────────────────────────────────

  function UsageCard() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getAnalytics(7).then(a => { setAnalytics(a); setLoading(false); });
    }, []);

    if (loading) return React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: "text-base" }, "Usage (7d)")),
      React.createElement(CardContent, null, React.createElement(LoadingSpinner))
    );

    const totals = analytics?.totals || {};
    const days = analytics?.daily || [];
    const maxCost = Math.max(...days.map(d => d.estimated_cost), 1);

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement(CardTitle, { className: "text-base" }, "Usage (7 days)")
      ),
      React.createElement(CardContent, { className: "flex flex-col gap-4" },
        React.createElement("div", { className: "grid grid-cols-2 gap-2" },
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "Sessions"),
            React.createElement("span", { className: "font-mono text-lg" }, totals.total_sessions || 0)
          ),
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "API Calls"),
            React.createElement("span", { className: "font-mono text-lg" }, totals.total_api_calls || 0)
          ),
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "Input Tokens"),
            React.createElement("span", { className: "font-mono text-lg" }, (totals.total_input || 0).toLocaleString())
          ),
          React.createElement("div", { className: "flex flex-col gap-1 p-2 rounded border border-border/50" },
            React.createElement("span", { className: "text-xs text-muted-foreground" }, "Est. Cost"),
            React.createElement("span", { className: "font-mono text-lg" }, "$" + (totals.total_estimated_cost || 0).toFixed(4))
          )
        ),
        days.length > 0 && React.createElement("div", { className: "flex flex-col gap-1" },
          React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" }, "Daily Cost"),
          React.createElement("div", { className: "flex items-end gap-0.5 h-12" },
            days.slice(-7).map((d, i) =>
              React.createElement("div", {
                key: i,
                className: "flex-1 rounded-t bg-primary/60 hover:bg-primary/80 transition-colors cursor-help",
                style: { height: Math.max(2, (d.estimated_cost / maxCost) * 100) + "%" },
                title: d.day + ": $" + d.estimated_cost.toFixed(4)
              })
            )
          )
        )
      )
    );
  }

  // ─── Recent Logs Card ────────────────────────────────────────────────────────

  function LogsCard() {
    const [logs, setLogs] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
      setLoading(true);
      api.getLogs({ file: "agent", lines: 30, level: "ERROR" }).then(l => { setLogs(l); setLoading(false); });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement(CardTitle, { className: "text-base" }, "Recent Errors"),
            React.createElement(Badge, { variant: "destructive", className: "text-xs" }, "agent.log")
          ),
          React.createElement(Button, {
            variant: "ghost", size: "sm", onClick: refresh,
            className: "h-7 text-xs cursor-pointer"
          }, "Refresh")
        )
      ),
      React.createElement(CardContent, null,
        loading ? React.createElement(LoadingSpinner)
          : !logs?.lines?.length ? React.createElement("p", { className: "text-sm text-muted-foreground" }, "No errors in recent logs")
          : React.createElement("div", { className: "flex flex-col gap-1 font-mono text-xs max-h-64 overflow-y-auto" },
              logs.lines.map((line, i) =>
                React.createElement("div", {
                  key: i,
                  className: "p-1 rounded hover:bg-destructive/10 text-destructive/80",
                  title: line
                }, line.length > 120 ? line.substring(0, 120) + "..." : line)
              )
            )
      )
    );
  }

  // ─── Skills Browser ──────────────────────────────────────────────────────────

  function SkillsBrowser() {
    const [skills, setSkills] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      api.getSkills().then(s => { setSkills(s); setLoading(false); });
    }, []);

    if (loading) return React.createElement(Card, null,
      React.createElement(CardHeader, null, React.createElement(CardTitle, { className: "text-base" }, "Skills Browser")),
      React.createElement(CardContent, null, React.createElement(LoadingSpinner))
    );

    const enabled = skills?.filter(s => s.enabled) || [];
    const disabled = skills?.filter(s => !s.enabled) || [];

    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement(CardTitle, { className: "text-base" }, "Skills Browser"),
          React.createElement(Badge, { variant: "outline", className: "text-xs" }, enabled.length + " enabled")
        )
      ),
      React.createElement(CardContent, { className: "flex flex-col gap-3" },
        React.createElement("div", { className: "flex flex-col gap-1" },
          React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" },
            "Enabled (" + enabled.length + ")"
          ),
          enabled.slice(0, 15).map(skill =>
            React.createElement("div", { key: skill.name, className: "flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5" },
              React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-green-400" }),
              React.createElement("span", { className: "text-sm flex-1 truncate" }, skill.name),
              React.createElement("span", { className: "text-xs text-muted-foreground" }, skill.category || "")
            )
          )
        ),
        disabled.length > 0 && React.createElement("div", { className: "flex flex-col gap-1" },
          React.createElement("span", { className: "text-xs text-muted-foreground uppercase tracking-wider" },
            "Disabled (" + disabled.length + ")"
          ),
          disabled.slice(0, 5).map(skill =>
            React.createElement("div", { key: skill.name, className: "flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5 opacity-60" },
              React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-muted-foreground/40" }),
              React.createElement("span", { className: "text-sm flex-1 truncate" }, skill.name)
            )
          )
        )
      )
    );
  }

  // ─── Main Plugin Page ────────────────────────────────────────────────────────

  function AgentMonitorPage() {
    const [activeTab, setActiveTab] = useState("overview");

    return React.createElement("div", { className: "flex flex-col gap-6" },
      // Header
      React.createElement("div", { className: "flex flex-col gap-1" },
        React.createElement("h1", { className: "text-xl font-bold tracking-tight" }, "Agent Monitor"),
        React.createElement("p", { className: "text-sm text-muted-foreground" },
          "Real-time Hermes Agent dashboard — " + new Date().toLocaleTimeString()
        )
      ),

      // Tab navigation
      React.createElement(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full" },
        React.createElement(TabsList, { className: "mb-4" },
          React.createElement(TabsTrigger, { value: "overview", className: "text-xs" }, "Overview"),
          React.createElement(TabsTrigger, { value: "sessions", className: "text-xs" }, "Sessions"),
          React.createElement(TabsTrigger, { value: "skills", className: "text-xs" }, "Skills"),
          React.createElement(TabsTrigger, { value: "cron", className: "text-xs" }, "Cron")
        ),

        // Overview tab — 2-column grid of cards
        React.createElement("div", { value: "overview", className: "space-y-4" },
          activeTab === "overview" && React.createElement("div", null,
            React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" },
              React.createElement(StatusCard),
              React.createElement(UsageCard)
            ),
            React.createElement("div", { className: "grid gap-4 lg:grid-cols-2 mt-4" },
              React.createElement(SessionsCard),
              React.createElement(CronCard)
            )
          )
        ),

        // Sessions tab
        React.createElement("div", { value: "sessions", className: "space-y-4" },
          activeTab === "sessions" && React.createElement("div", null,
            React.createElement(SessionsCard)
          )
        ),

        // Skills tab
        React.createElement("div", { value: "skills", className: "space-y-4" },
          activeTab === "skills" && React.createElement("div", null,
            React.createElement("div", { className: "grid gap-4 lg:grid-cols-2" },
              React.createElement(SkillsCard),
              React.createElement(SkillsBrowser)
            )
          )
        ),

        // Cron tab
        React.createElement("div", { value: "cron", className: "space-y-4" },
          activeTab === "cron" && React.createElement("div", null,
            React.createElement(CronCard)
          )
        )
      )
    );
  }

  // Register the plugin
  window.__HERMES_PLUGINS__.register("agent-monitor", AgentMonitorPage);
})();
