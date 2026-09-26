import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("baseline includes the canonical SQL in dependency order", () => {
  const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replaceAll("\r\n", "\n");
  const migration = read("db/migrations/2026-09-26_multiplayer_baseline.sql");
  const access = read("db/profiles_access.sql");
  const components = [
    ["PROFILE ACCESS", access.slice(access.indexOf("grant usage on schema"))],
    ["PRESENCE", read("db/presence.sql")],
    ["MULTIPLAYER", read("db/multiplayer.sql").replace(/^begin;\n/m, "").replace(/^commit;\n/m, "")],
  ];
  let previous = -1;
  for (const [name, sql] of components) {
    const start = migration.indexOf(`-- BEGIN ${name}\n`);
    const end = migration.indexOf(`-- END ${name}`, start);
    assert.ok(start > previous, `${name} install order`);
    assert.equal(migration.slice(start + `-- BEGIN ${name}\n`.length, end).trim(), sql.trim());
    previous = end;
  }
});
