(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const status = value => ({ active: 'Đang bật', blocked: 'Đã khóa', missing: 'Chưa cấp' }[value] || 'Chưa cấp');
  let busy = false;
  let currentRows = [];
  let customPasswordsSupported = false;
  const teacherPasswordAction = 'set-officer-password';
  window.accessManagerBuild = 'classroom-fix-20260902-v3';
  const updateHelp = 'Máy chủ chưa hỗ trợ bản tự đặt mật khẩu này. Cần cập nhật access-manager.js, thư mục server/ và netlify/functions/, rồi triển khai lại trên Netlify. Không chỉ thay index.html.';
  async function api(body) {
    if (window.cloudMembership?.role !== 'gvcn') throw new Error('Chỉ GVCN được quản lý quyền đăng nhập.');
    if (!window.cloudServices?.accessAdmin) throw new Error('Chưa kết nối được Firebase.');
    return window.cloudServices.accessAdmin(body);
  }
  function message(text, error = false) {
    const box = document.getElementById('access-message');
    if (box) { box.textContent = text; box.style.color = error ? '#b91c1c' : '#334155'; }
  }
  function renderRows(rows) {
    currentRows = rows;
    const table = document.getElementById('access-rows');
    if (!table) return;
    table.innerHTML = rows.length ? rows.map(row => `
      <tr>
        <td data-label="Học sinh"><strong>${escape(row.name)}</strong><small>ID nội bộ: ${escape(row.id)}</small></td>
        <td data-label="HS / PH"><code>${escape(row.code)}</code><small>${status(row.portal)}</small>
          <button data-action="rotate-code" data-kind="phhs" data-id="${escape(row.id)}">Đổi mã 5 số</button>
          ${row.portal !== 'missing' ? `<button data-action="toggle" data-kind="phhs" data-id="${escape(row.id)}" data-active="${row.portal !== 'active'}">${row.portal === 'active' ? 'Khóa HS/PH' : 'Mở HS/PH'}</button>` : ''}
        </td>
        <td data-label="Ban cán sự">${row.officer ? `<strong>${escape(row.officer)}</strong><small>${status(row.officerAccess)}</small>
          <button data-action="password" data-kind="${escape(row.officerKind || 'bcs')}" data-id="${escape(row.id)}">${row.officerAccess === 'missing' ? 'Cấp mật khẩu riêng' : 'Đổi mật khẩu riêng'}</button>` : '<small>Chưa được phân công cán bộ lớp</small>'}
          ${row.officerAccess !== 'missing' ? `<button data-action="toggle" data-kind="${escape(row.officerKind || 'bcs')}" data-id="${escape(row.id)}" data-active="${row.officerAccess !== 'active'}">${row.officerAccess === 'active' ? 'Khóa cán bộ' : 'Mở cán bộ'}</button>` : ''}
        </td>
      </tr>`).join('') : '<tr><td colspan="3">Lớp chưa có học sinh. Hãy thêm học sinh và lưu trước.</td></tr>';
  }
  async function load() {
    customPasswordsSupported = false;
    const result = await api({ action: 'list' });
    customPasswordsSupported = result.features?.customOfficerPasswords === true &&
      (!result.features?.teacherPasswordAction || result.features?.teacherPasswordAction === teacherPasswordAction);
    renderRows(result.students || []);
  }
  function clearPasswordForm() {
    const panel = document.getElementById('access-password-panel');
    if (!panel) return;
    panel.querySelectorAll('input').forEach(input => { input.value = ''; });
    panel.innerHTML = ''; panel.hidden = true;
  }
  function openPasswordForm(row) {
    if (!customPasswordsSupported) return message(updateHelp, true);
    const panel = document.getElementById('access-password-panel');
    if (!panel || !row?.officer) return;
    const secretBox = document.getElementById('access-secret');
    if (secretBox) { secretBox.hidden = true; secretBox.textContent = ''; }
    clearPasswordForm();
    panel.innerHTML = `
      <form id="access-password-form" data-id="${escape(row.id)}" aria-labelledby="access-password-title">
        <h3 id="access-password-title">Tự đặt mật khẩu cho ${escape(row.name)}</h3>
        <p>Giáo viên tự nhập mật khẩu từ 6 đến 128 ký tự; không bắt buộc dùng chuỗi ngẫu nhiên dài. Phân biệt chữ hoa/chữ thường.</p>
        <p>Mỗi cán bộ cần một mật khẩu riêng vì các em đăng nhập chỉ bằng mật khẩu, không nhập email hay tên tài khoản.</p>
        <p>Mật khẩu ngắn dễ bị đoán. Nên chọn cụm từ dài, dễ nhớ; tránh tên học sinh, ngày sinh hoặc dãy số đơn giản.</p>
        <label for="access-new-password">Mật khẩu mới</label>
        <input id="access-new-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required placeholder="Nhập mật khẩu do giáo viên chọn" autocapitalize="none" spellcheck="false" aria-describedby="access-password-help">
        <label for="access-confirm-password">Nhập lại mật khẩu</label>
        <input id="access-confirm-password" type="password" autocomplete="new-password" minlength="6" maxlength="128" required placeholder="Nhập lại đúng mật khẩu phía trên" autocapitalize="none" spellcheck="false">
        <p id="access-password-help">Không có khoảng trắng ở đầu/cuối. Lưu mật khẩu mới sẽ bật quyền cán bộ và vô hiệu phiên cũ của em này.</p>
        <button type="button" data-action="show-password" aria-pressed="false">Hiện mật khẩu</button>
        <button type="submit" class="access-primary">Lưu mật khẩu cho cán bộ</button>
        <button type="button" data-action="cancel-password">Hủy</button>
      </form>`;
    panel.hidden = false;
    const form = document.getElementById('access-password-form');
    form.addEventListener('submit', saveOfficerPassword);
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    document.getElementById('access-new-password').focus();
    message('Nhập mật khẩu riêng cho đúng cán bộ, rồi bấm Lưu mật khẩu.');
  }
  async function saveOfficerPassword(event) {
    event.preventDefault();
    if (busy) return;
    if (!customPasswordsSupported) return message('Máy chủ chưa hỗ trợ tự đặt mật khẩu. Hãy tải lại trang sau khi triển khai bản mới.', true);
    const form = event.currentTarget;
    const row = currentRows.find(item => String(item.id) === String(form.dataset.id));
    if (!row?.officer) { clearPasswordForm(); return message('Hãy tải lại danh sách và kiểm tra phân công cán bộ.', true); }
    const first = document.getElementById('access-new-password');
    const second = document.getElementById('access-confirm-password');
    const password = first.value;
    if (password.length < 6 || password.length > 128) return message('Mật khẩu cán bộ phải từ 6 đến 128 ký tự.', true);
    if (password !== password.trim() || /[\u0000-\u001f\u007f]/.test(password)) return message('Mật khẩu không được có khoảng trắng ở đầu/cuối hoặc ký tự xuống dòng.', true);
    if (password !== second.value) return message('Hai lần nhập mật khẩu chưa khớp.', true);
    if (!confirm(`Lưu mật khẩu riêng cho ${row.name}? Quyền cán bộ sẽ được bật. Mật khẩu và phiên đăng nhập cũ của em này sẽ hết hiệu lực.`)) return;
    busy = true;
    const controls = [...form.querySelectorAll('input, button')];
    controls.forEach(control => { control.disabled = true; });
    message('Đang lưu mật khẩu…');
    try {
      const result = await api({ action: teacherPasswordAction, kind: row.officerKind || 'bcs', studentId: row.id, password, ...(row.officerKind === 'to_pho' ? {replaceGroupDeputy:true,expectedGroup:row.group} : {}) });
      first.value = ''; second.value = '';
      if (!form.isConnected) return;
      clearPasswordForm();
      if (result.passwordSet !== true) {
        // Do not echo unexpected credentials or claim an unconfirmed save.
        const secretBox = document.getElementById('access-secret');
        if (result.password && secretBox) {
          secretBox.hidden = false;
          secretBox.textContent = result.password;
        }
        return message('Chưa xác nhận được mật khẩu đã lưu. ' + updateHelp, true);
      }
      const savedMessage = `Đã lưu mật khẩu riêng cho ${row.name}. Hãy gửi riêng cho đúng em; hệ thống không hiển thị lại mật khẩu.`;
      try { await load(); message(savedMessage); }
      catch (_) { message(savedMessage + ' Chưa tải lại được danh sách, hãy bấm Tải lại danh sách.', true); }
    } catch (error) {
      if (form.isConnected) message(error.message || 'Không thể lưu mật khẩu.', true);
    } finally {
      busy = false;
      controls.forEach(control => { control.disabled = false; });
    }
  }

  function closeAccessManager() {
    clearPasswordForm();
    const host = document.getElementById('modal-container');
    if (host) host.innerHTML = '';
    currentRows = [];
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('keydown', handleKeydown);
    }
  }
  window.closeAccessManager = closeAccessManager;

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeAccessManager();
    }
  }

  async function handle(event) {
    if (event.target && event.target.id === 'access-manager') {
      closeAccessManager();
      return;
    }
    const button = event.target?.closest ? event.target.closest('button[data-action]') : null;
    if (!button || busy) return;
    const { action, kind, id, active } = button.dataset;
    if (action === 'close') {
      closeAccessManager();
      return;
    }
    const row = currentRows.find(s => String(s.id) === String(id));
    if (action === 'password') { openPasswordForm(row); return; }
    if (action === 'cancel-password') { clearPasswordForm(); message('Đã hủy. Mật khẩu hiện tại không thay đổi.'); return; }
    if (action === 'show-password') {
      const inputs = ['access-new-password', 'access-confirm-password'].map(name => document.getElementById(name));
      if (inputs.some(input => !input)) return;
      const show = inputs[0].type === 'password';
      inputs.forEach(input => { input.type = show ? 'text' : 'password'; });
      button.setAttribute('aria-pressed', String(show));
      button.textContent = show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
      return;
    }
    if (action === 'sync' && !confirm('Bật mã 5 số cho học sinh chưa được cấp và đồng bộ danh sách mới nhất? Các tài khoản đã khóa vẫn được giữ khóa. Ai biết mã có thể xem hồ sơ tương ứng.')) return;
    if (action === 'rotate-code' && !confirm(`Đổi mã của ${row?.name || 'học sinh này'}? Mã cũ và phiên đăng nhập cũ sẽ mất hiệu lực sau khi Rules đã được cập nhật.`)) return;
    if (action === 'toggle' && !confirm(`${active === 'true' ? 'Mở' : 'Khóa'} quyền ${kind === 'to_pho' ? 'Tổ phó (thay phân công cũ trong tổ khi mở quyền)' : kind === 'bcs' ? 'cán bộ lớp' : 'HS/PH'} của ${row?.name || 'học sinh này'}?`)) return;
    busy = true; button.disabled = true;
    clearPasswordForm();
    const secretBox = document.getElementById('access-secret');
    if (secretBox) { secretBox.hidden = true; secretBox.textContent = ''; }
    message('Đang xử lý…');
    try {
      if (action === 'refresh') { await load(); message('Đã tải danh sách mới nhất.'); }
      else {
        const result = await api(action === 'sync' ? { action } : { action, kind, studentId: id, ...(action === 'toggle' ? { active: active === 'true', ...(kind === 'to_pho' && active === 'true' ? {replaceGroupDeputy:true,expectedGroup:row.group} : {}) } : {}) });
        if (result.password && secretBox && secretBox.isConnected) {
          secretBox.hidden = false;
          secretBox.textContent = `Mật khẩu mới của ${row?.name || 'cán bộ lớp'}: ${result.password}\nChỉ hiển thị lần này. Sao chép và gửi riêng cho đúng người. Nếu thất lạc, hãy đặt lại mật khẩu.`;
        }
        // Show a one-time password before refreshing: a list failure must not hide it.
        await load();
        message(result.count !== undefined ? `Đã đồng bộ ${result.count} học sinh. Không thay đổi các mã 5 số hiện có.` : result.code ? `Mã mới: ${result.code}. Hãy gửi riêng cho học sinh/phụ huynh.` : 'Đã cập nhật quyền đăng nhập.');
      }
    } catch (error) { message(error.message || 'Không thể cập nhật.', true); }
    finally { busy = false; button.disabled = false; }
  }
  window.openAccessManager = async function () {
    if (window.cloudMembership?.role !== 'gvcn') return;
    if (busy) return;
    customPasswordsSupported = false;
    let host = document.getElementById('modal-container');
    if (!host) {
      host = document.createElement('div');
      host.id = 'modal-container';
      host.className = 'print:hidden';
      document.body.appendChild(host);
    }
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('keydown', handleKeydown);
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', handleKeydown);
    }
    host.innerHTML = `<div id="access-manager" role="dialog" aria-modal="true" aria-labelledby="access-title" onclick="if(event.target===this)window.closeAccessManager()">
      <style>
        #access-manager { position:fixed; inset:0; z-index:12000; display:flex; align-items:center; justify-content:center; padding:16px; background:#0f172aaa; }
        #access-manager, #access-manager * {box-sizing:border-box;}
        #access-manager .access-panel { width:100%; max-width:1060px; min-width:0; max-height:90vh; max-height:90dvh; overflow:auto; overflow-wrap:anywhere; border-radius:22px; background:white; padding:24px; box-shadow:0 24px 80px #0f172a44; color:#1e293b; }
        #access-manager header {align-items:flex-start;flex-wrap:wrap;}
        #access-manager header h2 {flex:1 1 200px;min-width:0;max-width:100%;}
        #access-manager :is(p, strong, small, label, h2, h3) {white-space:normal;overflow-wrap:anywhere;}
        #access-manager :is(form, input, select, button, #access-password-panel, #access-message, #access-secret) {min-width:0;max-width:100%;}
        #access-manager h2 {font-size:22px;font-weight:800;margin-bottom:8px;}
        #access-manager p {font-size:13px;line-height:1.6;margin:8px 0;}
        #access-manager button {min-height:44px;height:auto;white-space:normal;overflow-wrap:anywhere;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;background:#f1f5f9;margin:4px 0;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation;}
        #access-manager button:disabled {opacity:.5;cursor:wait;}
        #access-manager button:focus-visible {outline:3px solid #818cf8;outline-offset:2px;}
        #access-manager .access-primary {background:#4338ca;color:white;border-color:#4338ca;}
        #access-manager table {width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px;}
        #access-manager td,#access-manager th {padding:12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere;}
        #access-manager small {display:block;color:#64748b;margin:5px 0;}
        #access-manager code {font-size:18px;font-weight:800;letter-spacing:2px;}
        #access-secret {white-space:pre-wrap;background:#fef3c7;border:1px solid #fcd34d;padding:16px;border-radius:10px;user-select:text;margin:12px 0;}
        #access-password-panel {background:#eef2ff;border:1px solid #c7d2fe;padding:16px;border-radius:12px;margin:16px 0;}
        #access-password-panel h3 {font-size:16px;font-weight:800;margin-bottom:8px;}
        #access-password-panel label {display:block;font-size:13px;font-weight:700;margin-top:12px;}
        #access-password-panel input {display:block;box-sizing:border-box;width:100%;max-width:520px;min-height:44px;font-size:16px;padding:10px 12px;margin:6px 0;border:1px solid #94a3b8;border-radius:8px;background:white;color:#0f172a;}
        @media (max-width:600px) {
          #access-manager {padding:8px;}
          #access-manager .access-panel {box-sizing:border-box;width:100%;padding:14px;max-height:94vh;max-height:94dvh;}
          #access-password-panel {padding:12px;}
          #access-password-form button {width:100%;margin-right:0;}
          /* Keep table semantics; stack each student's cells visually on phones. */
          #access-manager table, #access-manager tbody {display:block;width:100%;min-width:0;}
          #access-manager thead {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}
          #access-manager tbody tr {display:block;margin:12px 0;border:1px solid #e2e8f0;border-radius:12px;padding:4px 12px;}
          #access-manager tbody td {display:block;width:100%;padding:10px 0;}
          #access-manager tbody td:last-child {border-bottom:0;}
          #access-manager td[data-label]::before {content:attr(data-label);display:block;margin-bottom:6px;font-size:11px;font-weight:800;color:#64748b;}
        }
      </style>
      <section class="access-panel">
        <header style="display:flex;justify-content:space-between;gap:12px"><h2 id="access-title">Quản lý quyền đăng nhập</h2><button type="button" data-action="close" onclick="window.closeAccessManager()" aria-label="Đóng quản lý đăng nhập">Đóng</button></header>
        <p>HS/PH: mã học sinh 5 số. Ban cán sự: mật khẩu riêng. Chọn cán bộ lớp ở phần Phân quyền trước khi cấp mật khẩu.</p>
        <p><strong>Giáo viên tự đặt mật khẩu:</strong> bấm Cấp/Đổi mật khẩu riêng tại đúng học sinh, nhập hai lần rồi lưu. Không tự sinh mật khẩu khi bấm nút. <small>Bản tự đặt mật khẩu 02.09.2026 · v3</small></p>
        <p style="color:#92400e">Giữ kín mã học sinh: bất kỳ ai biết mã đều có thể xem hồ sơ tương ứng. Khi thay đổi danh sách hoặc phân công cán bộ, bấm Đồng bộ.</p>
        ${!window.simpleLoginEnabled ? '<p style="color:#b91c1c">Giao diện đăng nhập đơn giản đang tắt. Cấu hình SIMPLE_LOGIN_ENABLED=true và triển khai lại sau khi kiểm thử.</p>' : ''}
        <button class="access-primary" data-action="sync">Đồng bộ / bật mã học sinh</button><button data-action="refresh">Tải lại danh sách</button>
        <p id="access-message" role="status" aria-live="polite">Đang tải danh sách…</p><div id="access-secret" role="status" hidden></div>
        <div id="access-password-panel" hidden></div>
        <div style="max-width:100%;overflow-x:auto"><table role="table" aria-label="Quyền đăng nhập học sinh"><thead><tr><th scope="col">Học sinh</th><th scope="col">HS / PH</th><th scope="col">Ban cán sự</th></tr></thead><tbody id="access-rows"></tbody></table></div>
      </section></div>`;
    document.getElementById('access-manager').addEventListener('click', handle);
    try {
      await load();
      message(customPasswordsSupported ? 'Sẵn sàng: giáo viên có thể tự cấp mật khẩu riêng cho cán bộ.' : updateHelp, !customPasswordsSupported);
    } catch (error) { message(error.message || 'Không thể tải danh sách.', true); }
  };
})();
