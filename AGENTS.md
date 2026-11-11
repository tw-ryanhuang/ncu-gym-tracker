# 維護規則

平鎮與中大兩個專案的共用統計邏輯須同步更新、測試並部署：
- https://github.com/tw-ryanhuang/pingzhen-gym-tracker
- https://github.com/tw-ryanhuang/ncu-gym-tracker

共用規則位於 src/readings.js（兩個專案保持相同內容）；修改統計採用值、有效採樣條件、歷史分組、推薦或複查規則時，請同步檢查兩館。保留各館獨立來源、營業時間、Worker 名稱、D1 綁定及資料。勿使用另一館資料庫。

原始 count/status/fetched_at 不可被複查或校正覆寫。統計透過有效值投影採用成功正整數複查，一個原始 slot 只計一次；歷史 detail 也須適用。CSV 保留原始與有效值。同步執行 npm run check 和 npm test。
