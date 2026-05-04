// Integration tests for the per-user session/auth machinery: anonymous user
// creation on first cookie-less request, ownership scoping, pair-code merge,
// and tool-level user isolation.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';

describe('Auth & per-user sessions', () => {
  let tmpDir: string;
  let app: Express;
  let server: http.Server;
  let baseUrl: string;
  let getDb: typeof import('../../server/db.js').getDb;
  let initDb: typeof import('../../server/db.js').initDb;
  let closeDb: typeof import('../../server/db.js').closeDb;
  let executeTool: typeof import('../../server/llm/tools.js').executeTool;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quak-auth-'));
    process.env.STORAGE_DIR = tmpDir;
    process.env.NODE_ENV = 'test';

    const dbMod = await import('../../server/db.ts');
    const appMod = await import('../../server/app.ts');
    const toolsMod = await import('../../server/llm/tools.ts');
    initDb = dbMod.initDb;
    getDb = dbMod.getDb;
    closeDb = dbMod.closeDb;
    executeTool = toolsMod.executeTool;
    app = appMod.default;

    await initDb();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    server.close();
    await closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── helpers ──────────────────────────────────────────────────────────────
  async function call(jar: { cookie: string }, method: string, url: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.cookie) headers['Cookie'] = jar.cookie;
    const r = await fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) {
      // Pull just the quak_session=... part for our jar.
      const m = setCookie.match(/quak_session=[^;]+/);
      if (m) jar.cookie = m[0];
    }
    const text = await r.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: r.status, body: json as Record<string, unknown> | null, raw: text };
  }
  function newJar() { return { cookie: '' }; }

  // ── tests ────────────────────────────────────────────────────────────────
  it('first cookie-less request mints an anonymous user + session', async () => {
    const jar = newJar();
    const me = await call(jar, 'GET', '/api/me');
    expect(me.status).toBe(200);
    expect(typeof (me.body as { id: string }).id).toBe('string');
    expect(jar.cookie).toMatch(/^quak_session=/);
  });

  it('two separate jars get distinct user ids', async () => {
    const a = newJar();
    const b = newJar();
    const ma = await call(a, 'GET', '/api/me');
    const mb = await call(b, 'GET', '/api/me');
    expect(ma.body!.id).not.toBe(mb.body!.id);
  });

  it('GET /api/sheets returns only the current user\'s sheets', async () => {
    const a = newJar();
    const b = newJar();
    await call(a, 'GET', '/api/me');
    await call(b, 'GET', '/api/me');
    await call(a, 'POST', '/api/sheets', { name: 'A-only', columns: [{ name: 'X', cellType: 'text' }] });
    await call(b, 'POST', '/api/sheets', { name: 'B-only', columns: [{ name: 'X', cellType: 'text' }] });

    const listA = await call(a, 'GET', '/api/sheets');
    const listB = await call(b, 'GET', '/api/sheets');
    const namesA = (listA.body as Array<{ name: string }>).map((s) => s.name);
    const namesB = (listB.body as Array<{ name: string }>).map((s) => s.name);
    expect(namesA).toContain('A-only');
    expect(namesA).not.toContain('B-only');
    expect(namesB).toContain('B-only');
    expect(namesB).not.toContain('A-only');
  });

  it('GET /api/sheets/:id 404s when accessed by a different user', async () => {
    const a = newJar();
    const b = newJar();
    await call(a, 'GET', '/api/me');
    await call(b, 'GET', '/api/me');
    const created = await call(a, 'POST', '/api/sheets', { name: 'private', columns: [{ name: 'X', cellType: 'text' }] });
    const sheetId = (created.body as { id: string }).id;

    const okA = await call(a, 'GET', `/api/sheets/${sheetId}`);
    expect(okA.status).toBe(200);

    const denyB = await call(b, 'GET', `/api/sheets/${sheetId}`);
    expect(denyB.status).toBe(404);
  });

  it('pair-code: redeem on second device merges sheets into the inviter\'s account', async () => {
    const a = newJar();
    const b = newJar();
    await call(a, 'GET', '/api/me');
    await call(b, 'GET', '/api/me');
    // A creates a sheet
    await call(a, 'POST', '/api/sheets', { name: 'shared-after-pair', columns: [{ name: 'X', cellType: 'text' }] });
    // A generates a pair code
    const code = await call(a, 'POST', '/api/auth/pair-code');
    expect(code.status).toBe(200);
    const codeStr = (code.body as { code: string }).code;
    expect(codeStr).toMatch(/^\d{6}$/);

    // B redeems
    const redeem = await call(b, 'POST', '/api/auth/pair', { code: codeStr });
    expect(redeem.status).toBe(200);

    // B should now see A's sheet
    const list = await call(b, 'GET', '/api/sheets');
    const names = (list.body as Array<{ name: string }>).map((s) => s.name);
    expect(names).toContain('shared-after-pair');
  });

  it('pair-code is single-use', async () => {
    const a = newJar();
    const b = newJar();
    const c = newJar();
    await call(a, 'GET', '/api/me');
    await call(b, 'GET', '/api/me');
    await call(c, 'GET', '/api/me');
    const code = await call(a, 'POST', '/api/auth/pair-code');
    const codeStr = (code.body as { code: string }).code;
    const first = await call(b, 'POST', '/api/auth/pair', { code: codeStr });
    expect(first.status).toBe(200);
    const second = await call(c, 'POST', '/api/auth/pair', { code: codeStr });
    expect(second.status).toBe(409);
  });

  it('pair-code rejects redemption by the inviter themselves', async () => {
    const a = newJar();
    await call(a, 'GET', '/api/me');
    const code = await call(a, 'POST', '/api/auth/pair-code');
    const codeStr = (code.body as { code: string }).code;
    const r = await call(a, 'POST', '/api/auth/pair', { code: codeStr });
    expect(r.status).toBe(400);
  });

  it('pair-code rejects malformed codes', async () => {
    const a = newJar();
    await call(a, 'GET', '/api/me');
    const r = await call(a, 'POST', '/api/auth/pair', { code: 'abcdef' });
    expect(r.status).toBe(400);
  });

  it('settings: PUT /api/me/settings persists openrouter key and hasApiKey reflects it', async () => {
    const a = newJar();
    await call(a, 'GET', '/api/me');
    const set = await call(a, 'PUT', '/api/me/settings', { openrouterApiKey: 'sk-or-test-123', defaultModel: 'openai/gpt-4o' });
    expect(set.status).toBe(200);
    const me = await call(a, 'GET', '/api/me');
    expect((me.body as { hasApiKey: boolean }).hasApiKey).toBe(true);
    expect((me.body as { defaultModel: string }).defaultModel).toBe('openai/gpt-4o');
  });

  it('AI tool list_sheets is scoped to the userId passed to executeTool', async () => {
    // Two distinct user_ids, each owns one sheet.
    const u1 = 'tool-user-1';
    const u2 = 'tool-user-2';
    const db = getDb();
    await db.run(`INSERT INTO __quak_users (id) VALUES ('${u1}'), ('${u2}')`);

    const r1 = await executeTool('create_sheet', { name: 'u1-only', columns: [{ name: 'X', cellType: 'text' }] }, u1);
    const r2 = await executeTool('create_sheet', { name: 'u2-only', columns: [{ name: 'X', cellType: 'text' }] }, u2);
    expect(r1.error).toBeUndefined();
    expect(r2.error).toBeUndefined();

    const list1 = await executeTool('list_sheets', {}, u1);
    const names1 = (list1.data as Array<{ name: string }>).map((s) => s.name);
    expect(names1).toContain('u1-only');
    expect(names1).not.toContain('u2-only');

    // u1 cannot get_sheet for u2's sheet
    const u2SheetId = (r2.data as { id: string }).id;
    const denied = await executeTool('get_sheet', { sheetId: u2SheetId }, u1);
    expect(denied.error).toMatch(/Sheet not found/);
  });

  it('logout invalidates the current session token', async () => {
    const jar = newJar();
    const me1 = await call(jar, 'GET', '/api/me');
    const userIdBefore = (me1.body as { id: string }).id;
    const logout = await call(jar, 'POST', '/api/auth/logout');
    expect(logout.status).toBe(200);
    // After logout, a request creates a fresh anonymous user.
    const me2 = await call(jar, 'GET', '/api/me');
    expect((me2.body as { id: string }).id).not.toBe(userIdBefore);
  });
});
