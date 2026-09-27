import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUpstream, compareUpstream } from '../scripts/check-endpoints.js';

const readme =
  '| apps | https://apps.mcp.digitalocean.com/mcp | Apps |\n| docs | https://docs.mcp.digitalocean.com/mcp | Docs |';
const local =
  'var supportedServices = map[string]struct{}{\n "apps": {},\n "docs": {},\n}';
const known = {
  services: ['apps', 'docs'].map((key) => ({
    key,
    remote: { url: `https://${key}.mcp.digitalocean.com/mcp` },
    local: { service: key },
  })),
};
test('upstream parsing detects new/removed endpoints without rewriting the registry', () => {
  assert.deepEqual(compareUpstream(parseUpstream(readme, local), known), []);
  const before = JSON.stringify(known);
  const changed = parseUpstream(
    readme.replace('docs |', 'volumes |').replace('docs.mcp', 'volumes.mcp'),
    local,
  );
  const report = compareUpstream(changed, known);
  assert.equal(report.length, 2);
  assert.equal(JSON.stringify(known), before);
});
test('invalid upstream source fails closed instead of treating all services as removed', () => {
  assert.throws(() => parseUpstream('<html>network error</html>', local));
  assert.throws(() => parseUpstream(readme, 'invalid registry'));
  assert.throws(() => parseUpstream(readme + '\n' + readme, local));
  assert.throws(() =>
    parseUpstream(
      readme.replace('https://apps', 'https://user:secret@apps'),
      local,
    ),
  );
});
