export const TEST_STORAGE_KEY = 'atlas-test-workspace-v1';
export function readWorkspace(storage) {
  const text = storage.getItem(TEST_STORAGE_KEY);
  if (!text) return { workspace: null, revision: 0 };
  try {
    const saved = JSON.parse(text);
    if (!Number.isInteger(saved.revision) || !Array.isArray(saved.workspace?.maps)) throw Error();
    return saved;
  } catch {
    throw Error('Saved test maps could not be read. Preserve browser data before resetting it.');
  }
}
export function writeWorkspace(storage, workspace, revision) {
  const current = readWorkspace(storage);
  if (current.revision !== revision) throw Error('Your test maps changed in another tab. Export your changes before reloading.');
  const next = { workspace, revision: revision + 1 };
  storage.setItem(TEST_STORAGE_KEY, JSON.stringify(next));
  return { revision: next.revision };
}
