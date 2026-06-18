# Couplee v6 Supabase Sync

Couplee v6は、Supabaseで相手と本当に同期できるカップルアプリ版です。

## v6でできること

- メールアドレスとパスワードでログイン
- 自分のプロフィール作成
- 名前設定
- 画像アイコンアップロード
- カップルルーム作成
- 招待コード発行
- 相手が招待コードで参加
- 今日の質問を相手と共有
- ふたりの回答を同期
- 記念日カウントダウン
- 関係フェーズ設定
- アルバム同期
- 写真付き思い出追加
- お願い掲示板同期
- 未対応 / 受付中 / 完了ステータス同期
- 共有カレンダー同期
- ToDo同期
- プライバシー / GPS共有設定同期
- データ書き出し
- ログアウト
- 連携解除

## 重要

コメットさん福井のSupabaseとは分けて、Couplee専用のSupabaseプロジェクトを作成してください。

推奨プロジェクト名：

```text
couplee-app-db
```

## セットアップ手順

### 1. Supabaseで新規プロジェクトを作成

Supabaseにログインし、新規プロジェクトを作成します。

### 2. SQL Editorでschemaを実行

このZIPに入っている以下のファイルを開きます。

```text
supabase-schema.sql
```

中身をすべてコピーして、SupabaseのSQL Editorで実行してください。

### 3. Authenticationの設定

SupabaseのAuthenticationで、Emailログインを有効にしてください。

開発中は、確認メールが面倒な場合、Supabase側のAuth設定でメール確認をOFFにするとテストしやすいです。

### 4. API情報を取得

SupabaseのProject Settings → APIから以下をコピーします。

```text
Project URL
anon public key
```

### 5. Vercel / GitHubにアップロード

GitHubの `sebasuchan2212/couplee-app` に以下を上書きしてください。

```text
index.html
styles.css
app.js
vercel.json
README.md
supabase-schema.sql
```

Vercelが自動デプロイします。

### 6. アプリ画面でSupabase情報を入力

初回表示で、Project URLとanon keyを入力してください。

その後、メールアドレスとパスワードで登録・ログインします。

## 相手と連携する流れ

### 片方が作成する側

1. アカウント登録
2. プロフィール設定
3. 「カップルルームを作成」
4. 招待コードをコピー
5. LINEなどで相手へ送る

### 相手が参加する側

1. 同じアプリURLを開く
2. アカウント登録
3. プロフィール設定
4. 「相手の招待コードで参加」
5. 招待コードを入力

これで、お願い掲示板、アルバム、予定、ToDo、今日の質問が同期されます。

## 注意点

v6では画像アイコンとアルバム画像をBase64に圧縮してDBに保存しています。
小規模テストでは簡単ですが、本番運用ではSupabase Storageに移行するのが理想です。

## 次の改善候補

- Supabase Storage対応
- Web Push通知
- 位置情報の実座標共有
- 既読・未読
- チャット
- AI質問生成
- Conflict Replay
- Mental Load Ledger
- 課金機能
- 多言語化
- E2EE / Field-level encryption
