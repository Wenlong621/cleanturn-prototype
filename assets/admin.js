/* CleanTurn prototype · Admin console (English UI per owner requirement).
   Cleaner-facing app stays Chinese; shared data provides bilingual fields. */
(function () {
  "use strict";
  const { TODAY, D, fmtMDen, fmtMDWen, t12, esc, ICONS, STATUS, EVENT_TYPES_EN,
          CLEANERS, PROPERTIES, prop, TASKS, QUEUE, SYNC, AUDIT,
          toast, confirmModal, cleanerNameEn } = CT;

  const nav = document.getElementById("nav");
  const topbar = document.getElementById("topbar");
  const content = document.getElementById("content");

  const state = { view: "dash", taskFilter: "all", photoFilter: "all", drawer: null, drawerTab: "info" };

  const NAVS = [
    { group: "OPERATIONS" },
    { key: "dash",   label: "Dashboard", icon: "dash",  pill: () => QUEUE.filter(q => q.kind === "offer").length },
    { key: "tasks",  label: "Tasks",     icon: "list" },
    { key: "photos", label: "Photos",    icon: "photoLib" },
    { group: "SETTINGS" },
    { key: "props",  label: "Properties", icon: "home" },
    { key: "team",   label: "Team & access", icon: "users" },
    { key: "audit",  label: "Audit log", icon: "audit" },
  ];

  const chipOf = t => { const s = STATUS[t.status]; return `<span class="chip ${s.chip}"><span class="dot"></span>${s.labelEn}</span>`; };
  const b2bBadge = t => t.b2b ? '<span class="badge-b2b">Same-day check-in</span>' : "";
  const winCell = t => `${t12(t.checkout)} → ${t.nextCheckin ? t12(t.nextCheckin) : "—"}`;
  const cleanerCell = id => id
    ? `<span style="display:inline-flex;align-items:center;gap:7px"><span class="avatar avatar-sm ${CLEANERS[id].cls}">${CLEANERS[id].shortEn}</span>${cleanerNameEn(id)}</span>`
    : '<span style="color:var(--st-serious);font-weight:600">Unassigned</span>';

  /* ---------- Dashboard ---------- */
  function viewDash() {
    const today = TASKS.filter(t => t.off === 0);
    const inProgress = today.filter(t => t.status === "in_progress").length;
    const offered = TASKS.filter(t => t.status === "offered").length;
    const issues = TASKS.filter(t => t.status === "issue" && t.issueOpen).length;
    const risk = today.filter(t => t.b2b && !["completed", "cancelled"].includes(t.status)).length;
    const kpis = [
      { label: "Today's tasks", v: today.length, sub: `${today.filter(t => t.status === "completed").length} completed`, ac: "var(--spruce)" },
      { label: "In progress", v: inProgress, sub: "on site now", ac: "var(--st-info)" },
      { label: "Awaiting accept", v: offered, sub: "cleaner to confirm", ac: "var(--st-warn)" },
      { label: "Open issues", v: issues, sub: "needs follow-up", ac: "var(--st-serious)" },
      { label: "Overdue risk", v: risk, sub: "due by 4:00 PM", ac: "var(--st-critical)" },
    ];
    const issueTasks = TASKS.filter(t => t.status === "issue");
    return `
      <div class="kpi-row">
        ${kpis.map((k, i) => `
          <div class="kpi rise rise-${i + 1}" style="--kpi-accent:${k.ac}">
            <div class="kpi-label">${k.label}</div>
            <div class="kpi-value">${k.v}</div>
            <div class="kpi-sub">${k.sub}</div>
          </div>`).join("")}
      </div>
      <div class="grid-2">
        <div>
          <div class="card rise rise-2">
            <div class="panel-h"><h2>Today's schedule · ${fmtMDWen(TODAY)}</h2><span class="hint">back-to-back first</span></div>
            <table class="table">
              <thead><tr><th>Property</th><th>Cleaner</th><th>Window</th><th>Status</th></tr></thead>
              <tbody>
                ${today.sort((a, b) => (b.b2b - a.b2b)).map(t => {
                  const p = prop(t.propId);
                  return `<tr>
                    <td><b>${esc(p.aliasEn)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span> ${b2bBadge(t)}</td>
                    <td>${cleanerCell(t.cleaner)}</td>
                    <td class="num">${winCell(t)}</td>
                    <td>${chipOf(t)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="card rise rise-3" style="margin-top:14px">
            <div class="panel-h"><h2>Issue feed</h2><span class="hint">event ledger · photos & costs</span></div>
            ${issueTasks.length ? issueTasks.map(t => {
              const p = prop(t.propId);
              const cost = t.events.reduce((s, e) => s + (e.cost || 0), 0);
              return `<div class="issue-card">
                <div class="ic-head">
                  <b>${esc(p.aliasEn)} · ${fmtMDen(t.date)}</b>
                  <span style="display:flex;gap:8px;align-items:center">
                    ${cost ? `<span class="tag" style="background:var(--clay-soft);color:#A34E28">Cost CA$${cost}</span>` : ""}
                    ${t.issueOpen
                      ? `<button class="btn btn-sm btn-primary" data-close-issue="${t.id}">Mark resolved</button>`
                      : `<span class="chip chip-completed"><span class="dot"></span>Resolved</span>`}
                  </span>
                </div>
                <p style="color:var(--ink-2);margin-top:3px">${esc(t.noteEn || t.note || "")} — reported by ${cleanerNameEn(t.cleaner)}</p>
                ${t.events.map(e => `<p style="font-size:12.5px;color:var(--ink-3);margin-top:2px">· ${EVENT_TYPES_EN[e.type]}: ${esc(e.bodyEn || e.body)}${e.cost ? ` (CA$${e.cost})` : ""}</p>`).join("")}
                <div class="issue-photos">
                  ${t.photos.filter(ph => ph.tag === "issue").map(ph => `<div class="photo issue"><span class="ph-label">${esc(ph.labelEn || ph.label)}</span></div>`).join("")}
                  <button class="btn btn-ghost btn-sm" data-zip="${t.id}" style="align-self:center">${ICONS.download}Download zip</button>
                </div>
              </div>`;
            }).join("") : `<div class="empty">No issues right now</div>`}
          </div>
        </div>
        <div>
          <div class="card rise rise-3">
            <div class="panel-h"><h2>Action queue</h2><span class="hint">declines / timeouts / unassigned</span></div>
            ${QUEUE.map(q => `
              <div class="queue-item q-${q.level}">
                <span class="q-dot"></span>
                <div><b>${esc(q.title)}</b><p>${esc(q.body)}</p></div>
              </div>`).join("")}
          </div>
          <div class="card rise rise-4" style="margin-top:14px">
            <div class="panel-h"><h2>Hostfully sync</h2>
              <button class="btn btn-ghost btn-sm" id="syncBtn">${ICONS.refresh}Sync now</button></div>
            <div class="sync-row"><span class="ok">${ICONS.check}</span>
              Webhook healthy · last ${SYNC.webhook.last} — ${esc(SYNC.webhook.event)}</div>
            ${SYNC.runs.map(r => `<div class="sync-row"><span class="ok">${ICONS.check}</span>${esc(r.label)} · ${esc(r.result)}</div>`).join("")}
            <div class="sync-row" style="color:var(--ink-3)">${ICONS.clock}Daily fallback at 9:00 PM / 6:00 AM / 10:00 AM (America/Vancouver)</div>
          </div>
          <div class="card rise rise-5" style="margin-top:14px">
            <div class="panel-h"><h2>Notifications</h2><span class="hint">PRD FR-8</span></div>
            <div class="sync-row">${ICONS.send}Web Push + email fallback (no WeChat)</div>
            <div class="sync-row">${ICONS.bell}Auto alerts: declines, date changes, overdue risk</div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Tasks ---------- */
  function viewTasks() {
    const filters = [["all", "All"], ["offered", "Awaiting"], ["pending", "Not started"], ["in_progress", "In progress"], ["completed", "Completed"], ["issue", "Issues"], ["cancelled", "Cancelled"]];
    const list = TASKS
      .filter(t => state.taskFilter === "all" || t.status === state.taskFilter)
      .sort((a, b) => a.off - b.off || (b.b2b - a.b2b));
    return `
      <div class="filter-row rise">
        ${filters.map(([k, v]) => `<button class="fbtn ${state.taskFilter === k ? "on" : ""}" data-tf="${k}">${v}${k === "all" ? ` · ${TASKS.length}` : ""}</button>`).join("")}
      </div>
      <div class="card rise rise-1">
        <table class="table">
          <thead><tr><th>Date</th><th>Property</th><th>Cleaner</th><th>Window</th><th>Guest</th><th>Events</th><th>Status</th></tr></thead>
          <tbody>
            ${list.map(t => {
              const p = prop(t.propId);
              const cost = t.events.reduce((s, e) => s + (e.cost || 0), 0);
              return `<tr>
                <td class="num" style="white-space:nowrap">${fmtMDen(t.date)}${t.off === 0 ? ' <span class="tag" style="background:var(--spruce-soft);color:var(--spruce)">Today</span>' : ""}
                  ${t.changed ? `<div style="font-size:11px;color:var(--st-info)">Moved ${fmtMDen(D(t.changed.fromOff))} → ${fmtMDen(D(t.changed.toOff))}</div>` : ""}</td>
                <td><b>${esc(p.aliasEn)}</b> ${b2bBadge(t)}</td>
                <td>${cleanerCell(t.cleaner)}</td>
                <td class="num">${winCell(t)}</td>
                <td>${esc(t.guestName)} · ${t.guests}</td>
                <td>${t.events.length ? `${t.events.length} ${t.events.length > 1 ? "entries" : "entry"}${cost ? ` / CA$${cost}` : ""}` : "—"}</td>
                <td>${chipOf(t)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Photos ---------- */
  function viewPhotos() {
    const all = [];
    TASKS.forEach(t => t.photos.forEach(ph => all.push({ t, ph })));
    const list = all.filter(x => state.photoFilter === "all" || x.ph.tag === state.photoFilter);
    const retainInfo = x => {
      const keepDays = x.ph.tag === "issue" ? 7 : 3;
      const left = keepDays + x.t.off;
      if (left <= 0) return null;
      return { left, cls: left <= 1 ? "retain-soon" : "retain-ok" };
    };
    const live = list.map(x => ({ ...x, r: retainInfo(x) })).filter(x => x.r);
    return `
      <div class="filter-row rise">
        ${[["all", "All"], ["routine", "Routine · 3 days"], ["issue", "Issue · ≥7 days"]].map(([k, v]) =>
          `<button class="fbtn ${state.photoFilter === k ? "on" : ""}" data-pf="${k}">${v}</button>`).join("")}
        <span style="margin-left:auto;font-size:12px;color:var(--ink-3);align-self:center">Expired photos are hard-deleted at midnight and removed from the app (PRD FR-7)</span>
      </div>
      <div class="photo-lib rise rise-1">
        ${live.map(x => {
          const p = prop(x.t.propId);
          return `<div class="card plib-card">
            <div class="photo ${x.ph.tag === "issue" ? "issue" : ""}">
              ${x.ph.src ? `<img src="${x.ph.src}" alt="">` : ""}
              <span class="ph-label">${x.ph.tag === "issue" ? "Issue" : "Routine"} · ${esc(x.ph.labelEn || x.ph.label)}</span>
            </div>
            <div class="plib-meta">
              <b>${esc(p.aliasEn)} · ${fmtMDen(x.t.date)}</b>
              <span>Uploaded by ${cleanerNameEn(x.t.cleaner)}</span>
              <span class="retain ${x.r.cls}">${ICONS.clock.replace('class="icon"', 'class="icon" style="width:11px;height:11px"')}Deletes in ${x.r.left} day${x.r.left > 1 ? "s" : ""}</span>
              <span style="display:flex;gap:6px;margin-top:3px">
                <button class="btn btn-ghost btn-sm" data-zip="${x.t.id}">${ICONS.download}Download</button>
                <button class="btn btn-ghost btn-sm" data-cloud="1">${ICONS.cloud}Export</button>
              </span>
            </div>
          </div>`;
        }).join("") || `<div class="empty card" style="grid-column:1/-1">No live photos in this tag</div>`}
      </div>`;
  }

  /* ---------- Properties ---------- */
  function viewProps() {
    return `
      <div class="card rise">
        <div class="panel-h"><h2>Properties</h2><span class="hint">click a row for access info / staff & rates / log</span></div>
        <table class="table">
          <thead><tr><th>Property</th><th>Area</th><th>Layout</th><th>Primary</th><th>Backup</th><th>Auto-assign</th><th>Rate</th></tr></thead>
          <tbody>
            ${PROPERTIES.map(p => `
              <tr data-prop="${p.id}" style="cursor:pointer">
                <td><b>${esc(p.aliasEn)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span></td>
                <td>${esc(p.areaEn)}</td>
                <td class="num">${p.beds} BR · ${p.baths} BA</td>
                <td>${cleanerCell(p.primary)}</td>
                <td>${p.backup ? cleanerCell(p.backup) : '<span style="color:var(--ink-3)">Not set</span>'}</td>
                <td>${p.autoAssign ? '<span class="chip chip-completed"><span class="dot"></span>On</span>' : '<span class="chip chip-pending"><span class="dot"></span>Manual</span>'}</td>
                <td class="num">CA$${(p.price || {})[p.primary] || "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function drawerHTML(p) {
    const tabs = [["info", "Overview"], ["access", "Access info"], ["staff", "Staff & rates"], ["log", "Property log"]];
    let body = "";
    if (state.drawerTab === "info") {
      body = `<div class="card card-pad">
        <div class="kv"><span class="k">Code</span><span class="v">${p.code}</span></div>
        <div class="kv"><span class="k">Area</span><span class="v">${esc(p.areaEn)}</span></div>
        <div class="kv"><span class="k">Layout</span><span class="v">${p.beds} BR · ${p.baths} BA</span></div>
        <div class="kv"><span class="k">Checkout / check-in</span><span class="v">11:00 AM / 4:00 PM</span></div>
        <div class="kv"><span class="k">Currency</span><span class="v">CAD</span></div>
        <div class="kv"><span class="k">Hostfully sync</span><span class="v" style="color:var(--st-good)">Linked</span></div>
      </div>`;
    } else if (state.drawerTab === "access") {
      const s = p.secrets || {};
      body = `<div class="card card-pad">
        ${[["Door code", s.door], ["Garage / stall", s.garageEn || s.garage], ["Wi-Fi", s.wifi], ["Parking", s.parkingEn || s.parking], ["Entry notes", s.entryEn || s.entry]]
          .map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(v || "—")}</span></div>`).join("")}
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin-top:10px">Admin-only editing; cleaners see this read-only inside their task. Every change is written to the audit log. (All demo codes are fictional.)</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px" data-mock="editAccess">${ICONS.key}Edit access info</button>`;
    } else if (state.drawerTab === "staff") {
      body = `<div class="card card-pad">
        <div class="kv"><span class="k">Primary cleaner</span><span class="v">${cleanerNameEn(p.primary)} · CA$${(p.price || {})[p.primary] || "—"}/clean</span></div>
        <div class="kv"><span class="k">Backup cleaner</span><span class="v">${p.backup ? `${cleanerNameEn(p.backup)} · CA$${(p.price || {})[p.backup] || "—"}/clean` : "Not set"}</span></div>
        <div class="kv"><span class="k">Auto-assign new tasks</span><span class="v">${p.autoAssign ? "On (goes to primary)" : "Off (assign manually)"}</span></div>
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin-top:10px">A declined task is auto-reassigned to the backup cleaner and the admin is notified; if the backup declines or times out it lands in the action queue (PRD FR-3 / OQ-1).</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px" data-mock="editStaff">${ICONS.users}Adjust staff & rates</button>`;
    } else {
      body = `${p.logs.length ? `<ul class="timeline card card-pad" style="padding-bottom:6px">
        ${p.logs.map(l => `<li>
          <div class="tl-time">${fmtMDen(D(l.off))} · ${esc(l.by)} · ${l.type === "system" ? "system" : "manual"}</div>
          <div class="tl-body">${esc(l.body)}</div></li>`).join("")}
      </ul>` : `<div class="card empty">No log entries yet</div>`}
      <button class="btn btn-ghost btn-block" style="margin-top:10px" data-mock="addLog">${ICONS.plus}Add log entry (re-key, appliance change…)</button>`;
    }
    return `
      <div class="drawer-mask" data-drawer-close></div>
      <div class="drawer">
        <div class="d-head">
          <h2>${esc(p.aliasEn)} <span style="font-size:12px;color:var(--ink-3);font-weight:500">${p.code}</span></h2>
          <button class="btn btn-ghost btn-sm" data-drawer-close>${ICONS.x}Close</button>
        </div>
        <div class="d-body">
          <div class="d-tabs">${tabs.map(([k, v]) => `<button class="${state.drawerTab === k ? "on" : ""}" data-dtab="${k}">${v}</button>`).join("")}</div>
          ${body}
        </div>
      </div>`;
  }

  /* ---------- Team & access ---------- */
  function viewTeam() {
    return `
      <div class="grid-2 rise" style="grid-template-columns:1fr 1fr">
        ${Object.values(CLEANERS).map(c => {
          const props = PROPERTIES.filter(p => p.primary === c.id || p.backup === c.id);
          const done = TASKS.filter(t => t.cleaner === c.id && t.status === "completed").length;
          return `<div class="card">
            <div class="panel-h" style="padding-bottom:6px">
              <h2 style="display:flex;align-items:center;gap:9px"><span class="avatar ${c.cls}">${c.shortEn}</span>${esc(c.nameEn)}</h2>
              <span class="hint">${done} completed in last 30 days</span>
            </div>
            <table class="table">
              <thead><tr><th>Authorized property</th><th>Role</th><th>Rate</th></tr></thead>
              <tbody>
                ${props.map(p => `<tr>
                  <td><b>${esc(p.aliasEn)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span></td>
                  <td><span class="tag">${p.primary === c.id ? "Primary" : "Backup"}</span></td>
                  <td class="num">CA$${(p.price || {})[c.id] || "—"}</td>
                </tr>`).join("")}
              </tbody>
            </table>
            <div style="padding:10px 18px 14px">
              <button class="btn btn-ghost btn-sm" data-mock="grant">${ICONS.plus}Adjust access</button>
            </div>
          </div>`;
        }).join("")}
      </div>
      <p class="rise rise-2" style="font-size:12.5px;color:var(--ink-3);margin-top:12px">
        Access takes effect immediately: a cleaner can only read tasks, bookings and photos of authorized properties — enforced by database row-level security, not front-end filtering. Every access change is audited.
      </p>`;
  }

  /* ---------- Audit log ---------- */
  function viewAudit() {
    return `
      <div class="card rise">
        <div class="panel-h"><h2>Audit log</h2><span class="hint">access / rates / status / sync / photo cleanup — everything traceable</span></div>
        <table class="table">
          <thead><tr><th>Time</th><th>Actor</th><th>Event</th></tr></thead>
          <tbody>
            ${AUDIT.map(a => `<tr>
              <td class="num" style="white-space:nowrap">${a.off === 0 ? "Today" : fmtMDen(D(a.off))} ${a.time}</td>
              <td>${esc(a.actor)}</td>
              <td>${esc(a.action)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Render ---------- */
  const VIEWS = {
    dash:   { title: "Dashboard", sub: () => `${fmtMDWen(TODAY)} · Vancouver · Hostfully connected`, render: viewDash },
    tasks:  { title: "Tasks", sub: () => "Auto-generated from Hostfully bookings; cancellations & date changes sync automatically", render: viewTasks },
    photos: { title: "Photos", sub: () => "Tagged retention · hard-deleted on expiry · bulk download", render: viewPhotos },
    props:  { title: "Properties", sub: () => `${PROPERTIES.length} properties (demo data)`, render: viewProps },
    team:   { title: "Team & access", sub: () => "Primary / backup cleaners · per-clean rates", render: viewTeam },
    audit:  { title: "Audit log", sub: () => "Every critical action is traceable", render: viewAudit },
  };

  function render() {
    nav.innerHTML = NAVS.map(n => n.group
      ? `<div class="group">${n.group}</div>`
      : `<button class="${state.view === n.key ? "on" : ""}" data-nav="${n.key}">
          ${ICONS[n.icon]}<span class="txt">${n.label}</span>
          ${n.pill && n.pill() ? `<span class="pill">${n.pill()}</span>` : ""}
        </button>`).join("");
    const v = VIEWS[state.view];
    topbar.innerHTML = `
      <div><h1>${v.title}</h1><div class="sub">${v.sub()}</div></div>
      <div class="right">
        <a class="btn btn-ghost btn-sm" href="cleaner.html">${ICONS.user}Cleaner app</a>
        <a class="btn btn-ghost btn-sm" href="prd.html">${ICONS.doc}PRD</a>
      </div>`;
    const p = state.drawer ? prop(state.drawer) : null;
    content.innerHTML = v.render() + (p ? drawerHTML(p) : "");
  }

  /* ---------- Events ---------- */
  document.body.addEventListener("click", e => {
    const navBtn = e.target.closest("[data-nav]");
    if (navBtn) { state.view = navBtn.dataset.nav; state.drawer = null; render(); return; }

    const tf = e.target.closest("[data-tf]");
    if (tf) { state.taskFilter = tf.dataset.tf; render(); return; }
    const pf = e.target.closest("[data-pf]");
    if (pf) { state.photoFilter = pf.dataset.pf; render(); return; }

    const pr = e.target.closest("[data-prop]");
    if (pr) { state.drawer = pr.dataset.prop; state.drawerTab = "info"; render(); return; }
    if (e.target.closest("[data-drawer-close]")) { state.drawer = null; render(); return; }
    const dtab = e.target.closest("[data-dtab]");
    if (dtab) { state.drawerTab = dtab.dataset.dtab; render(); return; }

    const closeIssue = e.target.closest("[data-close-issue]");
    if (closeIssue) {
      const t = TASKS.find(x => x.id === closeIssue.dataset.closeIssue);
      confirmModal({
        title: "Mark issue as resolved?",
        body: "Issue photos will be kept for another 7 days from today, then auto-deleted.",
        okText: "Resolve", cancelText: "Cancel",
        onOk: () => { t.issueOpen = false; render(); toast("Issue closed; written to audit log"); },
      });
      return;
    }
    if (e.target.closest("[data-zip]")) { toast("Zip download started (prototype demo)", ICONS.download); return; }
    if (e.target.closest("[data-cloud]")) { toast("Exported to Google Drive (P2 feature demo)", ICONS.cloud); return; }
    if (e.target.closest("[data-mock]")) { toast("Demo: the real build opens an edit form here and writes to the audit log", ICONS.note); return; }

    if (e.target.closest("#syncBtn")) {
      const btn = e.target.closest("#syncBtn");
      btn.disabled = true; btn.innerHTML = `${ICONS.refresh}Syncing…`;
      setTimeout(() => {
        SYNC.runs.push({ label: "Manual sync · just now", result: "no changes", ok: true });
        render(); toast("Reconciled with Hostfully: no changes", ICONS.refresh);
      }, 900);
      return;
    }
  });

  render();
})();
