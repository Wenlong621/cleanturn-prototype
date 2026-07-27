/* CleanTurn 原型 · 管理员工作台逻辑 */
(function () {
  "use strict";
  const { TODAY, D, fmtMD, fmtYMD, fmtMDW, esc, ICONS, STATUS, EVENT_TYPES,
          CLEANERS, PROPERTIES, prop, TASKS, QUEUE, SYNC, AUDIT,
          toast, confirmModal, cleanerName } = CT;

  const nav = document.getElementById("nav");
  const topbar = document.getElementById("topbar");
  const content = document.getElementById("content");

  const state = { view: "dash", taskFilter: "all", photoFilter: "all", drawer: null, drawerTab: "info" };

  const NAVS = [
    { group: "运营" },
    { key: "dash",   label: "工作台",   icon: "dash",  pill: () => QUEUE.filter(q => q.kind === "offer").length },
    { key: "tasks",  label: "任务总表", icon: "list" },
    { key: "photos", label: "照片库",   icon: "photoLib" },
    { group: "配置" },
    { key: "props",  label: "房源管理", icon: "home" },
    { key: "team",   label: "人员与授权", icon: "users" },
    { key: "audit",  label: "审计日志", icon: "audit" },
  ];

  const chipOf = t => { const s = STATUS[t.status]; return `<span class="chip ${s.chip}"><span class="dot"></span>${s.label}</span>`; };
  const b2bBadge = t => t.b2b ? '<span class="badge-b2b">当日入住</span>' : "";
  const cleanerCell = id => id
    ? `<span style="display:inline-flex;align-items:center;gap:7px"><span class="avatar avatar-sm ${CLEANERS[id].cls}">${CLEANERS[id].short}</span>${cleanerName(id)}</span>`
    : '<span style="color:var(--st-serious);font-weight:600">待指派</span>';

  /* ---------- 工作台 ---------- */
  function viewDash() {
    const today = TASKS.filter(t => t.off === 0);
    const inProgress = today.filter(t => t.status === "in_progress").length;
    const offered = TASKS.filter(t => t.status === "offered").length;
    const issues = TASKS.filter(t => t.status === "issue" && t.issueOpen).length;
    const risk = today.filter(t => t.b2b && !["completed", "cancelled"].includes(t.status)).length;
    const kpis = [
      { label: "今日任务", v: today.length, sub: `${today.filter(t => t.status === "completed").length} 已完成`, ac: "var(--spruce)" },
      { label: "清洁中", v: inProgress, sub: "现场进行", ac: "var(--st-info)" },
      { label: "待接受", v: offered, sub: "等待人员确认", ac: "var(--st-warn)" },
      { label: "异常待处理", v: issues, sub: "需要跟进", ac: "var(--st-serious)" },
      { label: "逾期风险", v: risk, sub: "16:00 前须完成", ac: "var(--st-critical)" },
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
            <div class="panel-h"><h2>今日排程 · ${fmtMDW(TODAY)}</h2><span class="hint">back-to-back 置顶</span></div>
            <table class="table">
              <thead><tr><th>房源</th><th>清洁人员</th><th>时间窗口</th><th>状态</th></tr></thead>
              <tbody>
                ${today.sort((a, b) => (b.b2b - a.b2b)).map(t => {
                  const p = prop(t.propId);
                  return `<tr data-task="${t.id}" style="cursor:default">
                    <td><b>${esc(p.alias)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span> ${b2bBadge(t)}</td>
                    <td>${cleanerCell(t.cleaner)}</td>
                    <td class="num">${t.checkout} → ${t.nextCheckin || "—"}</td>
                    <td>${chipOf(t)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <div class="card rise rise-3" style="margin-top:14px">
            <div class="panel-h"><h2>异常动态</h2><span class="hint">事件流水账 · 附照片与费用</span></div>
            ${issueTasks.length ? issueTasks.map(t => {
              const p = prop(t.propId);
              const cost = t.events.reduce((s, e) => s + (e.cost || 0), 0);
              return `<div class="issue-card">
                <div class="ic-head">
                  <b>${esc(p.alias)} · ${fmtMD(t.date)}</b>
                  <span style="display:flex;gap:8px;align-items:center">
                    ${cost ? `<span class="tag" style="background:var(--clay-soft);color:#A34E28">费用 CA$${cost}</span>` : ""}
                    ${t.issueOpen
                      ? `<button class="btn btn-sm btn-primary" data-close-issue="${t.id}">标记已处理</button>`
                      : `<span class="chip chip-completed"><span class="dot"></span>已处理</span>`}
                  </span>
                </div>
                <p style="color:var(--ink-2);margin-top:3px">${esc(t.note || "")} — ${cleanerName(t.cleaner)} 回报</p>
                ${t.events.map(e => `<p style="font-size:12.5px;color:var(--ink-3);margin-top:2px">· ${EVENT_TYPES[e.type]}：${esc(e.body)}${e.cost ? `（CA$${e.cost}）` : ""}</p>`).join("")}
                <div class="issue-photos">
                  ${t.photos.filter(ph => ph.tag === "issue").map(ph => `<div class="photo issue"><span class="ph-label">${esc(ph.label)}</span></div>`).join("")}
                  <button class="btn btn-ghost btn-sm" data-zip="${t.id}" style="align-self:center">${ICONS.download}打包下载</button>
                </div>
              </div>`;
            }).join("") : `<div class="empty">暂无异常</div>`}
          </div>
        </div>
        <div>
          <div class="card rise rise-3">
            <div class="panel-h"><h2>待处理队列</h2><span class="hint">拒单 / 超时 / 待指派</span></div>
            ${QUEUE.map(q => `
              <div class="queue-item q-${q.level}">
                <span class="q-dot"></span>
                <div><b>${esc(q.title)}</b><p>${esc(q.body)}</p></div>
              </div>`).join("")}
          </div>
          <div class="card rise rise-4" style="margin-top:14px">
            <div class="panel-h"><h2>Hostfully 同步</h2>
              <button class="btn btn-ghost btn-sm" id="syncBtn">${ICONS.refresh}手动同步</button></div>
            <div class="sync-row"><span class="ok">${ICONS.check}</span>
              Webhook 正常 · 最近 ${SYNC.webhook.last} — ${esc(SYNC.webhook.event)}</div>
            ${SYNC.runs.map(r => `<div class="sync-row"><span class="ok">${ICONS.check}</span>${esc(r.label)} · ${esc(r.result)}</div>`).join("")}
            <div class="sync-row" style="color:var(--ink-3)">${ICONS.clock}兜底节奏：每日 21:00 / 06:00 / 10:00（America/Vancouver）</div>
          </div>
          <div class="card rise rise-5" style="margin-top:14px">
            <div class="panel-h"><h2>通知出口</h2><span class="hint">PRD FR-8</span></div>
            <div class="sync-row">${ICONS.send}Web Push + 邮件兜底（不使用微信）</div>
            <div class="sync-row">${ICONS.bell}拒单、改期、逾期风险自动提醒</div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- 任务总表 ---------- */
  function viewTasks() {
    const filters = [["all", "全部"], ["offered", "待接受"], ["pending", "未开始"], ["in_progress", "清洁中"], ["completed", "已完成"], ["issue", "异常"], ["cancelled", "已取消"]];
    const list = TASKS
      .filter(t => state.taskFilter === "all" || t.status === state.taskFilter)
      .sort((a, b) => a.off - b.off || (b.b2b - a.b2b));
    return `
      <div class="filter-row rise">
        ${filters.map(([k, v]) => `<button class="fbtn ${state.taskFilter === k ? "on" : ""}" data-tf="${k}">${v}${k === "all" ? ` · ${TASKS.length}` : ""}</button>`).join("")}
      </div>
      <div class="card rise rise-1">
        <table class="table">
          <thead><tr><th>日期</th><th>房源</th><th>清洁人员</th><th>时间窗口</th><th>房客</th><th>事件</th><th>状态</th></tr></thead>
          <tbody>
            ${list.map(t => {
              const p = prop(t.propId);
              const cost = t.events.reduce((s, e) => s + (e.cost || 0), 0);
              return `<tr>
                <td class="num" style="white-space:nowrap">${fmtMD(t.date)}${t.off === 0 ? ' <span class="tag" style="background:var(--spruce-soft);color:var(--spruce)">今天</span>' : ""}
                  ${t.changed ? `<div style="font-size:11px;color:var(--st-info)">改期 ${fmtMD(D(t.changed.fromOff))} → ${fmtMD(D(t.changed.toOff))}</div>` : ""}</td>
                <td><b>${esc(p.alias)}</b> ${b2bBadge(t)}</td>
                <td>${cleanerCell(t.cleaner)}</td>
                <td class="num">${t.checkout} → ${t.nextCheckin || "—"}</td>
                <td>${esc(t.guestName)} · ${t.guests}人</td>
                <td>${t.events.length ? `${t.events.length} 条${cost ? ` / CA$${cost}` : ""}` : "—"}</td>
                <td>${chipOf(t)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- 照片库 ---------- */
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
        ${[["all", "全部"], ["routine", "完成照 · 3 天"], ["issue", "异常照 · ≥7 天"]].map(([k, v]) =>
          `<button class="fbtn ${state.photoFilter === k ? "on" : ""}" data-pf="${k}">${v}</button>`).join("")}
        <span style="margin-left:auto;font-size:12px;color:var(--ink-3);align-self:center">到期照片每日 0 点物理删除，前端同步移除（PRD FR-7）</span>
      </div>
      <div class="photo-lib rise rise-1">
        ${live.map(x => {
          const p = prop(x.t.propId);
          return `<div class="card plib-card">
            <div class="photo ${x.ph.tag === "issue" ? "issue" : ""}">
              ${x.ph.src ? `<img src="${x.ph.src}" alt="">` : ""}
              <span class="ph-label">${x.ph.tag === "issue" ? "异常" : "完成"} · ${esc(x.ph.label)}</span>
            </div>
            <div class="plib-meta">
              <b>${esc(p.alias)} · ${fmtMD(x.t.date)}</b>
              <span>${cleanerName(x.t.cleaner)} 上传</span>
              <span class="retain ${x.r.cls}">${ICONS.clock.replace('class="icon"', 'class="icon" style="width:11px;height:11px"')}${x.r.left} 天后删除</span>
              <span style="display:flex;gap:6px;margin-top:3px">
                <button class="btn btn-ghost btn-sm" data-zip="${x.t.id}">${ICONS.download}下载</button>
                <button class="btn btn-ghost btn-sm" data-cloud="1">${ICONS.cloud}转存</button>
              </span>
            </div>
          </div>`;
        }).join("") || `<div class="empty card" style="grid-column:1/-1">该分类暂无在保照片</div>`}
      </div>`;
  }

  /* ---------- 房源管理 ---------- */
  function viewProps() {
    return `
      <div class="card rise">
        <div class="panel-h"><h2>房源列表</h2><span class="hint">点击行查看详情（进入信息 / 人员价格 / 房源日志）</span></div>
        <table class="table">
          <thead><tr><th>房源</th><th>区域</th><th>规格</th><th>主要人员</th><th>次要人员</th><th>自动归属</th><th>每次价格</th></tr></thead>
          <tbody>
            ${PROPERTIES.map(p => `
              <tr data-prop="${p.id}" style="cursor:pointer">
                <td><b>${esc(p.alias)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span></td>
                <td>${esc(p.area)}</td>
                <td class="num">${p.beds} 房 ${p.baths} 卫</td>
                <td>${cleanerCell(p.primary)}</td>
                <td>${p.backup ? cleanerCell(p.backup) : '<span style="color:var(--ink-3)">未设置</span>'}</td>
                <td>${p.autoAssign ? '<span class="chip chip-completed"><span class="dot"></span>开启</span>' : '<span class="chip chip-pending"><span class="dot"></span>手动</span>'}</td>
                <td class="num">CA$${(p.price || {})[p.primary] || "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function drawerHTML(p) {
    const tabs = [["info", "基本信息"], ["access", "进入信息"], ["staff", "人员与价格"], ["log", "房源日志"]];
    let body = "";
    if (state.drawerTab === "info") {
      body = `<div class="card card-pad">
        <div class="kv"><span class="k">编号</span><span class="v">${p.code}</span></div>
        <div class="kv"><span class="k">区域</span><span class="v">${esc(p.area)}</span></div>
        <div class="kv"><span class="k">规格</span><span class="v">${p.beds} 卧 · ${p.baths} 卫</span></div>
        <div class="kv"><span class="k">标准退房 / 入住</span><span class="v">11:00 / 16:00</span></div>
        <div class="kv"><span class="k">币种</span><span class="v">CAD</span></div>
        <div class="kv"><span class="k">Hostfully 同步</span><span class="v" style="color:var(--st-good)">已绑定</span></div>
      </div>`;
    } else if (state.drawerTab === "access") {
      const s = p.secrets || {};
      body = `<div class="card card-pad">
        ${[["门锁密码", s.door], ["车库 / 车位", s.garage], ["Wi-Fi", s.wifi], ["停车说明", s.parking], ["进入说明", s.entry]]
          .map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(v || "—")}</span></div>`).join("")}
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin-top:10px">仅管理员可编辑；清洁人员在任务详情中只读查看。所有修改写入审计日志（示例密码均为虚构）。</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px" data-mock="editAccess">${ICONS.key}编辑进入信息</button>`;
    } else if (state.drawerTab === "staff") {
      body = `<div class="card card-pad">
        <div class="kv"><span class="k">主要清洁人员</span><span class="v">${cleanerName(p.primary)} · CA$${(p.price || {})[p.primary] || "—"}/次</span></div>
        <div class="kv"><span class="k">次要清洁人员</span><span class="v">${p.backup ? `${cleanerName(p.backup)} · CA$${(p.price || {})[p.backup] || "—"}/次` : "未设置"}</span></div>
        <div class="kv"><span class="k">新任务自动归属</span><span class="v">${p.autoAssign ? "开启（自动指派主要人员）" : "关闭（逐单手动指派）"}</span></div>
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin-top:10px">拒单自动转派次要人员并通知管理员；次要人员拒绝或超时 → 进入待处理队列（PRD FR-3 / OQ-1）。</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px" data-mock="editStaff">${ICONS.users}调整人员与价格</button>`;
    } else {
      body = `${p.logs.length ? `<ul class="timeline card card-pad" style="padding-bottom:6px">
        ${p.logs.map(l => `<li>
          <div class="tl-time">${fmtMD(D(l.off))} · ${esc(l.by)} · ${l.type === "system" ? "系统" : "手动"}</div>
          <div class="tl-body">${esc(l.body)}</div></li>`).join("")}
      </ul>` : `<div class="card empty">暂无日志</div>`}
      <button class="btn btn-ghost btn-block" style="margin-top:10px" data-mock="addLog">${ICONS.plus}新增日志（换锁、设备变化等）</button>`;
    }
    return `
      <div class="drawer-mask" data-drawer-close></div>
      <div class="drawer">
        <div class="d-head">
          <h2>${esc(p.alias)} <span style="font-size:12px;color:var(--ink-3);font-weight:500">${p.code}</span></h2>
          <button class="btn btn-ghost btn-sm" data-drawer-close>${ICONS.x}关闭</button>
        </div>
        <div class="d-body">
          <div class="d-tabs">${tabs.map(([k, v]) => `<button class="${state.drawerTab === k ? "on" : ""}" data-dtab="${k}">${v}</button>`).join("")}</div>
          ${body}
        </div>
      </div>`;
  }

  /* ---------- 人员与授权 ---------- */
  function viewTeam() {
    return `
      <div class="grid-2 rise" style="grid-template-columns:1fr 1fr">
        ${Object.values(CLEANERS).map(c => {
          const props = PROPERTIES.filter(p => p.primary === c.id || p.backup === c.id);
          const done = TASKS.filter(t => t.cleaner === c.id && t.status === "completed").length;
          return `<div class="card">
            <div class="panel-h" style="padding-bottom:6px">
              <h2 style="display:flex;align-items:center;gap:9px"><span class="avatar ${c.cls}">${c.short}</span>${esc(c.name)}</h2>
              <span class="hint">近 30 天完成 ${done} 单</span>
            </div>
            <table class="table">
              <thead><tr><th>授权房源</th><th>角色</th><th>每次价格</th></tr></thead>
              <tbody>
                ${props.map(p => `<tr>
                  <td><b>${esc(p.alias)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span></td>
                  <td><span class="tag">${p.primary === c.id ? "主要" : "次要"}</span></td>
                  <td class="num">CA$${(p.price || {})[c.id] || "—"}</td>
                </tr>`).join("")}
              </tbody>
            </table>
            <div style="padding:10px 18px 14px">
              <button class="btn btn-ghost btn-sm" data-mock="grant">${ICONS.plus}调整授权</button>
            </div>
          </div>`;
        }).join("")}
      </div>
      <p class="rise rise-2" style="font-size:12.5px;color:var(--ink-3);margin-top:12px">
        授权即时生效：清洁人员登录后只能读取被授权房源的任务、订单与照片（数据库 RLS 强制，非前端过滤）。所有授权变更写入审计日志。
      </p>`;
  }

  /* ---------- 审计日志 ---------- */
  function viewAudit() {
    return `
      <div class="card rise">
        <div class="panel-h"><h2>审计日志</h2><span class="hint">权限 / 价格 / 状态 / 同步 / 照片清理，全程留痕</span></div>
        <table class="table">
          <thead><tr><th>时间</th><th>操作者</th><th>事件</th></tr></thead>
          <tbody>
            ${AUDIT.map(a => `<tr>
              <td class="num" style="white-space:nowrap">${a.off === 0 ? "今天" : fmtMD(D(a.off))} ${a.time}</td>
              <td>${esc(a.actor)}</td>
              <td>${esc(a.action)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- 渲染 ---------- */
  const VIEWS = {
    dash:   { title: "工作台", sub: () => `${fmtMDW(TODAY)} · 温哥华 · Hostfully 已连接`, render: viewDash },
    tasks:  { title: "任务总表", sub: () => "由 Hostfully 订单自动生成，取消/改期自动联动", render: viewTasks },
    photos: { title: "照片库", sub: () => "tag 分级保留 · 到期物理删除 · 可打包下载", render: viewPhotos },
    props:  { title: "房源管理", sub: () => `${PROPERTIES.length} 个房源（演示数据）`, render: viewProps },
    team:   { title: "人员与授权", sub: () => "主要 / 次要清洁人员 · 每次清洁价格", render: viewTeam },
    audit:  { title: "审计日志", sub: () => "所有关键操作可追溯", render: viewAudit },
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
        <a class="btn btn-ghost btn-sm" href="cleaner.html">${ICONS.user}清洁端</a>
        <a class="btn btn-ghost btn-sm" href="prd.html">${ICONS.doc}PRD</a>
      </div>`;
    const p = state.drawer ? prop(state.drawer) : null;
    content.innerHTML = v.render() + (p ? drawerHTML(p) : "");
  }

  /* ---------- 事件 ---------- */
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
        title: "标记异常已处理？",
        body: "关闭后异常照片保留期从今日起再保留 7 天，随后自动删除。",
        okText: "确认关闭",
        onOk: () => { t.issueOpen = false; render(); toast("异常已关闭，处理记录写入审计日志"); },
      });
      return;
    }
    if (e.target.closest("[data-zip]")) { toast("已打包 zip 下载（原型模拟）", ICONS.download); return; }
    if (e.target.closest("[data-cloud]")) { toast("已转存 Google Drive（P2 功能演示）", ICONS.cloud); return; }
    if (e.target.closest("[data-mock]")) { toast("原型演示：正式版在此打开编辑表单并写入审计日志", ICONS.note); return; }

    if (e.target.closest("#syncBtn")) {
      const btn = e.target.closest("#syncBtn");
      btn.disabled = true; btn.innerHTML = `${ICONS.refresh}同步中…`;
      setTimeout(() => {
        SYNC.runs.push({ label: "手动同步 · 刚刚", result: "无变更", ok: true });
        render(); toast("已与 Hostfully 对账：无变更", ICONS.refresh);
      }, 900);
      return;
    }
  });

  render();
})();
