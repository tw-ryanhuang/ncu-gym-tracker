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

## 全局逐段更新與異常人潮隔離

每個完整半小時結束並保留 10 分鐘緩衝，且至少 5 筆有效採樣後，即加入全局；比較平常與未來推薦只使用今天以前的資料。中大不足完整半小時的末段仍不納入。

共用唯讀投影位於 `src/history.js`；不修改 D1、原始採樣及 CSV。各館獨立的 `src/statistics-config.js` 可設定 `automatic: false` 關閉自動隔離，或以日期設定 `{mode: 'exclude', reason: '免費活動'}` / `{mode: 'include', reason: '已確認正常'}`；刪除日期設定即可恢復自動判定。不得以 CLOSED_DATES 標記仍營業的活動日。

自動判定使用受檢日期之前、同星期同半小時至少 6 個有效日期；偏差須大於 max(3×1.4826×MAD, 15人, 中位數的50%)。單段異常暫不納入一般日統計；同方向連續至少4段且異常占可判定時段至少一半，則隔離整日。隨當日完成時段增加會重新評估，未達整日條件時正常段恢復納入；人工納入可覆蓋自動隔離，休館仍排除。

全局顯示實際採用日期數、歷史不足時段數及排除理由。異常人潮不代表活動或故障；新專案歷史不足6個同星期日期時不自動排除。既有的至少3日顯示門檻保持不變。

修改後同步執行兩館 `npm run check`、`npm test`。回滾可復原本次程式更新；原始紀錄始終保留。
