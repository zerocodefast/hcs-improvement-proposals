#!/usr/bin/env node
/**
 * Post-sync docs link integrity gate.
 *
 * Fails when any markdown link exhibits a defect class that previously
 * shipped 404s on hol.org/docs (SEO audit 4, V7-03):
 *   1. relative `.md` links whose target only exists as `.mdx` (Docusaurus
 *      leaves them literal → `<target>.md/` → 404);
 *   2. wrong-parent relative links (`../routing/...` where the sibling lives
 *      at `./routing/...`);
 *   3. malformed `http://./...` hrefs (upstream autolinker damage — the
 *      sync's fixHcs27 repairs HCS-27's instances; this gate catches any
 *      other file regenerating the pattern);
 *   4. absolute `/docs/...md` links (`.md` suffix on an absolute doc path
 *      never resolves to a route).
 *
 * Links into docs/standards/** resolve only after sync-hiero-standards.js
 * has generated that gitignored tree, so this script MUST run post-sync
 * (it is part of the prebuild chain after the sync step).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = path.resolve(process.argv[2] ?? 'docs');

function* walkMarkdown(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkMarkdown(full);
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      yield full;
    }
  }
}

const violations = [];

function report(kind, file, detail) {
  violations.push({ kind, file: path.relative(process.cwd(), file), detail });
}

for (const file of walkMarkdown(DOCS_ROOT)) {
  const content = readFileSync(file, 'utf8');
  // Group 1 must exclude '#' so a trailing fragment never becomes part of
  // the resolved path.
  const linkRe = /\]\(([^)\s#]+)(#[^)\s]*)?\)/g;
  for (const match of content.matchAll(linkRe)) {
    const href = match[1];
    const fragment = (match[2] ?? '').slice(1) || null;
    const fragSuffix = match[2] ?? '';
    if (href.startsWith('mailto:')) continue;

    // Class 3: malformed http://./ autolinker damage.
    if (/^https?:\/\/\./.test(href)) {
      report('malformed-http-dot', file, href);
      continue;
    }
    if (/^https?:\/\//.test(href)) continue; // ordinary external link

    // Same-page anchors are always valid.
    if (href.startsWith('#')) continue;

    // Class 4: absolute doc paths must be route-form (no .md suffix).
    if (href.startsWith('/')) {
      if (/\.mdx?$/.test(href)) {
        report('absolute-md-suffix', file, href);
      }
      continue;
    }

    // Relative links: resolve against the linking file. Extensionless links
    // are Docusaurus doc-slug links — accept file.md / file.mdx /
    // dir/index.{md,mdx} resolutions.
    const target = path.normalize(path.join(path.dirname(file), href));
    const candidates = /\.(md|mdx)$/.test(target)
      ? [target]
      : [target, `${target}.md`, `${target}.mdx`,
         path.join(target, 'index.md'), path.join(target, 'index.mdx')];
    const resolved = candidates.find((c) => existsSync(c));
    if (resolved) {
      // Fragment target must match a generated heading anchor or explicit id
      // in the resolved document (Docusaurus slugify: lowercase, strip
      // non-word chars, spaces to dashes).
      if (fragment) {
        const doc = readFileSync(resolved, 'utf8');
        const slugify = (t) =>
          t.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        const anchors = new Set([
          ...[...doc.matchAll(/\{#([^}]+)\}/g)].map((m) => m[1]),
          ...[...doc.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slugify(m[1])),
          ...[...doc.matchAll(/id="([^"]+)"/g)].map((m) => m[1]),
        ]);
        if (!anchors.has(fragment)) {
          report('fragment-target-missing', file, `${href}${fragSuffix}`);
        }
      }
      continue;
    }

    // Class 1: .md link whose target exists only as .mdx.
    if (/\.md$/.test(target) && existsSync(target.replace(/\.md$/, '.mdx'))) {
      report('md-target-is-mdx', file, href);
      continue;
    }

    // Class 2: wrong-parent relative links — a `../X/...` whose target
    // exists when the leading `../` is treated as `./` (the link author
    // meant the same directory).
    if (href.startsWith('../')) {
      const stripped = href.slice(3);
      const sameDir = path.normalize(path.join(path.dirname(file), stripped));
      const sameDirCandidates = /\.(md|mdx)$/.test(sameDir)
        ? [sameDir]
        : [sameDir, `${sameDir}.md`, `${sameDir}.mdx`,
           path.join(sameDir, 'index.md'), path.join(sameDir, 'index.mdx')];
      if (sameDirCandidates.some((c) => existsSync(c))) {
        report('wrong-parent-relative', file, `${href} (exists as ./${stripped})`);
        continue;
      }
    }

    report('target-missing', file, href);
  }
}

if (violations.length > 0) {
  console.error(`docs link integrity: ${violations.length} violation(s)`);
  for (const v of violations) {
    console.error(`  [${v.kind}] ${v.file}: ${v.detail}`);
  }
  process.exit(1);
}
console.log('docs link integrity: OK');
