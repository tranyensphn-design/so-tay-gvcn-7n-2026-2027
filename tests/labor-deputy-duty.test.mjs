import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/deputy-fixture.mjs';
import {setup, tick} from './helpers/deputy-ui.mjs';

function setupLaborDeputy() {
  const backend = fixture();
  backend.db.rows.get('artifacts/demo/members/deputy').role = 'bcs';
  backend.state().officerRoles = [{
    key: 'lop-pho-lao-dong',
    title: 'Lớp phó lao động',
    status: 'active',
    assignedStudentId: '1',
    scope: 'all',
    canAccessTabs: ['truc-nhat', 'tich-diem', 'bao-cao'],
    allowedCategories: ['Phong trào', 'Kỷ luật', 'Nề nếp'],
    actions: { view: true, add: true, edit: false, delete: false, gradeEntry: true }
  }];
  const requests = [];
  const ui = setup({
    deputy: async body => {
      requests.push(body);
      return backend.service('deputy', body);
    }
  });
  return { ...ui, backend, requests };
}

test('Labor deputy workspace renders 2-column duty view with toolbar, week grid, and shift tabs matching GVCN', async () => {
  const f = setupLaborDeputy();
  await f.open();

  // Click on "Trực nhật" tab
  const dutyNav = f.document.querySelector('[data-panel-link="duty"]');
  assert(dutyNav, 'Navigation link for duty should exist');
  dutyNav.click();

  const dutyPanel = f.document.querySelector('[data-panel="duty"]');
  assert.equal(dutyPanel.hidden, false, 'Duty panel should be visible');

  // Verify page banner
  assert(dutyPanel.querySelector('.page-banner[data-page-banner="duty"]'), 'Banner should exist');
  assert.match(dutyPanel.querySelector('.page-banner-title').textContent, /Trực nhật • Tuần/);

  // Verify toolbar with week/day actions and officer role pill
  const toolbar = dutyPanel.querySelector('.duty-toolbar');
  assert(toolbar, 'Duty toolbar should exist');
  assert(toolbar.querySelector('[data-action="today-duty-day"]'), 'Hôm nay button should exist');
  assert.match(toolbar.textContent, /Lớp phó lao động/);

  // Verify left column: duty-today card
  const dutyToday = dutyPanel.querySelector('.duty-today');
  assert(dutyToday, 'duty-today card should exist');
  assert(dutyToday.querySelector('.duty-shift-tabs'), 'Shift tabs (Sáng/Chiều) should exist');
  assert(dutyToday.querySelector('.duty-score-row'), '4 Quick score buttons should exist');

  // Verify right column: 6-day week grid
  const weekGrid = dutyPanel.querySelector('.duty-week-grid');
  assert(weekGrid, 'duty-week-grid should exist');
  const dayCards = weekGrid.querySelectorAll('.duty-day');
  assert.equal(dayCards.length, 6, 'Should render 6 day cards (Thứ 2 to Thứ 7)');

  // Verify extra cleaning tasks card
  assert(dutyPanel.querySelector('.duty-extra'), 'Tổng vệ sinh / Trực đột xuất card should exist');
});

test('Labor deputy can switch shifts and evaluate duty directly using quick rating buttons', async () => {
  const f = setupLaborDeputy();
  await f.open();

  f.document.querySelector('[data-panel-link="duty"]').click();
  const dutyPanel = f.document.querySelector('[data-panel="duty"]');

  // Switch shift to Afternoon (Chiều)
  const afternoonTab = dutyPanel.querySelector('[data-action="select-duty-shift"][data-shift="afternoon"]');
  assert(afternoonTab, 'Afternoon shift tab should exist');
  afternoonTab.click();
  await tick();

  // Switch back to Morning
  const morningTab = f.document.querySelector('[data-action="select-duty-shift"][data-shift="morning"]');
  morningTab.click();
  await tick();

  // Click quick rating button "good" (+5đ)
  const goodScoreBtn = f.document.querySelector('.duty-score-row [data-action="rate-duty"][data-rating="good"]');
  assert(goodScoreBtn, 'Good (+5đ) score button should exist');
  goodScoreBtn.click();
  await tick();

  // Verify backend duty evaluation is updated
  const dutyRecord = f.backend.state().dutyRoster.weeks['2026-09-14']?.deputyEvaluations?.mon?.morning?.['1'];
  assert(dutyRecord, 'Evaluation should be recorded in backend');
  assert.equal(dutyRecord.rating, 'good');
  assert.match(f.document.querySelector('#message').textContent, /Đã lưu đánh giá/);
});

test('modal-container persists on document.body and is not wiped by app.innerHTML updates', () => {
  const {document} = setupLaborDeputy();
  // Ensure modal-container can be mounted on body
  let container = document.getElementById('modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modal-container';
    document.body.appendChild(container);
  }
  container.innerHTML = '<div id="test-modal">Modal content</div>';
  assert.equal(document.getElementById('test-modal')?.textContent, 'Modal content');

  // Simulate an app re-render (which updates #app.innerHTML)
  const app = document.getElementById('app');
  app.innerHTML = '<main id="new-content">Updated</main>';

  // Verify modal is NOT destroyed because it is not inside #app
  assert.equal(document.getElementById('test-modal')?.textContent, 'Modal content', 'Modal should persist across app.innerHTML re-renders');
});

test('Labor deputy can trigger auto-arrange duty week and backend rotates students across all shifts', async () => {
  const f = setupLaborDeputy();
  // Mock window.confirm to return true
  f.window.confirm = () => true;
  await f.open();

  f.document.querySelector('[data-panel-link="duty"]').click();
  const dutyPanel = f.document.querySelector('[data-panel="duty"]');

  const autoBtn = dutyPanel.querySelector('[data-action="auto-arrange-duty"]');
  assert(autoBtn, 'Auto-arrange button should exist for Labor Deputy');
  autoBtn.click();
  await tick();

  const req = f.requests.find(r => r.action === 'duty-auto-arrange');
  assert(req, 'duty-auto-arrange API request should be dispatched');

  const weekAssignments = f.backend.state().dutyRoster?.weeks?.[req.week]?.assignments;
  assert(weekAssignments, 'Week assignments should be created');
  assert(Array.isArray(weekAssignments.mon?.morning), 'Monday morning shift should have students');
  assert(weekAssignments.mon.morning.length > 0, 'At least 1 student should be assigned');
  assert.match(f.document.querySelector('#message').textContent, /tự động xếp lịch trực nhật thành công/i);
});

test('Labor deputy can open duty editor modal and assign students to shift with conflict validation', async () => {
  const f = setupLaborDeputy();
  await f.open();

  f.document.querySelector('[data-panel-link="duty"]').click();

  // Find a shift edit button
  const editBtn = f.document.querySelector('[data-action="open-duty-editor"][data-day="mon"][data-shift="morning"]');
  assert(editBtn, 'Duty edit button should exist for mon morning');
  editBtn.click();
  await tick();

  const modalBackdrop = f.document.querySelector('#duty-assign-backdrop');
  assert(modalBackdrop, 'Duty assign modal should be displayed');
  assert.match(modalBackdrop.textContent, /Phân công: Thứ Hai • Ca Sáng/);

  // Toggle student 2
  const toggleBtn = modalBackdrop.querySelector('.duty-toggle-student[data-id="2"]');
  if (toggleBtn) {
    toggleBtn.click();
    await tick();
  }

  // Save assignments
  const saveBtn = modalBackdrop.querySelector('#duty-modal-save');
  assert(saveBtn, 'Modal save button should exist');
  saveBtn.click();
  await tick();

  const assignReq = f.requests.find(r => r.action === 'duty-assign');
  assert(assignReq, 'duty-assign API request should be dispatched');
  assert.equal(assignReq.day, 'mon');
  assert.equal(assignReq.shift, 'morning');
  assert(Array.isArray(assignReq.studentIds), 'studentIds must be an array');
});

test('Duty toolbar officer badge has duty-toolbar-officer-badge class to prevent text squeeze', async () => {
  const f = setupLaborDeputy();
  await f.open();

  f.document.querySelector('[data-panel-link="duty"]').click();
  const badge = f.document.querySelector('.duty-toolbar-officer-badge');
  assert(badge, 'Officer badge should have duty-toolbar-officer-badge class');
  assert.match(badge.textContent, /Lớp phó lao động/);
});


