import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorldLineGraphJson } from '@bublys-org/world-line-graph';

// Storage root: configurable via env, default to .data/wlg under project root
const DATA_ROOT =
  process.env.WLG_DATA_DIR ||
  path.join(process.cwd(), '.data', 'wlg');

const CAS_DIR = path.join(DATA_ROOT, 'cas');
const GRAPH_DIR = path.join(DATA_ROOT, 'graphs');

// Ensure directories exist (called lazily)
let dirsReady = false;
async function ensureDirs(): Promise<void> {
  if (dirsReady) return;
  await fs.mkdir(CAS_DIR, { recursive: true });
  await fs.mkdir(GRAPH_DIR, { recursive: true });
  dirsReady = true;
}

/**
 * Sanitize an ID for use as a filename.
 * Replaces dangerous characters and prevents path traversal.
 */
function sanitize(name: string): string {
  // Remove path separators and parent-directory references
  return name
    .replace(/\.\./g, '_')
    .replace(/[/\\:*?"<>|]/g, '_');
}

// ---- CAS ----

export async function saveCasEntry(
  hash: string,
  data: unknown,
): Promise<void> {
  await ensureDirs();
  const filePath = path.join(CAS_DIR, `${sanitize(hash)}.json`);
  await fs.writeFile(filePath, JSON.stringify(data));
}

export async function loadCasEntry(
  hash: string,
): Promise<unknown | undefined> {
  try {
    const filePath = path.join(CAS_DIR, `${sanitize(hash)}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function hasCasEntry(hash: string): Promise<boolean> {
  try {
    const filePath = path.join(CAS_DIR, `${sanitize(hash)}.json`);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Given a list of hashes, return those that already exist on disk.
 */
export async function filterExistingHashes(
  hashes: string[],
): Promise<string[]> {
  const results = await Promise.all(
    hashes.map(async (h) => ((await hasCasEntry(h)) ? h : null)),
  );
  return results.filter((h): h is string => h !== null);
}

/**
 * Return all CAS hashes stored on disk.
 */
export async function listCasHashes(): Promise<string[]> {
  await ensureDirs();
  try {
    const files = await fs.readdir(CAS_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5)); // strip .json
  } catch {
    return [];
  }
}

// ---- Graph ----

export async function saveGraph(
  scopeId: string,
  graph: WorldLineGraphJson,
): Promise<void> {
  await ensureDirs();
  const filePath = path.join(GRAPH_DIR, `${sanitize(scopeId)}.json`);
  await fs.writeFile(filePath, JSON.stringify(graph));
}

export async function loadGraph(
  scopeId: string,
): Promise<WorldLineGraphJson | undefined> {
  try {
    const filePath = path.join(GRAPH_DIR, `${sanitize(scopeId)}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as WorldLineGraphJson;
  } catch {
    return undefined;
  }
}

export async function listGraphScopeIds(): Promise<string[]> {
  await ensureDirs();
  try {
    const files = await fs.readdir(GRAPH_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5)); // strip .json
  } catch {
    return [];
  }
}
