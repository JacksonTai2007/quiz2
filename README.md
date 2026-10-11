# 2026全澳中学生资讯科技知识问答比赛高中组模拟题 · Quiz2

線上網址：https://jacksontai2007.github.io/quiz2/

沿用 [JacksonTai 原題庫](https://jacksontai2007.github.io/quiz/) 的紙墨介面與八種模式。零建置、純靜態網站。

## 題目與判分

- 10 份 Google 表單，共 424 道知識題，包含原表單之間的重複題。
- 預設從最新的 IT2026（22 題）開始，可切換全部題庫或原表單分組。
- 單選、多選、填空；歧義或有缺失的題目只供研讀，不自動判分，也不混入模擬考試。
- 答案為人工推導及題幹公開提示，並非 Google 表單的官方評分答案。2025 第74題原圖未取得。
- 每題保存原表單、原題號、答案說明和來源；考前速記包含常見錯題提醒。

## 功能

順序練習、隨機練習、智能複習、錯題本、收藏、限時模擬考試、背題、瀏覽搜尋。
進度只保存在本機 localStorage；Quiz2 使用獨立的 `quiz2:` namespace，不覆寫原外交題庫的紀錄。
可設定字號、選項亂序、自動下一題、深淺色與減少動態。

## 本地預覽

```powershell
python -m http.server 8987 --bind 127.0.0.1
```

開啟 http://127.0.0.1:8987/ 。不要直接使用 `file://`，瀏覽器可能禁止讀取 JSON。

## 部署

GitHub Pages 從 `main` 分支根目錄發布。不需要 Node、打包或外部 API。

## 結構

`index.html` / `quiz.css` / `quiz.js`：界面與練習引擎。  
`data/index.json`：題庫清單；其餘 JSON：總題库與原表單分組。  
`quick-notes.html`：考前速記。`DESIGN.md`：原站對齊設計規範。  
`vendor/gsap/`：從原站沿用的自託管 GSAP 和外掛。

動畫依 GSAP Standard "no charge" license 使用，授權條款：https://gsap.com/standard-license/ 。
來源表單連結與逐題 provenance 存於 `data/*.json`。沒有提交或修改任何原表單。
