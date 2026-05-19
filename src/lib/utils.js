export function cap(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

// Title → URL slug. Lowercases, strips combining diacritic marks (Mn category
// after NFKD), collapses any other non-alphanum runs into a single dash, and
// trims leading/trailing dashes.
export function slugify(s) {
  return (s || '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Map a content path (e.g. "blog/hello-world", "pages/about", "pages/index")
// to the public-site URL. Mirrors lib/Index.php — `pages/*` is flat at the
// site root, `pages/index` is the homepage, everything else keeps its folder.
export function publicUrl(path) {
  const p = (path || '').replace(/^\/+/, '');
  if (!p) return '/';
  if (p === 'pages/index') return '/';
  if (p.startsWith('pages/')) return '/' + p.slice('pages/'.length);
  return '/' + p;
}

// Whether a media file should be rendered as an image preview. Mirrors
// MediaService::IMAGE_EXTS on the PHP side — keep them in sync.
export function isImageFile(file) {
  const name = typeof file === 'string' ? file : (file?.name || '');
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(name);
}

// Uppercased extension from a filename, e.g. "report.pdf" → "PDF".
export function extLabel(name) {
  const m = /\.([^.]+)$/.exec(name || '');
  return m ? m[1].toUpperCase() : 'FILE';
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}
