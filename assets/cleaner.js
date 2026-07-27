/* CleanTurn 原型 · 清洁人员端逻辑 */
(function () {
  "use strict";
  const { TODAY, D, fmtMD, fmtYMD, fmtMDW, esc, ICONS, STATUS, EVENT_TYPES,
          CLEANERS, PROPERTIES, prop, TASKS, NOTIFS, toast, confirmModal } = CT;

  const app = document.getElementById("app");
  const state = {
    me: "amy",
    tab: "today",
    calBase: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
    calSel: fmtYMD(TODAY),
    openTaskId: null,
    accessOpen: false,
    readNotifs: false,
  };

  /* ---------- 角色切换（演示权限隔离） ---------- */
  const roleSwitch = document.getElementById("roleSwitch");
  function renderRoleSwitch() {
    roleSwitch.innerHTML = Object.values(CLEANERS).map(c =>
      `<button class="${state.me === c.id ? "on" : ""}" data-role="${c.id}">
        <span class="avatar avatar-sm ${c.cls}">${c.short}</span>${esc(c.name)}
      </button>`).join("");
  }
  roleSwitch.addEventListener("click", e => {
    const b = e.target.closest("[data-role]");
    if (!b) return;
    state.me = b.dataset.role;
    state.openTaskId = null;
    state.readNotifs = false;
    renderRoleSwitch(); render();
    toast(`已切换为 ${CLEANERS[state.me].name} —— 只能看到被授权房源`, ICONS.shield);
  });

  /* ---------- 数据视图 ---------- */
  const myTasks = () => TASKS.filter(t => t.cleaner === state.me);
  const tasksOn = ymd => myTasks().filter(t => fmtYMD(t.date) === ymd);
  const notifCount = () => state.readNotifs ? 0 : (NOTIFS[state.me] || []).length;

  const timeWindow = t => t.nextCheckin
    ? `${t.checkout} 退房 → ${t.nextCheckin} 下位入住`
    : `${t.checkout} 退房 · 次日无入住`;

  /* ---------- 任务卡片 ---------- */
  function taskCard(t, showDate) {
    const p = prop(t.propId);
    const st = STATUS[t.status];
    const urgent = t.b2b && !["completed", "cancelled"].includes(t.status);
    return `
      <div class="card task-card s-${t.status} ${urgent ? "urgent" : ""}" data-task="${t.id}">
        <div class="tc-strip"></div>
        <div class="tc-main">
          <div class="tc-title">
            <b>${esc(p.alias)}</b><span class="code">${p.code}</span>
            ${t.b2b ? '<span class="badge-b2b">当日入住</span>' : ""}
            ${t.changed ? '<span class="badge-b2b" style="background:var(--st-info-bg);color:var(--st-info);border-color:#A9C6E8">已改期</span>' : ""}
          </div>
          <div class="tc-meta">
            ${showDate ? `<span>${ICONS.calendar}${fmtMD(t.date)}</span>` : ""}
            <span>${ICONS.clock}${esc(timeWindow(t))}</span>
            <span>${ICONS.guest}${t.guests} 人</span>
          </div>
        </div>
        <div class="tc-right">
          <span class="chip ${st.chip}"><span class="dot"></span>${st.label}</span>
          ${ICONS.right.replace('class="icon"', 'class="icon icon-sm" style="color:var(--ink-3)"')}
        </div>
      </div>`;
  }

  /* ---------- 今日视图 ---------- */
  function viewToday() {
    const todayList = tasksOn(fmtYMD(TODAY))
      .sort((a, b) => (b.b2b - a.b2b) || a.id.localeCompare(b.id));
    const upcoming = myTasks()
      .filter(t => t.off > 0 && t.off <= 7 && t.status !== "cancelled")
      .sort((a, b) => a.off - b.off);
    const doneCount = todayList.filter(t => t.status === "completed").length;
    return `
      <div class="section-h rise"><h2>今日任务</h2>
        <span class="hint">${todayList.length} 项 · 已完成 ${doneCount}</span></div>
      ${todayList.length
        ? todayList.map((t, i) => `<div class="rise rise-${Math.min(i + 1, 6)}">${taskCard(t, false)}</div>`).join("")
        : `<div class="card empty rise"><div class="display">今天没有清洁任务</div>好好休息，明天见。</div>`}
      <div class="section-h rise rise-3"><h2>未来 7 天</h2><span class="hint">${upcoming.length} 项</span></div>
      ${upcoming.map((t, i) => `<div class="rise rise-${Math.min(i + 3, 6)}">${taskCard(t, true)}</div>`).join("") ||
        `<div class="card empty rise">暂无排程</div>`}`;
  }

  /* ---------- 月历视图 ---------- */
  function viewCalendar() {
    const base = state.calBase;
    const y = base.getFullYear(), m = base.getMonth();
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) {
      const d = new Date(y, m, i - startDow + 1);
      cells.push({ d, dim: true });
    }
    for (let i = 1; i <= daysIn; i++) cells.push({ d: new Date(y, m, i), dim: false });
    while (cells.length % 7) {
      const last = cells[cells.length - 1].d;
      const d = new Date(last); d.setDate(d.getDate() + 1);
      cells.push({ d, dim: true });
    }
    const selTasks = tasksOn(state.calSel);
    const selDate = new Date(state.calSel + "T00:00:00");
    return `
      <div class="cal-head rise">
        <h2>${y} 年 ${m + 1} 月</h2>
        <div class="cal-nav">
          <button data-cal="-1" aria-label="上个月">${ICONS.left}</button>
          <button data-cal="1" aria-label="下个月">${ICONS.right}</button>
        </div>
      </div>
      <div class="card card-pad rise rise-1" style="padding:12px">
        <div class="cal-grid">
          ${CT.WEEK.map(w => `<div class="cal-dow">${w.slice(1)}</div>`).join("")}
          ${cells.map(c => {
            const ymd = fmtYMD(c.d);
            const list = tasksOn(ymd);
            const urgent = list.some(t => t.b2b && !["completed", "cancelled"].includes(t.status));
            const isToday = ymd === fmtYMD(TODAY);
            return `<div class="cal-cell ${c.dim ? "dim" : ""} ${isToday ? "today" : ""} ${ymd === state.calSel ? "sel" : ""}" data-day="${ymd}">
              <span>${c.d.getDate()}</span>
              ${list.length ? `<span class="cnt ${urgent ? "has-urgent" : ""}">${list.length}</span>` : ""}
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="section-h rise rise-2">
        <h2>${fmtMDW(selDate)}</h2>
        <span class="hint">${selTasks.length ? selTasks.length + " 项任务" : "无任务"}</span>
      </div>
      ${selTasks.map((t, i) => `<div class="rise rise-${Math.min(i + 2, 6)}">${taskCard(t, false)}</div>`).join("") ||
        `<div class="card empty rise rise-3">这一天没有清洁安排</div>`}`;
  }

  /* ---------- 通知视图 ---------- */
  function viewNotifs() {
    const list = NOTIFS[state.me] || [];
    state.readNotifs = true;
    return `
      <div class="section-h rise"><h2>通知</h2><span class="hint">异常沟通不再依赖微信</span></div>
      ${list.map((n, i) => `
        <div class="card notif-item rise rise-${Math.min(i + 1, 6)}">
          <div class="n-ico n-${n.kind}">${{ task: ICONS.inbox, change: ICONS.refresh, issue: ICONS.alert, remind: ICONS.bell }[n.kind]}</div>
          <div class="n-main"><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div>
          <span class="n-time">${n.off === 0 ? "今天" : fmtMD(D(n.off))} ${n.time}</span>
        </div>`).join("")}
      <p style="text-align:center;font-size:11.5px;color:var(--ink-3);margin-top:14px">
        正式版通过 Web Push / 邮件推送（见 PRD FR-8）
      </p>`;
  }

  /* ---------- 我的视图 ---------- */
  function viewProfile() {
    const me = CLEANERS[state.me];
    const mine = myTasks();
    const doneMonth = mine.filter(t => t.status === "completed").length;
    const myProps = PROPERTIES.filter(p => p.primary === state.me || p.backup === state.me);
    const income = mine.filter(t => t.status === "completed")
      .reduce((s, t) => s + ((prop(t.propId).price || {})[state.me] || 0), 0);
    return `
      <div class="card profile-head rise">
        <span class="avatar ${me.cls}">${me.short}</span>
        <div>
          <b style="font-size:17px">${esc(me.name)}</b>
          <div style="font-size:12px;color:var(--ink-3)">清洁人员 · 授权 ${myProps.length} 个房源</div>
        </div>
      </div>
      <div class="stat-row rise rise-1">
        <div class="card stat-cell"><b>${doneMonth}</b><span>近 30 天完成</span></div>
        <div class="card stat-cell"><b>${mine.filter(t => t.status === "issue").length}</b><span>异常回报</span></div>
        <div class="card stat-cell"><b>$${income}</b><span>对账金额 CAD</span></div>
      </div>
      <div class="section-h rise rise-2"><h2>我的授权房源</h2><span class="hint">由管理员分配</span></div>
      <div class="card rise rise-3">
        ${myProps.map(p => `
          <div class="prop-row">
            <div class="pr-ico">${ICONS.home}</div>
            <div style="flex:1"><b>${esc(p.alias)}</b> <span style="color:var(--ink-3);font-size:11px">${p.code}</span>
              <div style="font-size:11.5px;color:var(--ink-3)">${esc(p.area)}</div></div>
            <span class="tag">${p.primary === state.me ? "主要" : "次要"}</span>
            <span class="tag">$${(p.price || {})[state.me] || "—"}/次</span>
          </div>`).join("")}
      </div>
      <p style="text-align:center;font-size:11.5px;color:var(--ink-3);margin-top:14px">
        看不到的房源 = 未被授权（数据库层 RLS 强制隔离）
      </p>`;
  }

  /* ---------- 任务详情 ---------- */
  function taskPage(t) {
    const p = prop(t.propId);
    const st = STATUS[t.status];
    const urgent = t.b2b && !["completed", "cancelled"].includes(t.status);
    const sec = p.secrets || {};
    const accessRows = [
      [ICONS.key, "门锁密码", sec.door], [ICONS.car, "车库 / 车位", sec.garage],
      [ICONS.wifi, "Wi-Fi", sec.wifi], [ICONS.note, "停车说明", sec.parking], [ICONS.home, "进入说明", sec.entry],
    ].filter(r => r[2] && r[2] !== "—");

    return `
    <div class="task-page" id="taskPage">
      <div class="tp-bar">
        <button class="back" data-act="back">${ICONS.left}</button>
        <h2>${esc(p.alias)} <span style="font-size:12px;color:var(--ink-3);font-weight:500">${p.code}</span></h2>
        <span class="chip ${st.chip}"><span class="dot"></span>${st.label}</span>
      </div>
      <div class="tp-body">
        ${t.changed ? `<div class="banner banner-change">${ICONS.refresh}<span><b>订单已改期</b> — 退房日 ${fmtMD(D(t.changed.fromOff))} → ${fmtMD(D(t.changed.toOff))}，任务已自动顺延（来自 Hostfully 同步）</span></div>` : ""}
        ${urgent ? `<div class="banner banner-urgent">${ICONS.alert}<span><b>当日入住</b> — ${t.checkout} 退房，${t.nextCheckin} 新客入住，请优先完成本任务</span></div>` : ""}
        ${t.status === "issue" ? `<div class="banner banner-issue">${ICONS.alert}<span><b>异常处理中</b> — ${esc(t.note || "详见事件记录")}，管理员已收到通知</span></div>` : ""}

        <div class="info-grid">
          <div class="info-cell"><div class="k">${ICONS.calendar}清洁日期</div><div class="v">${fmtMDW(t.date)}</div></div>
          <div class="info-cell"><div class="k">${ICONS.clock}时间窗口</div><div class="v">${t.checkout} → ${t.nextCheckin || "—"} <small>${t.nextCheckin ? "下位入住" : "次日无入住"}</small></div></div>
          <div class="info-cell"><div class="k">${ICONS.guest}离店房客</div><div class="v">${esc(t.guestName)} <small>${t.guests} 人</small></div></div>
          <div class="info-cell"><div class="k">${ICONS.home}区域</div><div class="v" style="font-size:13px">${esc(p.area)}</div></div>
        </div>

        <div class="card access-box ${state.accessOpen ? "open" : ""}" id="accessBox">
          <div class="head" data-act="toggleAccess">
            <b>${ICONS.key}进入信息</b>
            <span style="font-size:11.5px;color:var(--ink-3);display:flex;align-items:center;gap:5px">
              ${state.accessOpen ? ICONS.eyeOff : ICONS.eye}${state.accessOpen ? "收起" : "点击查看"}
            </span>
          </div>
          <div class="access-rows">
            ${accessRows.map(r => `<div class="access-row"><span class="ak">${r[0]}${r[1]}</span><span class="av">${esc(r[2])}</span></div>`).join("")}
            <div class="readonly-note">只读信息，由管理员维护；如发现换锁等变化请写入房源日志</div>
          </div>
        </div>

        ${t.note && t.status !== "issue" ? `<div class="card card-pad" style="padding:12px 14px;margin-bottom:10px;font-size:13px"><b style="font-size:12px;color:var(--ink-3)">备注</b><br>${esc(t.note)}</div>` : ""}

        <div class="section-h"><h2>照片</h2><span class="hint">完成照保留 3 天 · 异常照 ≥7 天</span></div>
        <div class="photo-grid" id="photoGrid">
          ${t.photos.map(ph => `
            <div class="photo ${ph.tag === "issue" ? "issue" : ""}">
              ${ph.src ? `<img src="${ph.src}" alt="">` : ""}
              <span class="ph-label">${ph.tag === "issue" ? "异常" : "完成"} · ${esc(ph.label)}</span>
            </div>`).join("")}
          <label class="photo-add">${ICONS.camera}<span>上传照片</span>
            <input type="file" accept="image/*" hidden id="photoInput"></label>
        </div>

        <div class="section-h"><h2>事件流水账</h2>
          <button class="btn btn-ghost btn-sm" data-act="addEvent">${ICONS.plus}新增</button></div>
        <div class="card" style="padding:2px 14px">
          ${t.events.length ? t.events.map(ev => `
            <div class="event-item">
              <div class="ev-ico">${{ damage: ICONS.alert, repair: ICONS.wrench, restock: ICONS.box, extra: ICONS.sparkle, lost: ICONS.inbox, other: ICONS.note }[ev.type] || ICONS.note}</div>
              <div class="ev-main">
                <div class="ev-top"><b>${EVENT_TYPES[ev.type] || "其他"}</b>
                  <span class="ev-cost">${ev.cost ? "CA$" + ev.cost : "无费用"}</span></div>
                <div>${esc(ev.body)}</div>
                <div class="ev-sub">${esc(ev.by)}${ev.photos ? ` · 附 ${ev.photos} 张照片` : ""}</div>
              </div>
            </div>`).join("") : `<div class="empty" style="padding:20px">暂无事件 — 损坏、补货、额外清洁都记在这里</div>`}
        </div>

        <div class="action-zone">${actionButtons(t)}</div>
      </div>
    </div>`;
  }

  function actionButtons(t) {
    switch (t.status) {
      case "offered": return `
        <button class="btn btn-xl btn-primary" data-act="accept">${ICONS.check}接受任务</button>
        <button class="btn btn-danger-ghost btn-block" data-act="decline">拒绝（将转派次要人员并通知管理员）</button>`;
      case "pending": return `
        <button class="btn btn-xl btn-primary" data-act="start">开始清洁</button>`;
      case "in_progress": return `
        <button class="btn btn-xl btn-complete" data-act="complete">${ICONS.check}完成清洁</button>
        <div class="action-row"><button class="btn btn-ghost" data-act="reportIssue">${ICONS.alert}回报异常</button></div>`;
      case "issue": return `
        <button class="btn btn-xl btn-primary" data-act="complete">异常已处理 · 标记完成</button>`;
      case "completed": return `
        <div class="banner" style="background:var(--st-good-bg);color:#0A7A0A;margin-bottom:0">${ICONS.check}<span><b>已完成</b> — 状态与照片已同步给管理员，辛苦了！</span></div>`;
      default: return "";
    }
  }

  /* ---------- 事件 / 异常 表单 ---------- */
  function openEventSheet(t, isIssue) {
    const mask = document.createElement("div");
    mask.className = "sheet-mask";
    mask.innerHTML = `
      <div class="sheet">
        <div class="grip"></div>
        <h3>${isIssue ? "回报异常" : "新增事件"}</h3>
        <div class="field"><label>事件类型</label>
          <select id="evType">
            ${Object.entries(EVENT_TYPES).map(([k, v]) =>
              `<option value="${k}" ${isIssue && k === "damage" ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
        <div class="field"><label>描述${isIssue ? "（必填）" : ""}</label>
          <textarea id="evBody" placeholder="例：主卫马桶堵塞 / 洗手液需补 2 瓶"></textarea></div>
        <div class="field"><label>相关费用（CAD，可为 0）</label>
          <input type="number" id="evCost" value="0" min="0"></div>
        <div class="field"><label>照片</label>
          <label class="photo-add" style="aspect-ratio:auto;padding:14px">${ICONS.camera}<span>拍照或选择图片（原型模拟）</span>
            <input type="file" accept="image/*" hidden></label></div>
        <div class="modal-actions" style="margin-top:6px">
          <button class="btn btn-ghost" data-s="cancel">取消</button>
          <button class="btn btn-primary" data-s="save">${isIssue ? "提交异常" : "保存事件"}</button>
        </div>
      </div>`;
    mask.addEventListener("click", e => {
      if (e.target === mask || e.target.closest('[data-s="cancel"]')) { mask.remove(); return; }
      if (e.target.closest('[data-s="save"]')) {
        const body = mask.querySelector("#evBody").value.trim();
        if (!body) { toast("请填写描述", ICONS.alert); return; }
        t.events.push({
          type: mask.querySelector("#evType").value, body,
          cost: Number(mask.querySelector("#evCost").value) || 0,
          by: CLEANERS[state.me].name, photos: 0,
        });
        if (isIssue) { t.status = "issue"; t.note = body; }
        mask.remove(); render();
        toast(isIssue ? "异常已提交，管理员已收到通知" : "事件已记入流水账", isIssue ? ICONS.alert : ICONS.check);
      }
    });
    document.querySelector(".phone-screen").appendChild(mask);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const me = CLEANERS[state.me];
    const openTask = state.openTaskId ? TASKS.find(t => t.id === state.openTaskId) : null;
    const views = { today: viewToday, calendar: viewCalendar, notifs: viewNotifs, profile: viewProfile };
    const titles = { today: fmtMDW(TODAY), calendar: "清洁月历", notifs: "消息中心", profile: "我的" };
    app.innerHTML = `
      <div class="appbar">
        <div>
          <div class="hello">你好，${esc(me.name)}</div>
          <h1>${titles[state.tab]}</h1>
        </div>
        <button class="bell-btn" data-tab="notifs">${ICONS.bell}${notifCount() ? `<span class="bubble">${notifCount()}</span>` : ""}</button>
      </div>
      <div class="app-body">${views[state.tab]()}</div>
      <div class="bottom-nav">
        ${[["today", "今日", ICONS.today], ["calendar", "月历", ICONS.calendar], ["notifs", "通知", ICONS.bell], ["profile", "我的", ICONS.user]]
          .map(([k, label, ic]) => `<button class="${state.tab === k ? "on" : ""}" data-tab="${k}">${ic}<span>${label}</span></button>`).join("")}
      </div>
      ${openTask ? taskPage(openTask) : ""}`;
  }

  /* ---------- 全局事件委托 ---------- */
  app.addEventListener("click", e => {
    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) { state.tab = tabBtn.dataset.tab; state.openTaskId = null; render(); return; }

    const calBtn = e.target.closest("[data-cal]");
    if (calBtn) {
      state.calBase = new Date(state.calBase.getFullYear(), state.calBase.getMonth() + Number(calBtn.dataset.cal), 1);
      render(); return;
    }
    const dayCell = e.target.closest("[data-day]");
    if (dayCell) { state.calSel = dayCell.dataset.day; render(); return; }

    const card = e.target.closest("[data-task]");
    if (card) { state.openTaskId = card.dataset.task; state.accessOpen = false; render(); return; }

    const act = e.target.closest("[data-act]");
    if (!act) return;
    const t = state.openTaskId ? TASKS.find(x => x.id === state.openTaskId) : null;
    switch (act.dataset.act) {
      case "back": state.openTaskId = null; render(); break;
      case "toggleAccess": state.accessOpen = !state.accessOpen; render(); break;
      case "accept":
        t.status = "pending"; render();
        toast("已接受任务，管理员可见", ICONS.check); break;
      case "decline":
        confirmModal({
          title: "确认拒绝该任务？",
          body: `任务将自动转派给次要清洁人员${prop(t.propId).backup ? `（${CT.cleanerName(prop(t.propId).backup)}）` : ""}，并同时通知管理员。`,
          okText: "确认拒绝", danger: true,
          onOk: () => {
            const p = prop(t.propId);
            if (p.backup && p.backup !== state.me) { t.cleaner = p.backup; t.status = "offered"; }
            else { t.cleaner = null; t.status = "offered"; t.assignNote = "等待管理员手动指派"; }
            state.openTaskId = null; render();
            toast(p.backup ? `已转派 ${CT.cleanerName(p.backup)}，并通知管理员` : "无次要人员，已进入管理员待处理", ICONS.send);
          },
        }); break;
      case "start":
        t.status = "in_progress"; render();
        toast("开始清洁，计时已记录", ICONS.clock); break;
      case "complete":
        confirmModal({
          title: "确认完成清洁？",
          body: `确认后任务标记为<b>已完成</b>并通知管理员。<br>建议先上传完成照片再确认（防误触二次确认）。`,
          okText: "确认完成",
          onOk: () => {
            t.status = "completed"; t.issueOpen = false; render();
            toast("任务已完成，管理员已收到回报", ICONS.check);
          },
        }); break;
      case "reportIssue": openEventSheet(t, true); break;
      case "addEvent": openEventSheet(t, false); break;
    }
  });

  /* 照片上传（本地预览模拟） */
  app.addEventListener("change", e => {
    if (e.target.id !== "photoInput" || !e.target.files[0]) return;
    const t = TASKS.find(x => x.id === state.openTaskId);
    const reader = new FileReader();
    reader.onload = ev => {
      const isIssue = t.status === "issue";
      t.photos.push({ tag: isIssue ? "issue" : "routine", label: "刚刚上传", src: ev.target.result });
      render();
      toast(isIssue ? "异常照已上传（保留 ≥7 天）" : "完成照已上传（保留 3 天）", ICONS.camera);
    };
    reader.readAsDataURL(e.target.files[0]);
  });

  renderRoleSwitch();
  render();
})();
