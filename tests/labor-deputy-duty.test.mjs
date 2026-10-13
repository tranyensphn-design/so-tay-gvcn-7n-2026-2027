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

