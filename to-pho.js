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
  const DUTY_DAYS_LIST = [
    { key: 'mon', label: 'Thứ Hai', short: 'T2' },
    { key: 'tue', label: 'Thứ Ba', short: 'T3' },
    { key: 'wed', label: 'Thứ Tư', short: 'T4' },
    { key: 'thu', label: 'Thứ Năm', short: 'T5' },
    { key: 'fri', label: 'Thứ Sáu', short: 'T6' },
    { key: 'sat', label: 'Thứ Bảy', short: 'T7' }
  ];
  const DUTY_SHIFTS_LIST = [
    { key: 'morning', label: 'Buổi sáng', short: 'Sáng', icon: 'ph-sun' },
    { key: 'afternoon', label: 'Buổi chiều', short: 'Chiều', icon: 'ph-cloud-sun' }
  ];
  const DUTY_EVAL_CFG = {
    good: { label: 'Tốt (+5đ)', short: 'Tốt', points: 5, icon: '🌟', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    done: { label: 'Đạt (0đ)', short: 'Đạt', points: 0, icon: '✅', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    incomplete: { label: 'Chưa đạt (-3đ)', short: 'Chưa đạt', points: -3, icon: '⚠️', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    absent: { label: 'Nghỉ trực (-5đ)', short: 'Nghỉ trực', points: -5, icon: '❌', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  };
  let dutySelectedDay = '';
  let dutySelectedShift = 'morning';
  const getTodayDayKey = () => {
    try {
      const todayStr = data?.today || new Date().toISOString().slice(0, 10);
      const d = new Date(todayStr + 'T00:00:00');
      const day = d.getDay();
      const map = ['mon', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return map[day] || 'mon';
    } catch (_) {
      return 'mon';
    }
  };
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

    if (!dutySelectedDay) dutySelectedDay = getTodayDayKey();
    if (!['morning', 'afternoon'].includes(dutySelectedShift)) dutySelectedShift = 'morning';

    const parseDutyDate = k => {
      const parts = String(k || '').split('-').map(Number);
      return new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
    };
    const fmtDutyDate = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const getDutyDayDate = (weekMondayStr, dayIdx) => {
      const d = parseDutyDate(weekMondayStr);
      d.setDate(d.getDate() + dayIdx);
      return d;
    };
    const getDutyWeekRange = weekMondayStr => {
      const a = parseDutyDate(weekMondayStr);
      const b = new Date(a);
      b.setDate(b.getDate() + 5);
      return `${fmtDutyDate(a)} - ${fmtDutyDate(b)}/${b.getFullYear()}`;
    };

    const currentWeekDuties = (data.duties || []).filter(d => d.week === data.week);
    const getShiftDuties = (dayKey, shiftKey) => currentWeekDuties.filter(d => d.day === dayKey && d.shift === shiftKey);
    const getShiftStudents = (dayKey, shiftKey) => {
      const ds = getShiftDuties(dayKey, shiftKey);
      return ds.map(d => (data.students || []).find(s => String(s.id) === String(d.studentId))).filter(Boolean);
    };
    const getShiftEval = (dayKey, shiftKey) => {
      const ds = getShiftDuties(dayKey, shiftKey);
      for (const d of ds) {
        if (d.teacherEvaluation?.status) return { status: d.teacherEvaluation.status, teacher: true };
        if (d.evaluation?.rating) return { status: d.evaluation.rating, reason: d.evaluation.reason || '', teacherLocked: d.evaluation.teacherLocked };
      }
      return null;
    };
    const renderDutyStatusBadge = ev => {
      if (!ev || !DUTY_EVAL_CFG[ev.status]) {
        return '<span class="duty-status bg-slate-50 text-slate-500 border border-slate-200">Chưa đánh giá</span>';
      }
      const c = DUTY_EVAL_CFG[ev.status];
      return `<span class="duty-status ${c.cls}">${c.icon} ${c.short}</span>`;
    };

    const selectedDayIdx = Math.max(0, DUTY_DAYS_LIST.findIndex(d => d.key === dutySelectedDay));
    const selectedDayObj = DUTY_DAYS_LIST[selectedDayIdx] || DUTY_DAYS_LIST[0];
    const selectedDate = getDutyDayDate(data.week, selectedDayIdx);
    const selectedShiftObj = DUTY_SHIFTS_LIST.find(s => s.key === dutySelectedShift) || DUTY_SHIFTS_LIST[0];
    const selectedShiftStudents = getShiftStudents(dutySelectedDay, dutySelectedShift);
    const selectedShiftEval = getShiftEval(dutySelectedDay, dutySelectedShift);
    const weekRange = getDutyWeekRange(data.week);

    const dutyPanelHtml = p.dutyView ? `
      <section data-panel="duty" class="max-w-7xl mx-auto space-y-3 pb-8 pt-1 px-1 md:px-2">
        <section class="page-banner" data-page-banner="duty" data-tone="teal">
          <div class="page-banner-body">
            <div class="page-banner-icon"><i class="ph-fill ph-broom text-2xl text-teal-600"></i></div>
            <div class="page-banner-copy">
              <p class="page-banner-kicker">Lớp học xanh – sạch – đẹp</p>
              <h1 class="page-banner-title">Trực nhật • Tuần ${esc(data.week)}</h1>
              <p class="page-banner-description">Chấm điểm ca trực và theo dõi nề nếp vệ sinh lớp</p>
            </div>
          </div>
          <div class="page-banner-badges">
            <div class="page-banner-badge"><span class="page-banner-badge-label">Tuần</span><span class="page-banner-badge-value">${weekRange}</span></div>
          </div>
        </section>

        <div id="duty-view" data-layout-version="shift-v8">
          <section class="duty-toolbar no-print">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="duty-week-actions">
                <button type="button" class="duty-week-btn" data-action="prev-duty-day" title="Ngày trước"><i class="ph-bold ph-caret-left"></i> Ngày trước</button>
                <button type="button" class="duty-week-btn font-black text-teal-700 bg-teal-50 border-teal-200" data-action="today-duty-day">Hôm nay</button>
                <button type="button" class="duty-week-btn" data-action="next-duty-day" title="Ngày sau">Ngày sau <i class="ph-bold ph-caret-right"></i></button>
                ${p.dutyManage ? `
                  <button type="button" class="duty-week-btn font-black text-white bg-teal-600 hover:bg-teal-700 border-teal-600 shadow-sm" data-action="auto-arrange-duty" title="Tự động phân bổ đều học sinh cả lớp vào các ca trực trong tuần">
                    <i class="ph-bold ph-arrows-clockwise"></i> Xếp lịch tự động
                  </button>
                ` : ''}
                <button type="button" class="duty-week-btn" data-action="print-duty"><i class="ph-bold ph-printer"></i> In lịch trực</button>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="duty-toolbar-officer-badge px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <i class="ph-bold ph-shield-check"></i> Cán sự: Lớp phó lao động
                </span>
              </div>
            </div>
          </section>

          <div class="duty-main">
            <!-- Cột trái: Lịch trực đang chọn & Tổng vệ sinh -->
            <section class="duty-panel duty-left">
              <div class="duty-today">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <div class="text-[9px] uppercase tracking-[.14em] font-black text-white/70">Lịch trực đang chọn</div>
                    <div class="text-[21px] leading-tight font-black mt-0.5 text-white">${selectedDayObj.label}</div>
                    <div class="text-[9px] mt-1 font-bold text-white/80">${fmtDutyDate(selectedDate)} • ${selectedShiftObj.label} • ${selectedShiftStudents.length} học sinh</div>
                  </div>
                  ${renderDutyStatusBadge(selectedShiftEval)}
                </div>

                <div class="duty-shift-tabs">
                  ${DUTY_SHIFTS_LIST.map(s => `
                    <button type="button" class="duty-shift-tab ${s.key === dutySelectedShift ? 'active' : ''}" data-action="select-duty-shift" data-shift="${s.key}">
                      <i class="ph-bold ${s.icon}"></i> ${s.label}
                    </button>
                  `).join('')}
                </div>

                <div class="duty-today-students">
                  ${selectedShiftStudents.length ? selectedShiftStudents.map(s => `
                    <div class="duty-person">
                      <div class="w-[30px] h-[30px] rounded-full bg-teal-900/40 border border-white/20 text-white font-black text-xs flex items-center justify-center shrink-0">
                        ${esc((s.name || '').slice(-2))}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="duty-person-name text-white font-black">${esc(s.name)}</div>
                        <div class="duty-person-meta text-white/80">${esc(s.group || 'Học sinh')}</div>
                      </div>
                    </div>
                  `).join('') : '<div class="col-span-2 text-xs text-white/70 text-center py-4">Chưa phân công ca này</div>'}
                </div>

                ${p.dutyManage ? `
                  <button type="button" class="w-full mt-2.5 py-2 px-3 bg-white text-teal-800 hover:bg-teal-50 border border-white/40 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer" data-action="open-duty-editor" data-day="${dutySelectedDay}" data-shift="${dutySelectedShift}">
                    <i class="ph-bold ph-user-plus"></i> Phân công ca này (${selectedShiftObj.short})
                  </button>
                ` : ''}

                <div class="mt-2.5">
                  <label class="block text-[10px] font-bold text-white/80 mb-1">Nhận xét / Lý do:</label>
                  <input type="text" id="bcs-duty-reason-input" value="${esc(selectedShiftEval?.reason || '')}" placeholder="VD: Quét dọn sạch sẽ, kê bàn ghế ngay ngắn..." class="w-full px-3 py-1.5 bg-white/15 border border-white/25 rounded-xl text-white placeholder:text-white/50 text-xs font-bold outline-none focus:bg-white/25">
                </div>

                <div class="duty-score-row">
                  ${Object.entries(DUTY_EVAL_CFG).map(([key, c]) => `
                    <button type="button" class="duty-score-btn ${selectedShiftEval?.status === key ? 'active' : ''}" data-action="rate-duty" data-rating="${key}" ${p.duty ? '' : 'disabled'}>
                      <div class="text-[13px]">${c.icon}</div>
                      <div>${c.short}</div>
                      <div class="text-[7px] opacity-75">${c.points > 0 ? '+' : ''}${c.points}đ</div>
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Tổng vệ sinh / Trực đột xuất -->
              <div class="duty-extra">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="text-[11px] font-black text-slate-700">Tổng vệ sinh / Trực đột xuất</div>
                    <div class="text-[9px] text-slate-400 font-semibold">Theo dõi quy chuẩn vệ sinh và nề nếp lớp học</div>
                  </div>
                  <span class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center"><i class="ph-bold ph-broom"></i></span>
                </div>
                <div class="duty-extra-list">
                  <div class="duty-extra-card">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Vệ sinh lớp học hàng ngày</span>
                      <span class="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 font-extrabold">Quy chuẩn</span>
                    </div>
                    <p class="text-[10px] text-slate-500 leading-relaxed font-medium">Quét sạch rác trong và ngoài cửa lớp, đổ rác đúng nơi quy định, lau bảng sạch sẽ, kê ngay ngắn bàn ghế và tắt quạt điện trước khi ra về.</p>
                  </div>
                  <div class="duty-extra-card">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Tiêu chuẩn chấm điểm thi đua</span>
                      <span class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-extrabold">+5đ / -5đ</span>
                    </div>
                    <p class="text-[10px] text-slate-500 leading-relaxed font-medium">Tốt (+5đ), Đạt (0đ), Chưa đạt (-3đ), Nghỉ trực (-5đ). Điểm liên thông tự động cập nhật vào sổ theo dõi thi đua toàn lớp.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Cột phải: Lịch trực tuần 6 ngày -->
            <section class="duty-panel duty-week" id="duty-week-print-area">
              <div class="duty-week-heading flex justify-between gap-3 mb-2">
                <div>
                  <div class="text-[14px] font-black text-slate-800">LỊCH TRỰC NHẬT TUẦN</div>
                  <div class="text-[9px] text-slate-400 font-bold">${esc(data.className || 'LỚP 7N')} • ${weekRange} • Sáng / Chiều</div>
                </div>
                <div class="text-right">
                  <div class="text-[8px] font-black text-slate-500">${esc(data.classBranding?.stationName || 'TRẠM CÔ TRẦN YẾN')}</div>
                  <div class="text-[8px] text-teal-600 font-bold">Cán sự: Lớp phó lao động</div>
                </div>
              </div>

              <div class="duty-week-grid">
                ${DUTY_DAYS_LIST.map((day, dIdx) => {
                  const dDate = getDutyDayDate(data.week, dIdx);
                  const morningStudents = getShiftStudents(day.key, 'morning');
                  const afternoonStudents = getShiftStudents(day.key, 'afternoon');
                  const morningEval = getShiftEval(day.key, 'morning');
                  const afternoonEval = getShiftEval(day.key, 'afternoon');
                  const isSelected = day.key === dutySelectedDay;
                  const isToday = day.key === getTodayDayKey();

                  return `
                    <article class="duty-day ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}" data-action="select-day" data-day="${day.key}">
                      <div class="flex items-start justify-between gap-2 duty-day-heading">
                        <div class="min-w-0">
                          <div class="duty-day-title-row text-[12px] leading-tight font-black text-slate-800 flex items-center gap-1.5">
                            <span>${day.label}</span>
                            ${isToday ? '<span class="duty-today-badge text-[8px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-black"><i class="ph-fill ph-sparkle"></i> HÔM NAY</span>' : ''}
                          </div>
                          <div class="text-[8.5px] mt-1 font-bold text-slate-400">${fmtDutyDate(dDate)} • ${morningStudents.length + afternoonStudents.length} học sinh</div>
                        </div>
                        <span class="duty-day-shift-summary"><b>${morningStudents.length}</b> Sáng · <b>${afternoonStudents.length}</b> Chiều</span>
                      </div>

                      <div class="duty-day-shifts space-y-1.5 mt-2">
                        <!-- Ca Sáng -->
                        <section class="duty-shift-block ${isSelected && dutySelectedShift === 'morning' ? 'active' : ''}" data-shift="morning" data-action="select-day-shift" data-day="${day.key}" data-shift="morning">
                          <div class="duty-shift-head flex items-center justify-between gap-1">
                            <div class="duty-shift-title flex items-center gap-1"><i class="ph-bold ph-sun text-amber-500"></i><span>Sáng</span><b>${morningStudents.length} HS</b></div>
                            <div class="flex items-center gap-1">
                              ${p.dutyManage ? `
                                <button type="button" class="px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[9.5px] font-black flex items-center gap-1 transition-all cursor-pointer" data-action="open-duty-editor" data-day="${day.key}" data-shift="morning" title="Phân công học sinh ca Sáng">
                                  <i class="ph-bold ph-pencil-simple"></i> Phân công
                                </button>
                              ` : ''}
                              ${renderDutyStatusBadge(morningEval)}
                            </div>
                          </div>
                          <div class="duty-desktop-day-actions">
                            <div class="duty-desktop-score-buttons">
                              ${Object.entries(DUTY_EVAL_CFG).map(([rKey, c]) => `
                                <button type="button" class="duty-desktop-score-btn ${morningEval?.status === rKey ? 'active' : ''}" data-action="rate-shift-direct" data-day="${day.key}" data-shift="morning" data-rating="${rKey}" title="${c.label}" ${p.duty ? '' : 'disabled'}>
                                  <span>${c.icon}</span><span>${c.short}</span>
                                </button>
                              `).join('')}
                            </div>
                          </div>
                          <div class="duty-mini-list duty-shift-students">
                            ${morningStudents.length ? morningStudents.map(s => `
                              <div class="duty-mini-person" title="${esc(s.name)}">
                                <div class="w-[20px] h-[20px] rounded-full bg-slate-100 text-slate-600 font-black text-[9px] flex items-center justify-center shrink-0">${esc((s.name || '').slice(-2))}</div>
                                <div class="duty-mini-name truncate">${esc(s.name)}</div>
                              </div>
                            `).join('') : '<div class="duty-shift-empty text-[8px] text-slate-400 italic">Chưa phân công</div>'}
                          </div>
                        </section>

                        <!-- Ca Chiều -->
                        <section class="duty-shift-block ${isSelected && dutySelectedShift === 'afternoon' ? 'active' : ''}" data-shift="afternoon" data-action="select-day-shift" data-day="${day.key}" data-shift="afternoon">
                          <div class="duty-shift-head flex items-center justify-between gap-1">
                            <div class="duty-shift-title flex items-center gap-1"><i class="ph-bold ph-cloud-sun text-blue-500"></i><span>Chiều</span><b>${afternoonStudents.length} HS</b></div>
                            <div class="flex items-center gap-1">
                              ${p.dutyManage ? `
                                <button type="button" class="px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[9.5px] font-black flex items-center gap-1 transition-all cursor-pointer" data-action="open-duty-editor" data-day="${day.key}" data-shift="afternoon" title="Phân công học sinh ca Chiều">
                                  <i class="ph-bold ph-pencil-simple"></i> Phân công
                                </button>
                              ` : ''}
                              ${renderDutyStatusBadge(afternoonEval)}
                            </div>
                          </div>
                          <div class="duty-desktop-day-actions">
                            <div class="duty-desktop-score-buttons">
                              ${Object.entries(DUTY_EVAL_CFG).map(([rKey, c]) => `
                                <button type="button" class="duty-desktop-score-btn ${afternoonEval?.status === rKey ? 'active' : ''}" data-action="rate-shift-direct" data-day="${day.key}" data-shift="afternoon" data-rating="${rKey}" title="${c.label}" ${p.duty ? '' : 'disabled'}>
                                  <span>${c.icon}</span><span>${c.short}</span>
                                </button>
                              `).join('')}
                            </div>
                          </div>
                          <div class="duty-mini-list duty-shift-students">
                            ${afternoonStudents.length ? afternoonStudents.map(s => `
                              <div class="duty-mini-person" title="${esc(s.name)}">
                                <div class="w-[20px] h-[20px] rounded-full bg-slate-100 text-slate-600 font-black text-[9px] flex items-center justify-center shrink-0">${esc((s.name || '').slice(-2))}</div>
                                <div class="duty-mini-name truncate">${esc(s.name)}</div>
                              </div>
                            `).join('') : '<div class="duty-shift-empty text-[8px] text-slate-400 italic">Chưa phân công</div>'}
                          </div>
                        </section>
                      </div>
                    </article>
                  `;
                }).join('')}
              </div>
            </section>
          </div>

          <!-- Form tương thích với các bài kiểm thử tự động -->
          <div class="duty-compat-forms hidden" aria-hidden="true">
            ${currentWeekDuties.map(d => {
              const s = (data.students || []).find(st => String(st.id) === String(d.studentId));
              return `
                <form class="duty-form" data-week="${esc(d.week)}" data-day="${esc(d.day)}" data-shift="${esc(d.shift)}" data-id="${esc(d.studentId)}">
                  <select name="rating">
                    ${Object.entries(ratings).map(([key, label]) => `<option value="${key}" ${(d.evaluation?.rating === key || d.evaluation?.status === key) ? 'selected' : ''}>${label}</option>`).join('')}
                  </select>
                  <textarea name="reason">${esc(d.evaluation?.reason || '')}</textarea>
                  <button type="submit">Lưu</button>
                </form>
              `;
            }).join('')}
          </div>
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
      let bcsSemester = 'HK1';
      let bcsSubject = (data.subjects && data.subjects[0]?.id) || 'math';
      let bcsGroup = 'all';
      let bcsSearch = '';

      const calcReward = (score, seq) => {
        const num = parseFloat(score);
        const s = Number(seq);
        if (isNaN(num) || num < 0 || num > 10) return 0;
        if (s === 5 || s === 6) {
          if (num >= 8) return 15;
          if (num >= 5) return 5;
          return -5;
        }
        if (num === 10) return 10;
        if (num >= 9) return 9;
        if (num >= 8) return 8;
        if (num >= 7) return 7;
        if (num >= 6) return 6;
        if (num === 5) return -1;
        if (num >= 4) return -2;
        if (num >= 3) return -3;
        if (num >= 2) return -4;
        return -5;
      };

      const fmtReward = pts => {
        const n = Number(pts) || 0;
        return n > 0 ? `+${n}đ` : `${n}đ`;
      };

      const getGrade = (sId, subId, sem, seq) => {
        return (data.grades || []).find(r =>
          String(r.studentId) === String(sId) &&
          r.subjectId === subId &&
          r.semester === sem &&
          Number(r.sequence) === Number(seq)
        );
      };

      const calcAverage = (sId, subId, sem) => {
        let weightedSum = 0;
        let totalWeight = 0;
        for (let s = 1; s <= 6; s++) {
          const rec = getGrade(sId, subId, sem, s);
          if (rec && rec.score !== null && rec.score !== '' && !isNaN(rec.score)) {
            const sc = parseFloat(rec.score);
            const w = s === 5 ? 2 : (s === 6 ? 3 : 1);
            weightedSum += sc * w;
            totalWeight += w;
          }
        }
        return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '---';
      };

      const calcTotalReward = (sId, subId, sem) => {
        let total = 0;
        for (let s = 1; s <= 6; s++) {
          const rec = getGrade(sId, subId, sem, s);
          if (rec && rec.score !== null && rec.score !== '' && !isNaN(rec.score)) {
            total += calcReward(rec.score, s);
          }
        }
        return total;
      };

      const section = document.createElement('section');
      section.dataset.panel = 'grades';
      section.className = 'max-w-7xl mx-auto space-y-4 pb-12 pt-1 px-1 md:px-2';

      const renderGradesPanel = () => {
        const groups = [...new Set((data.students || []).map(s => s.group).filter(Boolean))];
        let visibleStudents = (data.students || []).slice();
        if (bcsGroup !== 'all') {
          visibleStudents = visibleStudents.filter(s => s.group === bcsGroup);
        }
        if (bcsSearch.trim()) {
          const q = bcsSearch.toLowerCase().trim();
          visibleStudents = visibleStudents.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.code || '').toLowerCase().includes(q)
          );
        }

        const assessCols = [
          { seq: 1, label: 'TX1' },
          { seq: 2, label: 'TX2' },
          { seq: 3, label: 'TX3' },
          { seq: 4, label: 'TX4' },
          { seq: 5, label: 'GIỮA KỲ' },
          { seq: 6, label: 'CUỐI KỲ' }
        ];

        const semHtml = ['HK1', 'HK2'].map(sem => `
          <button type="button" data-bcs-sem="${sem}" class="px-4 py-2 rounded-xl font-black text-xs transition-all ${bcsSemester === sem ? 'bg-[#1e1b4b] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} cursor-pointer">
            ${sem}
          </button>
        `).join('');

        const subHtml = (data.subjects || []).map(sub => `
          <button type="button" data-bcs-sub="${esc(sub.id)}" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${bcsSubject === sub.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'} cursor-pointer">
            ${esc(sub.name || sub.id)}
          </button>
        `).join('');

        const rowsHtml = visibleStudents.map((s, idx) => {
          let enteredCount = 0;
          let cellsHtml = '';

          assessCols.forEach(col => {
            const rec = getGrade(s.id, bcsSubject, bcsSemester, col.seq);
            const scoreVal = (rec && rec.score !== null && !isNaN(rec.score)) ? rec.score : '';
            if (scoreVal !== '') enteredCount++;
            const rew = scoreVal !== '' ? calcReward(scoreVal, col.seq) : 0;
            const rewClass = rew > 0 ? 'text-emerald-600' : rew < 0 ? 'text-rose-600' : 'text-slate-400';

            cellsHtml += `
              <td class="p-2 text-center align-middle">
                <div class="flex flex-col items-center justify-center">
                  <input type="number" step="0.25" min="0" max="10" inputmode="decimal" placeholder="-"
                    value="${scoreVal !== '' ? esc(scoreVal) : ''}"
                    data-grade-student="${esc(s.id)}"
                    data-grade-seq="${col.seq}"
                    class="bcs-grade-input w-16 h-10 text-center font-black text-slate-800 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all shadow-2xs">
                  <span class="text-[10px] mt-1 font-extrabold ${rewClass}">${scoreVal !== '' ? fmtReward(rew) : '-'}</span>
                </div>
              </td>
            `;
          });

          const avg = calcAverage(s.id, bcsSubject, bcsSemester);
          const totalRew = calcTotalReward(s.id, bcsSubject, bcsSemester);
          const totalRewClass = totalRew > 0 ? 'text-emerald-600' : totalRew < 0 ? 'text-rose-600' : 'text-slate-700';

          return `
            <tr data-student-row="${esc(s.id)}" class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
              <td class="p-3 text-center font-bold text-slate-400 text-xs">${idx + 1}</td>
              <td class="p-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">${esc((s.name || '').slice(-2))}</div>
                  <div class="min-w-0">
                    <div class="font-black text-slate-800 text-xs truncate">${esc(s.name)}</div>
                    <div class="text-[10px] font-bold text-slate-400">${esc(s.group || '')} • ${enteredCount}/6 điểm</div>
                  </div>
                </div>
              </td>
              <td class="p-3 text-center font-bold text-slate-600 text-xs whitespace-nowrap">${esc(s.group || '')}</td>
              ${cellsHtml}
              <td class="p-3 text-center font-black text-indigo-600 text-sm">${avg}</td>
              <td class="p-3 text-center font-black text-xs ${totalRewClass}">${fmtReward(totalRew)}</td>
            </tr>
          `;
        }).join('');

        section.innerHTML = `
          <section class="page-banner" data-page-banner="report" data-tone="sky">
            <div class="page-banner-body">
              <div class="page-banner-icon"><i class="ph-fill ph-clipboard-text text-2xl text-sky-600"></i></div>
              <div class="page-banner-copy">
                <p class="page-banner-kicker">Học tập & Tiến bộ · Giao diện Ban cán sự</p>
                <h1 class="page-banner-title">Sổ điểm học tập</h1>
                <p class="page-banner-description">Chuẩn ma trận 6 cột đánh giá theo Thông tư: TX1, TX2, TX3, TX4, Giữa kỳ, Cuối kỳ</p>
              </div>
            </div>
          </section>

          <div class="bg-white rounded-[2rem] shadow-sm border border-slate-200/80 p-4 md:p-6 space-y-4">
            <!-- Toolbar -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-400 uppercase tracking-wider">Học kỳ:</span>
                <div class="flex gap-1">${semHtml}</div>
              </div>
              <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select id="bcs-grade-group-select" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer">
                  <option value="all" ${bcsGroup === 'all' ? 'selected' : ''}>Tất cả tổ</option>
                  ${groups.map(g => `<option value="${esc(g)}" ${bcsGroup === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
                </select>
                <div class="relative flex-1 sm:w-48">
                  <input type="text" id="bcs-grade-search" value="${esc(bcsSearch)}" placeholder="🔎 Tìm học sinh..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none">
                </div>
                <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black whitespace-nowrap">
                  <i class="ph-fill ph-check-circle"></i> Tự động đồng bộ
                </span>
              </div>
            </div>

            <!-- Subject buttons -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
              <span class="text-xs font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">Môn:</span>
              ${subHtml}
            </div>

            <!-- Scroll hint for mobile -->
            <p class="text-[11px] text-slate-400 font-bold italic md:hidden">↔ Vuốt ngang bảng để xem đủ 6 cột điểm · Bấm vào ô để sửa điểm</p>

            <!-- Matrix Table -->
            <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table class="w-full text-left border-collapse">
                <thead class="bg-[#1e1b4b] text-white text-[10px] uppercase font-black tracking-wider">
                  <tr>
                    <th class="p-3 text-center w-12">STT</th>
                    <th class="p-3 w-48">Học sinh</th>
                    <th class="p-3 text-center w-20">Tổ</th>
                    ${assessCols.map(c => `<th class="p-3 text-center w-24">${c.label}</th>`).join('')}
                    <th class="p-3 text-center w-24">TB MÔN</th>
                    <th class="p-3 text-center w-24">ĐIỂM TÍCH</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  ${rowsHtml || `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-bold text-xs">Không có học sinh trong danh sách.</td></tr>`}
                </tbody>
              </table>
            </div>

            <!-- Single entry fallback form in collapsible -->
            <div class="pt-3 border-t border-slate-100">
              <details class="text-xs text-slate-600">
                <summary class="font-bold cursor-pointer hover:text-indigo-600 transition-colors">➕ Biểu mẫu nhập nhanh từng học sinh (Dự phòng)</summary>
                <form id="grade-form" data-request="${safeUuid()}" class="space-y-3 mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <label class="text-xs font-bold text-slate-600">Học sinh
                      <select name="studentId" class="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold">${data.students.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
                    </label>
                    <label class="text-xs font-bold text-slate-600">Môn học
                      <select name="subjectId" class="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold">${data.subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
                    </label>
                    <label class="text-xs font-bold text-slate-600">Học kỳ
                      <select name="semester" class="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"><option>HK1</option><option>HK2</option></select>
                    </label>
                    <label class="text-xs font-bold text-slate-600">Cột điểm
                      <select name="sequence" class="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold">${['TX1','TX2','TX3','TX4','Giữa kỳ','Cuối kỳ'].map((s,i) => `<option value="${i+1}">${s}</option>`).join('')}</select>
                    </label>
                  </div>
                  <div class="flex items-center justify-between gap-3 pt-2">
                    <p id="grade-current" class="text-xs font-bold text-indigo-700"></p>
                    <div class="flex items-center gap-2">
                      <input name="score" type="number" min="0" max="10" step="any" inputmode="decimal" placeholder="Điểm (0-10)" class="w-32 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold">
                      <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">Lưu điểm</button>
                    </div>
                  </div>
                </form>
              </details>
            </div>
          </div>
        `;

        // Bind events
        section.querySelectorAll('[data-bcs-sem]').forEach(btn => {
          btn.onclick = () => {
            bcsSemester = btn.dataset.bcsSem;
            renderGradesPanel();
          };
        });

        section.querySelectorAll('[data-bcs-sub]').forEach(btn => {
          btn.onclick = () => {
            bcsSubject = btn.dataset.bcsSub;
            renderGradesPanel();
          };
        });

        const grpSel = section.querySelector('#bcs-grade-group-select');
        if (grpSel) {
          grpSel.onchange = () => {
            bcsGroup = grpSel.value;
            renderGradesPanel();
          };
        }

        const searchInp = section.querySelector('#bcs-grade-search');
        if (searchInp) {
          searchInp.oninput = () => {
            bcsSearch = searchInp.value;
            renderGradesPanel();
            const reInp = section.querySelector('#bcs-grade-search');
            if (reInp) {
              reInp.focus();
              reInp.selectionStart = reInp.selectionEnd = reInp.value.length;
            }
          };
        }

        // Inline inputs change / blur handlers
        section.querySelectorAll('.bcs-grade-input').forEach(inp => {
          inp.onchange = async () => {
            if (working || leaving) return;
            const studentId = inp.dataset.gradeStudent;
            const seq = inp.dataset.gradeSeq;
            const oldRec = getGrade(studentId, bcsSubject, bcsSemester, seq);
            const oldScore = oldRec?.score !== undefined ? String(oldRec.score) : '';
            const val = inp.value.trim();

            if (val === oldScore) return;

            if (val !== '') {
              const num = parseFloat(val);
              if (isNaN(num) || num < 0 || num > 10) {
                alert('Điểm số phải từ 0 đến 10!');
                inp.value = oldScore;
                return;
              }
            } else {
              if (!confirm('Xóa điểm học sinh này?')) {
                inp.value = oldScore;
                return;
              }
            }

            dirty = true;
            run(async () => {
              const reqId = safeUuid();
              await api({
                action: 'grade',
                studentId: String(studentId),
                subjectId: bcsSubject,
                semester: bcsSemester,
                sequence: Number(seq),
                score: val === '' ? '' : parseFloat(val),
                expectedRecord: oldRec?.version ?? null,
                requestId: reqId
              });

              // Cập nhật mảng data.grades tại chỗ
              if (!data.grades) data.grades = [];
              const recIndex = data.grades.findIndex(r =>
                String(r.studentId) === String(studentId) &&
                r.subjectId === bcsSubject &&
                r.semester === bcsSemester &&
                Number(r.sequence) === Number(seq)
              );

              if (val === '') {
                if (recIndex !== -1) data.grades.splice(recIndex, 1);
              } else {
                const parsed = parseFloat(val);
                if (recIndex !== -1) {
                  data.grades[recIndex].score = parsed;
                  data.grades[recIndex].version = 'v_' + Date.now();
                } else {
                  data.grades.push({
                    studentId: String(studentId),
                    subjectId: bcsSubject,
                    semester: bcsSemester,
                    sequence: Number(seq),
                    score: parsed,
                    version: 'v_' + Date.now()
                  });
                }
              }

              const student = (data.students || []).find(s => String(s.id) === String(studentId));
              message(`Đã lưu điểm ${val !== '' ? val : '(đã xóa)'} cho ${student?.name || 'học sinh'}.`);
              renderGradesPanel();
            });
          };

          inp.onkeydown = e => {
            if (e.key === 'Enter') {
              inp.blur();
            }
          };
        });

        // Bind single form inside details
        const form = section.querySelector('#grade-form');
        if (form) {
          const currentRecord = () => data.grades.find(r => r.studentId === form.querySelector('[name=studentId]').value && r.subjectId === form.querySelector('[name=subjectId]').value && r.semester === form.querySelector('[name=semester]').value && Number(r.sequence) === Number(form.querySelector('[name=sequence]').value));
          const updateCurrent = () => {
            const curEl = section.querySelector('#grade-current');
            if (curEl) curEl.textContent = 'Điểm hiện tại: ' + (currentRecord()?.score ?? 'Chưa nhập');
          };
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
      };

      renderGradesPanel();
      el('content').appendChild(section);
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

    // Gắn sự kiện quản lý Trực nhật cho Lớp phó lao động / Ban cán sự
    root.querySelectorAll('[data-action="select-day"]').forEach(card => {
      card.onclick = event => {
        if (event.target.closest('[data-action="rate-shift-direct"]') || event.target.closest('[data-action="select-day-shift"]')) return;
        dutySelectedDay = card.dataset.day;
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="select-duty-shift"]').forEach(btn => {
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        dutySelectedShift = btn.dataset.shift;
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="select-day-shift"]').forEach(block => {
      block.onclick = event => {
        if (event.target.closest('[data-action="rate-shift-direct"]')) return;
        dutySelectedDay = block.dataset.day;
        dutySelectedShift = block.dataset.shift;
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="prev-duty-day"]').forEach(btn => {
      btn.onclick = () => {
        const idx = DUTY_DAYS_LIST.findIndex(d => d.key === dutySelectedDay);
        dutySelectedDay = DUTY_DAYS_LIST[(idx - 1 + DUTY_DAYS_LIST.length) % DUTY_DAYS_LIST.length].key;
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="next-duty-day"]').forEach(btn => {
      btn.onclick = () => {
        const idx = DUTY_DAYS_LIST.findIndex(d => d.key === dutySelectedDay);
        dutySelectedDay = DUTY_DAYS_LIST[(idx + 1) % DUTY_DAYS_LIST.length].key;
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="today-duty-day"]').forEach(btn => {
      btn.onclick = () => {
        dutySelectedDay = getTodayDayKey();
        dutySelectedShift = 'morning';
        renderDeputy();
      };
    });

    root.querySelectorAll('[data-action="print-duty"]').forEach(btn => {
      btn.onclick = () => {
        window.print();
      };
    });

    root.querySelectorAll('[data-action="rate-duty"]').forEach(btn => {
      btn.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();
        if (working || leaving) return;
        if (!p.duty) return message('Bạn chỉ có quyền xem lịch trực nhật.', true);
        const rating = btn.dataset.rating;
        const assignedDuties = (data.duties || []).filter(d => d.week === data.week && d.day === dutySelectedDay && d.shift === dutySelectedShift);
        if (!assignedDuties.length) return message('Ca trực này chưa có học sinh được phân công.', true);
        const cfg = DUTY_EVAL_CFG[rating];
        if (!cfg) return;
        const reasonInput = root.querySelector('#bcs-duty-reason-input');
        const reason = (reasonInput?.value || '').trim() || `${cfg.short}: Hoàn thành ca trực`;
        dirty = true;
        run(async () => {
          for (const d of assignedDuties) {
            await api({ action: 'duty', week: data.week, day: dutySelectedDay, shift: dutySelectedShift, studentId: d.studentId, rating, reason });
          }
          await load();
          message(`Đã lưu đánh giá ${cfg.label} cho ca trực.`);
        });
      };
    });

    root.querySelectorAll('[data-action="rate-shift-direct"]').forEach(btn => {
      btn.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();
        if (working || leaving) return;
        if (!p.duty) return message('Bạn chỉ có quyền xem lịch trực nhật.', true);
        const day = btn.dataset.day;
        const shift = btn.dataset.shift;
        const rating = btn.dataset.rating;
        dutySelectedDay = day;
        dutySelectedShift = shift;
        const assignedDuties = (data.duties || []).filter(d => d.week === data.week && d.day === day && d.shift === shift);
        if (!assignedDuties.length) return message('Ca trực này chưa có học sinh được phân công.', true);
        const cfg = DUTY_EVAL_CFG[rating];
        if (!cfg) return;
        const reason = `${cfg.short}: Hoàn thành ca trực`;
        dirty = true;
        run(async () => {
          for (const d of assignedDuties) {
            await api({ action: 'duty', week: data.week, day, shift, studentId: d.studentId, rating, reason });
          }
          await load();
          message(`Đã lưu đánh giá ${cfg.label} cho ca trực.`);
        });
      };
    });

    root.querySelectorAll('[data-action="auto-arrange-duty"]').forEach(btn => {
      btn.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();
        if (working || leaving) return;
        if (!p.dutyManage) return message('Chỉ Lớp phó lao động mới có quyền xếp lịch tự động.', true);
        if (!confirm(`Bạn có muốn tự động phân bổ đều học sinh cả lớp vào các ca trực trong tuần ${data.week}? Lịch trực sẽ được chia đều từ Thứ 2 đến Thứ 7.`)) return;
        dirty = true;
        run(async () => {
          try {
            await api({ action: 'duty-auto-arrange', week: data.week });
            await load();
            message(`Đã tự động xếp lịch trực nhật thành công cho tuần ${data.week}.`);
          } catch (err) {
            message(err.message || 'Không thể tự động xếp lịch.', true);
          }
        });
      };
    });

    root.querySelectorAll('[data-action="open-duty-editor"]').forEach(btn => {
      btn.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        if (!p.dutyManage) return message('Chỉ Lớp phó lao động mới có quyền phân công học sinh.', true);
        openDeputyDutyEditor(btn.dataset.day, btn.dataset.shift);
      };
    });

    function openDeputyDutyEditor(targetDayKey, targetShiftKey) {
      const dayKey = targetDayKey || dutySelectedDay || 'mon';
      const shiftKey = targetShiftKey || dutySelectedShift || 'morning';
      const dayObj = DUTY_DAYS_LIST.find(d => d.key === dayKey) || DUTY_DAYS_LIST[0];
      const shiftObj = DUTY_SHIFTS_LIST.find(s => s.key === shiftKey) || DUTY_SHIFTS_LIST[0];

      let modalContainer = document.getElementById('modal-container');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
      }

      const weekDuties = (data.duties || []).filter(d => d.week === data.week);
      const otherShiftAssignments = {};
      for (const d of weekDuties) {
        if (d.day === dayKey && d.shift === shiftKey) continue;
        const dO = DUTY_DAYS_LIST.find(x => x.key === d.day);
        const sO = DUTY_SHIFTS_LIST.find(x => x.key === d.shift);
        otherShiftAssignments[String(d.studentId)] = `${dO?.label || d.day} (${sO?.short || d.shift})`;
      }

      const initialChosen = weekDuties
        .filter(d => d.day === dayKey && d.shift === shiftKey)
        .map(d => String(d.studentId));
      const chosenIds = new Set(initialChosen);

      let searchQuery = '';
      let groupFilter = 'all';

      function renderModal() {
        const allStudents = data.students || [];
        const groups = [...new Set(allStudents.map(s => s.group).filter(Boolean))].sort();

        const visibleStudents = allStudents.filter(s => {
          const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchGroup = groupFilter === 'all'
            ? true
            : groupFilter === 'unassigned'
              ? (!chosenIds.has(String(s.id)) && !otherShiftAssignments[String(s.id)])
              : s.group === groupFilter;
          return matchSearch && matchGroup;
        });

        const chosenList = allStudents.filter(s => chosenIds.has(String(s.id)));

        modalContainer.innerHTML = `
          <div class="duty-modal-backdrop" id="duty-assign-backdrop">
            <div class="duty-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="duty-modal-title">
              <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50 to-emerald-50">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-md">
                    <i class="ph-bold ${shiftObj.icon}"></i>
                  </div>
                  <div>
                    <h3 id="duty-modal-title" class="text-base font-black text-slate-800 leading-snug">
                      Phân công: ${dayObj.label} • Ca ${shiftObj.short}
                    </h3>
                    <p class="text-xs text-slate-500 font-semibold">
                      Tuần ${esc(data.week)} • ${allStudents.length} học sinh cả lớp
                    </p>
                  </div>
                </div>
                <button type="button" id="duty-modal-close" class="w-8 h-8 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center border border-slate-200 transition-all cursor-pointer">
                  <i class="ph-bold ph-x text-base"></i>
                </button>
              </div>

              <div class="p-4 bg-slate-50/70 border-b border-slate-100">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <span>Học sinh được phân công ca này</span>
                    <span class="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px]">${chosenIds.size}</span>
                  </div>
                  ${chosenIds.size > 0 ? `
                    <button type="button" id="duty-clear-chosen" class="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer">
                      Xóa tất cả (${chosenIds.size})
                    </button>
                  ` : ''}
                </div>

                <div class="flex flex-wrap gap-1.5 min-h-[38px] max-h-[100px] overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200/80">
                  ${chosenList.length ? chosenList.map(s => `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold shadow-xs">
                      <span>${esc(s.name)}</span>
                      <button type="button" class="duty-remove-student text-teal-600 hover:text-rose-600 cursor-pointer" data-id="${esc(s.id)}" title="Bỏ chọn">
                        <i class="ph-bold ph-x text-[10px]"></i>
                      </button>
                    </span>
                  `).join('') : '<span class="text-xs text-slate-400 italic py-1 px-2">Chưa chọn học sinh nào cho ca này</span>'}
                </div>
              </div>

              <div class="p-3 border-b border-slate-100 space-y-2">
                <div class="relative">
                  <i class="ph-bold ph-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                  <input type="text" id="duty-student-search" value="${esc(searchQuery)}" placeholder="Tìm theo tên học sinh..." class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-teal-500 focus:bg-white transition-all">
                </div>

                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
                  <button type="button" class="duty-group-filter px-2.5 py-1 rounded-lg transition-all cursor-pointer ${groupFilter === 'all' ? 'bg-teal-600 text-white font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-group="all">Tất cả</button>
                  <button type="button" class="duty-group-filter px-2.5 py-1 rounded-lg transition-all cursor-pointer ${groupFilter === 'unassigned' ? 'bg-teal-600 text-white font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-group="unassigned">Chưa trực</button>
                  ${groups.map(g => `
                    <button type="button" class="duty-group-filter px-2.5 py-1 rounded-lg transition-all cursor-pointer ${groupFilter === g ? 'bg-teal-600 text-white font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" data-group="${esc(g)}">${esc(g)}</button>
                  `).join('')}
                </div>
              </div>

              <div class="p-3 overflow-y-auto max-h-[300px] flex-1 divide-y divide-slate-100">
                ${visibleStudents.length ? visibleStudents.map(s => {
                  const sid = String(s.id);
                  const isSelected = chosenIds.has(sid);
                  const conflictShift = otherShiftAssignments[sid];
                  const isConflict = Boolean(conflictShift);

                  return `
                    <div class="py-2 px-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-teal-50/80' : isConflict ? 'opacity-60 bg-slate-50/50' : 'hover:bg-slate-50'}">
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}">
                          ${esc((s.name || '').slice(-2))}
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-black text-slate-800 truncate">${esc(s.name)}</div>
                          <div class="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                            <span>${esc(s.group || 'Học sinh')}</span>
                            ${isConflict ? `<span class="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-extrabold text-[9px]"><i class="ph-bold ph-warning"></i> Đã trực ${conflictShift}</span>` : ''}
                          </div>
                        </div>
                      </div>

                      <div>
                        ${isSelected ? `
                          <button type="button" class="duty-toggle-student px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-black hover:bg-rose-600 transition-colors cursor-pointer" data-id="${esc(s.id)}">
                            <span>Đã chọn</span>
                          </button>
                        ` : isConflict ? `
                          <button type="button" class="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-400 text-xs font-bold cursor-not-allowed" disabled title="Học sinh đã có lịch trực khác trong tuần">
                            Đã có ca
                          </button>
                        ` : `
                          <button type="button" class="duty-toggle-student px-3 py-1 rounded-lg bg-white border border-teal-300 text-teal-700 hover:bg-teal-50 text-xs font-black transition-colors cursor-pointer" data-id="${esc(s.id)}">
                            + Chọn
                          </button>
                        `}
                      </div>
                    </div>
                  `;
                }).join('') : '<div class="text-center py-8 text-xs text-slate-400 font-bold">Không tìm thấy học sinh phù hợp</div>'}
              </div>

              <div class="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <span class="text-[11px] text-slate-500 font-bold">
                  Quy tắc: 1 học sinh chỉ trực 1 ca/tuần.
                </span>
                <div class="flex items-center gap-2">
                  <button type="button" id="duty-modal-cancel" class="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer">
                    Đóng
                  </button>
                  <button type="button" id="duty-modal-save" class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
                    <i class="ph-bold ph-check"></i> Lưu phân công (${chosenIds.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        const backdrop = modalContainer.querySelector('#duty-assign-backdrop');
        const closeBtn = modalContainer.querySelector('#duty-modal-close');
        const cancelBtn = modalContainer.querySelector('#duty-modal-cancel');
        const saveBtn = modalContainer.querySelector('#duty-modal-save');
        const searchInput = modalContainer.querySelector('#duty-student-search');

        const closeModal = () => {
          modalContainer.innerHTML = '';
        };

        backdrop.onclick = e => {
          if (e.target === backdrop) closeModal();
        };
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        modalContainer.querySelectorAll('.duty-remove-student').forEach(btn => {
          btn.onclick = () => {
            chosenIds.delete(btn.dataset.id);
            renderModal();
          };
        });

        const clearBtn = modalContainer.querySelector('#duty-clear-chosen');
        if (clearBtn) {
          clearBtn.onclick = () => {
            chosenIds.clear();
            renderModal();
          };
        }

        modalContainer.querySelectorAll('.duty-group-filter').forEach(btn => {
          btn.onclick = () => {
            groupFilter = btn.dataset.group;
            renderModal();
          };
        });

        modalContainer.querySelectorAll('.duty-toggle-student').forEach(btn => {
          btn.onclick = () => {
            const id = btn.dataset.id;
            if (chosenIds.has(id)) {
              chosenIds.delete(id);
            } else {
              if (otherShiftAssignments[id]) {
                return message(`Học sinh này đã được xếp lịch ở ${otherShiftAssignments[id]}. Vui lòng bỏ ca kia trước nếu muốn đổi.`, true);
              }
              chosenIds.add(id);
            }
            renderModal();
          };
        });

        if (searchInput) {
          searchInput.oninput = e => {
            searchQuery = e.target.value;
            renderModal();
            const nextInput = modalContainer.querySelector('#duty-student-search');
            if (nextInput) {
              nextInput.focus();
              nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
            }
          };
        }

        saveBtn.onclick = async () => {
          if (working || leaving) return;
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Đang lưu...';
          dirty = true;
          run(async () => {
            try {
              await api({
                action: 'duty-assign',
                week: data.week,
                day: dayKey,
                shift: shiftKey,
                studentIds: Array.from(chosenIds)
              });
              closeModal();
              await load();
              message(`Đã lưu phân công ${chosenIds.size} học sinh cho ${dayObj.label} • Ca ${shiftObj.short}.`);
            } catch (err) {
              saveBtn.disabled = false;
              saveBtn.innerHTML = `<i class="ph-bold ph-check"></i> Lưu phân công (${chosenIds.size})`;
              message(err.message || 'Không thể lưu phân công.', true);
            }
          });
        };
      }

      renderModal();
    }

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
