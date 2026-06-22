import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TauriConfig } from '../types.js';

const DEFAULT_ICONS_DIR = 'icons';

const VARIANT_SOURCE_BASENAMES = [
  'icon.png',
  'Square310x310Logo.png',
  '128x128@2x.png',
  '128x128.png',
  '32x32.png',
] as const;

function normalizeIconPath(iconPath: string): string {
  return iconPath.replace(/\\/g, '/');
}

function resolveIconPath(srcTauriDir: string, iconPath: string): string {
  return path.resolve(srcTauriDir, normalizeIconPath(iconPath));
}

function commonPathPrefix(paths: string[]): string | null {
  if (paths.length === 0) return null;

  const segments = paths.map((p) => path.normalize(p).split(path.sep));
  const minLen = Math.min(...segments.map((s) => s.length));
  const common: string[] = [];

  for (let i = 0; i < minLen; i++) {
    const seg = segments[0][i];
    if (segments.every((s) => s[i] === seg)) {
      common.push(seg);
    } else {
      break;
    }
  }

  return common.length > 0 ? common.join(path.sep) : null;
}

/**
 * Derive the icons directory from `bundle.icon` in the merged Tauri config.
 * All configured icon paths must live under the same directory (or share a common parent).
 */
function iconsDirFromBundleIcon(srcTauriDir: string, iconPaths: string[]): string | null {
  if (iconPaths.length === 0) return null;

  const parentDirs = iconPaths.map((iconPath) =>
    path.dirname(resolveIconPath(srcTauriDir, iconPath))
  );

  const uniqueDirs = [...new Set(parentDirs.map((d) => path.normalize(d)))];
  if (uniqueDirs.length === 1 && fs.existsSync(uniqueDirs[0])) {
    return uniqueDirs[0];
  }

  const common = commonPathPrefix(uniqueDirs);
  if (common && fs.existsSync(common)) {
    return common;
  }

  return null;
}

/**
 * Resolve which icons directory to use for Windows / MSIX assets.
 *
 * Uses the merged Tauri config (`tauri.conf.json` + `tauri.windows.conf.json`) passed
 * by the caller. When `bundle.icon` is set, its paths determine the directory; otherwise
 * falls back to `src-tauri/icons/`.
 */
export function resolveIconsDir(projectRoot: string, tauriConfig?: TauriConfig): string {
  const srcTauriDir = path.join(projectRoot, 'src-tauri');
  const defaultDir = path.join(srcTauriDir, DEFAULT_ICONS_DIR);

  const iconPaths = tauriConfig?.bundle?.icon;
  if (iconPaths?.length) {
    const fromConfig = iconsDirFromBundleIcon(srcTauriDir, iconPaths);
    if (fromConfig) return fromConfig;
  }

  return defaultDir;
}

export function iconsDirLabel(iconsDir: string, projectRoot: string): string {
  const srcTauriDir = path.join(projectRoot, 'src-tauri');
  const relative = path.relative(srcTauriDir, iconsDir).replace(/\\/g, '/');
  return relative ? `src-tauri/${relative}` : 'src-tauri/icons';
}

/**
 * Pick the highest-resolution PNG listed in `bundle.icon`, then fall back to
 * well-known filenames inside the resolved icons directory.
 */
export function resolveVariantSourcePath(
  projectRoot: string,
  tauriConfig?: TauriConfig
): string | null {
  const srcTauriDir = path.join(projectRoot, 'src-tauri');
  const iconPaths = tauriConfig?.bundle?.icon ?? [];

  for (const basename of VARIANT_SOURCE_BASENAMES) {
    const configured = iconPaths.find(
      (iconPath) => path.basename(normalizeIconPath(iconPath)) === basename
    );
    if (configured) {
      const resolved = resolveIconPath(srcTauriDir, configured);
      if (fs.existsSync(resolved)) return resolved;
    }
  }

  const iconsDir = resolveIconsDir(projectRoot, tauriConfig);
  for (const basename of VARIANT_SOURCE_BASENAMES) {
    const candidate = path.join(iconsDir, basename);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}
