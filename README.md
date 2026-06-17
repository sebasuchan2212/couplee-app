# Couplee - Couples OS

2026年以降のグローバル展開を想定した、カップル向けWebアプリの完成版プロトタイプです。
GitHubにアップロードして、そのままVercel / GitHub Pagesで公開できます。

## 搭載機能

- 初回オンボーディング
  - ふたりの名前
  - 交際開始日
  - 次の記念日名
  - 関係フェーズ
  - 遠距離設定
- ホーム
  - 記念日カウントダウン
  - 今日の質問
  - 気分チェック
  - 連続記録
  - カップルレベル / ハートポイント
  - 直近予定
- 記念日
  - 次の記念日表示
  - ふたりの軌跡
  - マイルストーンバッジ
  - デート提案
- アルバム
  - 写真アップロード
  - 思い出カード
  - 日付・場所・キャプション管理
- お願い掲示板
  - お願い追加
  - 未対応 / 受付中 / 完了ステータス
  - 完了時のハートポイント付与
- 共有カレンダー
  - 予定追加
  - ToDo追加 / 完了切替
  - 直近予定表示
- プライバシー
  - 位置情報共有 ON/OFF
  - 常に共有 / 時間限定 / 緊急時のみ
  - 連携解除
  - データ書き出し
  - 全データ削除
- PWA対応
  - manifest.webmanifest
  - スマホのホーム画面追加に対応

## ローカルで開く方法

このアプリは静的ファイルだけで動きます。

```bash
# フォルダに移動
cd couplee-app

# 好きな静的サーバーで起動。例:
python3 -m http.server 3000
```

ブラウザで `http://localhost:3000` を開いてください。

## GitHubにアップロードする方法

```bash
git init
git add .
git commit -m "Initial Couplee app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/couplee-app.git
git push -u origin main
```

## Vercelで公開する方法

1. Vercelにログイン
2. `Add New Project`
3. GitHubの `couplee-app` を選択
4. Framework Preset は `Other`
5. Build Command は空欄
6. Output Directory も空欄または `.`
7. Deploy

## 本番化する場合の次フェーズ

現状はフロントエンド完結・localStorage保存です。
本番運用では以下を追加してください。

- Supabase / Firebase 認証
- パートナー招待リンク
- クラウドDB
- 写真ストレージ
- プッシュ通知
- 課金
- 多言語化
- E2EE / Field-level encryption
- Abuse report / safety flow
