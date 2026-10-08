window.openDeputyWorkspace = async function() {
  'use strict';
  window.closeDeputyWorkspace?.();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const safeUuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try { return crypto.randomUUID(); } catch (_) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };
  const app = document.getElementById('app');
  const member = window.cloudMembership;
  if (!app || !window.cloudUser || !['to_pho','bcs'].includes(member?.role)) return;

  app.innerHTML = `
    <main id="deputy-workspace">
      <button id="bcs-sidebar-backdrop" class="bcs-sidebar-backdrop" type="button" aria-label="Đóng menu điều hướng" tabindex="-1" hidden></button>
      <aside id="bcs-sidebar" class="bcs-sidebar" aria-label="Menu điều hướng Ban cán sự" tabindex="-1">
        <div class="bcs-sidebar-heading">
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m16 7-3 6-6 4 4-7Z" fill="white"/></svg> Menu điều hướng</span>
          <button id="bcs-menu-close" class="bcs-menu-button" type="button" aria-label="Đóng menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        </div>
        <div class="bcs-class-card">
          <div id="bcs-class-avatar" class="bcs-class-avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></svg></div>
          <strong id="bcs-class-name">Lớp học</strong>
          <b id="bcs-station-name">Ban cán sự lớp</b>
          <small id="bcs-class-slogan">Đoàn kết - Tự tin - Tỏa sáng</small>
        </div>
        <div id="bcs-role-slot"></div>
        <nav id="bcs-navigation" class="bcs-navigation" aria-label="Chức năng được cấp quyền"></nav>
      </aside>
      <div id="bcs-main" class="bcs-main">
      <header class="bcs-topbar print:hidden">
        <div class="bcs-brand">
          <button id="bcs-menu-toggle" class="bcs-menu-button" type="button" aria-label="Mở menu điều hướng" aria-controls="bcs-sidebar" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
          <h2 id="deputy-view-title" class="bcs-brand-title">Tích Điểm</h2>
        </div>
        <nav style="display:flex;align-items:center;gap:10px">
          <button id="back" type="button" hidden></button>
          <button type="button" id="bcs-parent-lookup-btn" class="flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-orange-400 to-amber-500 px-3.5 py-2 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap cursor-pointer" title="Cổng Phụ Huynh tra cứu">
            <i class="ph-bold ph-magnifying-glass text-sm"></i> <span class="hidden sm:inline">Tra cứu</span>
          </button>
          <div id="deputy-sync-pill" class="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 shadow-sm">
            <i class="ph-fill ph-cloud-slash text-sm text-slate-400"></i><span class="hidden sm:inline">Dữ liệu tạm</span>
          </div>
          <div class="bcs-profile">
            <div class="text-right hidden sm:block">
              <h1 id="bcs-officer-name">Ban cán sự lớp</h1>
              <small id="bcs-officer-role">TÀI KHOẢN HỌC SINH</small>
            </div>
            <span id="bcs-avatar" class="bcs-avatar" aria-hidden="true">BC</span>
          </div>
          <button id="logout" type="button" aria-label="Đăng xuất tài khoản" title="Đăng xuất">
            <i class="ph-bold ph-sign-out text-base"></i>
          </button>
        </nav>
      </header>
      <section class="page-banner bcs-hero" data-page-banner="overview" data-tone="sky" aria-labelledby="bcs-welcome" hidden>
        <div class="page-banner-body">
          <div class="overview-hero-card">
            <div id="bcs-hero-content"></div>
          </div>
        </div>
      </section>
      <div class="deputy-inner">
        <p id="message" role="status" aria-live="polite" class="empty:hidden p-3 my-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs md:text-sm font-bold text-indigo-900 shadow-sm transition-all"></p>
        <div id="recovery" hidden></div>
        <div id="content"></div>
      </div>
      </div>
    </main>
  `;

  const root = document.getElementById('deputy-workspace');
  root.querySelector('#bcs-hero-content').innerHTML = window.ClassDashboard.heroContent({
    title: 'Chào mừng Ban cán sự lớp 7N!',
    kicker: 'TRẠM HỌC TẬP 7N',
    subtitle: 'KHÔNG GIAN BAN CÁN SỰ',
    description: 'Đoàn kết – Tự tin – Tỏa sáng',
    student: true
  });
  const el = id => root.querySelector('#' + id);

  if (!document.getElementById('deputy-dashboard-theme')) {
    const theme = document.createElement('link');
    theme.id = 'deputy-dashboard-theme';
    theme.rel = 'stylesheet';
    theme.href = '/deputy-dashboard.css?v=bcs-sidebar-v3';
    document.head.appendChild(theme);
  }
  el('back')?.remove();

  const ratings = { good:'Tốt (+5)', done:'Đạt (0)', incomplete:'Chưa đạt (-3)', absent:'Nghỉ trực (-5)' };
  const days = { mon:'Thứ Hai', tue:'Thứ Ba', wed:'Thứ Tư', thu:'Thứ Năm', fri:'Thứ Sáu', sat:'Thứ Bảy' };
  let data, rows = [], working = false, dirty = false, recoveryActive = false, sessionBlocked = false, leaving = false, selectedRoleKey = '', selectedPanel = '', permissionRefreshQueued = false, permissionRefreshTimer = null;
  let currentActionType = 'add'; // 'add' hoặc 'subtract'
  let currentTargetType = 'student'; // 'student', 'group', 'class'

  const desktopMenu = window.matchMedia?.('(min-width: 1024px)');
  let sidebarOpen = false;
  function setSidebar(open, restoreFocus = false) {
    sidebarOpen = Boolean(open && !desktopMenu?.matches);
    const sidebar = el('bcs-sidebar');
    const visible = Boolean(desktopMenu?.matches || sidebarOpen);
    root.classList.toggle('bcs-menu-open', sidebarOpen);
    el('bcs-menu-toggle').setAttribute('aria-expanded', String(sidebarOpen));
    el('bcs-sidebar-backdrop').hidden = !sidebarOpen;
    sidebar.inert = !visible;
    sidebar.setAttribute('aria-hidden', String(!visible));
    el('bcs-main').inert = sidebarOpen;
    if (sidebarOpen) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      el('bcs-menu-close').focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if (restoreFocus) {
        if (desktopMenu?.matches) el('bcs-navigation').querySelector('[aria-pressed="true"]')?.focus();
        else el('bcs-menu-toggle').focus();
      }
    }
  }
  el('bcs-menu-toggle').onclick = () => setSidebar(!sidebarOpen);
  el('bcs-menu-close').onclick = () => setSidebar(false, true);
  el('bcs-sidebar-backdrop').onclick = () => setSidebar(false, true);
  root.addEventListener('keydown', event => {
    if (!sidebarOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setSidebar(false, true);
    } else if (event.key === 'Tab') {
      const items = [...el('bcs-sidebar').querySelectorAll('button:not([disabled]), select:not([disabled])')].filter(e => e.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  const syncSidebarViewport = () => {
    const focusInside = el('bcs-sidebar').contains(document.activeElement);
    setSidebar(false);
    if (focusInside && !desktopMenu?.matches) el('bcs-menu-toggle').focus();
  };
  desktopMenu?.addEventListener('change', syncSidebarViewport);
  setSidebar(false);

  const defaultPositiveCriteria = [
    { points: 2,  reason: "Giơ tay phát biểu", category: "Học tập" },
    { points: 8,  reason: "Đạt điểm tốt 8", category: "Học tập" },
    { points: 9,  reason: "Đạt điểm tốt 9", category: "Học tập" },
    { points: 10, reason: "Đạt điểm tốt 10", category: "Học tập" },
    { points: 20, reason: "Nhặt được của rơi trả lại người mất", category: "Nề nếp" },
    { points: 30, reason: "Việc làm tốt - Được nhà trường khen ngợi", category: "Phong trào" },
    { points: 10, reason: "Việc làm tốt - Được lớp khen ngợi", category: "Phong trào" },
    { points: 15, reason: "Thực hiện tốt nội quy nhà trường", category: "Nề nếp" }
  ];
  const defaultNegativeCriteria = [
    { points: 10, reason: "Đi học muộn", category: "Chuyên cần" },
    { points: 5,  reason: "Thiếu khăn quàng (huy hiệu)", category: "Nề nếp" },
    { points: 5,  reason: "Trang phục sai quy định", category: "Nề nếp" },
    { points: 10, reason: "Nghỉ học không xin phép", category: "Chuyên cần" },
    { points: 15, reason: "Bỏ tiết học", category: "Chuyên cần" },
    { points: 10, reason: "Không làm bài tập về nhà", category: "Học tập" },
    { points: 5,  reason: "Nói chuyện trong giờ học", category: "Kỷ luật" },
    { points: 10, reason: "Nói tục chửi bậy", category: "Kỷ luật" },
    { points: 10, reason: "Viết, vẽ bậy lên bàn", category: "Kỷ luật" },
    { points: 5,  reason: "Bị điểm dưới 5", category: "Học tập" }
  ];

  const runtime = window.__GVCN_RUNTIME_CONFIG__ || {};
  const draftKey = ['gvcn-score-draft', runtime.appId || 'so-tay-gvcn-7n', runtime.classId || '7n', window.cloudUser.uid].join(':');
  let draftStorage;
  try { draftStorage = window.sessionStorage; } catch (_) {}
  let scoreDraft = null;
  try { scoreDraft = JSON.parse(draftStorage?.getItem(draftKey) || 'null'); } catch (_) {}

  function rememberScore(payload) {
    scoreDraft = {...payload};
    try { draftStorage?.setItem(draftKey, JSON.stringify(scoreDraft)); } catch (_) {}
  }
  function clearScoreDraft() {
    scoreDraft = null;
    try { draftStorage?.removeItem(draftKey); } catch (_) {}
  }
  function restoreScoreDraft() {
    const form = el('score-form');
    if (!scoreDraft || !form) return;
    if ((scoreDraft.roleKey || '') !== selectedRoleKey ||
        !data.permissions?.points || scoreDraft.action !== 'score' ||
        !data.students.some(s => s.id === scoreDraft.studentId) ||
        !(data.permissions.categories || []).includes(scoreDraft.category) ||
        !/^[a-zA-Z0-9_-]{16,80}$/.test(scoreDraft.requestId || '')) return;
    for (const key of ['studentId','points','category','reason']) {
      const field = form.querySelector(`[name=${key}]`);
      if (field) field.value = scoreDraft[key];
    }
    form.dataset.request = scoreDraft.requestId;
    dirty = true;
    showPanel('points');
    message('Đã khôi phục lượt nhập chưa xác nhận. Kiểm tra lịch sử; gửi lại cùng nội dung sẽ không cộng/trừ lần hai.');
  }

  root.addEventListener('input', () => { dirty = true; });
  root.addEventListener('change', () => { dirty = true; });
  const message = (text = '', error = false) => {
    const msgEl = el('message');
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.toggle('text-rose-700', error);
    msgEl.classList.toggle('bg-rose-50', error);
    msgEl.classList.toggle('border-rose-100', error);
  };
  const api = body => window.cloudServices.deputy({ ...body, ...(selectedRoleKey ? {roleKey:selectedRoleKey} : {}) });

  function showRecovery(error, savedMessage = '') {
    if (!root.isConnected || leaving) return;
    recoveryActive = true;
    const code = error.code || '';
    const session = ['SESSION_CHANGED','SESSION_EXPIRED','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled'].includes(code) || error.status === 401;
    sessionBlocked = session;
    const assignment = ['ASSIGNMENT_CHANGED','ROLE_UNAVAILABLE'].includes(code) || /Phân công tổ/i.test(error.message || '');
    if ([401,403].includes(error.status)) {
      data = null; rows = []; dirty = false; el('content').innerHTML = '';
      el('bcs-navigation').innerHTML = '';
      el('bcs-role-slot').innerHTML = '';
      setSidebar(false, sidebarOpen);
      const h1 = root.querySelector('h1');
      if (h1) h1.textContent = 'Ban cán sự lớp';
      const avatar = el('bcs-avatar');
      if (avatar) avatar.textContent = 'BC';
    }
    message(savedMessage);
    el('recovery').hidden = false;
    el('recovery').innerHTML = `
      <section class="recovery-card" role="alert" aria-labelledby="recovery-title">
        <h2 id="recovery-title">${session ? 'Cần đăng nhập lại' : assignment ? 'Đang cập nhật phân công của bạn' : savedMessage ? 'Điểm đã lưu, chưa tải lại được dữ liệu' : 'Chưa tải được dữ liệu'}</h2>
        <p class="text-sm text-slate-700">${assignment ? 'Chức vụ của bạn đang được cập nhật. Trang sẽ tự chuyển khi nhận được phân công hợp lệ từ GVCN.' : esc(error.message || 'Kết nối tạm gián đoạn. Bạn có thể làm mới dữ liệu hoặc về màn hình đăng nhập.')}</p>
        <p class="text-xs text-slate-500 mt-2">${savedMessage ? 'Máy chủ đã xác nhận lưu điểm. Không nhập lại bản ghi này; bấm Làm mới dữ liệu để xem điểm và lịch sử mới nhất.' : session ? 'Phiên đăng nhập đã hết hiệu lực hoặc tài khoản đã được khóa/đổi mật khẩu. Hãy đăng nhập lại bằng tài khoản riêng.' : assignment ? 'Bạn có thể ở lại trang này để nhận quyền mới tự động, làm mới dữ liệu hoặc thoát về trang đăng nhập.' : 'Nếu vừa bấm lưu, hãy kiểm tra dữ liệu sau khi kết nối lại trước khi gửi lần nữa.'}</p>
        <div class="bcs-cards">
          <button class="bcs-card bcs-mint" data-action="refresh">
            ${icon('attendance')}<strong>Làm mới dữ liệu</strong><b>↻</b><small>Đọc lại phiên và phân công mới</small>
          </button>
          <button class="bcs-card bcs-lavender" data-action="login">
            ${icon('roster')}<strong>Đăng nhập lại</strong><b>→</b><small>Dùng tài khoản riêng của bạn</small>
          </button>
          <button class="bcs-card bcs-pink" data-action="home">
            ${icon('grades')}<strong>Về trang đăng nhập</strong><b>⌂</b><small>Thoát an toàn khỏi phiên hiện tại</small>
          </button>
        </div>
      </section>
    `;
  }

  async function leaveWorkspace() {
    if (leaving) return;
    if (dirty && !confirm('Nội dung chưa gửi trong biểu mẫu sẽ mất khi đăng xuất. Bạn muốn tiếp tục?')) return;
    leaving = true;
    try {
      await window.cloudServices.signOut();
      window.closeDeputyWorkspace?.();
      window.handleCloudAuthState?.(null, null);
    } catch (error) { leaving = false; showRecovery(error); }
  }

  async function run(fn) {
    if (working || leaving) return;
    working = true;
    const controls = [...root.querySelectorAll('#content button,#content input,#content select,#content textarea,#recovery button[data-action="refresh"]')].map(control=>[control,control.disabled]);
    controls.forEach(([control])=>{control.disabled=true;});
    try { await fn(); } catch (error) { showRecovery(error); }
    finally {
      working = false;
      if (permissionRefreshQueued && root.isConnected && !leaving) requestPermissionRefresh();
      if (root.isConnected) controls.forEach(([control,disabled])=>{if(root.contains(control)) control.disabled=disabled;});
    }
  }

  async function refresh() {
    if (dirty && !confirm('Nạp dữ liệu mới sẽ xóa nội dung chưa gửi. Tiếp tục?')) return;
    if (typeof window.cloudServices.refreshSession !== 'function') throw new Error('Website chưa được cập nhật đồng bộ. Hãy tải lại trang hoặc đăng nhập lại.');
    const fresh = await window.cloudServices.refreshSession();
    if (!root.isConnected || leaving) return;
    if (fresh.role !== member.role) { window.startApp(); return; }
    selectedRoleKey = '';
    await load(false, true);
    if (root.isConnected) message('Đã làm mới phiên đăng nhập và dữ liệu.');
  }

  const icon = window.ClassDashboard.icon;

  function scoreHistory() {
    const entries = (data.students || []).flatMap(student => (student.history || []).map(entry => ({ student, entry }))).sort((a,b) => String(b.entry.date).localeCompare(String(a.entry.date))).slice(0, 60);
    return `
      <div class="mt-4">
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Điểm vừa ghi nhận</h3>
        <div class="bcs-history-grid">
          ${entries.map(({ student, entry }) => `
            <article class="bcs-history-card">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <strong class="text-xs font-bold text-slate-800">${esc(student.name)}</strong>
                <span class="bcs-score-badge ${Number(entry.points) < 0 ? 'negative' : ''}">
                  ${Number(entry.points) > 0 ? '+' : ''}${esc(entry.points)}đ
                </span>
              </div>
              <p class="text-xs text-slate-700 font-medium my-1">${esc(entry.reason)}</p>
              <small class="text-[10px] text-slate-400 block">${esc(entry.category)} • ${esc(entry.performer)} • ${esc(String(entry.date || '').slice(0,10))}</small>
              ${entry.canEdit ? `<button type="button" class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer" data-action="edit-score" data-student="${esc(student.id)}" data-id="${esc(entry.id)}">Sửa bản ghi</button>` : ''}
            </article>
          `).join('') || '<p class="text-xs text-slate-400 italic">Chưa có điểm được ghi nhận trong phạm vi này.</p>'}
        </div>
      </div>
    `;
  }

  function dashboardHtml() {
    const p = data.permissions || {}, students = data.students || [];
    const cards = [];
    const navPaths = {
      points: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
      attendance: 'M8 2v4M16 2v4M4 9h16M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1ZM8 14l3 3 5-5',
      duty: 'm14 3 3 2-5 9-3-2ZM9 12c-4 1-6 4-6 8h14c-4-2-5-4-5-6M7 16l-1 4M10 17l1 3'
    };
    const card = (id, title) => {
      const icon = navPaths[id] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${navPaths[id]}"/></svg>` : window.ClassDashboard.icon(id);
      cards.push(`<button type="button" class="dashboard-card bcs-nav-item" data-panel-link="${id}" aria-controls="bcs-panel-${id}" aria-pressed="false" title="${esc(title)}"><span class="bcs-nav-icon">${icon}</span><strong>${esc(title)}</strong></button>`);
    };

    // Chỉ render các thẻ/tab mà tài khoản được cấp quyền
    if (p.points || p.scoreEdit) card('points', 'Tích điểm', '＋ / −', 'Cộng / trừ điểm thi đua', 'rose');
    if (p.scoresView && !p.points && !p.scoreEdit) card('scores', 'Tổng điểm thi đua', students.reduce((sum, s) => sum + (Number(s.points) || 0), 0), 'Tổng hợp điểm trong phạm vi', 'amber');
    if (p.attendanceView) card('attendance', 'Điểm danh', `${students.filter(s => ['present','late'].includes(s.attendance)).length}/${students.length}`, 'Chuyên cần hôm nay', 'blue');
    if (p.dutyView) card('duty', 'Trực nhật', data.duties.filter(d => d.week === data.week).length, 'Lịch trực tuần', 'green');
    if (p.grades) card('grades', 'Sổ điểm', 'Aa', 'Điểm học tập', 'orange');
    if (p.roster) card('roster', 'Học sinh', students.length, data.groupId ? `Danh sách ${data.groupId}` : 'Thành viên lớp', 'violet');

    const select = (data.availableRoles || []).length > 1 ? `
      <div class="bcs-role-select">
        <label>Chức vụ:
          <select id="bcs-role-select">
            ${data.availableRoles.map(r => `<option value="${esc(r.key)}" ${r.key === data.selectedRoleKey ? 'selected' : ''}>${esc(r.title)} • ${esc(r.scope === 'group' ? r.groupName : 'Toàn lớp')}</option>`).join('')}
          </select>
        </label>
      </div>
    ` : '';

    el('bcs-navigation').innerHTML = cards.join('');
    el('bcs-role-slot').innerHTML = select;
    el('bcs-class-name').textContent = data.className || 'Lớp 7N';
    const branding = data.classBranding || {};
    el('bcs-station-name').textContent = branding.stationName || 'Ban cán sự lớp';
    el('bcs-class-slogan').textContent = branding.slogan || 'Đoàn kết - Tự tin - Tỏa sáng';
    const avatarUrl = String(branding.avatarUrl || '');
    const avatar = el('bcs-class-avatar');
    if (/^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(avatarUrl)) {
      avatar.innerHTML = `<img src="${esc(avatarUrl)}" alt="Ảnh đại diện lớp">`;
    } else {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></svg>';
    }
    return `
      ${!cards.length ? '<div class="bcs-empty">Chưa có chức năng được cấp cho vai trò này. Bạn vẫn có thể làm mới dữ liệu hoặc đăng xuất; GVCN sẽ kiểm tra phân công.</div>' : ''}
      ${p.scoresView && !p.points ? `
        <section data-panel="scores" class="bg-white rounded-2xl border border-slate-200 p-4 my-3">
          <h2 class="text-base font-black text-slate-800">Thi đua trong phạm vi của bạn</h2>
          <p class="text-xs text-slate-500 mb-3">Tổng điểm hiện tại của các học sinh được phép xem.</p>
          ${scoreHistory()}
        </section>
      ` : ''}
      ${p.roster ? `
        <section data-panel="roster" class="bg-white rounded-2xl border border-slate-200 p-4 my-3">
          <h2 class="text-base font-black text-slate-800">Thành viên ${esc(data.groupId || data.className || 'lớp 7N')}</h2>
          <p class="text-xs text-slate-500 mb-3">Danh sách học sinh trong phạm vi được phân công.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            ${students.map((s, i) => `
              <div class="bcs-student">
                <span class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0" aria-hidden="true">${i+1}</span>
                <div class="min-w-0 flex-1">
                  <strong class="text-xs font-bold text-slate-800 block truncate">${esc(s.name)}</strong>
                  <small class="text-[10px] text-slate-500">${esc(s.group)} • ${esc(s.points || 0)}đ</small>
                </div>
              </div>
            `).join('') || '<p class="text-xs text-slate-400">Chưa có học sinh trong phạm vi được giao.</p>'}
          </div>
        </section>
      ` : ''}
    `;
  }

  function showPanel(id) {
    const panel = [...root.querySelectorAll('#content [data-panel]')].find(p => p.dataset.panel === id);
    if (!panel) return;
    selectedPanel = id;
    root.querySelectorAll('#content [data-panel]').forEach(p => {
      p.id = 'bcs-panel-' + p.dataset.panel;
      p.hidden = p !== panel;
    });
    root.querySelectorAll('[data-panel-link]').forEach(b => {
      const isActive = b.dataset.panelLink === id;
      b.setAttribute('aria-pressed', String(isActive));
      b.classList.toggle('active', isActive);
    });

    const titles = {
      points: 'Tích Điểm',
      attendance: 'Điểm Danh',
      duty: 'Trực Nhật',
      grades: 'Sổ Điểm',
      roster: 'Học Sinh',
      scores: 'Điểm Thi Đua'
    };
    const titleEl = root.querySelector('#deputy-view-title');
    if (titleEl && titles[id]) titleEl.textContent = titles[id];
  }

  function installDashboardNavigation() {
    const defaultTab = root.querySelector('[data-panel="points"]') ? 'points' : (root.querySelector('[data-panel-link]')?.dataset.panelLink || '');
    const active = [...root.querySelectorAll('[data-panel-link]')].some(b => b.dataset.panelLink === selectedPanel) ? selectedPanel : defaultTab;
    if (active) showPanel(active);
    root.querySelectorAll('[data-panel-link]').forEach(b => {
      b.onclick = () => {
        showPanel(b.dataset.panelLink);
        if (sidebarOpen) setSidebar(false, true);
      };
    });
    const picker = el('bcs-role-select');
    if (picker) picker.onchange = event => {
      event.stopPropagation();
      if (working || (dirty && !confirm('Đổi chức vụ sẽ bỏ nội dung biểu mẫu chưa gửi. Tiếp tục?'))) {
        picker.value = selectedRoleKey;
        return;
      }
      selectedRoleKey = picker.value;
      selectedPanel = '';
      void run(() => load(false, true));
    };
  }

  function renderDeputy() {
    const p = data.permissions || {};
    const scoreCategories = (p.categories && p.categories.length)
      ? p.categories
      : ['Học tập', 'Phong trào', 'Kỷ luật', 'Chuyên cần', 'Nề nếp'];

    const allowedPositive = defaultPositiveCriteria.filter(c => scoreCategories.includes(c.category));
    const allowedNegative = defaultNegativeCriteria.filter(c => scoreCategories.includes(c.category));
    const criteriaToUsePositive = allowedPositive.length ? allowedPositive : defaultPositiveCriteria;
    const criteriaToUseNegative = allowedNegative.length ? allowedNegative : defaultNegativeCriteria;

    const performerName = data.identity ? `${data.identity.name} (${data.identity.title})` : 'Ban Cán Sự';
    const canSelectClass = data.selectedRoleKey && !data.groupId;

    const pointsPanelHtml = (p.points || p.scoreEdit) ? `
      <section data-panel="points">
        <div class="max-w-7xl mx-auto space-y-2 pb-4 pt-1 px-1 md:px-2" id="points-view-wrapper">
          <div class="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 overflow-visible flex flex-col" id="points-form-card">
            
            <!-- Header Form / Banner Tích Điểm - Ảnh 1 chuẩn GVCN -->
            <section id="page-banner-points" class="page-banner" data-page-banner="points" data-tone="sky" aria-labelledby="page-banner-points-title">
              <div class="page-banner-body">
                <div class="page-banner-icon" aria-hidden="true">
                  <i class="ph-fill ph-plus-circle"></i>
                </div>
                <div class="page-banner-copy">
                  <p class="page-banner-kicker">Ghi nhận nỗ lực</p>
                  <h1 id="page-banner-points-title" class="page-banner-title">Cộng / trừ điểm thi đua</h1>
                  <p class="page-banner-description">Ghi nhận thành tích, theo dõi thi đua và tạo động lực học tập.</p>
                  <div class="page-banner-details">
                    <div id="points-target-badge" role="status">Chọn học sinh để bắt đầu chấm điểm</div>
                  </div>
                </div>
                <div class="page-banner-side">
                  <button type="button" class="page-banner-action" title="Đổi ảnh">
                    <i class="ph-bold ph-image" aria-hidden="true"></i><span>Đổi ảnh</span>
                  </button>
                </div>
              </div>
            </section>

            <form id="score-form" data-request="${safeUuid()}" ${!p.points ? 'hidden' : ''} class="flex flex-col flex-1">
              <div class="p-3 md:p-3.5 flex-1">
                <!-- 1. Loại thao tác (Cộng / Trừ) -->
                <div class="flex rounded-xl p-1 bg-slate-100 border border-slate-200/60 shadow-inner mb-2">
                  <button type="button" id="btn-action-add" class="flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all bg-emerald-600 text-white shadow-md cursor-pointer">
                    <i class="ph-bold ph-plus-circle text-base"></i> <span>+ Khen Thưởng</span>
                  </button>
                  <button type="button" id="btn-action-subtract" class="flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all bg-transparent text-slate-500 hover:text-slate-800 cursor-pointer">
                    <i class="ph-bold ph-minus-circle text-base"></i> <span>- Kỷ Luật</span>
                  </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-3">
                  <!-- Cột bên trái: Đối tượng & Lý do -->
                  <div class="space-y-2.5">
                    <!-- 2. Đối tượng áp dụng -->
                    <div>
                      <label class="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-widest">ĐỐI TƯỢNG ÁP DỤNG:</label>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <button type="button" id="btn-target-student" class="py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-[#1e1b4b] text-white shadow-md cursor-pointer">
                          <i class="ph-fill ph-user text-base"></i> Học Sinh
                        </button>
                        <button type="button" id="btn-target-group" class="py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer">
                          <i class="ph-fill ph-users text-base"></i> Nhóm/Tổ
                        </button>
                        <button type="button" id="btn-target-class" class="py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer ${canSelectClass ? '' : 'opacity-50 cursor-not-allowed'}">
                          <i class="ph-fill ph-users-three text-base"></i> Cả Lớp
                        </button>
                      </div>
                    </div>

                    <!-- 3. Hộp chọn đối tượng (Autocomplete + Native Select) -->
                    <div class="relative" id="point-student-autocomplete">
                      <div class="relative">
                        <i class="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-lg pointer-events-none"></i>
                        <input type="text" id="pf-student-search" autocomplete="off" placeholder="Gõ tên học sinh..." class="w-full pl-10 pr-10 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm md:text-base font-black text-slate-800 placeholder:text-slate-400 placeholder:font-semibold outline-none shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:shadow-lg">
                        <button type="button" id="pf-student-clear-btn" class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all hidden" title="Xóa lựa chọn">
                          <i class="ph-bold ph-x"></i>
                        </button>
                      </div>
                      
                      <!-- Native select for test & standard form submissions -->
                      <select name="studentId" id="score-student-select" class="w-full mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
                        ${data.students.map(s => `<option value="${esc(s.id)}">${esc(s.name)} • ${esc(s.group)} (${esc(s.points || 0)}đ)</option>`).join('')}
                      </select>

                      <div id="pf-student-suggestions" class="hidden absolute left-0 right-0 top-[calc(100%+6px)] z-[100] max-h-[200px] overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-slate-200 shadow-xl p-2"></div>
                      <div class="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 px-1">
                        <i class="ph-bold ph-info"></i> Gõ từng ký tự để tìm nhanh theo tên, tổ hoặc mã học sinh
                      </div>
                    </div>

                    <!-- 6. Lý do & Ghi chú -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div class="md:col-span-2">
                        <label class="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">LÝ DO / NỘI DUNG THAY ĐỔI ĐIỂM <span class="text-red-500">*</span></label>
                        <input type="text" id="pf-reason-input" name="reason" placeholder="Vd: Đạt điểm 9, 10 môn Toán..." class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-all" required maxlength="500">
                      </div>
                      <div>
                        <label class="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">GHI CHÚ BỔ SUNG (KHÔNG BẮT BUỘC):</label>
                        <input type="text" id="pf-note-input" name="note" placeholder="Nhập ghi chú thêm cho học sinh hoặc phụ huynh..." class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 shadow-sm transition-all italic">
                      </div>
                      <div>
                        <label class="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">NGƯỜI THỰC HIỆN:</label>
                        <input type="text" readonly value="${esc(performerName)}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 outline-none cursor-not-allowed shadow-inner">
                      </div>
                    </div>
                  </div>

                  <!-- Cột bên phải: Tiêu chí nhanh & Số điểm -->
                  <div class="space-y-2.5">
                    <!-- 4. Tiêu chí nhanh -->
                    <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5">
                      <div class="flex justify-between items-center gap-2 mb-2">
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">CHỌN MẪU NHANH:</label>
                        <span class="text-[10px] text-slate-400 italic">Gợi ý lý do & điểm · không ghi đè điểm nhập tay</span>
                      </div>
                      <div id="criteria-list-container" class="grid grid-cols-2 gap-1.5 max-h-[135px] overflow-y-auto custom-scrollbar pr-1">
                        ${criteriaToUsePositive.map(c => `
                          <button type="button" class="criteria-item-btn" data-criterion-points="${c.points}" data-criterion-reason="${esc(c.reason)}" data-criterion-category="${esc(c.category)}">
                            <span class="font-bold text-slate-700 text-[10px] line-clamp-1 min-w-0">${esc(c.reason)}</span>
                            <span class="font-black text-[10px] shrink-0 text-emerald-600">+${c.points}đ</span>
                          </button>
                        `).join('')}
                      </div>
                    </div>

                    <!-- 5. Số điểm & Danh mục -->
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">SỐ ĐIỂM THAY ĐỔI:</label>
                        <div class="relative">
                          <div id="pf-sign-indicator" class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-emerald-600">+</div>
                          <input type="number" id="pf-points-input" name="points" value="2" min="1" max="100" class="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-all" required>
                        </div>
                      </div>
                      <div>
                        <label class="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">PHÂN LOẠI THI ĐUA:</label>
                        <div class="relative">
                          <select id="pf-category-select" name="category" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm transition-all appearance-none cursor-pointer">
                            ${scoreCategories.map(cat => `<option value="${esc(cat)}">${esc(cat)}</option>`).join('')}
                          </select>
                          <i class="ph-bold ph-caret-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-base"></i>
                        </div>
                      </div>
                    </div>

                    <!-- Banner Xem nhanh -->
                    <div class="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2">
                      <div class="text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500 mb-0.5">XEM NHANH</div>
                      <div id="quick-preview-text" class="text-xs font-bold text-slate-700 leading-snug">
                        Chọn đối tượng để bắt đầu cộng / trừ điểm.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer Form chuẩn GVCN -->
              <div class="sticky bottom-0 z-40 px-3 py-2.5 bg-white/95 backdrop-blur-xl border-t border-slate-200 flex justify-between items-center gap-2 shadow-[0_-10px_30px_rgba(15,23,42,.08)] rounded-b-[1.5rem]">
                <button type="button" id="btn-reset-points" class="px-3 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors text-xs shadow-sm cursor-pointer">
                  Làm Mới
                </button>
                <div class="flex items-center gap-2">
                  <button type="button" data-action="cancel-edit" class="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-lg hover:bg-rose-100 text-xs shadow-sm cursor-pointer" hidden>
                    Hủy sửa
                  </button>
                  <button type="submit" id="points-submit-btn" class="px-5 py-2.5 font-black rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-xs md:text-sm bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 cursor-pointer">
                    <span id="submit-text">Xác Nhận & Kiểm Tra</span>
                    <span id="points-preview-badge" class="bg-white/20 px-2.5 py-0.5 rounded-lg text-xs font-black">+2đ</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
          ${scoreHistory()}
        </div>
      </section>
    ` : '';

    const dutyPanelHtml = p.dutyView ? `
      <section data-panel="duty" class="max-w-7xl mx-auto space-y-3 pb-8 pt-1 px-1 md:px-2">
        <section class="page-banner" data-page-banner="duty" data-tone="teal">
          <div class="page-banner-body">
            <div class="page-banner-icon"><i class="ph-fill ph-broom text-2xl text-teal-600"></i></div>
            <div class="page-banner-copy">
              <p class="page-banner-kicker">Lớp học xanh – sạch – đẹp</p>
              <h1 class="page-banner-title">Trực nhật • Tuần ${esc(data.week)}</h1>
              <p class="page-banner-description">Chấm điểm ca trực và theo dõi nền nếp vệ sinh lớp</p>
            </div>
          </div>
        </section>
        <div class="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4 md:p-6 space-y-3">
          ${data.duties.filter(d => d.week === data.week).map(d => {
            const s = data.students.find(s => s.id === d.studentId);
            return `
              <form class="duty-form bcs-person-card" data-week="${esc(d.week)}" data-day="${esc(d.day)}" data-shift="${esc(d.shift)}" data-id="${esc(d.studentId)}">
                <h3 class="font-bold text-sm text-slate-800 mb-2">${esc(s?.name)} • ${esc(days[d.day])} • ${d.shift === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}</h3>
                ${!p.duty || d.teacherEvaluation?.status || d.evaluation?.teacherLocked ? (!p.duty ? '<p class="text-xs text-slate-500">Chỉ xem lịch trực nhật theo phân quyền được giao.</p>' : '<p class="text-xs text-slate-500">Ca trực/điểm đã được cán bộ phụ trách hoặc GVCN xử lý.</p>') : `
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <label class="text-xs font-bold text-slate-600">Đánh giá
                      <select name="rating" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                        ${Object.entries(ratings).map(([key, label]) => `<option value="${key}" ${d.evaluation?.rating === key ? 'selected' : ''}>${label}</option>`).join('')}
                      </select>
                    </label>
                    <label class="text-xs font-bold text-slate-600">Lý do
                      <textarea name="reason" required maxlength="500" class="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" rows="1">${esc(d.evaluation?.reason || '')}</textarea>
                    </label>
                  </div>
                  <button type="submit" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">Lưu đánh giá / sửa lý do</button>
                `}
              </form>
            `;
          }).join('') || '<p class="text-xs text-slate-400 italic">Tổ chưa có ca trực được phân công trong tuần.</p>'}
        </div>
      </section>
    ` : '';

    el('content').innerHTML = dashboardHtml() + pointsPanelHtml + dutyPanelHtml;

    if (p.attendanceView) {
      const section = document.createElement('section');
      section.dataset.panel = 'attendance';
      section.className = 'max-w-7xl mx-auto space-y-3 pb-8 pt-1 px-1 md:px-2';
      section.innerHTML = `
        <section class="page-banner" data-page-banner="attendance" data-tone="teal">
          <div class="page-banner-body">
            <div class="page-banner-icon"><i class="ph-fill ph-calendar-check text-2xl text-teal-600"></i></div>
            <div class="page-banner-copy">
              <p class="page-banner-kicker">Điểm danh mỗi ngày</p>
              <h1 class="page-banner-title">Quản lý chuyên cần • ${esc(data.today)}</h1>
              <p class="page-banner-description">Theo dõi chuyên cần và cập nhật tình hình đi học của học sinh</p>
            </div>
          </div>
        </section>
        <div class="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4 md:p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${data.students.map(s => `
              <form class="attendance-form bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between gap-3" data-id="${esc(s.id)}">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">${esc(s.name.slice(-2))}</div>
                  <div class="min-w-0 flex-1">
                    <div class="font-bold text-xs text-slate-800 truncate">${esc(s.name)}</div>
                    <div class="text-[10px] text-slate-500">${esc(s.group)}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <select name="status" class="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700" ${p.attendance ? '' : 'disabled'}>
                    <option value="" disabled ${!s.attendance ? 'selected' : ''}>Chưa ghi nhận</option>
                    ${Object.entries({present:'Có mặt',late:'Đi muộn',excused:'Vắng P',unexcused:'Vắng KP'}).map(([key,label]) => `<option value="${key}" ${s.attendance===key?'selected':''}>${label}</option>`).join('')}
                  </select>
                  ${p.attendance ? `<button type="submit" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer">Lưu</button>` : ''}
                </div>
              </form>
            `).join('')}
          </div>
        </div>
      `;
      el('content').appendChild(section);
      section.querySelectorAll('form').forEach(form => form.onsubmit = event => {
        event.preventDefault();
        if (working || leaving) return;
        dirty = true;
        const status = new FormData(form).get('status');
        if (!status) return;
        run(async () => {
          await api({ action: 'attendance', studentId: form.dataset.id, status });
          await load();
          message('Đã lưu điểm danh và điểm chuyên cần.');
        });
      });
    }

    if (p.grades) {
      const section = document.createElement('section');
      section.dataset.panel = 'grades';
      section.className = 'max-w-7xl mx-auto space-y-3 pb-8 pt-1 px-1 md:px-2';
      section.innerHTML = `
        <section class="page-banner" data-page-banner="report" data-tone="sky">
          <div class="page-banner-body">
            <div class="page-banner-icon"><i class="ph-fill ph-clipboard-text text-2xl text-sky-600"></i></div>
            <div class="page-banner-copy">
              <p class="page-banner-kicker">Học tập & Tiến bộ</p>
              <h1 class="page-banner-title">Sổ điểm học tập</h1>
              <p class="page-banner-description">Nhập / sửa điểm theo môn và học kỳ</p>
            </div>
          </div>
        </section>
        <div class="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4 md:p-6">
          <form id="grade-form" data-request="${safeUuid()}" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <label class="text-xs font-bold text-slate-600">Học sinh
                <select name="studentId" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">${data.students.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
              </label>
              <label class="text-xs font-bold text-slate-600">Môn học
                <select name="subjectId" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">${data.subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
              </label>
              <label class="text-xs font-bold text-slate-600">Học kỳ
                <select name="semester" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"><option>HK1</option><option>HK2</option></select>
              </label>
              <label class="text-xs font-bold text-slate-600">Cột điểm
                <select name="sequence" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">${['TX1','TX2','TX3','TX4','Giữa kỳ','Cuối kỳ'].map((s,i) => `<option value="${i+1}">${s}</option>`).join('')}</select>
              </label>
            </div>
            <div class="flex items-center justify-between gap-3 pt-2">
              <p id="grade-current" class="text-xs font-bold text-indigo-700"></p>
              <div class="flex items-center gap-2">
                <input name="score" type="number" min="0" max="10" step="any" inputmode="decimal" placeholder="Điểm mới (0-10)" class="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">Lưu điểm</button>
              </div>
            </div>
          </form>
          <div class="mt-4 pt-3 border-t border-slate-100">
            <details class="text-xs text-slate-600">
              <summary class="font-bold cursor-pointer">Xem điểm đã ghi nhận</summary>
              <div class="space-y-1 mt-2">
                ${data.grades.map(r => `<p>${esc(data.students.find(s => s.id === r.studentId)?.name)} • ${esc(data.subjects.find(s => s.id === r.subjectId)?.name)} • ${esc(r.semester)} • ${Number(r.sequence)<=4 ? 'TX'+Number(r.sequence) : Number(r.sequence)===5 ? 'Giữa kỳ' : 'Cuối kỳ'}: <b>${esc(r.score)}</b></p>`).join('') || '<p class="italic text-slate-400">Chưa có điểm.</p>'}
              </div>
            </details>
          </div>
        </div>
      </section>
    `;
    el('content').appendChild(section);

    const form = el('grade-form');
    const currentRecord = () => data.grades.find(r => r.studentId === form.querySelector('[name=studentId]').value && r.subjectId === form.querySelector('[name=subjectId]').value && r.semester === form.querySelector('[name=semester]').value && Number(r.sequence) === Number(form.querySelector('[name=sequence]').value));
    const updateCurrent = () => { el('grade-current').textContent = 'Điểm hiện tại: ' + (currentRecord()?.score ?? 'Chưa nhập'); };
    form.querySelectorAll('select').forEach(select => select.addEventListener('change', updateCurrent));
    updateCurrent();
    form.onsubmit = event => {
      event.preventDefault();
      if (working || leaving) return;
      dirty = true;
      const values = Object.fromEntries(new FormData(form));
      if (values.score === '' && !confirm('Xóa điểm đang chọn và hoàn tác đóng góp điểm theo quy định của lớp?')) return;
      run(async () => {
        await api({ action: 'grade', ...values, expectedRecord: currentRecord()?.version ?? null, requestId: form.dataset.request });
        await load();
        message('Đã lưu điểm học tập và cập nhật điểm tích.');
      });
    };
  }

  // Cài đặt tương tác cho Form Tích Điểm (Chuẩn Ảnh 1)
  const scoreForm = el('score-form');
  if (scoreForm) {
    const btnActionAdd = scoreForm.querySelector('#btn-action-add');
    const btnActionSubtract = scoreForm.querySelector('#btn-action-subtract');
    const signIndicator = scoreForm.querySelector('#pf-sign-indicator');
    const pointsInput = scoreForm.querySelector('#pf-points-input');
    const submitBtn = scoreForm.querySelector('#points-submit-btn');
    const pointsPreviewBadge = scoreForm.querySelector('#points-preview-badge');
    const criteriaContainer = scoreForm.querySelector('#criteria-list-container');
    const studentSelect = scoreForm.querySelector('#score-student-select');
    const searchInput = scoreForm.querySelector('#pf-student-search');
    const clearBtn = scoreForm.querySelector('#pf-student-clear-btn');
    const suggestionsBox = scoreForm.querySelector('#pf-student-suggestions');
    const reasonInput = scoreForm.querySelector('#pf-reason-input');
    const categorySelect = scoreForm.querySelector('#pf-category-select');
    const quickPreviewText = scoreForm.querySelector('#quick-preview-text');
    const targetBadge = root.querySelector('#points-target-badge');

    function updatePreviewBadge() {
      const val = Math.abs(Number(pointsInput?.value) || 0);
      const sign = currentActionType === 'subtract' ? '-' : '+';
      if (pointsPreviewBadge) pointsPreviewBadge.textContent = `${sign}${val}đ`;
    }

    function updateQuickPreview() {
      if (currentTargetType === 'group') {
        if (quickPreviewText) quickPreviewText.textContent = 'Đang áp dụng theo tổ / nhóm đã chọn.';
        if (targetBadge) targetBadge.textContent = 'Đang chọn: Áp dụng theo nhóm / tổ';
        return;
      }
      if (currentTargetType === 'class') {
        if (quickPreviewText) quickPreviewText.textContent = 'Đang áp dụng cho toàn lớp.';
        if (targetBadge) targetBadge.textContent = 'Đang chọn: Áp dụng cho toàn lớp';
        return;
      }
      const selectedStudent = (data.students || []).find(s => String(s.id) === String(studentSelect?.value));
      if (selectedStudent) {
        if (quickPreviewText) quickPreviewText.innerHTML = `Đang thao tác với <span class="text-indigo-700 font-bold">${esc(selectedStudent.name)}</span> • ${esc(selectedStudent.group)} • ${esc(selectedStudent.points || 0)}đ`;
        if (targetBadge) targetBadge.innerHTML = `Đang chọn: <b>${esc(selectedStudent.name)}</b> (${esc(selectedStudent.group)} - ${esc(selectedStudent.points || 0)}đ)`;
      } else {
        if (quickPreviewText) quickPreviewText.textContent = 'Chọn đối tượng để bắt đầu cộng / trừ điểm.';
        if (targetBadge) targetBadge.textContent = 'Chọn học sinh để bắt đầu chấm điểm';
      }
    }

    function renderCriteriaList() {
      if (!criteriaContainer) return;
      const isAdd = currentActionType === 'add';
      const list = isAdd ? criteriaToUsePositive : criteriaToUseNegative;
      criteriaContainer.innerHTML = list.map(c => `
        <button type="button" class="criteria-item-btn ${!isAdd ? 'negative' : ''}" data-criterion-points="${c.points}" data-criterion-reason="${esc(c.reason)}" data-criterion-category="${esc(c.category)}">
          <span class="font-bold text-slate-700 text-[10px] line-clamp-1 min-w-0">${esc(c.reason)}</span>
          <span class="font-black text-[10px] shrink-0 ${isAdd ? 'text-emerald-600' : 'text-rose-600'}">${isAdd ? '+' : '-'}${c.points}đ</span>
        </button>
      `).join('');
      criteriaContainer.querySelectorAll('.criteria-item-btn').forEach(btn => {
        btn.onclick = () => {
          const pts = Number(btn.dataset.criterionPoints) || 0;
          const rsn = btn.dataset.criterionReason || '';
          const cat = btn.dataset.criterionCategory || '';
          if (reasonInput) reasonInput.value = rsn;
          if (pointsInput) pointsInput.value = pts;
          if (categorySelect && [...categorySelect.options].some(o => o.value === cat)) categorySelect.value = cat;
          updatePreviewBadge();
          dirty = true;
        };
      });
    }

    function setActionType(type) {
      currentActionType = type;
      const isAdd = type === 'add';
      if (btnActionAdd) btnActionAdd.className = `flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${isAdd ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-800'}`;
      if (btnActionSubtract) btnActionSubtract.className = `flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${!isAdd ? 'bg-rose-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-800'}`;
      if (signIndicator) {
        signIndicator.textContent = isAdd ? '+' : '-';
        signIndicator.className = `absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg ${isAdd ? 'text-emerald-600' : 'text-rose-600'}`;
      }
      if (submitBtn) {
        submitBtn.className = `px-5 py-2.5 font-black rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-xs md:text-sm text-white cursor-pointer ${isAdd ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`;
      }
      renderCriteriaList();
      updatePreviewBadge();
    }

    if (btnActionAdd) btnActionAdd.onclick = () => setActionType('add');
    if (btnActionSubtract) btnActionSubtract.onclick = () => setActionType('subtract');
    if (pointsInput) pointsInput.oninput = () => updatePreviewBadge();

    // Target Switcher
    const btnTargetStudent = scoreForm.querySelector('#btn-target-student');
    const btnTargetGroup = scoreForm.querySelector('#btn-target-group');
    const btnTargetClass = scoreForm.querySelector('#btn-target-class');

    function setTarget(t) {
      currentTargetType = t;
      if (btnTargetStudent) btnTargetStudent.className = `py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${t === 'student' ? 'bg-[#1e1b4b] text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600'}`;
      if (btnTargetGroup) btnTargetGroup.className = `py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${t === 'group' ? 'bg-[#1e1b4b] text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600'}`;
      if (btnTargetClass) btnTargetClass.className = `py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${t === 'class' ? 'bg-[#1e1b4b] text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600'} ${canSelectClass ? '' : 'opacity-50 cursor-not-allowed'}`;
      updateQuickPreview();
    }

    if (btnTargetStudent) btnTargetStudent.onclick = () => setTarget('student');
    if (btnTargetGroup) btnTargetGroup.onclick = () => setTarget('group');
    if (btnTargetClass && canSelectClass) btnTargetClass.onclick = () => setTarget('class');

    // Autocomplete Student Search
    function filterSuggestions(query = '') {
      if (!suggestionsBox) return;
      const q = String(query).trim().toLowerCase();
      const matched = (data.students || []).filter(s => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || String(s.group || '').toLowerCase().includes(q) || String(s.id).includes(q);
      });
      if (!matched.length) {
        suggestionsBox.innerHTML = '<div class="p-2 text-xs text-slate-400 text-center">Không tìm thấy học sinh phù hợp</div>';
      } else {
        suggestionsBox.innerHTML = matched.map(s => `
          <div class="suggestion-item p-2 hover:bg-indigo-50 rounded-lg cursor-pointer flex items-center justify-between transition-colors" data-id="${esc(s.id)}">
            <span class="font-bold text-xs text-slate-800">${esc(s.name)}</span>
            <span class="text-[10px] text-slate-500 font-semibold">${esc(s.group)} • ${esc(s.points || 0)}đ</span>
          </div>
        `).join('');
        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
          item.onclick = () => {
            const id = item.dataset.id;
            const s = (data.students || []).find(st => String(st.id) === id);
            if (s) {
              if (studentSelect) {
                studentSelect.value = s.id;
                studentSelect.dispatchEvent(new Event('input', { bubbles: true }));
                studentSelect.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (searchInput) searchInput.value = s.name;
              if (clearBtn) clearBtn.classList.remove('hidden');
              suggestionsBox.classList.add('hidden');
              updateQuickPreview();
            }
          };
        });
      }
      suggestionsBox.classList.remove('hidden');
    }

    if (searchInput) {
      searchInput.onfocus = () => filterSuggestions(searchInput.value);
      searchInput.oninput = () => {
        filterSuggestions(searchInput.value);
        if (clearBtn) clearBtn.classList.toggle('hidden', !searchInput.value);
      };
      // Khi click ra ngoài thì ẩn gợi ý
      root.addEventListener('click', event => {
        if (!scoreForm.querySelector('#point-student-autocomplete')?.contains(event.target)) {
          suggestionsBox?.classList.add('hidden');
        }
      });
    }

    if (clearBtn) {
      clearBtn.onclick = () => {
        if (searchInput) searchInput.value = '';
        clearBtn.classList.add('hidden');
        if (suggestionsBox) suggestionsBox.classList.add('hidden');
        if (studentSelect && data.students?.[0]) {
          studentSelect.value = data.students[0].id;
          studentSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }
        updateQuickPreview();
      };
    }

    if (studentSelect) {
      const onSelectChange = () => {
        const s = (data.students || []).find(st => String(st.id) === String(studentSelect.value));
        if (s && searchInput) searchInput.value = s.name;
        if (clearBtn) clearBtn.classList.toggle('hidden', !studentSelect.value);
        updateQuickPreview();
      };
      studentSelect.addEventListener('change', onSelectChange);
      studentSelect.addEventListener('input', onSelectChange);
      // Khởi tạo tên học sinh đầu tiên vào ô search
      const initStudent = (data.students || []).find(s => String(s.id) === String(studentSelect.value));
      if (initStudent && searchInput && !searchInput.value) {
        searchInput.value = initStudent.name;
        if (clearBtn) clearBtn.classList.remove('hidden');
      }
    }

    // Nút Làm Mới Form
    const btnReset = scoreForm.querySelector('#btn-reset-points');
    if (btnReset) {
      btnReset.onclick = () => {
        const firstStudent = data.students?.[0];
        if (studentSelect && firstStudent) {
          studentSelect.value = firstStudent.id;
          studentSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (searchInput) searchInput.value = firstStudent ? firstStudent.name : '';
        if (reasonInput) reasonInput.value = '';
        const noteInput = scoreForm.querySelector('#pf-note-input');
        if (noteInput) noteInput.value = '';
        if (pointsInput) pointsInput.value = '2';
        setActionType('add');
        setTarget('student');
        updateQuickPreview();
        updatePreviewBadge();
        dirty = false;
      };
    }

    // Gắn handler submit
    scoreForm.onsubmit = event => {
      event.preventDefault();
      if (working || leaving) return;
      dirty = true;
      const form = event.target || scoreForm;
      const values = Object.fromEntries(new FormData(form));
      if (form.dataset.studentId) values.studentId = form.dataset.studentId;

      let pts = Number(values.points);
      if (!isNaN(pts) && pts !== 0) {
        if (currentActionType === 'subtract') {
          pts = -Math.abs(pts);
        } else if (currentActionType === 'add') {
          pts = pts < 0 ? pts : Math.abs(pts);
        }
        values.points = pts;
      }

      const payload = {
        action: form.dataset.historyId ? 'score-edit' : 'score',
        ...values,
        requestId: form.dataset.request || safeUuid(),
        historyId: form.dataset.historyId,
        expectedRecord: form.dataset.version,
        roleKey: selectedRoleKey
      };

      rememberScore(payload);
      void run(async () => {
        const result = await api(payload);
        if (result?.saved !== true) throw new Error('Máy chủ chưa xác nhận lưu điểm. Nội dung nhập được giữ lại; kiểm tra lịch sử trước khi gửi tiếp.');
        if (!root.isConnected || leaving) return;
        clearScoreDraft();
        dirty = false;
        try { await load(); }
        catch (error) {
          if (!root.isConnected || leaving) return;
          renderDeputy();
          showRecovery(error, 'Đã lưu điểm trực tiếp. Máy chủ đã lưu điểm, nhưng chưa tải được danh sách mới. Bấm Làm mới dữ liệu.');
          return;
        }
        message('Đã lưu điểm trực tiếp và đồng bộ dữ liệu.');
      });
    };

    renderCriteriaList();
    updateQuickPreview();
    updatePreviewBadge();
  }

  installDashboardNavigation();

  root.querySelectorAll('.duty-form').forEach(form => form.onsubmit = event => {
    event.preventDefault();
    if (working || leaving) return;
    dirty = true;
    const values = Object.fromEntries(new FormData(form));
    run(async () => {
      await api({ action: 'duty', ...values, week: form.dataset.week, day: form.dataset.day, shift: form.dataset.shift, studentId: form.dataset.id });
      await load();
      message('Đã lưu đánh giá và cập nhật điểm theo cấu hình lớp.');
    });
  });

  // Nút tra cứu phụ huynh trên topbar
  const lookupBtn = el('bcs-parent-lookup-btn');
  if (lookupBtn) {
    lookupBtn.onclick = () => {
      if (typeof window.openParentLookupModal === 'function') window.openParentLookupModal();
    };
  }
}

  async function load(permissionEvent = false, discardScoreDraft = false) {
    let next;
    try { next = await api({ action: 'view' }); }
    catch (error) {
      if (!permissionEvent || !selectedRoleKey || !['ROLE_UNAVAILABLE','ASSIGNMENT_CHANGED'].includes(error.code)) throw error;
      selectedRoleKey = '';
      next = await api({ action: 'view' });
    }
    if (!root.isConnected || leaving) return;
    if (discardScoreDraft) clearScoreDraft();
    const accessShape = d => JSON.stringify([d?.selectedRoleKey, d?.groupId, d?.permissions, d?.availableRoles, (d?.students || []).map(s => s.id)]);
    if (permissionEvent && dirty && data && accessShape(data) === accessShape(next)) {
      recoveryActive = false; sessionBlocked = false; el('recovery').hidden = true; el('recovery').innerHTML = '';
      return;
    }
    const discardedDraft = permissionEvent && dirty;
    recoveryActive = false; sessionBlocked = false; el('recovery').hidden = true; el('recovery').innerHTML = '';
    data = next;
    selectedRoleKey = data.selectedRoleKey || selectedRoleKey || '';

    if (data.identity) {
      const h1 = root.querySelector('h1');
      if (h1) h1.textContent = `${data.identity.name} • ${data.identity.title}`;
      const officerRole = root.querySelector('#bcs-officer-role');
      if (officerRole) officerRole.textContent = data.identity.title;
      const avatar = el('bcs-avatar');
      if (avatar) avatar.textContent = String(data.identity.name || 'BC').trim().split(/\s+/).slice(-2).map(s => s[0]).join('');
      const welcome = el('bcs-welcome');
      if (welcome) welcome.textContent = `Chào ${data.identity.name}!`;
    }

    dirty = false;
    renderDeputy();
    message(discardedDraft ? 'Quyền đã thay đổi. Biểu mẫu chưa gửi đã được đóng để tránh thao tác sai phạm vi.' : '');
    restoreScoreDraft();
  }

  const handleAction = event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'login' || action === 'home') { void leaveWorkspace(); return; }
    if (action === 'refresh') { void run(refresh); return; }
    if (action === 'cancel-edit' && !working) { renderDeputy(); dirty = false; return; }
    if (action === 'edit-score') {
      if (working || (dirty && !confirm('Bỏ nội dung chưa gửi để sửa bản ghi này?'))) return;
      const student = data.students.find(s => s.id === button.dataset.student);
      const entry = student?.history.find(h => h.id === id && h.canEdit);
      const form = el('score-form');
      if (!entry || !form) return;
      form.hidden = false;
      form.dataset.historyId = entry.id;
      form.dataset.studentId = student.id;
      form.dataset.version = entry.version;
      form.dataset.request = safeUuid();

      for (const [key, value] of Object.entries({ studentId: student.id, points: Math.abs(entry.points), category: entry.category, reason: entry.reason })) {
        const field = form.querySelector(`[name=${key}]`);
        if (field) field.value = value;
      }

      if (Number(entry.points) < 0) {
        currentActionType = 'subtract';
        const btnActionSubtract = form.querySelector('#btn-action-subtract');
        if (btnActionSubtract) btnActionSubtract.click();
      } else {
        currentActionType = 'add';
        const btnActionAdd = form.querySelector('#btn-action-add');
        if (btnActionAdd) btnActionAdd.click();
      }

      const studentSelect = form.querySelector('[name=studentId]');
      if (studentSelect) studentSelect.disabled = true;
      const cancelBtn = form.querySelector('[data-action=cancel-edit]');
      if (cancelBtn) cancelBtn.hidden = false;
      const titleBanner = root.querySelector('#page-banner-points-title');
      if (titleBanner) titleBanner.textContent = 'Sửa điểm đã ghi nhận';
      dirty = true;
      showPanel('points');
    }
  };

  el('content').addEventListener('click', handleAction);
  el('recovery').addEventListener('click', handleAction);

  function requestPermissionRefresh() {
    if (leaving || !root.isConnected) return;
    permissionRefreshQueued = true;
    clearTimeout(permissionRefreshTimer);
    permissionRefreshTimer = setTimeout(() => {
      if (working || leaving || !root.isConnected) return;
      permissionRefreshQueued = false;
      void run(async () => {
        const fresh = await window.cloudServices.refreshSession();
        if (!root.isConnected || leaving) return;
        if (fresh.role !== member.role) { window.startApp(); return; }
        await load(true);
      });
    }, 100);
  }

  const stopPermissions = window.cloudServices.subscribePermissionChanges?.(requestPermissionRefresh, () => {
    requestPermissionRefresh();
  });

  const timer = setInterval(() => {
    if (!root.isConnected) { clearInterval(timer); return; }
    if (!working && !leaving && !document.hidden) {
      if (recoveryActive && !sessionBlocked) requestPermissionRefresh();
      else if (!recoveryActive && !dirty && !(root.contains(document.activeElement) && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))) run(() => load());
    }
  }, 15000);

  window.closeDeputyWorkspace = () => {
    clearInterval(timer);
    clearTimeout(permissionRefreshTimer);
    stopPermissions?.();
    desktopMenu?.removeEventListener('change', syncSidebarViewport);
    root.remove();
  };

  el('logout').onclick = () => { void leaveWorkspace(); };
  await run(load);
};
