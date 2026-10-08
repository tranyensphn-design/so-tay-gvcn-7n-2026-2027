import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {parseHTML} from 'linkedom';
const {document}=parseHTML('<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MENU DỌC GVCN V3 — Ban cán sự</title></head><body style="margin:0"><div id="app"></div></body></html>');
const students=Array.from({length:8},(_,i)=>({id:String(i+1),name:'Học sinh '+String(i+1).padStart(2,'0'),group:'Tổ '+(1+i%4),points:10+i,history:[{id:'demo'+i,date:'2026-10-05',points:2,reason:'Tích cực phát biểu xây dựng bài',category:'Học tập',performer:'Bạn Minh',canEdit:false}],attendance:i===7?'excused':'present'}));
const data={role:'bcs',className:'Lớp 7N',classBranding:{stationName:'TRẠM CÔ TRẦN YẾN',slogan:'Đoàn kết - Tự tin - Tỏa sáng',avatarUrl:''},today:'2026-10-05',week:'2026-10-05',groupId:null,selectedRoleKey:'lop-truong',availableRoles:[],identity:{name:'Bạn Minh',title:'Lớp trưởng'},students,duties:[],subjects:[{id:'math',name:'Toán'}],grades:[],permissions:{roster:true,scoresView:true,attendanceView:true,attendance:true,dutyView:true,duty:true,points:true,directScore:true,scoreEdit:true,grades:true,categories:['Nề nếp','Học tập']}};
const window={cloudUser:{uid:'demo'},cloudMembership:{role:'bcs'},cloudServices:{deputy:async()=>data}};
const context=vm.createContext({window,document,crypto:{randomUUID},setInterval:()=>0,clearInterval:()=>{},setTimeout,clearTimeout,confirm:()=>false});
for(const file of ['class-dashboard.js','to-pho.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
await window.openDeputyWorkspace();document.getElementById('deputy-dashboard-theme').remove();
for (const match of fs.readFileSync('index.html','utf8').matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)) { const style=document.createElement('style');style.textContent=match[1];document.head.appendChild(style); }
for(const file of ['class-dashboard.css','deputy-dashboard.css']){const style=document.createElement('style');style.textContent=fs.readFileSync(file,'utf8');document.head.appendChild(style);}
document.querySelector('.overview-hero-chip').textContent='BẢN XEM TRƯỚC • DỮ LIỆU MINH HỌA';
document.querySelectorAll('form button,form input,form select,form textarea').forEach(e=>{e.disabled=true;});
const tailwind=document.createElement('script');tailwind.src='https://cdn.tailwindcss.com';document.head.appendChild(tailwind);
const icons=document.createElement('script');icons.src='https://unpkg.com/@phosphor-icons/web';document.head.appendChild(icons);
const script=document.createElement('script');script.textContent=`
const root=document.getElementById('deputy-workspace'),sidebar=document.getElementById('bcs-sidebar'),toggle=document.getElementById('bcs-menu-toggle'),backdrop=document.getElementById('bcs-sidebar-backdrop'),main=document.getElementById('bcs-main');
const desktop=matchMedia('(min-width:1024px)');
function menu(open){open=Boolean(open&&!desktop.matches);root.classList.toggle('bcs-menu-open',open);toggle.setAttribute('aria-expanded',String(open));backdrop.hidden=!open;sidebar.inert=!desktop.matches&&!open;sidebar.setAttribute('aria-hidden',String(sidebar.inert));main.inert=open;}
toggle.onclick=()=>menu(!root.classList.contains('bcs-menu-open'));
document.getElementById('bcs-menu-close').onclick=()=>{menu(false);toggle.focus();};backdrop.onclick=()=>{menu(false);toggle.focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu(false);toggle.focus();}});desktop.addEventListener('change',()=>menu(false));menu(!desktop.matches);
document.querySelectorAll('[data-panel-link]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==b.dataset.panelLink);document.querySelectorAll('[data-panel-link]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('deputy-view-title').textContent=b.textContent;menu(false);});
document.querySelectorAll('[data-action],#logout,#bcs-parent-lookup-btn').forEach(b=>b.onclick=()=>alert('Bản minh họa, không kết nối hoặc ghi dữ liệu lớp thật.'));
`;
document.body.appendChild(script);
document.getElementById('deputy-workspace').classList.add('bcs-menu-open');
document.getElementById('bcs-sidebar').setAttribute('aria-hidden','false');
document.getElementById('bcs-menu-toggle').setAttribute('aria-expanded','true');
document.getElementById('bcs-sidebar-backdrop').hidden=false;
const offlineStyle=document.createElement('style');offlineStyle.textContent='@media(min-width:1024px){#deputy-workspace .bcs-sidebar-backdrop{display:none!important}}';document.head.appendChild(offlineStyle);
fs.writeFileSync('XEM_TRUOC_MENU_DOC_GVCN_V3.html',('<!DOCTYPE html>\n'+document.documentElement.outerHTML).replace(/[ \t]+$/gm,''));
