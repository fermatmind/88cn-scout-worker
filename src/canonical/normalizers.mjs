export function normalizeProjectName(name) {
  if (typeof name !== 'string') return '';
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[''".,()[\]{}]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\b(ai|inc|llc|ltd|labs|app|hq)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDomain(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function normalizeGithubRepoUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== 'github.com') return null;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return `github.com/${owner.toLowerCase()}/${repo.toLowerCase().replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

export function candidateSlug(name) {
  return normalizeProjectName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
