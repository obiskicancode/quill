import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** Every .tsx under a source directory, as repo-relative paths. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sources(path));
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

const read = (path: string) => readFileSync(join(root, path), 'utf8');
const where = (path: string) => relative(root, path);

/**
 * The `{...}` object passed to a `useConfirm()` binding in this file. The
 * binding name is read back so a renamed hook still resolves its own calls.
 */
function confirmCalls(source: string): string[] {
  const asks = [...source.matchAll(/const\s+(\w+)\s*=\s*useConfirm\(\)/g)].map(
    (m) => m[1],
  );
  const calls: string[] = [];
  for (const name of asks) {
    const re = new RegExp(
      String.raw`(?<![.\w])${name}\s*\(\s*\{[\s\S]*?\n\s*\}\s*\)`,
      'g',
    );
    for (const match of source.matchAll(re)) calls.push(match[0]);
  }
  return calls;
}

describe('useConfirm wiring', () => {
  const all = [...sources('components'), ...sources('app')];
  const callers = all.filter((p) => confirmCalls(read(p)).length > 0);

  it('1. Every confirm call is bound to the hook, never to the global', () => {
    assert.ok(
      callers.length > 0,
      'this test is vacuous if nothing asks for confirmation',
    );
    for (const path of all) {
      const source = read(path);
      assert.ok(
        !/window\.confirm\s*\(/.test(source),
        `${where(path)} calls the native dialog directly`,
      );
      // The failure this guards: a call site keeps `confirm({...})` after
      // losing its `const confirm = useConfirm()` and silently hits
      // window.confirm, which answers true to any dismissal.
      for (const call of source.matchAll(
        /(?<![.\w])confirm\s*\(\s*[\x27`\{]/g,
      )) {
        assert.match(
          source,
          /const\s+confirm\s*=\s*useConfirm\(\)/,
          `${where(path)} calls confirm() with no hook binding: ${call[0].trim()}`,
        );
      }
    }
  });

  it('2. Only the admin shell subtree asks, and it provides once', () => {
    for (const path of callers) {
      assert.ok(
        path.startsWith('components/admin/'),
        `${where(path)} uses useConfirm outside the shell that provides it`,
      );
    }
    // The dialog's own doc comment names the tag, so match a rendered pair.
    assert.deepEqual(
      all.filter((p) =>
        /<ConfirmProvider>[\s\S]*?<\/ConfirmProvider>/.test(read(p)),
      ),
      ['components/admin/AdminShell.tsx'],
    );
    assert.match(
      read('components/admin/AdminShell.tsx'),
      /<ConfirmProvider>[\s\S]*?\{children\}[\s\S]*?<\/ConfirmProvider>/,
      'the provider must wrap the page content, not sit beside it',
    );
  });

  it('3. Consumers import the hook from the shared dialog', () => {
    for (const path of callers) {
      assert.match(
        read(path),
        /from '@\/components\/ui\/confirm'/,
        `${where(path)} must import useConfirm from components/ui/confirm`,
      );
    }
  });

  it('4. A destructive ask names its own button', () => {
    // Enter on a destructive dialog must not fire a button labelled "Confirm".
    for (const path of callers) {
      for (const call of confirmCalls(read(path))) {
        if (!/tone:\s*'danger'/.test(call)) continue;
        assert.match(
          call,
          /confirmLabel:/,
          `${where(path)} has a danger ask with the default label`,
        );
      }
    }
  });
});
