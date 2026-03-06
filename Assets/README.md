# Assets — 共用美術資源庫

所有報告、網頁輸出的美術資源統一放在這裡。

## 目錄結構

```
Assets/
├── colors.json       # 色彩主題（品牌色、圖表色、狀態色）
├── css/
│   └── base.css      # 共用 CSS 變數 + 基礎樣式
├── fonts/            # 本地字型檔（.woff2、.ttf）
├── images/           # 參照圖片、Logo、背景圖
└── videos/           # GIF、MP4 動態素材
```

## 引用方式

### HTML 引用 CSS
```html
<!-- 從 Macro_Weekly/reports/YYYY-WXX/ 引用 -->
<link rel="stylesheet" href="../../../../Assets/css/base.css">

<!-- 從 Macro_Weekly/template/ 引用 -->
<link rel="stylesheet" href="../../Assets/css/base.css">
```

### Python 讀取色彩設定
```python
import json
from pathlib import Path

ASSETS = Path(__file__).parents[N] / "Assets"  # N = 到 AI_Agent 的層數
colors = json.loads((ASSETS / "colors.json").read_text())

primary = colors["brand"]["primary"]        # "#1A1A2E"
positive = colors["chart"]["positive"]      # "#26A69A"
series = colors["chart"]["series"]          # list of 8 colours
```

### 圖片引用
```html
<img src="../../../../Assets/images/logo.png" alt="Logo">
```

## 色彩分組

| 分組 | 用途 |
|------|------|
| `brand` | 主視覺、頁首、按鈕 |
| `chart` | Plotly / Chart.js 資料系列 |
| `text` | 文字層次 |
| `background` | 頁面、卡片、邊框 |
| `status` | 成功、警告、危險、資訊 |
