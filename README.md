# 中大健身人潮指南

從中央大學體育室官網所嵌入的公開 Google 試算表讀取「重訓室」人數，每 5 分鐘儲存至 Cloudflare D1。

## 行為

- 今日 `/`：最近人數、完整一小時建議、資料健康、最近 20 筆、今日走勢與開閉館觀察。
- 全局 `/overview`：最近 56 天、同星期、半小時的歷史比較。
- `/export.csv`：匯出原始紀錄。
- Web App：standalone manifest、圖示與離線快照；離線畫面明確標示非即時資料。
- 排程僅占用一個帳號 Cron 額度，每 5 分鐘觸發；程式在非採樣時段直接結束，不請求來源、不寫入資料庫。
- 台灣時間 09:00–20:50，營業採樣至 20:45；08:50、08:55、20:50、20:55、21:05 額外觀察。
- 來源 `N/A` 存為 `count=NULL,status=unavailable`，不推定休館、不當成 0，不納入統計。
- 0 人保留原始值，20 秒後複查僅補 metadata；不扣除、不校正原始人數。
- 半小時須至少 5 筆正常紀錄；同星期至少 3 個有效日期才顯示比較。一小時推薦要求同日相鄰完整半小時，不含當天未完成資料。
- 20:30–20:50 不足半小時，不納入比較。Google 公開發布資料可能延遲，抓取成功不保證來源數字剛更新。

## Cloudflare 設定

1. 建立獨立 D1 資料庫 **ncu-gym**，將 ID 寫入 `wrangler.jsonc` 的 `database_id`。不能使用平鎮資料庫。
2. Workers & Pages 連接本 GitHub 專案，Worker 名稱 **ncu-gym-tracker**，正式分支 `main`。
3. Build command 留空、Deploy command `npm run deploy`、Root `/`。可先關閉 Preview builds。
4. 推送觸發部署：檢查與測試通過後，套用只新增資料表/索引的 D1 migrations，再部署 Worker 與 cron。
5. 綁定名稱必須是 `DB`。首次正式部署後等待營業排程，確認有 `ok` 或 `unavailable` 紀錄。

尚未填入獨立 D1 ID 前，部署程式會明確停止。沒有登入密碼需求。若設定休館日，可在 Worker runtime 設 `CLOSED_DATES=2026-12-25,2027-01-01`（僅示範格式，依實際公告設定）。

## 開發

```sh
npm install
npm run check
npm test
npm run deploy
```

修改文案/內容：`src/ui/pages.js`；樣式：`src/ui/styles.js`；圖表/推薦：`src/ui/client.js`；來源讀取/D1：`src/worker.js`；Web App：`src/pwa.js`。時段目前在 collector 與 UI 明確設定，營業時間變更時須同步更新與測試。

官方來源： https://pe.ncu.edu.tw/about/66.html
開放時間： https://pe.ncu.edu.tw/about/29.html
