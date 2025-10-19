import fs from 'fs/promises';
import path from 'path';

export interface ManifestEntry {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  assets?: string[];
  imports?: string[];
}

export type ViteManifest = Record<string, ManifestEntry>;

let cachedManifest: ViteManifest | null = null;
let manifestWarningLogged = false;

export interface ResolvedAssets {
  scripts: string[];
  styles: string[];
  preloads: string[];
  assets: string[];
}

const DEFAULT_MANIFEST_PATH = path.resolve(process.cwd(), 'dist', 'manifest.json');

export function clearManifestCache() {
  cachedManifest = null;
  manifestWarningLogged = false;
}

export async function getViteManifest(): Promise<ViteManifest> {
  if (cachedManifest) {
    return cachedManifest;
  }

  const manifestPath = resolveManifestPath();

  const raw = await fs.readFile(manifestPath, 'utf8');
  cachedManifest = JSON.parse(raw) as ViteManifest;
  manifestWarningLogged = false;
  return cachedManifest;
}

export async function resolveAssetsForEntries(entries: string[]): Promise<ResolvedAssets | null> {
  try {
    const manifest = await getViteManifest();
    if (!entries.length) {
      return createEmptyAssets();
    }

    const visited = new Set<string>();
    const scripts = new Set<string>();
    const styles = new Set<string>();
    const preloads = new Set<string>();
    const staticAssets = new Set<string>();

    const visit = (entryId: string, isRoot = false) => {
      if (visited.has(entryId)) return;
      visited.add(entryId);

      const entry = manifest[entryId];
      if (!entry) return;

      if (entry.file) {
        if (isRoot || entry.isEntry) {
          scripts.add(entry.file);
        } else {
          preloads.add(entry.file);
        }
      }

      entry.css?.forEach((cssPath) => styles.add(cssPath));
      entry.assets?.forEach((assetPath) => staticAssets.add(assetPath));

      entry.imports?.forEach((depId) => {
        visit(depId, false);
      });
    };

    entries.forEach((entryId) => visit(entryId, true));

    return {
      scripts: Array.from(scripts).map(ensureLeadingSlash),
      styles: Array.from(styles).map(ensureLeadingSlash),
      preloads: Array.from(preloads).map(ensureLeadingSlash),
      assets: Array.from(staticAssets).map(ensureLeadingSlash),
    };
  } catch (error) {
    if (!manifestWarningLogged) {
      console.warn('Unable to resolve Vite manifest assets:', error);
      manifestWarningLogged = true;
    }
    return null;
  }
}

function resolveManifestPath(): string {
  const overridePath = process.env.VITE_MANIFEST_PATH;
  if (overridePath) {
    const resolved = path.isAbsolute(overridePath)
      ? overridePath
      : path.resolve(process.cwd(), overridePath);
    return resolved;
  }
  return DEFAULT_MANIFEST_PATH;
}

function ensureLeadingSlash(assetPath: string): string {
  if (!assetPath.startsWith('/')) {
    return `/${assetPath.replace(/^\/+/, '')}`;
  }
  return assetPath;
}

function createEmptyAssets(): ResolvedAssets {
  return { scripts: [], styles: [], preloads: [], assets: [] };
}
