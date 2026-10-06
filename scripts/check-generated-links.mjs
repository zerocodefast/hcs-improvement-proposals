#!/usr/bin/env node
/**
 * Generated-site link integrity gate (V8-08).
 *
 * The source-level checker (check-docs-links.mjs) is an early warning; it
 * cannot see root-relative routes, pure same-page fragments, JSX/MDX Link
 * components, generated sidebar links, or Docusaurus heading-id slug
 * generation. This gate parses the FINAL generated HTML in build/ with a
 * real HTML parser and validates every internal href:
 *
 *   1. each link resolves to an emitted route (via the route manifest
 *      implied by build/ directory structure), and
 *   2. each fragment target exists in the destination page's final DOM IDs
 *      (heading anchors, explicit ids, Docusaurus duplicate-heading
 *      suffixes), and
 *   3. same-page fragments resolve against the linking page's own DOM ids.
 *
 * Skipped by design (not silently valid): external URLs, mailto, custom
 * hcs:// protocol examples inside code fences (the parser never sees them —
 * fenced code is rendered as text, not anchors), downloadable assets and
 * machine documents are checked for existence, not route shape.
 *
 * Mutation testing: feed it a build with a known-broken link and it must
 * fail (see tests/mutated-gate-results.json in the proof dir).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const BUILD_ROOT = path.resolve(process.argv[2] ?? 'build');
const DOCS_ROOT = path.resolve(process.argv[3] ?? 'docs');

if (!existsSync(BUILD_ROOT)) {
  console.error(`generated-site gate: build root ${BUILD_ROOT} does not exist`);
  process.exit(1);
}

/**
 * Cross-package navigation: the docs site links root-relative routes owned
 * by the portal (points-portal). The docs build cannot emit those routes,
 * so the gate validates them against this reviewed allowlist instead of the
 * route manifest. Every entry was verified live against hol.org; entries
 * must be re-verified before adding.
 */
const SITE_ROUTE_ALLOWLIST = new Set(
  JSON.parse(
    readFileSync(
      path.resolve(path.dirname(process.argv[1] ?? '.'), 'site-route-allowlist.json'),
      'utf8',
    ),
  ).routes.map((r) => (r.endsWith('/') || r === '/' ? r : `${r}/`)),
);

/** Collect every emitted route: an index.html path minus the filename. */
function* walkHtml(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkHtml(full);
    } else if (entry === 'index.html') {
      yield full;
    }
  }
}

const routes = new Set(); // '/docs/libraries/x/' page paths
const pageFiles = new Map(); // route -> index.html path
for (const file of walkHtml(BUILD_ROOT)) {
  const rel = path.relative(BUILD_ROOT, file);
  const route = `/${rel.split(path.sep).slice(0, -1).join('/')}/`;
  routes.add(route);
  pageFiles.set(route, file);
}

/** Docusaurus heading-id slug: lowercase, strip non-word/space/hyphen,
 * spaces to hyphens; consecutive duplicates get -1, -2 suffixes. */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-');
}

/** Extract all DOM ids from built HTML — headings get Docusaurus anchor
 * spans with ids; explicit ids are preserved verbatim. */
function extractIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

const violations = [];

/** Resolve an absolute-or-site-relative href to a route in the manifest. */
function routeExists(resolvedPath) {
  const withSlash = resolvedPath.endsWith('/') ? resolvedPath : `${resolvedPath}/`;
  return routes.has(resolvedPath) || routes.has(withSlash);
}

for (const [route, file] of pageFiles) {
  const html = readFileSync(file, 'utf8');
  const pageIds = extractIds(html);
  // Anchor text list for heading slug derivation (Docusaurus emits
  // <h2 class="anchor..."> with id already applied, so pageIds covers it).

  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g)) {
    const href = match[1];
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:\/\//.test(href)) continue; // external: separate posture
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('/')) continue; // hcs:// etc.

    let rawPath = href;
    let fragment = null;
    const hashIndex = href.indexOf('#');
    if (hashIndex >= 0) {
      fragment = href.slice(hashIndex + 1);
      rawPath = href.slice(0, hashIndex);
    }

    // Pure same-page fragment: resolve against this page's own ids.
    if (rawPath === '' ) {
      if (fragment && !pageIds.has(fragment)) {
        violations.push({
          route,
          href,
          kind: 'same-page-fragment-missing',
          detail: `#${fragment} not in page ids`,
        });
      }
      continue;
    }

    // Root-relative site link: resolve against the build root.
    let targetRoute;
    if (rawPath.startsWith('/')) {
      targetRoute = rawPath.endsWith('/') || rawPath.endsWith('.html')
        ? rawPath
        : `${rawPath}/`;
    } else {
      const baseDir = route.endsWith('/') ? route : `${route}/`;
      targetRoute = new URL(rawPath, `https://docs.local${baseDir}`).pathname;
    }

    if (!routeExists(targetRoute)) {
      // Asset or machine document: check the built file exists on disk.
      const asFile = path.join(BUILD_ROOT, rawPath);
      if (existsSync(asFile) && statSync(asFile).isFile()) continue;
      // Cross-package portal route: reviewed allowlist, not the docs manifest.
      if (rawPath.startsWith('/') && SITE_ROUTE_ALLOWLIST.has(rawPath.endsWith('/') ? rawPath : `${rawPath}/`)) {
        continue;
      }
      violations.push({ route, href, kind: 'route-missing', detail: targetRoute });
      continue;
    }

    if (fragment) {
      const targetFile = pageFiles.get(
        targetRoute.endsWith('/') ? targetRoute : `${targetRoute}/`,
      );
      if (targetFile) {
        const ids = extractIds(readFileSync(targetFile, 'utf8'));
        if (!ids.has(fragment) && !ids.has(fragment.replace(/^-+|-+$/g, ''))) {
          violations.push({
            route,
            href,
            kind: 'fragment-target-missing',
            detail: `#${fragment} not found in ${targetRoute}`,
          });
        }
      }
    }
  }
}

// Also validate: every emitted route reachable check is the sitemap's job;
// this gate is href-direction only.

if (violations.length > 0) {
  console.error(`generated-site gate: ${violations.length} violation(s)`);
  for (const v of violations.slice(0, 50)) {
    console.error(`  [${v.kind}] ${v.route} -> ${v.href} :: ${v.detail ?? ''}`);
  }
  if (violations.length > 50) {
    console.error(`  ... and ${violations.length - 50} more`);
  }
  process.exit(1);
}
console.log(`generated-site gate: OK (${routes.size} routes checked)`);
