// --- [1. 프리셋 데이터 연동] ---
const presets = {
  prime: {
    applicant_name: "김민수", age: 32, phone_owner_name: "김민수", account_owner_name: "김민수",
    kcb_score: 790, nice_score: 830, current_overdue_count: 0, recent_6m_overdue_days: 0,
    is_public_default: false, nhic_status: "직장가입자", employment_months: 18, avg_nhic_premium: 145000,
    payday_day: 25, annual_income: 45000000, total_debt: 12000000, peer_lender_count: 0, past_repaid_count: 1
  },
  borderline: {
    applicant_name: "박준영", age: 26, phone_owner_name: "박준영", account_owner_name: "박준영",
    kcb_score: 690, nice_score: 730, current_overdue_count: 0, recent_6m_overdue_days: 2,
    is_public_default: false, nhic_status: "직장가입자", employment_months: 4, avg_nhic_premium: 85000,
    payday_day: 10, annual_income: 26000000, total_debt: 18000000, peer_lender_count: 1, past_repaid_count: 0
  },
  cutoff: {
    applicant_name: "이진호", age: 23, phone_owner_name: "이진호", account_owner_name: "이진호",
    kcb_score: 610, nice_score: 640, current_overdue_count: 1, recent_6m_overdue_days: 15,
    is_public_default: true, nhic_status: "지역가입자", employment_months: 1, avg_nhic_premium: 32000,
    payday_day: 15, annual_income: 15000000, total_debt: 22000000, peer_lender_count: 2, past_repaid_count: 0
  }
};

function applyPreset(type) {
  // 버튼 스타일 변경
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const p = presets[type];
  for (let key in p) {
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = p[key];
    else el.value = p[key];
  }
}

// --- [2. 룰 엔진 알고리즘] ---

function evaluateHardCutoff(d) {
  const v = [];
  if (d.kcb_score < 650 || d.nice_score < 700) v.push("신용점수 미달 (KCB 650 또는 NICE 700 미만)");
  if (d.current_overdue_count > 0 || d.recent_6m_overdue_days >= 5) v.push("연체 보유 (단기 5일 이상)");
  if (d.is_public_default) v.push("공공기록 등재 (파산/면책/신복위)");
  if (d.nhic_status !== "직장가입자" || d.employment_months < 3) v.push("건보 직장가입 3개월 미만");
  if (d.applicant_name !== d.phone_owner_name || d.applicant_name !== d.account_owner_name) v.push("명의 불일치 (본인확인 실패)");
  if (d.peer_lender_count >= 2) v.push("타 대부업체 과다 이용");
  return v;
}

function calculateScore(d) {
  let cb = 15;
  if (d.kcb_score >= 750 && d.nice_score >= 800) cb = 30;
  else if (d.kcb_score >= 700 || d.nice_score >= 750) cb = 23;

  let emp = (d.employment_months >= 12) ? 15 : ((d.employment_months >= 6) ? 10 : 5);
  if (d.avg_nhic_premium >= 120000) emp += 20;
  else if (d.avg_nhic_premium >= 70000) emp += 15;
  else emp += 10;

  let dti = d.annual_income > 0 ? (d.total_debt / d.annual_income * 100) : 999;
  let debt = (dti <= 40) ? 15 : ((dti <= 80) ? 10 : ((dti <= 120) ? 5 : 0));
  if (d.peer_lender_count === 0) debt += 5;

  let prof = (d.age >= 28 && d.age <= 55) ? 10 : ((d.age >= 24 && d.age <= 27 || d.age >= 56) ? 6 : 3);
  prof += (d.past_repaid_count >= 1) ? 5 : 2;

  return cb + emp + debt + prof;
}

function getNextPayday(paydayDay) {
  const today = new Date();
  let d = new Date(today.getFullYear(), today.getMonth(), paydayDay);
  if (d <= today) d.setMonth(d.getMonth() + 1);
  
  if (Math.ceil((d - today) / 86400000) <= 5) d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() + 1); // 급여일 익일
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// --- [3. UI 조작 및 애니메이션] ---

function startEvaluation() {
  // 실제 금융 앱처럼 0.8초의 가짜 분석 딜레이(UX) 추가
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('readyStage').classList.add('d-none');
  document.getElementById('resultStage').classList.add('d-none');
  document.getElementById('loadingStage').classList.remove('d-none');

  setTimeout(() => {
    processLogic();
  }, 800);
}

function processLogic() {
  document.getElementById('loadingStage').classList.add('d-none');
  document.getElementById('resultStage').classList.remove('d-none');
  
  // 폼 데이터 파싱
  const d = {
    applicant_name: document.getElementById("applicant_name").value,
    phone_owner_name: document.getElementById("phone_owner_name").value,
    account_owner_name: document.getElementById("account_owner_name").value,
    age: Number(document.getElementById("age").value),
    kcb_score: Number(document.getElementById("kcb_score").value),
    nice_score: Number(document.getElementById("nice_score").value),
    current_overdue_count: Number(document.getElementById("current_overdue_count").value),
    recent_6m_overdue_days: Number(document.getElementById("recent_6m_overdue_days").value),
    is_public_default: document.getElementById("is_public_default").checked,
    nhic_status: document.getElementById("nhic_status").value,
    employment_months: Number(document.getElementById("employment_months").value),
    avg_nhic_premium: Number(document.getElementById("avg_nhic_premium").value),
    payday_day: Number(document.getElementById("payday_day").value),
    annual_income: Number(document.getElementById("annual_income").value),
    total_debt: Number(document.getElementById("total_debt").value),
    peer_lender_count: Number(document.getElementById("peer_lender_count").value),
    past_repaid_count: Number(document.getElementById("past_repaid_count").value)
  };

  const cutoffs = evaluateHardCutoff(d);
  const badge = document.getElementById('decisionBadge');
  const circle = document.getElementById('scoreCircle');
  
  if (cutoffs.length > 0) {
    // 거절 처리
    badge.className = 'fin-badge danger';
    badge.innerHTML = '⛔ 즉시 거절 (심사 불가)';
    circle.className = 'score-circle mx-auto my-3 danger';
    document.getElementById('scoreDisplay').innerText = '0';
    
    document.getElementById('approvedBox').classList.add('d-none');
    document.getElementById('rejectedBox').classList.remove('d-none');
    
    const list = document.getElementById('cutoffList');
    list.innerHTML = '';
    cutoffs.forEach(c => list.innerHTML += `<li>${c}</li>`);
  } else {
    // 통과 및 점수 계산
    const score = calculateScore(d);
    document.getElementById('rejectedBox').classList.add('d-none');
    document.getElementById('approvedBox').classList.remove('d-none');
    document.getElementById('resDueDate').innerText = getNextPayday(d.payday_day);
    
    // 점수 카운트업 애니메이션
    animateValue('scoreDisplay', 0, score, 500);

    if (score >= 80) {
      badge.className = 'fin-badge success';
      badge.innerHTML = '✅ 즉시 자동 승인';
      circle.className = 'score-circle mx-auto my-3 success';
    } else if (score >= 65) {
      badge.className = 'fin-badge warning';
      badge.innerHTML = '⚠️ 수동 심사 (재직 확인 요망)';
      circle.className = 'score-circle mx-auto my-3 warning';
      document.getElementById('resDueDate').innerText += ' (확인 후 확정)';
    } else {
      badge.className = 'fin-badge danger';
      badge.innerHTML = '⛔ 스코어 미달 거절';
      circle.className = 'score-circle mx-auto my-3 danger';
      document.getElementById('approvedBox').classList.add('d-none');
    }
  }
}

function resetForm() {
  document.getElementById('resultStage').classList.add('d-none');
  document.getElementById('readyStage').classList.remove('d-none');
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('scoreDisplay').innerText = '0';
  document.getElementById('scoreCircle').className = 'score-circle mx-auto my-3';
}

// 숫자 카운트 애니메이션 유틸리티
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}