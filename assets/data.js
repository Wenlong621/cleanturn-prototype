/* CleanTurn 原型 · 虚构演示数据与共享工具
   所有房源、人员、密码、价格均为虚构，仅用于原型演示。
   任务日期相对"今天"动态生成，原型任何时候打开都是活的。 */

(function (global) {
  "use strict";

  /* ---------- 日期工具 ---------- */
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const D = off => { const d = new Date(TODAY); d.setDate(d.getDate() + off); return d; };
  const pad = n => String(n).padStart(2, "0");
  const fmtMD = d => `${d.getMonth() + 1}月${d.getDate()}日`;
  const fmtYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const fmtMDW = d => `${fmtMD(d)} ${WEEK[d.getDay()]}`;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- 图标（描边 SVG） ---------- */
  const I = (p, extra) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}${extra || ""}</svg>`;
  const ICONS = {
    calendar: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    today: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12" cy="14.5" r="2.2" fill="currentColor" stroke="none"/>'),
    bell: I('<path d="M18 9.5a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/>'),
    user: I('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/>'),
    home: I('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>'),
    check: I('<path d="M4.5 12.5 10 18 19.5 7"/>'),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    alert: I('<path d="M12 3.5 22 20H2Z"/><path d="M12 10v4.2M12 17.2v.1"/>'),
    camera: I('<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.4"/>'),
    key: I('<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5 20 3.5M16 7.5l3 3M13.5 10l2.5 2.5"/>'),
    wifi: I('<path d="M3 9.5a13 13 0 0 1 18 0M6.5 13a8.5 8.5 0 0 1 11 0M9.8 16.3a4 4 0 0 1 4.4 0"/><circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none"/>'),
    car: I('<path d="M5 16.5 6.5 11a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5l1.5 5.5"/><rect x="4" y="14.5" width="16" height="4.5" rx="1.4"/><path d="M7.5 19v1.5M16.5 19v1.5"/>'),
    clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    refresh: I('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3.8v4h-4"/>'),
    download: I('<path d="M12 4v10M8 10.5l4 4 4-4"/><path d="M5 19.5h14"/>'),
    cloud: I('<path d="M7 18.5a4.2 4.2 0 0 1-.6-8.4 5.4 5.4 0 0 1 10.6 1A3.8 3.8 0 0 1 16.5 18.5Z"/>'),
    left: I('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
    right: I('<path d="M9.5 5.5 16 12l-6.5 6.5"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    doc: I('<path d="M6 3.5h8L19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8H19M8.5 13h7M8.5 16.5h7"/>'),
    shield: I('<path d="M12 3.5 19.5 6v6c0 4.6-3.1 7.6-7.5 9-4.4-1.4-7.5-4.4-7.5-9V6Z"/><path d="M9 12l2.2 2.2L15.5 9.8"/>'),
    wrench: I('<path d="M14.5 6.5a4.4 4.4 0 0 0-6 5.4L3.6 16.8a1.8 1.8 0 0 0 2.6 2.6l4.9-4.9a4.4 4.4 0 0 0 5.4-6l-2.8 2.8-2.2-2.2Z"/>'),
    sparkle: I('<path d="M12 4c.7 3.6 2 5.5 6 6.5-4 1-5.3 2.9-6 6.5-.7-3.6-2-5.5-6-6.5 4-1 5.3-2.9 6-6.5Z"/><path d="M18.5 15.5c.3 1.4.9 2.2 2.5 2.6-1.6.4-2.2 1.2-2.5 2.6-.3-1.4-.9-2.2-2.5-2.6 1.6-.4 2.2-1.2 2.5-2.6Z"/>'),
    box: I('<path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5Z"/><path d="M4 8.5 12 13l8-4.5M12 13v8"/>'),
    eye: I('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.6"/>'),
    eyeOff: I('<path d="M5.5 6.5C3.6 8.2 3 12 3 12s3.5 6 9 6c1.6 0 3-.5 4.2-1.2M10 6.3A8 8 0 0 1 12 6c5.5 0 9 6 9 6a15.4 15.4 0 0 1-2.4 3M4 4l16 16"/>'),
    inbox: I('<path d="M4 13.5V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7.5"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/>'),
    dollar: I('<circle cx="12" cy="12" r="8.5"/><path d="M15 9.2c-.5-1-1.6-1.5-3-1.5-1.7 0-2.8.8-2.8 2 0 2.8 6 1.5 6 4.4 0 1.3-1.2 2.2-3.2 2.2-1.6 0-2.8-.6-3.3-1.7M12 6v1.7M12 16.3V18"/>'),
    users: I('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7"/><path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.5M17.5 14.9c1.7.7 2.7 2.1 3 4.1"/>'),
    dash: I('<rect x="3.5" y="3.5" width="7.5" height="9" rx="1.6"/><rect x="13" y="3.5" width="7.5" height="5.5" rx="1.6"/><rect x="13" y="11" width="7.5" height="9.5" rx="1.6"/><rect x="3.5" y="14.5" width="7.5" height="6" rx="1.6"/>'),
    list: I('<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
    photoLib: I('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4 3.5 3 2.5-2 4 3.5"/>'),
    audit: I('<path d="M7 3.5h10a1 1 0 0 1 1 1V20l-3-1.8L12 20l-3-1.8L6 20V4.5a1 1 0 0 1 1-1Z"/><path d="M9.5 8.5h5M9.5 12h5"/>'),
    send: I('<path d="M20.5 3.5 3.5 10.8l6.9 2.3 2.3 6.9Z"/><path d="M20.5 3.5 10.4 13.1"/>'),
    logout: I('<path d="M9 4H5.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1H9"/><path d="M15 8.5 18.5 12 15 15.5M18 12H9.5"/>'),
    guest: I('<circle cx="12" cy="7.5" r="3"/><path d="M6 20a6.3 6.3 0 0 1 12 0"/><path d="M17.5 4.5c1.2.7 1.2 2.9 0 3.6"/>'),
    note: I('<path d="M5 4.5h14v12l-4 4H5Z"/><path d="M15 20.5v-4h4"/>'),
  };

  /* ---------- 状态元数据 ---------- */
  const STATUS = {
    offered:     { label: "待接受",   chip: "chip-offered" },
    pending:     { label: "未开始",   chip: "chip-pending" },
    in_progress: { label: "清洁中",   chip: "chip-progress" },
    completed:   { label: "已完成",   chip: "chip-completed" },
    issue:       { label: "异常",     chip: "chip-issue" },
    cancelled:   { label: "已取消",   chip: "chip-cancelled" },
  };
  const EVENT_TYPES = { damage: "损坏", repair: "维修", restock: "补货", extra: "额外清洁", lost: "遗留物", other: "其他" };

  /* ---------- 人员 ---------- */
  const CLEANERS = {
    amy:   { id: "amy",   name: "陈阿美", short: "美", cls: "avatar-a" },
    grace: { id: "grace", name: "刘思佳", short: "佳", cls: "avatar-g" },
  };
  const ADMIN_NAME = "温经理";

  /* ---------- 房源（虚构） ---------- */
  const PROPERTIES = [
    { id: "P1", code: "MV-01", alias: "枫景别墅", area: "北温 · Maple Ct", beds: 4, baths: 3, primary: "amy", backup: "grace", autoAssign: true,  price: { amy: 300, grace: 300 },
      secrets: { door: "1088#", garage: "2266", wifi: "MapleView-5G / stay1088", parking: "车道右侧可停 2 台", entry: "侧门进入，玄关柜有备用拖鞋" },
      logs: [
        { off: -5,  type: "manual", by: "温经理", body: "正门换锁完成，新密码已同步到系统" },
        { off: -8,  type: "manual", by: "陈阿美", body: "车库遥控器电量偏低，建议更换电池" },
        { off: -16, type: "system", by: "系统",   body: "清洁价格调整：280 → 300 CAD（温经理）" },
      ] },
    { id: "P2", code: "LS-02", alias: "湖畔小筑", area: "深湾 · Lakeshore", beds: 3, baths: 2, primary: "amy", backup: "grace", autoAssign: true,  price: { amy: 260, grace: 260 },
      secrets: { door: "0713#", garage: "—", wifi: "Lakeside / calmwater", parking: "路边免费停车", entry: "湖侧木门直入" },
      logs: [ { off: -11, type: "manual", by: "刘思佳", body: "洗衣机排水偏慢，已反馈房东观察" } ] },
    { id: "P3", code: "HB-03", alias: "海港公寓", area: "市中心 · Harbour St", beds: 2, baths: 1, primary: "grace", backup: "amy", autoAssign: true,  price: { grace: 180, amy: 180 },
      secrets: { door: "4520#", garage: "P2-33 车位", wifi: "HarbourLoft / seaview", parking: "地库访客位 30 分钟内免费", entry: "大堂刷码进入，电梯需拍卡" },
      logs: [ { off: -3, type: "system", by: "系统", body: "进入信息更新：门锁密码已更换（温经理）" } ] },
    { id: "P4", code: "KB-04", alias: "海滩之家", area: "基斯兰奴 · Kits Beach", beds: 3, baths: 2, primary: "amy", backup: null, autoAssign: false, price: { amy: 320 },
      secrets: { door: "8806#", garage: "—", wifi: "KitsHouse / sunsand", parking: "屋前车道", entry: "钥匙盒在侧栏第二格" },
      logs: [] },
    { id: "P5", code: "BT-05", alias: "本拿比联排", area: "本拿比 · Townline", beds: 3, baths: 2.5, primary: "amy", backup: "grace", autoAssign: true, price: { amy: 220, grace: 220 },
      secrets: { door: "3311#", garage: "1199", wifi: "Townhome5G / maple2026", parking: "车库 + 门前 1 位", entry: "车库侧门进入" },
      logs: [] },
    { id: "P6", code: "RS-06", alias: "列治文雅居", area: "列治文 · Garden City", beds: 2, baths: 2, primary: "grace", backup: "amy", autoAssign: true, price: { grace: 200, amy: 200 },
      secrets: { door: "6688#", garage: "—", wifi: "GardenSuite / lulu888", parking: "楼下访客位登记车牌", entry: "北门快递柜旁入口" },
      logs: [] },
  ];
  const prop = id => PROPERTIES.find(p => p.id === id);

  /* ---------- 任务（相对今天生成） ---------- */
  let seq = 0;
  const T = (off, propId, cleaner, status, o = {}) => ({
    id: "T" + (++seq),
    off, propId, cleaner, status,
    date: D(off),
    checkout: o.checkout || "11:00",
    nextCheckin: "nextCheckin" in o ? o.nextCheckin : "16:00",
    b2b: !!o.b2b,
    guests: o.guests || 2,
    guestName: o.guestName || "—",
    note: o.note || "",
    changed: o.changed || null,        // {fromOff, toOff}
    events: o.events || [],            // {type, body, cost, by, photos}
    photos: o.photos || [],            // {tag:'routine'|'issue', label}
    issueOpen: !!o.issueOpen,
    assignNote: o.assignNote || "",
  });

  const TASKS = [
    /* 过去（历史记录 & 日历密度） */
    T(-20, "P2", "amy",   "completed", { guests: 2, guestName: "S. Park",  photos: [{ tag: "routine", label: "客厅" }, { tag: "routine", label: "厨房" }] }),
    T(-17, "P1", "amy",   "completed", { guests: 5, guestName: "J. Wong",  photos: [{ tag: "routine", label: "全屋" }] }),
    T(-14, "P4", "amy",   "completed", { guests: 3, guestName: "L. Brown", photos: [{ tag: "routine", label: "卧室" }] }),
    T(-12, "P3", "grace", "completed", { guests: 2, guestName: "K. Sato",  photos: [{ tag: "routine", label: "全屋" }] }),
    T(-9,  "P5", "grace", "completed", { guests: 4, guestName: "A. Gill",  photos: [] }),
    T(-7,  "P6", "grace", "completed", { guests: 2, guestName: "D. Kim",   photos: [] }),
    T(-6,  "P6", "grace", "cancelled", { guests: 2, guestName: "T. Zhao",  note: "订单在 Hostfully 取消，任务自动关闭" }),
    T(-5,  "P2", "amy",   "completed", { guests: 3, guestName: "M. Ross",  photos: [{ tag: "routine", label: "客厅" }] }),
    T(-3,  "P1", "amy",   "issue",     { guests: 6, guestName: "H. Nguyen", b2b: false, issueOpen: true,
      note: "主卫马桶堵塞，无法在清洁时段内修复",
      events: [
        { type: "damage", body: "主卫马桶堵塞，疑似异物，已尝试皮搋无效", cost: 0,  by: "陈阿美", photos: 1 },
        { type: "repair", body: "联系水管工上门疏通，45 分钟处理完毕",     cost: 80, by: "陈阿美", photos: 1 },
      ],
      photos: [{ tag: "issue", label: "主卫 · 堵塞" }, { tag: "issue", label: "疏通后" }] }),
    T(-1,  "P4", "amy",   "completed", { guests: 2, guestName: "E. Fraser", photos: [{ tag: "routine", label: "客厅" }, { tag: "routine", label: "厨房" }, { tag: "routine", label: "浴室" }] }),
    T(-1,  "P3", "grace", "completed", { guests: 2, guestName: "Y. Lin",    photos: [{ tag: "routine", label: "全屋" }] }),

    /* 今天 */
    T(0, "P1", "amy",   "in_progress", { b2b: true, guests: 4, guestName: "R. Chen", note: "客人 16:00 入住，优先主卧与厨房",
      events: [{ type: "restock", body: "洗手液耗尽，需补充 2 瓶", cost: 0, by: "陈阿美", photos: 0 }] }),
    T(0, "P5", "amy",   "pending",     { guests: 3, guestName: "B. Singh", nextCheckin: null, note: "明日无入住，可安排在下午" }),
    T(0, "P3", "grace", "offered",     { b2b: true, guests: 2, guestName: "M. Liu", assignNote: "您是该房源主要清洁人员" }),
    T(0, "P6", "grace", "pending",     { guests: 2, guestName: "C. Wang", nextCheckin: null }),

    /* 未来 */
    T(1, "P2", "amy",   "pending",  { guests: 4, guestName: "P. Martin" }),
    T(1, "P4", "amy",   "offered",  { guests: 2, guestName: "N. Silva", assignNote: "该房源为手动指派（未开启自动归属）" }),
    T(3, "P6", "grace", "pending",  { guests: 2, guestName: "T. Ito", changed: { fromOff: 1, toOff: 3 }, note: "客人在 Hostfully 延长住宿，退房日变更" }),
    T(4, "P1", "amy",   "pending",  { b2b: true, guests: 5, guestName: "G. Adams" }),
    T(6, "P3", "grace", "pending",  { guests: 2, guestName: "W. Zhou" }),
    T(8, "P5", "amy",   "pending",  { guests: 4, guestName: "F. Dubois" }),
  ];

  /* ---------- 通知 ---------- */
  const NOTIFS = {
    amy: [
      { off: 0,  time: "07:00", kind: "remind", title: "今日 2 项清洁任务", body: "枫景别墅（当日入住，16:00 前完成）、本拿比联排" },
      { off: 0,  time: "06:12", kind: "task",   title: "新任务待接受：海滩之家", body: `${fmtMD(D(1))} 退房清洁，请确认接受` },
      { off: -1, time: "18:40", kind: "issue",  title: "异常已受理：枫景别墅", body: "管理员已跟进马桶堵塞维修，费用已记录" },
    ],
    grace: [
      { off: 0,  time: "07:00", kind: "remind", title: "今日 2 项清洁任务", body: "海港公寓（当日入住）、列治文雅居" },
      { off: 0,  time: "06:05", kind: "task",   title: "新任务待接受：海港公寓", body: "今日退房清洁（当日 16:00 新客入住），请尽快确认" },
      { off: -1, time: "10:02", kind: "change", title: "订单改期：列治文雅居", body: `退房日 ${fmtMD(D(1))} → ${fmtMD(D(3))}，任务已自动顺延` },
    ],
  };

  /* ---------- 管理端队列 / 同步 / 审计 ---------- */
  const QUEUE = [
    { kind: "offer",   title: "海港公寓 · 今日（当日入住）", body: "已指派主要人员刘思佳，等待接受 · 已等待 1 小时 12 分", level: "serious" },
    { kind: "offer",   title: `海滩之家 · ${fmtMD(D(1))}`, body: "房源未开启自动归属，已手动指派陈阿美，等待接受", level: "warn" },
    { kind: "decline", title: "转派记录 · 湖畔小筑", body: `${fmtMD(D(-2))} 主要人员拒单 → 已自动转派次要人员并通知（示例记录）`, level: "info" },
  ];

  const SYNC = {
    webhook: { ok: true, last: "09:41", event: "新订单建立 · 湖畔小筑（Hostfully webhook）" },
    runs: [
      { label: `昨日 21:00 兜底同步`, result: "3 项变更", ok: true },
      { label: `今日 06:00 兜底同步`, result: "无变更", ok: true },
      { label: `今日 10:00 兜底同步`, result: "1 项变更（列治文雅居改期）", ok: true },
    ],
  };

  const AUDIT = [
    { off: 0,  time: "10:01", actor: "系统",   action: `同步：列治文雅居订单改期，任务 ${fmtMD(D(1))} → ${fmtMD(D(3))}，已通知刘思佳` },
    { off: 0,  time: "09:41", actor: "系统",   action: "Webhook：新订单建立（湖畔小筑），已生成清洁任务" },
    { off: 0,  time: "08:15", actor: "陈阿美", action: "任务状态：枫景别墅 未开始 → 清洁中" },
    { off: -1, time: "18:36", actor: "温经理", action: "异常处理：枫景别墅 马桶堵塞 → 已受理，维修费用 CA$80 入账" },
    { off: -1, time: "09:20", actor: "温经理", action: "权限变更：授权 刘思佳 为 海滩之家 次要清洁人员（后撤销）" },
    { off: -2, time: "14:02", actor: "温经理", action: "进入信息：海港公寓 门锁密码更新" },
    { off: -3, time: "21:00", actor: "系统",   action: "照片清理：3 张完成照到期，已物理删除并同步移除前端" },
    { off: -16, time: "11:30", actor: "温经理", action: "价格调整：枫景别墅 每次清洁 280 → 300 CAD" },
  ];

  /* ---------- 共享 UI ---------- */
  function toast(msg, icon) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = (icon || ICONS.check) + `<span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s, transform .3s"; t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 2400);
    setTimeout(() => t.remove(), 2800);
  }

  function confirmModal({ title, body, okText = "确认", danger = false, onOk }) {
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">再想想</button>
          <button class="btn ${danger ? "btn-danger-ghost" : "btn-primary"}" data-act="ok">${esc(okText)}</button>
        </div>
      </div>`;
    mask.addEventListener("click", e => {
      if (e.target === mask || e.target.closest("[data-act='cancel']")) mask.remove();
      else if (e.target.closest("[data-act='ok']")) { mask.remove(); onOk && onOk(); }
    });
    document.body.appendChild(mask);
  }

  const cleanerName = id => (CLEANERS[id] ? CLEANERS[id].name : "未指派");

  global.CT = {
    TODAY, D, fmtMD, fmtYMD, fmtMDW, WEEK, esc,
    ICONS, STATUS, EVENT_TYPES,
    CLEANERS, ADMIN_NAME, PROPERTIES, prop, TASKS,
    NOTIFS, QUEUE, SYNC, AUDIT,
    toast, confirmModal, cleanerName,
  };
})(window);
