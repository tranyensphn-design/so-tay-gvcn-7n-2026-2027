import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,view,blocked} from './helpers/deputy-ui.mjs';
import {fixture} from './helpers/deputy-fixture.mjs';

const details={...view,className:'Lớp 7N',classBranding:{stationName:'Trạm lớp 7N',slogan:'Đoàn kết',avatarUrl:''},permissions:{points:true,attendanceView:true,dutyView:true,categories:['Học tập']}};

test('sidebar opens and closes without discarding an unsent score or requesting new data',async()=>{
 let requests=0;const f=setup({deputy:async()=>{requests++;return details;}});await f.open();
 const toggle=f.document.querySelector('#bcs-menu-toggle');assert(toggle,'mobile navigation opener exists');
 const form=f.document.querySelector('#score-form'),reason=form.querySelector('[name=reason]');reason.value='Bài đang nhập';
 toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');
 assert.equal(f.document.querySelector('#bcs-sidebar-backdrop').hidden,false);
 assert.deepEqual([...f.document.querySelectorAll('#bcs-navigation [data-panel-link]')].map(b=>b.dataset.panelLink),['points','attendance','duty']);
 f.document.querySelector('[data-panel-link=attendance]').click();
 assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(f.document.querySelector('[data-panel=attendance]').hidden,false);
 toggle.click();f.document.querySelector('[data-panel-link=points]').click();
 assert.equal(f.document.querySelector('#score-form'),form);assert.equal(reason.value,'Bài đang nhập');assert.equal(requests,1);
 toggle.click();f.document.querySelector('#bcs-sidebar-backdrop').click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
 toggle.click();f.document.querySelector('#bcs-menu-close').click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
});

test('revoked access clears navigation outside the content panel',async()=>{
 let revoked=false;const f=setup({deputy:async()=>{if(revoked)throw blocked();return details;}});await f.open();
 assert(f.document.querySelector('#bcs-navigation [data-panel-link]'));
 revoked=true;await f.notify();
 assert.equal(f.document.querySelector('[data-panel-link]'),null);assert.equal(f.document.querySelector('#score-form'),null);
 assert.equal(f.document.querySelector('#bcs-role-slot').textContent,'');
});

test('officer view shares only display branding, not other teacher settings',async()=>{
 const f=fixture();Object.assign(f.state().admin ||= {},{stationName:'Trạm lớp 7N',slogan:'Đoàn kết',classAvatarUrl:'https://example.com/class.png',privateNote:'private-teacher-note'});
 const result=await f.service('deputy',{action:'view'});
 assert.deepEqual(result.classBranding,{stationName:'Trạm lớp 7N',slogan:'Đoàn kết',avatarUrl:'https://example.com/class.png'});
 assert(!JSON.stringify(result).includes('private-teacher-note'));
});
