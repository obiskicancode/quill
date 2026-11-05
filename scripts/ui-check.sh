#!/usr/bin/env bash
# Design-token and shadcn adoption guard rails.
#
# Every check is zero-tolerance: the script fails if a single match is found.
# Anything that legitimately breaks a rule is listed in an explicit allowlist
# below, with the reason, so new violations cannot hide among old ones.
#
#   pnpm ui:check
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

TARGETS=(components app)
FAILED=0

# --check <name> <pattern> [allowed-pattern] ------------------------------------
check() {
  local name="$1" pattern="$2" allow="${3:-}" matches
  if [[ -n "$allow" ]]; then
    matches=$(grep -rnP --include=*.tsx "$pattern" "${TARGETS[@]}" | grep -vP "$allow" || true)
  else
    matches=$(grep -rnP --include=*.tsx "$pattern" "${TARGETS[@]}" || true)
  fi
  if [[ -z "$matches" ]]; then
    printf '  ok    %s\n' "$name"
  else
    printf '  FAIL  %s\n' "$name"
    printf '%s\n' "$matches" | sed 's/^/          /'
    FAILED=$((FAILED + 1))
  fi
}

echo "ui-check: radius, type and elevation ramps"

# A bare `rounded` is Tailwind's own default, not one of the project radii.
check 'bare rounded (use rounded-control / rounded-card)' \
  '(?<![\w-])rounded(?![\w-])'

# rounded-sm/md/lg/xl are re-aliased onto --radius in app/globals.css, so the
# shadcn primitives may use them; the names above lg are not on that ramp.
check 'radius outside the aliased ramp (rounded-xl and up, or arbitrary)' \
  'rounded-(2xl|3xl|full-|\[)' \
  'rounded-\[inherit\]|rounded-\[min\('

# The project type ramp is display/h2/h3/figure/body/small/caption/micro.
check 'default text scale (use text-caption/small/body/figure/h3)' \
  'text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])'
check 'arbitrary font size' 'text-\[\d'

# Elevation lives in --shadow-raised / --shadow-float / --shadow-xs.
check 'default shadow scale (use shadow-raised / shadow-float / shadow-xs)' \
  'shadow-(sm|md|lg|xl|2xl)(?![\w-])'
check 'bare shadow' '(?<![\w-])shadow(?![\w-])'
# Allowed arbitrary shadows, one reason each:
#   ReservationsTable  1px hairline on sticky columns; no token is an edge
#   Carousel           white ring around a dot sitting on a photograph
check 'arbitrary shadow outside the allowlist' 'shadow-\[' \
  'shadow-\[0\.0625rem_0_0_0_var\(--color-line\)\]|shadow-\[0_0_0_0\.0625rem_rgb\(0_0_0/0\.25\)\]|shadow-\[--shadow'

echo
echo "ui-check: colour literals"

check 'arbitrary colour utility' '(bg|text|border|ring|fill|stroke|from|to|via|decoration|outline)-\[(#|rgb\(|hsl\(|oklch\()'
check 'inline colour style' 'style=\{\{[^}]*[Cc]olor'

echo
echo "ui-check: token semantics"

# --color-accent is shadcn's subtle hover surface, never the brand amber.
check 'brand amber spelled bg-brand (use bg-primary)' 'bg-brand(?![\w-])'
check 'brand alias border-brand (use border-primary)' 'border-brand(?![\w/-])'

# Status fills carry their own -foreground token; white is not it.
check 'text-white on a status fill (use *-foreground)' \
  'bg-(success|destructive|warning|primary)[^"]*text-white'
check 'text-paper on a solid brand fill (use text-primary-foreground)' \
  'bg-primary [^"]*text-paper'

# Removing the default outline must always pair with a visible focus treatment.
check 'focus:outline-none outside the primitives' 'focus:outline-none' \
  'components/ui/'

echo
echo "ui-check: dead variants"

# The .dark block stays wired for a future theme; no component ships a dark surface.
check 'dark: variant utility' '(^|[\s"'"'"'`])dark:[a-z]'

echo
echo "ui-check: merge engine wiring"

python3 - <<'PY'
import re, sys

css = open('app/globals.css').read()
# --text-<name> and --text-<name>--line-height both exist; only the stem is a utility.
ramp = {m for m in re.findall(r'--text-([a-z0-9-]+?)(?:--[\w-]+)?\s*:', css)}
utils = open('lib/utils.ts').read()
block = re.search(r'const TYPE_RAMP = \[(.*?)\]', utils, re.S)
registered = set(re.findall(r"'([a-z0-9-]+)'", block.group(1))) if block else set()

missing = sorted(ramp - registered)
extra = sorted(registered - ramp)
if missing:
    print('  FAIL  lib/utils.ts TYPE_RAMP is missing: %s' % ', '.join(missing))
    print('        text-<name> would be read as a colour and delete its neighbour')
    sys.exit(1)
if extra:
    print('  FAIL  lib/utils.ts registers names with no --text-* token: %s' % ', '.join(extra))
    sys.exit(1)
print('  ok    every --text-* token is registered as a font size in lib/utils.ts')
PY
[ $? -eq 0 ] || FAILED=$((FAILED + 1))

echo
echo "ui-check: class-string literals and undefined tokens"

python3 - <<'PY'
import glob, re, sys

css = open('app/globals.css').read()
defined = set(re.findall(r'--color-([a-z0-9-]+):', css))

COLOR_PREFIX = r'(?:bg|text|border|ring|fill|stroke|decoration|shadow|from|via|to|accent|caret|outline|divide)'
token_re = re.compile(r'\b%s-([a-z][a-z0-9-]*?)(?=[\s"\'`/:])' % COLOR_PREFIX)
# Values that share the colour namespace but come from Tailwind itself.
framework = {'transparent', 'current', 'inherit', 'white', 'black', 'none',
             'linear', 'gradient', 'radial', 'conic', 'initial', 'unset'}
gradient_re = re.compile(r'^(?:linear|radial|conic|repeating)-(?:to|from|via)-')
looks_like_token = re.compile(
    r'^(paper|ink|line|brand|surface|chart|sidebar|popover|card|background|'
    r'foreground|muted|accent|primary|secondary|destructive|success|warning|'
    r'departures|overlay|whatsapp|input|ring)')

# Every literal class string in the app: className="..." and cn()/template args.
class_str_re = re.compile(
    r'className=(?:"([^"]*)"|\{`([^`]*)`|\{cn\(([^;]*?)\)\}|\{\'([^\']*)\'\})',
    re.S)

problems = {}
for path in glob.glob('components/**/*.tsx', recursive=True) + \
            glob.glob('app/**/*.tsx', recursive=True):
    src = open(path).read()
    for m in class_str_re.finditer(src):
        chunk = ''.join(x or '' for x in m.groups())
        for hexcol in re.findall(r'#[0-9a-fA-F]{3,8}\b', chunk):
            key = ('hex colour in a class string', path)
            problems.setdefault(key, set()).add(hexcol)
    for token in set(token_re.findall(src)):
        if token in framework or gradient_re.match(token):
            continue
        if looks_like_token.match(token) and token not in defined:
            problems.setdefault(('undefined colour token', path), set()).add(token)

if problems:
    for (kind, path), values in sorted(problems.items()):
        print('  FAIL  %s: %s -> %s' % (kind, path, ' '.join(sorted(values))))
    sys.exit(1)
print('  ok    class strings carry no colour literals and every colour')
print('        utility resolves to a token in app/globals.css')
PY
[ $? -eq 0 ] || FAILED=$((FAILED + 1))

echo
echo "ui-check: consolidation guards"

# The native dialog blocks the main thread, cannot be styled, and approves a
# destructive action on a bare Enter. components/ui/Confirm.tsx owns this now,
# and it can keep the dialog open while the action runs.
check 'native confirm dialog (use useConfirm())' \
  '(^|[^.\w])confirm\(\s*[\x27\x60"]|window\.confirm\('

# Banner is deleted in favour of Alert variant x size. Comments still say the
# word, so match the element rather than the letter.
check 'removed <Banner> primitive (use Alert variant + size)' '<Banner[\s/>]'

# The hero bar and the sticky rail are the same component now
# (components/stay/StayPicker.tsx), so the dates, guests and the commit rule are
# written once. A second rail copy drifts on the next change to any of them.
check 'removed <StaySelector> (use <StayPicker variant="rail">)' \
  '<StaySelector[\s/>]'

# The underline colour belongs to TextLink. The two header nav links are the
# exception: they are <Link>s that keep the header's own 0.625rem underline
# offset, which TextLink does not express.
check 'decoration-brand outside TextLink' 'decoration-brand' \
  'components/ui/text-link\.tsx|components/Header\.tsx'

# Amounts are spelled by lib/format. A symbol spliced in front of a raw number
# is a second spelling, and it disagrees with the first the moment the grouping
# or the decimals move.
check 'hand-spliced naira glyph (use formatMinor / formatNaira)' '₦\{'

# An inset note is Alert size="panel". The two allowlisted rows keep the bare
# recipe because they hold controls: Alert's default role="alert" would announce
# a guest count or an extra-bed switch on every render.
check 'note-panel recipe outside Alert' 'rounded-control bg-paper p-4' \
  'components/checkout/DetailsStep\.tsx|components/room-detail/BookingCard\.tsx'

# The `sm` breakpoint is 390px and two nowrap buttons side by side want about
# 400px, so switching a column to a row without letting it wrap puts the page
# into horizontal scroll on a small phone. Allowed: the two dialog footers,
# whose short labels sit inside their own max-width, and the admin tree, which
# takes this rule when its own pass lands.
check 'sm:flex-row without flex-wrap' '^(?!.*flex-wrap).*sm:flex-row' \
  'components/admin/|components/ui/dialog\.tsx|components/ui/alert-dialog\.tsx'

python3 - <<'PY'
import glob, sys

# Date and money formatting lives in two files. Anything else that constructs a
# formatter is a third locale choice, and the three disagree across zones.
ALLOW = {'lib/format.ts', 'lib/dates.ts'}
DIRS = ('app', 'components', 'lib', 'hooks', 'providers', 'constants', 'schemas')
hits = []
for d in DIRS:
    for ext in ('ts', 'tsx'):
        for path in glob.glob(f'{d}/**/*.{ext}', recursive=True):
            if path in ALLOW:
                continue
            for n, line in enumerate(open(path, encoding='utf-8'), 1):
                if 'new Intl.' in line:
                    hits.append(f'{path}:{n}')
if hits:
    print('  FAIL  Intl formatter constructed outside lib/format + lib/dates:')
    for h in hits:
        print('          %s' % h)
    sys.exit(1)
print('  ok    every Intl formatter comes from lib/format or lib/dates')
PY
[ $? -eq 0 ] || FAILED=$((FAILED + 1))

python3 - <<'PY'
import pathlib, re, sys


def open_tag_end(text, i):
    """Where the tag starting at i closes: its '>' index, or the '/' of a
    self-close. Attributes are skipped, so a render={<h2 />} prop is not read as
    a child element."""
    depth = quotes = 0
    while i < len(text):
        c = text[i]
        if quotes:
            if c == quotes:
                quotes = 0
        elif c in '"\'':
            quotes = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        elif c == '>' and depth == 0:
            return i - 1 if text[i - 1] == '/' else i
        i += 1
    return None


# CardTitle renders a div. A heading placed inside it is a div around a heading,
# which is the shape that lets a card title silently stop being one; the
# primitive takes render={<h2 />} instead.
CARD = re.compile(r'<CardTitle\b')
HEAD = re.compile(r'<h[1-6]\b')
root = pathlib.Path('.')
hits = []
for path in list(root.glob('components/**/*.tsx')) + list(root.glob('app/**/*.tsx')):
    text = path.read_text(encoding='utf-8')
    for m in CARD.finditer(text):
        close = open_tag_end(text, m.end())
        if close is None:
            continue
        body = text[close + 1: text.find('</CardTitle', close)]
        if '<CardAction' in body:
            body = body[: body.index('<CardAction')]
        if HEAD.search(body):
            hits.append(f'{path}:{text[: m.start()].count(chr(10)) + 1}')
if hits:
    print('  FAIL  heading nested inside <CardTitle> (use render={<h2 />}):')
    for h in hits:
        print('          %s' % h)
    sys.exit(1)
print('  ok    every CardTitle is the heading itself, not its wrapper')
PY
[ $? -eq 0 ] || FAILED=$((FAILED + 1))

echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "ui-check: all checks passed"
  exit 0
fi
echo "ui-check: $FAILED check(s) failed"
exit 1
