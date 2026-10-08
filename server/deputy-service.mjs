import { applyAcademicScore, gradeVersion } from './academic-score.mjs';
import { AccessError, studentView, officerFor } from './access-model.mjs';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const RATINGS = { good: [5, 'Tốt'], done: [0, 'Đạt'], incomplete: [-3, 'Chưa đạt'], absent: [-5, 'Nghỉ trực'] };
const fail = (message = 'Bạn không có quyền thực hiện thao tác này.', code = 'ACCESS_DENIED') => { const error = new AccessError(403, message); error.code = code; throw error; };
const historyWeek = h => (h && Number.isFinite(Date.parse(h.date))) ? weekOf(new Date(Date.parse(h.date) + 7*3600000).toISOString().slice(0,10)) : null;
export const scoreVersion = h => h ? JSON.stringify([h.points,h.reason,h.category,h.updatedAt || h.date,Number(h.editRevision)||0]) : '';
export function normalizeGroup(g) {
  if (g === null || g === undefined) return '';
  return String(g).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^to[-_\s]*/i, '').trim();
}
export function isSameGroup(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const sa = String(a).trim().toLowerCase();
  const sb = String(b).trim().toLowerCase();
  if (sa === sb) return true;
  const na = normalizeGroup(a);
  const nb = normalizeGroup(b);
  return na !== '' && na === nb;
}
export function weekOf(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function applyDelta(student, points, history) {
  const before = Number(student.stars) || 0;
  student.points = (Number(student.points) || 0) + points;
  student.stars = Math.max(0, before + points);
  (student.history ||= []).push({ ...history, points, actualStars: student.stars - before });
}
export function applyAttendance(state, student, id, status, today, stamp, performer) {
  if (!['present','late','excused','unexcused'].includes(status)) throw new AccessError(400,'Trạng thái điểm danh không hợp lệ.');
  const record = (state.attendanceRecords ||= {})[today] ||= {};
  if (record[id] === status) return;
  const ledger = (state.attendancePointAdjustments ||= {})[today] ||= {};
  const old = ledger[id];
  if (old) {
    const stars = Number(student.stars) || 0;
    student.points = (Number(student.points)||0) - (Number(old.pointsDelta)||0);
    student.stars = Math.max(0,stars-(Number(old.starsDelta)||0));
    (student.history ||= []).push({id:`attendance-restore:${today}:${id}:${stamp}`,date:stamp,points:-(Number(old.pointsDelta)||0),actualStars:student.stars-stars,source:'attendance',attendanceDate:today,attendanceStatus:status,category:'Chuyên cần',reason:'Hoàn điểm khi sửa điểm danh',performer});
    delete ledger[id];
  }
  const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
  if (status === 'late' || status === 'unexcused') {
    const aliases = status === 'late' ? ['di hoc muon','di muon'] : ['nghi hoc khong xin phep','vang khong phep'];
    const criterion = (state.criteria?.negative || []).find(c=>aliases.some(a=>normalize(c.reason).includes(a)));
    const penalty = Math.max(0,Number(criterion?.points ?? 10)||0);
    const stars = Number(student.stars)||0;
    applyDelta(student,-penalty,{id:`attendance:${today}:${id}:${stamp}`,date:stamp,source:'attendance',attendanceDate:today,attendanceStatus:status,category:'Chuyên cần',reason:criterion?.reason || (status==='late'?'Đi học muộn':'Vắng không phép'),performer});
    ledger[id]={pointsDelta:-penalty,starsDelta:student.stars-stars,configuredPenalty:penalty,status};
  }
  record[id]=status;
}
export function projectGroup(state, groupId) {
  const students = (state.students || []).filter(s => (groupId === null || isSameGroup(s.group, groupId)));
  const ids = new Set(students.map(s => String(s.id)));
  const duties = [];
  for (const [week, value] of Object.entries(state.dutyRoster?.weeks || {})) {
    for (const [day, shifts] of Object.entries(value.assignments || {})) {
      for (const [shift, assigned] of Object.entries(shifts || {})) {
        if (!Array.isArray(assigned)) continue;
        for (const id of assigned) if (ids.has(String(id))) duties.push({ week, day, shift, studentId: String(id),
          evaluation: value.deputyEvaluations?.[day]?.[shift]?.[String(id)] || null,
          teacherEvaluation: value.evaluations?.[day]?.[shift]?.status ? {status:value.evaluations[day][shift].status} : null });
      }
    }
  }
  return { groupId, students: students.map(s => ({ id: String(s.id), name: s.name || '', group: String(s.group || ''),
    points: Number(s.points) || 0, history: (s.history || []).map(h => ({ id: h.id, date: h.date,
      reason: h.reason || '', category: h.category || '', points: Number(h.points) || 0, performer: h.performer || '' })) })), duties };
}
export function createDeputyService({ db, auth, appId, classId, clock = Date.now }) {
  const root = db.collection('artifacts').doc(appId);
  const cls = root.collection('classes').doc(classId);
  const stateRef = cls.collection('state').doc('main');
  const proposals = cls.collection('scoreProposals');
  return async (token, input) => {
    let actor;
    try { actor = await auth.verifyIdToken(token, true); } catch { throw Object.assign(new AccessError(401, 'Phiên đăng nhập đã hết hạn.'), {code:'SESSION_EXPIRED'}); }
    // Older deployed clients use propose; it now has the same direct-write semantics.
    input = {...input, action: input.action === 'propose' ? 'score' : input.action};
    const today = new Date(clock() + 7 * 3600000).toISOString().slice(0, 10);
    const stamp = new Date(clock()).toISOString();
    return db.runTransaction(async tx => {
      const [ms, ss] = await Promise.all([tx.get(root.collection('members').doc(actor.uid)), tx.get(stateRef)]);
      const member = ms.data(), state = ss.data()?.state;
      if (!member?.active || !state || (member.classId && member.classId !== classId)) fail();
      const teacher = member.role === 'gvcn' && member.authMode !== 'simple';
      const deputy = member.role === 'to_pho' && member.classId === classId;
      const officer = member.role === 'bcs' && (!member.classId || member.classId === classId);
      if (!teacher && !deputy && !officer) fail();
      if (member.authMode === 'simple' && member.accessVersion !== actor.accessVersion) fail('Quyền đã thay đổi. Hãy đăng nhập lại.', 'SESSION_CHANGED');
      const assigned = state.students?.find(s => String(s.id) === String(member.studentId));
      const roles = officer ? (state.officerRoles || []).filter(r => r.status === 'active' && String(r.assignedStudentId) === String(member.studentId) && r.actions?.view === true) : [];
      const usable = role => ['all','group'].includes(role.scope) && (!(role.scope === 'group' || /^to-truong/.test(role.key || '')) || (role.groupName && isSameGroup(assigned?.group, role.groupName)));
      // Never merge scopes. Each request uses exactly one teacher-assigned role. Prioritize scoring-capable roles when roleKey is omitted.
      const policy = officer ? (input.roleKey ? roles.find(r => r.key === input.roleKey) : (roles.find(r => usable(r) && r.actions?.add === true) || roles.find(usable) || roles[0])) : null;
      if (officer && (!assigned || !policy || policy.actions?.view !== true)) fail('Chức vụ đã bị khóa hoặc chưa được cấp quyền xem.', 'ROLE_UNAVAILABLE');
      const groupId = deputy ? member.groupId : officer && (policy.scope === 'group' || /^to-truong/.test(policy.key || '')) ? policy.groupName : null;
      if ((deputy || (officer && (policy.scope === 'group' || /^to-truong/.test(policy.key || '')))) && (!groupId || !assigned || !isSameGroup(assigned.group, groupId))) fail('Phân công tổ chưa khớp với danh sách lớp. GVCN cần kiểm tra lại tổ và học sinh được phân công.', 'ASSIGNMENT_CHANGED');
      if (officer && !['all','group'].includes(policy.scope)) fail('Phạm vi phân quyền chưa hợp lệ.');
      const tabs = officer ? (policy.canAccessTabs || []) : ['truc-nhat','tich-diem','bao-cao'];
      const categories = officer ? (Array.isArray(policy.allowedCategories) && policy.allowedCategories.length ? policy.allowedCategories : ['Học tập','Phong trào','Kỷ luật','Chuyên cần','Nề nếp']) : ['Học tập','Phong trào','Kỷ luật','Chuyên cần','Nề nếp'];
      const permissions = {
        roster: !teacher && tabs.includes('hoc-sinh'),
        scoresView: !teacher && tabs.some(t => ['tich-diem','bao-cao'].includes(t)),
        attendanceView: officer && tabs.includes('diem-danh') && categories.includes('Chuyên cần'),
        dutyView: !teacher && tabs.includes('truc-nhat'),
        scoreEdit: !teacher && tabs.includes('tich-diem') && (!officer || policy.actions?.edit === true),
        points: !teacher && tabs.includes('tich-diem') && (!officer || policy.actions?.add === true),
        duty: !teacher && tabs.includes('truc-nhat') && (!officer || policy.actions?.add === true),
        attendance: officer && tabs.includes('diem-danh') && categories.includes('Chuyên cần') && policy.actions?.add === true,
        grades: officer && tabs.includes('bao-cao') && policy.actions?.gradeEntry === true && state.gradeSettings?.allowOfficerGradeEntry !== false && state.gradeSettings?.allowMonitorEntry !== false,
        directScore: true,
        categories
      };
      if (input.action === 'view') {

        const projection = teacher ? {} : projectGroup(state, groupId);
        if (permissions.grades) {
          const visibleIds = new Set(projection.students.map(s => s.id));
          projection.subjects = (state.subjectsConfig || []).map(s => ({id:s.id, name:s.name}));
          projection.grades = (state.academicScoresRecords || []).filter(r => visibleIds.has(String(r.studentId))).map(r => ({studentId:String(r.studentId), subjectId:r.subjectId, semester:r.semester, sequence:r.sequence, score:r.score, version:gradeVersion(r)}));
        }
        if (!teacher) {
          if (!tabs.includes('truc-nhat')) projection.duties = [];
          if (!tabs.some(tab => ['bao-cao','tich-diem'].includes(tab))) projection.students.forEach(s => { s.history = []; delete s.points; });
          else if (officer) projection.students.forEach(s => { s.history = s.history.filter(h => categories.includes(h.category)); });
          if (!permissions.roster && !permissions.scoresView && !permissions.attendanceView && !permissions.dutyView && !permissions.grades && !permissions.points) projection.students = [];
          projection.students.forEach(s => {
            const original = state.students?.find(p=>String(p.id)===s.id);
            (s.history || []).forEach(h=>{
              const record = (original?.history || []).find(r=>String(r.id)===String(h.id));
              h.version = scoreVersion(record);
              h.canEdit = Boolean(record && permissions.scoreEdit && record.source==='officer-score' && record.createdBy===actor.uid && !record.weeklyResetSettled && !record.approvedBy && historyWeek(record)===weekOf(today));
            });
          });
          projection.students.forEach(s => { if (permissions.attendanceView) s.attendance = state.attendanceRecords?.[today]?.[s.id] || null; });
        }
        return { className: String(state.admin?.className || 'Lớp 7N'),
          classBranding: {
            stationName: String(state.admin?.stationName || 'TRẠM CÔ TRẦN YẾN'),
            slogan: String(state.admin?.slogan || 'Đoàn kết - Tự tin - Tỏa sáng'),
            avatarUrl: String(state.admin?.classAvatarUrl || '')
          },
          selectedRoleKey: policy?.key || '',
          availableRoles: roles.filter(usable).map(r => ({key:r.key,title:r.title,scope:(r.scope === 'group' || /^to-truong/.test(r.key || '')) ? 'group' : 'all',groupName:r.groupName || ''})),
          role: member.role, title: teacher ? 'Điểm thi đua' : groupId ? `Tổ của tôi • ${groupId}` : 'Ban cán sự • Toàn lớp', today, week: weekOf(today), permissions,
          identity: teacher ? null : {studentId:String(assigned.id), name:assigned.name || '', title:policy?.title || `Tổ phó ${groupId}`},
          ...projection };
      }
      if (input.action === 'grade') {
        if (!permissions.grades) fail('Chưa được GVCN cấp quyền nhập điểm học tập.');
        if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)) throw new AccessError(400, 'Mã yêu cầu không hợp lệ.');
        const receiptRef = cls.collection('gradeMutations').doc(input.requestId);
        const receipt = (await tx.get(receiptRef)).data();
        if (receipt) {
          if (receipt.actor !== actor.uid) fail();
          if (receipt.studentId !== String(input.studentId) || receipt.subjectId !== input.subjectId || receipt.semester !== input.semester || receipt.sequence !== Number(input.sequence) || receipt.score !== input.score)
            throw new AccessError(409, 'Yêu cầu trước đã được lưu. Bấm Cập nhật trước khi nhập thay đổi tiếp theo.');
          return {saved:true};
        }
        const student = state.students.find(s => String(s.id) === String(input.studentId));
        if (!student || (groupId && !isSameGroup(student.group, groupId))) fail();
        const week = weekOf(today);
        if (state.weeklyCompetitionArchives?.[week] || (state.weeklyCompetition?.start && week < state.weeklyCompetition.start)) fail('Tuần này đã chốt, không thể thay đổi điểm.');
        applyAcademicScore(state, student, input, stamp, assigned.name || member.displayName, applyDelta);
        const nextScoreRevision = (Number(ss.data()?.scoreRevision) || 0) + 1;
        tx.update(stateRef, {state, scoreRevision: nextScoreRevision, updatedAt:stamp, updatedBy:actor.uid});
        tx.set(cls.collection('permissionSignals').doc('current'), { revision: nextScoreRevision, updatedAt: stamp });
        tx.set(cls.collection('studentViews').doc(String(student.id)), {state:studentView(state,student), updatedAt:stamp, updatedBy:actor.uid});
        tx.set(receiptRef, {actor:actor.uid, studentId:String(student.id), subjectId:input.subjectId, semester:input.semester, sequence:Number(input.sequence), score:input.score, at:stamp});
        return {saved:true, scoreRevision: nextScoreRevision};
      }
      if (!['score', 'score-edit', 'duty', 'attendance'].includes(input.action)) fail();
      if (input.action === 'score' && !permissions.points) fail();
      if (input.action === 'score-edit' && !permissions.scoreEdit) fail();
      if (input.action === 'duty' && !permissions.duty) fail();
      if (input.action === 'attendance' && !permissions.attendance) fail();
      const studentId = String(input.studentId || '');
      const student = state.students.find(s => String(s.id) === studentId);
      if (!student || (groupId && !isSameGroup(student.group, groupId))) fail();
      const reason = input.action === 'attendance' ? 'Điểm danh' : String(input.reason || '').trim();
      if (!reason || reason.length > 500) throw new AccessError(400, 'Nhập lý do từ 1 đến 500 ký tự.');
      let week = weekOf(today);
      let receiptRef, fingerprint;
      let targetCat = String(input.category || categories[0] || 'Nề nếp');
      if (['score','score-edit'].includes(input.action)) {
        if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)) throw new AccessError(400, 'Mã yêu cầu không hợp lệ.');
        if (!categories.includes(targetCat)) fail('Chuyên mục chưa được GVCN cấp quyền.');
        receiptRef = cls.collection('scoreMutations').doc(input.requestId);
        const receipt = (await tx.get(receiptRef)).data();
        fingerprint = JSON.stringify([input.action,studentId,Number(input.points),reason,targetCat,input.historyId || '',input.expectedRecord ?? null,policy?.key || '']);
        if (receipt) {
          if (receipt.actor !== actor.uid) fail();
          if (receipt.fingerprint !== fingerprint) throw new AccessError(409,'Lượt lưu này đã được xử lý với nội dung khác. Hãy tải lại dữ liệu trước khi sửa.');
          return {saved:true};
        }
        // Do not turn a pending legacy request into a direct award during a retry.
        const legacy = (await tx.get(proposals.doc(input.requestId))).data();
        if (legacy) throw new AccessError(409,'Đây là yêu cầu từ phiên bản cũ. Hãy tải lại và kiểm tra lịch sử điểm trước khi nhập lại.');
      }
      if (input.action === 'duty') {
        week = input.week;
        if (week !== weekOf(today) || !DAYS.includes(input.day) || !['morning', 'afternoon'].includes(input.shift) || !RATINGS[input.rating]) fail('Chỉ được chấm ca trực thuộc tuần hiện tại.');
        const date = new Date(`${week}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + DAYS.indexOf(input.day));
        if (date.toISOString().slice(0, 10) > today) fail('Chưa đến ngày trực nhật này.');
      }
      if (state.weeklyCompetitionArchives?.[week] || (state.weeklyCompetition?.start && week < state.weeklyCompetition.start)) fail('Tuần này đã chốt, không thể thay đổi điểm.');
      if (['score','score-edit'].includes(input.action)) {
        if (!['string','number'].includes(typeof input.points)) throw new AccessError(400,'Điểm phải là một số hợp lệ.');
        let points = Number(input.points);
        if (!Number.isInteger(points) || !points || Math.abs(points) > 100) throw new AccessError(400, 'Điểm phải là số nguyên khác 0, từ -100 đến 100.');
        if (points > 0 && /^giơ tay phát biểu(?:\s*\(.*\))?$/i.test(reason)) points = 2;
        const category = targetCat;
        let entryId = `score:${input.requestId}`, createdAt = stamp, editRevision = 0;
        if (input.action === 'score-edit') {
          const old = student.history?.find(h=>h.id===input.historyId);
          if (!old || old.source !== 'officer-score' || old.createdBy !== actor.uid || !categories.includes(old.category)) fail('Bạn chỉ được sửa bản ghi của mình trong phạm vi được cấp.');
          if (old.weeklyResetSettled || old.approvedBy || historyWeek(old) !== week) fail('Bản ghi đã chốt hoặc không thuộc tuần hiện tại.');
          if (scoreVersion(old) !== input.expectedRecord) throw new AccessError(409,'Điểm đã thay đổi trên thiết bị khác. Hãy tải lại trước khi sửa.');
          student.points = (Number(student.points)||0) - (Number(old.points)||0);
          student.stars = Math.max(0,(Number(student.stars)||0) - (Number(old.actualStars)||0));
          student.history = student.history.filter(h=>h.id !== old.id);
          entryId = old.id; createdAt = old.date; editRevision = (Number(old.editRevision)||0)+1;
        }
        applyDelta(student,points,{id:entryId,date:createdAt,updatedAt:stamp,editRevision,reason,category,performer:assigned.name || member.displayName,source:'officer-score',sourceId:entryId,createdBy:actor.uid});
        tx.set(receiptRef,{actor:actor.uid,fingerprint,at:stamp});
      } else {
        if (input.action === 'attendance') {
          applyAttendance(state, student, studentId, input.status, today, stamp, assigned.name || member.displayName);
        } else {
          const { day, shift, rating } = input;
          const duty = state.dutyRoster?.weeks?.[week];
          if (!duty?.assignments?.[day]?.[shift]?.some(id => String(id) === studentId)) fail('Học sinh không được phân công ca trực này.');
          if (duty.evaluations?.[day]?.[shift]?.status) fail('Ca trực đã được cán bộ phụ trách/GVCN đánh giá.');
          const old = duty.deputyEvaluations?.[day]?.[shift]?.[studentId];
          if (old?.teacherLocked) fail('GVCN đã xử lý điểm này. Không thể sửa đánh giá.');
          const sourceId = `deputy-duty:${week}:${day}:${shift}:${studentId}`;
          const entries = (student.history || []).filter(h => h.sourceId === sourceId);
          if (entries.some(h => h.approvedBy || h.weeklyResetSettled)) fail('Điểm đã xác nhận hoặc chốt, không thể sửa.');
          if (old?.rating === rating && old?.reason === reason) return { saved: true };
          student.points = (Number(student.points) || 0) - entries.reduce((s, h) => s + (Number(h.points) || 0), 0);
          student.stars = Math.max(0, (Number(student.stars) || 0) - entries.reduce((s, h) => s + (Number(h.actualStars) || 0), 0));
          student.history = (student.history || []).filter(h => h.sourceId !== sourceId);
          const points = state.dutyRoster.settings?.linkPoints ? RATINGS[rating][0] : 0;
          applyDelta(student, points, { id: sourceId, date: stamp, reason: `Trực nhật ${RATINGS[rating][1]}: ${reason}`,
            category: 'Nề nếp', performer: assigned.name || member.displayName, source: 'deputy-duty', sourceId });
          (((duty.deputyEvaluations ||= {})[day] ||= {})[shift] ||= {})[studentId] = {
            rating, reason, points, updatedBy: actor.uid, updatedAt: stamp };
        }
      }
      const nextScoreRevision = (Number(ss.data()?.scoreRevision) || 0) + 1;
      tx.update(stateRef, { state, scoreRevision: nextScoreRevision, updatedAt: stamp, updatedBy: actor.uid });
      tx.set(cls.collection('permissionSignals').doc('current'), { revision: nextScoreRevision, updatedAt: stamp });
      tx.set(cls.collection('studentViews').doc(studentId), { state: studentView(state, student), updatedAt: stamp, updatedBy: actor.uid });
      tx.set(cls.collection('auditLogs').doc(), { actorUid: actor.uid, actorRole: member.role,
        action: `deputy.${input.action}`, studentId, createdAt: stamp, summary: reason, level: 'info' });
      return { saved: true, scoreRevision: nextScoreRevision };
    });
  };
}

