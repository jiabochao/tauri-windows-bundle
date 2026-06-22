import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resolveIconsDir,
  iconsDirLabel,
  resolveVariantSourcePath,
} from '../src/core/icons.js';
import { readMergedWindowsTauriConfig } from '../src/core/project-discovery.js';

describe('resolveIconsDir', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-test-'));
    fs.mkdirSync(path.join(projectRoot, 'src-tauri', 'icons'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('uses the directory implied by bundle.icon paths', () => {
    const customDir = path.join(projectRoot, 'src-tauri', 'icons', 'windows');
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(path.join(customDir, 'StoreLogo.png'), 'png');
    fs.writeFileSync(path.join(projectRoot, 'src-tauri', 'icons', 'StoreLogo.png'), 'mac');

    const result = resolveIconsDir(projectRoot, {
      bundle: {
        icon: ['icons/windows/32x32.png', 'icons/windows/icon.ico'],
      },
    });

    expect(result).toBe(customDir);
    expect(iconsDirLabel(result, projectRoot)).toBe('src-tauri/icons/windows');
  });

  it('supports arbitrary bundle.icon directories', () => {
    const customDir = path.join(projectRoot, 'src-tauri', 'brand', 'win-icons');
    fs.mkdirSync(customDir, { recursive: true });

    const result = resolveIconsDir(projectRoot, {
      bundle: {
        icon: ['brand/win-icons/StoreLogo.png', 'brand/win-icons/icon.ico'],
      },
    });

    expect(result).toBe(customDir);
    expect(iconsDirLabel(result, projectRoot)).toBe('src-tauri/brand/win-icons');
  });

  it('falls back to src-tauri/icons when bundle.icon is not set', () => {
    const defaultDir = path.join(projectRoot, 'src-tauri', 'icons');
    fs.writeFileSync(path.join(defaultDir, 'StoreLogo.png'), 'mac');

    expect(resolveIconsDir(projectRoot)).toBe(defaultDir);
    expect(iconsDirLabel(defaultDir, projectRoot)).toBe('src-tauri/icons');
  });

  it('does not infer a custom directory without bundle.icon', () => {
    const customDir = path.join(projectRoot, 'src-tauri', 'icons', 'windows');
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(path.join(customDir, 'Square150x150Logo.png'), 'win');

    expect(resolveIconsDir(projectRoot)).toBe(path.join(projectRoot, 'src-tauri', 'icons'));
  });
});

describe('readMergedWindowsTauriConfig', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-test-'));
    fs.mkdirSync(path.join(projectRoot, 'src-tauri'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('merges tauri.windows.conf.json over tauri.conf.json for icon paths', () => {
    fs.mkdirSync(path.join(projectRoot, 'src-tauri', 'icons', 'windows'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'src-tauri', 'tauri.conf.json'),
      JSON.stringify({
        bundle: {
          icon: ['icons/32x32.png', 'icons/icon.ico'],
        },
      })
    );
    fs.writeFileSync(
      path.join(projectRoot, 'src-tauri', 'tauri.windows.conf.json'),
      JSON.stringify({
        bundle: {
          icon: ['icons/windows/32x32.png', 'icons/windows/icon.ico'],
        },
      })
    );

    const merged = readMergedWindowsTauriConfig(projectRoot);
    expect(merged.bundle?.icon).toEqual(['icons/windows/32x32.png', 'icons/windows/icon.ico']);

    const iconsDir = resolveIconsDir(projectRoot, merged);
    expect(iconsDir).toBe(path.join(projectRoot, 'src-tauri', 'icons', 'windows'));
  });
});

describe('resolveVariantSourcePath', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tauri-icons-test-'));
    fs.mkdirSync(path.join(projectRoot, 'src-tauri', 'icons'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('prefers PNG paths from bundle.icon', () => {
    const customDir = path.join(projectRoot, 'src-tauri', 'icons', 'windows');
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(path.join(customDir, '128x128@2x.png'), 'hi-res');

    const config = {
      bundle: {
        icon: ['icons/windows/32x32.png', 'icons/windows/128x128@2x.png', 'icons/windows/icon.ico'],
      },
    };

    expect(resolveVariantSourcePath(projectRoot, config)).toBe(
      path.join(customDir, '128x128@2x.png')
    );
  });
});
