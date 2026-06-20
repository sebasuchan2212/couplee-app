# Couplee v6.3 Easy Link Inline版

## 目的

Vercel側で `app.js` や `styles.css` が古いまま表示されたり、Deployment Protectionにより外部JS/CSSが読めない場合でも、画面が確実に変わるようにした1ファイル完結版です。

## 変更点

- `index.html` にCSSとアプリ本体JSを内蔵
- `app.js` / `styles.css` の読み込み不要
- Supabase接続情報を初期値として内蔵
- `?reset=1` でCouplee/Supabase関連のローカル保存を初期化
- v6.2の「リンクを開いて名前を入れるだけ」連携導線を維持

## アップロードするファイル

GitHubに以下を上書きしてください。

- index.html
- vercel.json
- README.md
- supabase-schema.sql

既存の `app.js` と `styles.css` が残っていても、この版では使用しません。

## 確認URL

通常:

`https://couplee-app-git-main-sebasuchan0402-4737s-projects.vercel.app/`

古い表示が残る場合:

`https://couplee-app-git-main-sebasuchan0402-4737s-projects.vercel.app/?reset=1`
