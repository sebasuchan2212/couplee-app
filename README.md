# Couplee v5 - Screen Switch UI

Couplee v5 は、情報量を抑えて各画面を下部ナビで切り替える最新UI版です。

## 主な改善

- 6画面同時表示をやめ、1画面ずつ切り替える構成に変更
- 初回入力画面を3ステップ化
- 名前、記念日、関係フェーズをわかりやすく入力
- あなたとパートナーのアイコンに画像アップロード対応
- アップロード画像はホーム上部のアイコンに反映
- 既存の機能は維持
  - ホーム
  - 記念日
  - アルバム
  - お願い掲示板
  - 共有カレンダー
  - プライバシー / GPS ON/OFF

## Vercel設定

- Framework Preset: Other
- Build Command: 空欄
- Output Directory: `.`

## 構成

- `index.html`: 1ファイル完結アプリ
- `vercel.json`: キャッシュを残さない設定
- `README.md`: 説明

古い `app.js`、`styles.css`、`service-worker.js` が残っていても、この v5 は `index.html` だけで動きます。
