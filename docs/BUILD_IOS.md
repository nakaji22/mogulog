# iOSビルド手順書（Macなし / GitHub Actions）

ローカルにMacとXcodeが無くても、GitHub ActionsのmacOSランナーでiOSアプリをビルドできます。

## 0. 全体像

```
コードをGitHubへpush
  → Actions「test」ジョブ（Ubuntu）: 型チェック / Lint / 単体テスト
  → Actions「build-ios」ジョブ（macOS）: Expo Prebuild → CocoaPods → xcodebuild
  → （archiveモード時）署名 → IPA生成 → App Store Connectへアップロード → TestFlight
```

## 1. Appleアカウント不要の確認ビルド（最初はこれ）

1. このリポジトリをGitHubに作成し、コードをpushする
2. GitHubの **Actions** タブで「iOS Build」が自動実行される
3. `build_mode` は `simulator` 扱いになり、署名なしでシミュレータ向けビルドが成功すれば、プロジェクトがビルド可能な状態であることが確認できる

手動実行: Actions → iOS Build → Run workflow → build_mode=`simulator`

## 2. 署名付きビルドの準備（Apple Developer Program登録後）

### 2-1. App ID とプロファイルの作成

1. [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) で App ID を登録する
   - Bundle ID: `com.mogulog.app`（app.json の `ios.bundleIdentifier` と一致させる。変更する場合は両方を揃える）
2. **Certificates** で「Apple Distribution」証明書を作成する
   - CSR（証明書署名要求）はMacが無くても作成できる（OpenSSL: `openssl req -new -newkey rsa:2048 -nodes -keyout dist.key -out dist.csr`）。作成した証明書（.cer）と秘密鍵から .p12 を作る: `openssl pkcs12 -export -out distribution.p12 -inkey dist.key -in distribution.cer`
3. **Profiles** で「App Store Connect」用の Provisioning Profile を作成する
   - App ID: 上記、証明書: 上記、名前は任意（例: `MoguLog App Store`）。この名前を Secrets の `PROVISIONING_PROFILE_NAME` に登録する

### 2-2. App Store Connect APIキー

1. App Store Connect → ユーザーとアクセス → 統合（App Store Connect API）→ チームキーで「App Manager」以上のキーを発行
2. `.p8` ファイル、Key ID、Issuer ID を控える（.p8は再ダウンロード不可）

### 2-3. GitHub Secrets の登録

リポジトリの Settings → Secrets and variables → Actions に以下を登録する。**秘密情報をコードやREADMEに書かないこと。**

| Secret名 | 内容 |
|---|---|
| `APPLE_CERTIFICATE_P12_BASE64` | distribution.p12 を Base64 化した文字列（`base64 -i distribution.p12`） |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 のパスワード |
| `PROVISIONING_PROFILE_BASE64` | .mobileprovision を Base64 化した文字列 |
| `PROVISIONING_PROFILE_NAME` | プロファイル名（2-1で付けた名前） |
| `DEVELOPMENT_TEAM_ID` | Apple Developer の Team ID（10文字） |
| `KEYCHAIN_PASSWORD` | CI用キーチェーンの任意パスワード（使い捨てでよい） |
| `ASC_API_KEY_ID` | App Store Connect API の Key ID |
| `ASC_API_ISSUER_ID` | 同 Issuer ID |
| `ASC_API_KEY_P8_BASE64` | AuthKey_XXXX.p8 を Base64 化した文字列 |

### 2-4. 署名付きビルド＋アップロード

Actions → iOS Build → Run workflow で:
- build_mode = `archive`
- upload = チェック（TestFlightへ届けたい場合）

成功すると:
- Artifacts に IPA とビルドログが保存される
- upload時は App Store Connect にビルドが届き、処理完了後に TestFlight で選べるようになる

## 3. バージョンとビルド番号

公開前に `app.json` の `version`（例 1.0.0）と `ios.buildNumber` を上げる。再提出時は buildNumber が前回より大きい必要がある。

## 4. トラブルシューティング

| 症状 | 対処 |
|---|---|
| prebuild で失敗 | Actions のログで該当ステップを確認。`npx expo-doctor` の指摘（依存バージョン不整合）が多い |
| 署名エラー（No signing certificate） | .p12 のパスワードと Base64 の改行混入を確認。証明書が Apple Distribution か確認 |
| Profile が見つからない | `PROVISIONING_PROFILE_NAME` がポータル上の名前と完全一致しているか確認 |
| アップロードで Xcode バージョン不足 | Appleは提出時に最新のXcode/SDKを要求する。ランナーの Xcode を上げるか Expo SDK を更新する |
| ビルド番号の重複 | `ios.buildNumber` を上げて再実行 |

## 5. EAS Build（代替手段）

プロジェクトの AGENTS.md が推奨する Expo 公式のクラウドビルド（EAS）でも同じことができます（`eas build -p ios`, `eas submit`）。本プロジェクトの標準手順は要件に沿って GitHub Actions としていますが、署名管理を任せたい場合は EAS への移行も可能です。その場合も Apple Developer アカウントと App Store Connect のアプリ作成が別途必要です。
