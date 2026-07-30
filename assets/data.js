/* CleanTurn 原型 · 虚构演示数据与共享工具
   所有房源、人员、密码、价格均为虚构，仅用于原型演示。
   任务日期相对"今天"动态生成，原型任何时候打开都是活的。
   语言约定：清洁端中文；管理端英文（业主要求）。
   共享数据提供双语字段（alias/aliasEn 等），管理端专用数据（QUEUE/SYNC/AUDIT）直接为英文。 */

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
  /* 英文日期（管理端） */
  const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmtMDen = d => `${MON_EN[d.getMonth()]} ${d.getDate()}`;
  const fmtMDWen = d => `${WEEK_EN[d.getDay()]}, ${MON_EN[d.getMonth()]} ${d.getDate()}`;
  const t12 = s => {
    if (!s) return s;
    const [h, m] = s.split(":").map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
  };
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

  /* ---------- 状态元数据（label 中文 / labelEn 英文） ---------- */
  const STATUS = {
    offered:     { label: "待接受",   labelEn: "Awaiting accept", chip: "chip-offered" },
    pending:     { label: "未开始",   labelEn: "Not started",     chip: "chip-pending" },
    in_progress: { label: "清洁中",   labelEn: "In progress",     chip: "chip-progress" },
    completed:   { label: "已完成",   labelEn: "Completed",       chip: "chip-completed" },
    issue:       { label: "异常",     labelEn: "Issue",           chip: "chip-issue" },
    cancelled:   { label: "已取消",   labelEn: "Cancelled",       chip: "chip-cancelled" },
  };
  const EVENT_TYPES = { damage: "损坏", repair: "维修", restock: "补货", extra: "额外清洁", lost: "遗留物", other: "其他" };
  const EVENT_TYPES_EN = { damage: "Damage", repair: "Repair", restock: "Restock", extra: "Extra clean", lost: "Lost & found", other: "Other" };

  /* ---------- 人员 ---------- */
  const CLEANERS = {
    amy:   { id: "amy",   name: "陈阿美", nameEn: "Amy Chen",  short: "美", shortEn: "A", cls: "avatar-a" },
    grace: { id: "grace", name: "刘思佳", nameEn: "Grace Liu", short: "佳", shortEn: "G", cls: "avatar-g" },
  };
  const ADMIN_NAME = "温经理";
  const ADMIN_NAME_EN = "Wen";

  /* ---------- 房源（虚构） ---------- */
  const PROPERTIES = [
    { id: "P1", code: "MV-01", alias: "枫景别墅", aliasEn: "Maple View Villa", area: "北温 · Maple Ct", areaEn: "North Van · Maple Ct", beds: 4, baths: 3, primary: "amy", backup: "grace", autoAssign: true, price: { amy: 300, grace: 300 },
      secrets: { door: "1088#", garage: "2266", wifi: "MapleView-5G / stay1088",
        parking: "车道右侧可停 2 台", parkingEn: "Driveway right side, fits 2 cars",
        entry: "侧门进入，玄关柜有备用拖鞋", entryEn: "Enter via side door; spare slippers in foyer cabinet" },
      logs: [
        { off: -5,  type: "manual", by: "Wen",       body: "Front door re-keyed; new code synced to system" },
        { off: -8,  type: "manual", by: "Amy Chen",  body: "Garage remote battery low; suggest replacing" },
        { off: -16, type: "system", by: "System",    body: "Per-clean rate changed: 280 → 300 CAD (by Wen)" },
      ] },
    { id: "P2", code: "LS-02", alias: "湖畔小筑", aliasEn: "Lakeside Cottage", area: "深湾 · Lakeshore", areaEn: "Deep Cove · Lakeshore", beds: 3, baths: 2, primary: "amy", backup: "grace", autoAssign: true, price: { amy: 260, grace: 260 },
      secrets: { door: "0713#", garage: "—", wifi: "Lakeside / calmwater",
        parking: "路边免费停车", parkingEn: "Free street parking",
        entry: "湖侧木门直入", entryEn: "Enter through the lakeside wooden gate" },
      logs: [ { off: -11, type: "manual", by: "Grace Liu", body: "Washer drains slowly; owner notified, monitoring" } ] },
    { id: "P3", code: "HB-03", alias: "海港公寓", aliasEn: "Harbour Loft", area: "市中心 · Harbour St", areaEn: "Downtown · Harbour St", beds: 2, baths: 1, primary: "grace", backup: "amy", autoAssign: true, price: { grace: 180, amy: 180 },
      secrets: { door: "4520#", garage: "P2-33 车位", garageEn: "Stall P2-33", wifi: "HarbourLoft / seaview",
        parking: "地库访客位 30 分钟内免费", parkingEn: "Visitor parking in garage, free under 30 min",
        entry: "大堂刷码进入，电梯需拍卡", entryEn: "Lobby code entry; elevator needs fob" },
      logs: [ { off: -3, type: "system", by: "System", body: "Access info updated: door code changed (by Wen)" } ] },
    { id: "P4", code: "KB-04", alias: "海滩之家", aliasEn: "Kits Beach House", area: "基斯兰奴 · Kits Beach", areaEn: "Kitsilano · Kits Beach", beds: 3, baths: 2, primary: "amy", backup: null, autoAssign: false, price: { amy: 320 },
      secrets: { door: "8806#", garage: "—", wifi: "KitsHouse / sunsand",
        parking: "屋前车道", parkingEn: "Front driveway",
        entry: "钥匙盒在侧栏第二格", entryEn: "Lockbox on side fence, second slot" },
      logs: [] },
    { id: "P5", code: "BT-05", alias: "本拿比联排", aliasEn: "Burnaby Townhome", area: "本拿比 · Townline", areaEn: "Burnaby · Townline", beds: 3, baths: 2.5, primary: "amy", backup: "grace", autoAssign: true, price: { amy: 220, grace: 220 },
      secrets: { door: "3311#", garage: "1199", wifi: "Townhome5G / maple2026",
        parking: "车库 + 门前 1 位", parkingEn: "Garage + 1 spot out front",
        entry: "车库侧门进入", entryEn: "Enter via garage side door" },
      logs: [] },
    { id: "P6", code: "RS-06", alias: "列治文雅居", aliasEn: "Richmond Garden Suite", area: "列治文 · Garden City", areaEn: "Richmond · Garden City", beds: 2, baths: 2, primary: "grace", backup: "amy", autoAssign: true, price: { grace: 200, amy: 200 },
      secrets: { door: "6688#", garage: "—", wifi: "GardenSuite / lulu888",
        parking: "楼下访客位登记车牌", parkingEn: "Visitor stalls downstairs; register plate",
        entry: "北门快递柜旁入口", entryEn: "North entrance beside parcel lockers" },
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
    noteEn: o.noteEn || "",
    changed: o.changed || null,        // {fromOff, toOff}
    events: o.events || [],            // {type, body, bodyEn, cost, by, photos}
    photos: o.photos || [],            // {tag:'routine'|'issue', label, labelEn}
    issueOpen: !!o.issueOpen,
    assignNote: o.assignNote || "",
  });

  const TASKS = [
    /* 过去（历史记录 & 日历密度） */
    T(-20, "P2", "amy",   "completed", { guests: 2, guestName: "S. Park",  photos: [{ tag: "routine", label: "客厅", labelEn: "Living room" }, { tag: "routine", label: "厨房", labelEn: "Kitchen" }] }),
    T(-17, "P1", "amy",   "completed", { guests: 5, guestName: "J. Wong",  photos: [{ tag: "routine", label: "全屋", labelEn: "Whole home" }] }),
    T(-14, "P4", "amy",   "completed", { guests: 3, guestName: "L. Brown", photos: [{ tag: "routine", label: "卧室", labelEn: "Bedroom" }] }),
    T(-12, "P3", "grace", "completed", { guests: 2, guestName: "K. Sato",  photos: [{ tag: "routine", label: "全屋", labelEn: "Whole home" }] }),
    T(-9,  "P5", "grace", "completed", { guests: 4, guestName: "A. Gill",  photos: [] }),
    T(-7,  "P6", "grace", "completed", { guests: 2, guestName: "D. Kim",   photos: [] }),
    T(-6,  "P6", "grace", "cancelled", { guests: 2, guestName: "T. Zhao",  note: "订单在 Hostfully 取消，任务自动关闭", noteEn: "Booking cancelled in Hostfully; task auto-closed" }),
    T(-5,  "P2", "amy",   "completed", { guests: 3, guestName: "M. Ross",  photos: [{ tag: "routine", label: "客厅", labelEn: "Living room" }] }),
    T(-3,  "P1", "amy",   "issue",     { guests: 6, guestName: "H. Nguyen", b2b: false, issueOpen: true,
      note: "主卫马桶堵塞，无法在清洁时段内修复",
      noteEn: "Ensuite toilet clogged; could not be fixed within the cleaning window",
      events: [
        { type: "damage", body: "主卫马桶堵塞，疑似异物，已尝试皮搋无效", bodyEn: "Ensuite toilet clogged, likely foreign object; plunger didn't work", cost: 0,  by: "陈阿美", photos: 1 },
        { type: "repair", body: "联系水管工上门疏通，45 分钟处理完毕",     bodyEn: "Plumber called in; cleared in 45 minutes", cost: 80, by: "陈阿美", photos: 1 },
      ],
      photos: [{ tag: "issue", label: "主卫 · 堵塞", labelEn: "Ensuite · clog" }, { tag: "issue", label: "疏通后", labelEn: "After clearing" }] }),
    T(-1,  "P4", "amy",   "completed", { guests: 2, guestName: "E. Fraser", photos: [{ tag: "routine", label: "客厅", labelEn: "Living room" }, { tag: "routine", label: "厨房", labelEn: "Kitchen" }, { tag: "routine", label: "浴室", labelEn: "Bathroom" }] }),
    T(-1,  "P3", "grace", "completed", { guests: 2, guestName: "Y. Lin",    photos: [{ tag: "routine", label: "全屋", labelEn: "Whole home" }] }),

    /* 今天 */
    T(0, "P1", "amy",   "in_progress", { b2b: true, guests: 4, guestName: "R. Chen",
      note: "客人 16:00 入住，优先主卧与厨房", noteEn: "Guest arrives 4 PM; prioritize master bedroom & kitchen",
      events: [{ type: "restock", body: "洗手液耗尽，需补充 2 瓶", bodyEn: "Hand soap out; need 2 refills", cost: 0, by: "陈阿美", photos: 0 }] }),
    T(0, "P5", "amy",   "pending",     { guests: 3, guestName: "B. Singh", nextCheckin: null,
      note: "明日无入住，可安排在下午", noteEn: "No arrival tomorrow; afternoon is fine" }),
    T(0, "P3", "grace", "offered",     { b2b: true, guests: 2, guestName: "M. Liu", assignNote: "您是该房源主要清洁人员" }),
    T(0, "P6", "grace", "pending",     { guests: 2, guestName: "C. Wang", nextCheckin: null }),

    /* 未来 */
    T(1, "P2", "amy",   "pending",  { guests: 4, guestName: "P. Martin" }),
    T(1, "P4", "amy",   "offered",  { guests: 2, guestName: "N. Silva", assignNote: "该房源为手动指派（未开启自动归属）" }),
    T(3, "P6", "grace", "pending",  { guests: 2, guestName: "T. Ito", changed: { fromOff: 1, toOff: 3 },
      note: "客人在 Hostfully 延长住宿，退房日变更", noteEn: "Guest extended the stay in Hostfully; checkout date moved" }),
    T(4, "P1", "amy",   "pending",  { b2b: true, guests: 5, guestName: "G. Adams" }),
    T(6, "P3", "grace", "pending",  { guests: 2, guestName: "W. Zhou" }),
    T(8, "P5", "amy",   "pending",  { guests: 4, guestName: "F. Dubois" }),
  ];

  /* ---------- 通知（清洁端 · 中文） ---------- */
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

  /* ---------- 管理端专用数据（英文） ---------- */
  const QUEUE = [
    { kind: "offer",   title: "Harbour Loft · Today (same-day check-in)", body: "Offered to primary cleaner Grace Liu · waiting 1h 12m", level: "serious" },
    { kind: "offer",   title: `Kits Beach House · ${fmtMDen(D(1))}`, body: "Auto-assign is off; manually offered to Amy Chen, awaiting accept", level: "warn" },
    { kind: "decline", title: "Reassignment log · Lakeside Cottage", body: `${fmtMDen(D(-2))}: primary declined → auto-reassigned to backup, admin notified (sample)`, level: "info" },
  ];

  const SYNC = {
    webhook: { ok: true, last: "9:41 AM", event: "New booking created · Lakeside Cottage (Hostfully webhook)" },
    runs: [
      { label: "Yesterday 9:00 PM fallback sync", result: "3 changes", ok: true },
      { label: "Today 6:00 AM fallback sync", result: "no changes", ok: true },
      { label: "Today 10:00 AM fallback sync", result: "1 change (Richmond Garden Suite rescheduled)", ok: true },
    ],
  };

  const AUDIT = [
    { off: 0,  time: "10:01", actor: "System",    action: `Sync: Richmond Garden Suite booking rescheduled; task moved ${fmtMDen(D(1))} → ${fmtMDen(D(3))}; Grace Liu notified` },
    { off: 0,  time: "09:41", actor: "System",    action: "Webhook: new booking (Lakeside Cottage); cleaning task created" },
    { off: 0,  time: "08:15", actor: "Amy Chen",  action: "Task status: Maple View Villa — Not started → In progress" },
    { off: -1, time: "18:36", actor: "Wen",       action: "Issue handled: Maple View Villa toilet clog accepted; CA$80 repair cost recorded" },
    { off: -1, time: "09:20", actor: "Wen",       action: "Access change: granted Grace Liu backup on Kits Beach House (later revoked)" },
    { off: -2, time: "14:02", actor: "Wen",       action: "Access info: Harbour Loft door code updated" },
    { off: -3, time: "21:00", actor: "System",    action: "Photo cleanup: 3 routine photos expired; hard-deleted and removed from the app" },
    { off: -16, time: "11:30", actor: "Wen",      action: "Rate change: Maple View Villa per-clean 280 → 300 CAD" },
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

  function confirmModal({ title, body, okText = "确认", cancelText = "再想想", danger = false, onOk }) {
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">${esc(cancelText)}</button>
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
  const cleanerNameEn = id => (CLEANERS[id] ? CLEANERS[id].nameEn : "Unassigned");

  global.CT = {
    TODAY, D, fmtMD, fmtYMD, fmtMDW, WEEK, esc,
    fmtMDen, fmtMDWen, t12,
    ICONS, STATUS, EVENT_TYPES, EVENT_TYPES_EN,
    CLEANERS, ADMIN_NAME, ADMIN_NAME_EN, PROPERTIES, prop, TASKS,
    NOTIFS, QUEUE, SYNC, AUDIT,
    toast, confirmModal, cleanerName, cleanerNameEn,
  };
})(window);
