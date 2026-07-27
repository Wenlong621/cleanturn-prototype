# CleanTurn · PMS 清洁排程与房务回报系统（PRD + 交互原型）

短租民宿运营的内部清洁管理系统方案：从 Hostfully（PMS）自动同步订房数据生成清洁任务，清洁人员在手机月历上只看到被授权房源，拍照回报、记录事件流水账；照片按类型分级保留、到期自动删除。

**在线预览**：<https://wenlong621.github.io/cleanturn-prototype/>

| 页面 | 说明 |
|---|---|
| [index.html](index.html) | 入口页 |
| [cleaner.html](cleaner.html) | 清洁人员端原型（手机模拟，可切换人员演示权限隔离） |
| [admin.html](admin.html) | 管理员工作台原型（今日排程 / 待处理队列 / 异常 / 照片库 / 房源 / 审计） |
| [prd.html](prd.html) / [PRD.md](PRD.md) | 产品需求文档 v1.0 |

## 原型可以演示什么

- 今日任务与"当日入住"（back-to-back）置顶提醒
- 任务接受 / 拒绝 → 自动转派次要清洁人员并通知管理员
- 开始清洁 → 大按钮完成 + 二次确认（防误触）
- 异常回报与**事件流水账**（叙述 + 照片 + 费用）
- 进入信息（门锁 / Wi-Fi / 停车）只读查看
- 月历视图、订单改期横幅、通知中心
- 管理端 KPI、照片分级保留倒计时与打包下载、Hostfully 同步健康、审计日志

## 说明

- 纯静态 HTML/CSS/JS，无后端；交互为本地模拟，数据相对"今天"动态生成。
- 所有房源、人员、密码、订单、价格均为**虚构演示数据**。
- 技术方案建议（正式版）：Next.js + Supabase（Postgres RLS / Auth / Storage / Edge Functions / pg_cron），详见 PRD 第 8 节。

## 本地运行

```bash
python -m http.server 8123
# 打开 http://localhost:8123
```
