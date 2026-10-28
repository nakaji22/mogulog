# もぐログ（MoguLog）

写真で記録する、**完全無料**のiOS向け食事管理アプリ。
広告なし・サブスクリプションなし・アプリ内課金なし・アカウント登録不要。記録はすべて端末内に保存されます。

## 特徴

- 📷 写真撮影／ライブラリ選択から食事を記録（料理の候補提示＋量の補正方式。詳細は下記「正直な仕様」）
- 🍱 日本食品標準成分表の代表値をもとにした内蔵食品データベース（120品目超）と料理テンプレート
- 🎯 年齢・身長・体重・活動レベルから推奨摂取カロリーを算出（Mifflin-St Jeor式、極端な制限を推奨しない安全下限つき）
- 📅 カレンダー形式の食事履歴、日別・週別・月別集計
- 📊 7日/30日のカロリー推移、PFCバランス、体重グラフ、ルールベースのアドバイス
- 💾 SQLiteによる端末内永続化、CSVエクスポート、JSONバックアップ／復元、全データ削除
- 🌙 ダークモード対応、日本語UI、VoiceOver配慮

## 正直な仕様（写真解析について）

本アプリは外部の有料AI APIを使わないため、**写真から料理を自動判定する学習モデルは搭載していません**。
写真を撮ると、料理テンプレートと利用履歴に基づく「候補」を提示し、利用者が選んで量を調整する方式です。
数値はすべて推定値であり、アプリ内でもその旨を明示しています。設計の根拠は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

## 開発

前提: Node.js 20以上。Macは不要です（iOSビルドはGitHub Actionsで実行）。

```bash
npm install               # 依存関係のインストール
npm run generate-assets   # アイコン画像をSVGから生成
npm run typecheck         # 型チェック
npm run lint              # Lint
npm test                  # 単体テスト（node:test + tsx）
npm run start             # Expo開発サーバー（実機確認は開発ビルド/TestFlight経由）
```

## iOSビルド（Macなし）

GitHub Actions の macOS ランナーでビルドします。手順は [docs/BUILD_IOS.md](docs/BUILD_IOS.md)。
App Store公開の手順は [docs/APP_STORE.md](docs/APP_STORE.md)、プライバシーポリシーは [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)。

## 技術構成

React Native + TypeScript / Expo SDK 58 / Expo Router / expo-sqlite / Zustand / react-native-svg

## フォルダ構成

- `src/app/` — 画面（Expo Router）
- `src/lib/` — ドメインロジック（栄養計算、目標計算、食品DB、解析候補、DB、バックアップ）
- `src/components/` — 共通UIとグラフ
- `docs/` — 設計書・ビルド手順・公開手順・プライバシーポリシー
- `.github/workflows/ios.yml` — iOSクラウドビルド
