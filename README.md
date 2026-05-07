# 工廠庫存管理系統

## 技術棧
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React + Vite + Tailwind CSS
- **同時啟動**: concurrently

## 三個角色入口

| 角色 | URL | 說明 |
|------|-----|------|
| 老闆後台 | `/dashboard` | 需登入（admin / admin123） |
| 工人登記 | `/input` | 無需登入，直接操作 |
| 品牌設計師 | `/brand/:token` | 老闆產生專屬連結後點入 |

---

## 啟動步驟

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立資料庫與種子資料

```bash
npm run seed
```

這會建立 SQLite 資料庫並填入以下種子資料：
- **Pen N**（筆蓋系列）- 訂單 3,000 件
- **名片盒**（鋁合金名片盒）- 訂單 2,000 件
- **踩踩獸**（花生組）- 訂單 5,000 件
- **刮痧板**（#316/#304 不鏽鋼）- 訂單 5,000 件

### 3. 啟動開發伺服器

```bash
npm run dev
```

- **前端**：http://localhost:5173
- **後端 API**：http://localhost:3001

---

## 環境變數（.env）

```env
PORT=3001
DB_PATH=./data/inventory.db
JWT_SECRET=factory_inventory_secret_2024
ADMIN_USER=admin
ADMIN_PASS=admin123
```

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 老闆登入 |
| GET  | `/api/products` | 所有產品 |
| POST | `/api/products` | 新增產品（需 JWT） |
| PUT  | `/api/products/:id` | 更新產品（需 JWT） |
| GET  | `/api/products/:id/parts` | 產品零件與加工站 |
| POST | `/api/parts` | 新增零件（需 JWT） |
| POST | `/api/parts/:id/skus` | 新增 SKU（需 JWT） |
| POST | `/api/parts/:id/stages` | 新增加工站（需 JWT） |
| GET  | `/api/receive-logs` | 進出貨記錄（支援 ?product_id= &date= &part_id=） |
| POST | `/api/receive-logs` | 登記進出貨（自動更新庫存） |
| GET  | `/api/alerts` | 低庫存警示（?threshold=200） |
| GET  | `/api/export/csv/:product_id` | 匯出 CSV（需 JWT） |
| POST | `/api/designer-tokens` | 產生設計師連結（需 JWT） |
| GET  | `/api/designer-tokens` | 查看所有設計師連結（需 JWT） |
| GET  | `/api/brand/:token` | 設計師唯讀資料 |
| GET  | `/api/packing-items` | 包裝副件 |
| POST | `/api/packing-items` | 新增包裝副件（需 JWT） |
| PUT  | `/api/packing-items/:id` | 更新包裝副件（需 JWT） |

---

## 功能說明

### 老闆後台 `/dashboard`
- **庫存總覽**：各零件庫存、出貨量、達成率
- **加工流程站**：各零件加工廠管理
- **SKU 顏色庫存**：各 SKU 進出貨明細
- **不良率圖表**：BarChart 視覺化
- **訂單達成率**：PieChart + 預計完成日期設定
- **包裝副件**：副件庫存管理
- **進出貨記錄**：完整記錄 + 日期篩選 + CSV 匯出
- **設定**：新增產品/零件/加工站、設計師連結管理

### 工人介面 `/input`
- **4 步驟流程**：選動作 → 選產品/零件/SKU → 數字鍵盤輸入 → 確認送出
- 完成後可「相同零件繼續」或「全新登記」
- 顯示今日自己的登記紀錄

### 品牌設計師 `/brand/:token`
- 只顯示被指派的產品
- 整體狀態時間軸（等待中/送加工廠/加工中/包裝中/完成）
- 各零件狀態 + SKU 顏色進度
- 品質異常警示（不顯示數字，只顯示有異常/正常）
- 預計完成時間

---

## 加工廠列表
黑豬鋁、家佑、阿奇、廠內、雷射、小林、良浩、阿勗、拋台李、至威、永勝、豪成、勗成
