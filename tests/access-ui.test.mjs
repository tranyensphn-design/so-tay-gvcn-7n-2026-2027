import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../access-manager.js', import.meta.url), 'utf8');

// The real UI module runs with small DOM/RPC doubles. No credentials or
// requests go to Firebase, and no dependencies are added to the deployed app.
function harness(options = {}) {
  const calls = [], confirmations = [], nodes = new Map();
  function element(id) {
    const node = { id, innerHTML: '', textContent: '', hidden: false, value: '', type: 'password',
      disabled: false, dataset: {}, style: {}, listeners: new Map(), attributes: {},
      addEventListener(type, handler) { this.listeners.set(type, handler); },
      setAttribute(name, value) { this.attributes[name] = value; },
      focus() { this.focused = true; }, scrollIntoView() {},
    };
    nodes.set(id, node); return node;
  }
  for (const id of ['modal-container', 'access-manager', 'access-message', 'access-rows', 'access-secret',
    'access-password-panel', 'access-password-form', 'access-new-password', 'access-confirm-password']) element(id);
  const get = id => nodes.get(id);
  const panel = get('access-password-panel'), form = get('access-password-form');
  panel.hidden = true;
  let panelHtml = '';
  Object.defineProperty(panel, 'innerHTML', {
    get: () => panelHtml,
    set: value => { panelHtml = value; form.dataset.id = /data-id="([^"]*)"/.exec(value)?.[1]; },
  });
  Object.defineProperty(form, 'isConnected', { get: () => !!get('modal-container').innerHTML && !!panelHtml && !panel.hidden });
  const controls = [get('access-new-password'), get('access-confirm-password'), element('submit-control')];
  panel.querySelectorAll = () => controls.slice(0, 2);
  form.querySelectorAll = () => controls;
  const row = { id: '1', name: options.name || 'Test Officer', officer: options.officer ?? 'Class leader',
    code: '12345', portal: 'active', officerAccess: 'missing' };
  let saved = false;
  const docListeners = new Map();
  const context = {
    document: {
      getElementById: get,
      addEventListener(type, handler) { docListeners.set(type, handler); },
      removeEventListener(type, handler) { if (docListeners.get(type) === handler) docListeners.delete(type); }
    },
    confirm: message => { confirmations.push(message); return options.confirm !== false; },
    window: {
      cloudMembership: { role: options.role || 'gvcn' }, simpleLoginEnabled: false,
      cloudServices: { accessAdmin: async body => {
        calls.push(structuredClone(body));
        if (body.action === 'list') {
          if (saved && options.failRefresh) throw new Error('Refresh failed');
          return { students: [row], features: { customOfficerPasswords: options.supported !== false, teacherPasswordAction: 'set-officer-password' } };
        }
        if (body.action === 'password' || body.action === 'set-officer-password') {
          if (options.save) await options.save(body);
          saved = true;
          return options.response || { passwordSet: true };
        }
        return {};
      } },
    },
  };
  vm.runInNewContext(source, context);
  const click = async (action, extras = {}) => {
    const button = element(`button-${action}`);
    button.dataset = { action, kind: 'bcs', id: '1', ...extras };
    await get('access-manager').listeners.get('click')({ target: { closest: () => button } });
    return button;
  };
  const fill = (password = 'Test7N', repeat = password) => {
    get('access-new-password').value = password; get('access-confirm-password').value = repeat;
  };
  const submit = () => form.listeners.get('submit')({ preventDefault() {}, currentTarget: form });
  return { context, get, calls, confirmations, controls, click, fill, submit, docListeners,
    triggerKeydown: key => { const fn = docListeners.get('keydown'); if (fn) fn({ key }); },
    open: () => context.window.openAccessManager(), writes: () => calls.filter(c => c.action === 'password' || c.action === 'set-officer-password') };
}

test('opening the custom-password form selects the right officer, masks both inputs and escapes the name', async () => {
  const h = harness({ name: '<img src=x onerror=alert(1)>' });
  await h.open(); await h.click('password');
  const html = h.get('access-password-panel').innerHTML;
  assert.match(html, /&lt;img/);
  assert(!html.includes('<img'));
  assert.equal((html.match(/type="password"/g) || []).length, 2);
  assert.equal((html.match(/autocomplete="new-password"/g) || []).length, 2);
  assert.equal(h.get('access-password-form').dataset.id, '1');
  assert.equal(h.get('access-new-password').focused, true);
  assert.equal(h.writes().length, 0);
});

test('mismatched confirmation and invalid lengths/whitespace do not send a password mutation', async () => {
  const h = harness(); await h.open(); await h.click('password');
  for (const [first, second] of [['Test7N', 'Other7N'], ['', ''], ['12345', '12345'], ['x'.repeat(129), 'x'.repeat(129)], [' Test7N', ' Test7N'], ['Test7N ', 'Test7N '], ['Test\n7N', 'Test\n7N']]) {
    h.fill(first, second); await h.submit();
    assert.equal(h.writes().length, 0);
    assert.equal(h.get('access-password-panel').hidden, false);
  }
});

test('confirmed password is sent only for the selected officer and cleared after success without echo', async () => {
  const h = harness(); await h.open(); await h.click('password'); h.fill(); await h.submit();
  assert.deepEqual(h.writes(), [{ action: 'set-officer-password', kind: 'bcs', studentId: '1', password: 'Test7N' }]);
  assert.equal(h.get('access-new-password').value, '');
  assert.equal(h.get('access-confirm-password').value, '');
  assert.equal(h.get('access-password-panel').innerHTML, '');
  assert.equal(h.get('access-password-panel').hidden, true);
  assert.match(h.get('access-message').textContent, /Đã lưu mật khẩu riêng/);
  assert(!h.get('access-message').textContent.includes('Test7N'));
  assert(!h.get('access-secret').textContent.includes('Test7N'));
  assert(!h.confirmations[0].includes('Test7N'));
});

test('cancel and close discard password fields without writing', async () => {
  for (const action of ['cancel-password', 'close']) {
    const h = harness(); await h.open(); await h.click('password'); h.fill(); await h.click(action);
    assert.equal(h.writes().length, 0);
    assert.equal(h.get('access-new-password').value, '');
    assert.equal(h.get('access-confirm-password').value, '');
    assert.equal(h.get('access-password-panel').innerHTML, '');
  }
});

test('closing access manager via closeAccessManager, backdrop, or Escape clears the modal container', async () => {
  const h1 = harness();
  await h1.open();
  h1.get('modal-container').innerHTML = '<div id="access-manager">...</div>';
  assert.notEqual(h1.get('modal-container').innerHTML, '');
  h1.context.window.closeAccessManager();
  assert.equal(h1.get('modal-container').innerHTML, '');

  const h2 = harness();
  await h2.open();
  h2.get('modal-container').innerHTML = '<div id="access-manager">...</div>';
  await h2.get('access-manager').listeners.get('click')({ target: { id: 'access-manager' } });
  assert.equal(h2.get('modal-container').innerHTML, '');

  const h3 = harness();
  await h3.open();
  h3.get('modal-container').innerHTML = '<div id="access-manager">...</div>';
  h3.triggerKeydown('Escape');
  assert.equal(h3.get('modal-container').innerHTML, '');
});

test('modal panel does not block event propagation and close button has direct handler', async () => {
  const h = harness();
  await h.open();
  const modalHtml = h.get('modal-container').innerHTML;
  assert(!modalHtml.includes('event.stopPropagation()'), 'access-panel must not stop event propagation');
  assert.match(modalHtml, /onclick="window\.closeAccessManager\(\)"/);
  assert.match(modalHtml, /data-action="close"/);
});

test('declining the save confirmation preserves the existing credential', async () => {
  const h = harness({ confirm: false }); await h.open(); await h.click('password'); h.fill(); await h.submit();
  assert.equal(h.writes().length, 0);
  assert.equal(h.get('access-password-panel').hidden, false);
});

test('show/hide password updates both input types and the accessible toggle state', async () => {
  const h = harness(); await h.open(); await h.click('password');
  const show = await h.click('show-password');
  assert.equal(h.get('access-new-password').type, 'text');
  assert.equal(h.get('access-confirm-password').type, 'text');
  assert.equal(show.attributes['aria-pressed'], 'true');
  const hide = await h.click('show-password');
  assert.equal(h.get('access-new-password').type, 'password');
  assert.equal(h.get('access-confirm-password').type, 'password');
  assert.equal(hide.attributes['aria-pressed'], 'false');
});

test('double submitting while a save is pending sends only one mutation', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ save: () => pending });
  await h.open(); await h.click('password'); h.fill();
  const first = h.submit(); await h.submit();
  assert.equal(h.writes().length, 1);
  assert(h.controls.every(c => c.disabled));
  finish(); await first;
  assert(h.controls.every(c => !c.disabled));
});

test('a rejected save leaves the form editable with an error and no success message', async () => {
  const h = harness({ save: () => { throw new Error('Mật khẩu trùng.'); } });
  await h.open(); await h.click('password'); h.fill(); await h.submit();
  assert.match(h.get('access-message').textContent, /Mật khẩu trùng/);
  assert.equal(h.get('access-password-panel').hidden, false);
  assert(h.controls.every(c => !c.disabled));
});

test('list refresh failure after a successful save is reported distinctly and does not retain the password', async () => {
  const h = harness({ failRefresh: true }); await h.open(); await h.click('password'); h.fill(); await h.submit();
  assert.match(h.get('access-message').textContent, /Đã lưu mật khẩu riêng/);
  assert.match(h.get('access-message').textContent, /Chưa tải lại được danh sách/);
  assert.equal(h.get('access-new-password').value, '');
  assert.equal(h.get('access-password-panel').hidden, true);
});

test('older Functions are detected before any password mutation is sent', async () => {
  const h = harness({ supported: false }); await h.open(); await h.click('password');
  assert.match(h.get('access-message').textContent, /Máy chủ chưa hỗ trợ/);
  assert.equal(h.get('access-password-panel').hidden, true);
  assert.equal(h.writes().length, 0);
});

test('a mismatched legacy response is never reported as saving the teacher-chosen password', async () => {
  const h = harness({ response: { password: 'LEGACY_RANDOM_ONLY' } });
  await h.open(); await h.click('password'); h.fill(); await h.submit();
  assert.match(h.get('access-message').textContent, /Máy chủ chưa hỗ trợ/);
  assert(!h.get('access-message').textContent.includes('Đã lưu'));
  assert.match(h.get('access-secret').textContent, /LEGACY_RANDOM_ONLY/);
  assert(!h.get('access-secret').textContent.includes('Test7N'));
});

test('non-teachers cannot open access management and unassigned pupils cannot open the password form', async () => {
  const blocked = harness({ role: 'bcs' }); await blocked.open();
  assert.equal(blocked.calls.length, 0);
  const unassigned = harness({ officer: '' }); await unassigned.open(); await unassigned.click('password');
  assert.equal(unassigned.get('access-password-panel').hidden, true);
  assert.equal(unassigned.writes().length, 0);
});
