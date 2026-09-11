import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Use an already-installed Playwright; no application dependency is required.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.AUDIT_URL || 'http://127.0.0.1:4178';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = resolve('frontend/coverage/qa-p2');
mkdirSync(output, { recursive: true });
const baseline = process.env.AUDIT_BASE;
const cssFiles = ['styles', 'professional-shell', 'professional-pages', 'professional-management', 'professional-public', 'landing-page'];
const oldCss = baseline && cssFiles.map(name => execFileSync('git', ['show', `${baseline}:frontend/src/${name}.css`], { encoding: 'utf8' })).join('\n');
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const theme of ['light', 'dark']) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addInitScript(theme => {
        localStorage.setItem('agendai-theme', theme);
        localStorage.setItem('tcc_agendamento_token', 'local-audit-fixture');
      }, theme);
      // All API calls are intercepted: never connect to a database or production.
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
          assert.equal(route.request().method(), 'GET');
          const body = url.pathname === '/api/auth/me' ? { usuario: { id: 1, nome: 'Pessoa QA' } }
            : url.pathname === '/api/negocio' ? { negocio: { id: 1, nome: 'Negócio QA', slug_publico: 'qa' } }
            : { agendamentos: [], profissionais: [], servicos: [], clientes: [] };
          return route.fulfill({ json: body });
        }
        if (url.origin !== origin) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const path of ['/', '/login', '/cadastro', '/dashboard']) {
        await page.goto(`${origin}${path}`);
        await page.locator(path === '/' ? '.landing-page' : path === '/dashboard' ? '.topbar-user' : '.auth-panel').waitFor();
        if (baseline) {
          await page.evaluate(() => document.querySelectorAll('style[data-vite-dev-id]').forEach(s => s.remove()));
          await page.addStyleTag({ content: oldCss });
          await page.locator('.topbar-user').evaluateAll(buttons => buttons.forEach(b => b.removeAttribute('aria-label')));
        }
        // Real Tab navigation: collect each focus stop once, including both logos.
        const visited = new Set();
        for (let step = 0; step < 65; step++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(230); // Finish the existing focus transitions before measuring.
          const item = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const style = getComputedStyle(el);
            const rgba = value => {
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 1;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
              return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v);
            };
            const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
            const surface = node => {
              if (!node) return [255, 255, 255];
              const c = rgba(getComputedStyle(node).backgroundColor);
              return blend(c, surface(node.parentElement));
            };
            let ring = el, rs = style;
            if (rs.outlineStyle === 'none' && rs.boxShadow === 'none' && el.parentElement) {
              ring = el.parentElement; rs = getComputedStyle(ring);
            }
            const outline = rs.outlineStyle !== 'none' && parseFloat(rs.outlineWidth) > 0;
            const color = outline ? rs.outlineColor : rs.boxShadow.match(/(?:rgba?\([^)]*\)|color\([^)]*\))/)?.[0];
            const bg = surface(outline && parseFloat(rs.outlineOffset) < 0 ? ring : ring.parentElement);
            const fg = color ? rgba(color) : null;
            const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
            const a = fg && luminance(blend(fg, bg)), b = luminance(bg);
            return {
              key: [...document.querySelectorAll('*')].indexOf(el),
              tag: el.tagName, class: el.className,
              label: el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.type,
              focusVisible: el.matches(':focus-visible'), color, alpha: fg?.[3], background: bg,
              ratio: fg ? (Math.max(a, b) + .05) / (Math.min(a, b) + .05) : null,
            };
          });
          if (!item) continue;
          if (visited.has(item.key)) break;
          visited.add(item.key);
          results.push({ theme, viewport, path, ...item });
          if (!baseline) {
            assert(item.focusVisible, `Missing :focus-visible ${path} ${item.label}`);
            assert(item.ratio >= 3, `Contrast ${item.ratio}: ${theme} ${path} ${item.label}`);
            assert.equal(item.alpha, 1, `Translucent indicator: ${item.label}`);
          }
          if (String(item.class).includes('topbar-user')) {
            const profile = page.locator('.topbar-user');
            if (!baseline) assert.equal(await profile.getAttribute('aria-label'), 'Menu do perfil');
            await page.screenshot({ path: `${output}/${baseline ? 'before' : 'after'}-profile-${theme}-${viewport.width}.png` });
            await page.keyboard.press('Enter');
            assert.equal(await profile.getAttribute('aria-expanded'), 'true');
            await page.keyboard.press('Escape');
            assert.equal(await profile.getAttribute('aria-expanded'), 'false');
            if (!baseline) assert.equal(await profile.getAttribute('aria-label'), 'Menu do perfil');
          }
          if (path === '/login' && String(item.class).includes('brand-logo')) {
            await page.screenshot({ path: `${output}/${baseline ? 'before' : 'after'}-logo-${theme}-${viewport.width}-${step}.png` });
          }
        }
        if (path === '/dashboard' && viewport.width === 390) {
          await page.getByRole('button', { name: 'Abrir menu', exact: true }).focus();
          await page.keyboard.press('Enter');
          assert(await page.locator('.sidebar .brand-logo-button').evaluate(el => el === document.activeElement));
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          assert(await page.locator('.sidebar .brand-logo-button').evaluate(el => el === document.activeElement));
          await page.keyboard.press('Escape');
          assert(await page.getByRole('button', { name: 'Abrir menu', exact: true }).evaluate(el => el === document.activeElement));
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Horizontal overflow: ${path}`);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
} finally {
  writeFileSync(`${output}/${baseline ? 'before' : 'after'}.json`, JSON.stringify({ baseline: baseline || null, results }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks: results.length, minimum: Math.min(...results.filter(r => r.ratio !== null).map(r => r.ratio)), missingIndicators: results.filter(r => r.ratio === null).length }));
