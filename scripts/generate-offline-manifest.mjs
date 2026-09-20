import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile() && entry.name !== 'offline-manifest.json') files.push(path);
  }
  return files;
}

const paths = (await listFiles(root)).sort();
const hash = createHash('sha256');
for (const path of paths) {
  hash.update(relative(root, path).split(sep).join('/'));
  hash.update(await readFile(path));
}
const manifest = {
  build: hash.digest('hex').slice(0, 20),
  files: paths.map(path => `/${relative(root, path).split(sep).join('/')}`),
};
if (!manifest.files.includes('/index.html') || !manifest.files.includes('/sql-wasm.wasm')) {
  throw new Error('O build não contém os arquivos essenciais para o modo offline.');
}
await writeFile(join(root, 'offline-manifest.json'), JSON.stringify(manifest));
console.log(`Manifesto offline: ${manifest.files.length} arquivos (${manifest.build}).`);
