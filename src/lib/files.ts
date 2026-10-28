import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 撮影/選択した写真をアプリのドキュメント領域へ複製し、永続的なURIを返す。
 * 一時URIのままだとOSに削除されることがあるため必ずコピーする。
 */
export async function persistPhoto(sourceUri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic'].includes(ext) ? ext : 'jpg';
  const dest = new File(dir, `meal-${Date.now()}.${safeExt}`);
  const src = new File(sourceUri);
  src.copy(dest);
  return dest.uri;
}

export async function deletePhotoIfLocal(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists && uri.includes('photos')) file.delete();
  } catch {
    // 削除失敗は致命的ではないため無視する
  }
}

/** テキストファイルをキャッシュに書き出して共有シートを開く（CSV/JSONエクスポート用） */
export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('この端末では共有機能が利用できません');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

/** バックアップJSONを選んで読み込む。キャンセル時は null */
export async function pickBackupFile(): Promise<string | null> {
  const result = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (result.canceled) return null;
  const picked = Array.isArray(result.result) ? result.result[0] : result.result;
  return picked.text();
}
