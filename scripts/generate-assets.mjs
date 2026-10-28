// アイコン等の画像アセットをSVGから生成する。
// PNGをリポジトリに直接置かず、ビルド前に生成することで、テキストのみの
// スナップショット配布でも扱えるようにしている。
// 実行: npm run generate-assets （sharp が必要）
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'assets', 'icon.svg'));
const outDir = join(root, 'assets', 'images');
mkdirSync(outDir, { recursive: true });

await sharp(svg, { density: 300 }).resize(1024, 1024).png().toFile(join(outDir, 'icon.png'));
console.log('generated assets/images/icon.png');
