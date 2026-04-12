/* ── Constants ── */
var NLW = {
  '2022/23': 9.50, '2023/24': 10.42, '2024/25': 11.44,
  '2025/26': 12.21, '2026/27': 12.71, '2027/28': 12.65
};
var ACC = {
  '2022/23': 8.70, '2023/24': 9.10, '2024/25': 9.99,
  '2025/26': 10.66, '2026/27': 11.10, '2027/28': 11.10
};
var PA    = 12570;   /* Personal allowance */
var BRB   = 50270;   /* Basic rate band upper limit */
var BRT   = 0.20;    /* Basic rate tax */
var HRT   = 0.40;    /* Higher rate tax */
var C4R   = 0.06;    /* Class 4 NI rate */
var C4LPL = 12570;   /* Class 4 lower profits limit */

/* ── State ── */
var yr         = '2026/27';
var nightOn    = false;
var wtrOpen    = false;
var mencapOpen = false;
var accOpen    = false;

/* Shared job data — populated by Tab 1, read by Tabs 2 & 3 */
var S = {
  hasData: false, dayPay: 0, nightPay: 0, totalPay: 0,
  dayHrs: 0, nightHrs: 0, totalHrs: 0, dayRate: 0, nightRate: 0,
  days: 0, hrs: 0, exp: 0, nightOn: false,
  totalCalls: 0, chargePerCall: 0, minsPerCall: 0, nlw: 12.71
};

/* ── Utilities ── */
var fmt = function(n, dp) {
  dp = (dp === undefined) ? 2 : dp;
  return '\u00a3' + n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
var el = function(id) { return document.getElementById(id); };

/* ── Info popups ── */
document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('info-btn')) {
    document.querySelectorAll('.info-popup').forEach(function(p) {
      p.classList.remove('active');
    });
  }
});

function toggleInfo(id) {
  var p = el(id); if (!p) return;
  var was = p.classList.contains('active');
  document.querySelectorAll('.info-popup').forEach(function(x) { x.classList.remove('active'); });
  if (!was) p.classList.add('active');
}

/* ── Tab navigation ── */
function switchTab(n) {
  [1, 2, 3].forEach(function(i) {
    el('tab' + i).classList.toggle('on', i === n);
    el('panel' + i).classList.toggle('on', i === n);
  });
  window.scrollTo(0, 0);
  if (n === 2) renderQuick();
  if (n === 3) calcAdv();
}

/* ── Year pills ── */
document.querySelectorAll('.yr-pill').forEach(function(p) {
  p.addEventListener('click', function() {
    document.querySelectorAll('.yr-pill').forEach(function(x) { x.classList.remove('on'); });
    p.classList.add('on');
    yr = p.getAttribute('data-yr');
    calc();
  });
});

/* ── Input listeners ── */
['dailyRate', 'numDays', 'hrsDay', 'expenses',
 'totalCalls', 'chargePerCall', 'minsPerCall'].forEach(function(id) {
  var e = el(id); if (e) e.addEventListener('input', calc);
});

/* ── Night calls ── */
function toggleNight() {
  nightOn = !nightOn;
  el('nightFields').classList.toggle('open', nightOn);
  el('ntSw').classList.toggle('on', nightOn);
  el('ntIcon').classList.toggle('on', nightOn);
  calc();
}

/* ── WTR card ── */
function toggleWtr() {
  wtrOpen = !wtrOpen;
  el('wtrBody').classList.toggle('open', wtrOpen);
  el('wtrChev').classList.toggle('open', wtrOpen);
}

/* ── Mencap expander ── */
function toggleMencap() {
  mencapOpen = !mencapOpen;
  var b = el('mencapBody'), c = el('mencapChev');
  if (b) b.classList.toggle('open', mencapOpen);
  if (c) c.classList.toggle('open', mencapOpen);
}

/* ── Accommodation panel ── */
function toggleAcc() {
  accOpen = !accOpen;
  el('accPanel').classList.toggle('open', accOpen);
  el('accTrigger').innerHTML = accOpen
    ? '\u25b2 accommodation offset reference'
    : '\u25bc accommodation offset reference';
}

/* ── NLW verdict block ── */
function verdictBlock(label, rate, nlw, sub) {
  var diff = rate - nlw;
  var s = diff >= 0 ? 'above' : (diff >= -1 ? 'close' : 'below');
  var badge = { above: 'Above NLW', close: 'Just below NLW', below: 'Below NLW' }[s];
  return '<div class="nlw-verdict ' + s + '">'
    + '<div><div class="nv-label">' + label + '</div>'
    + '<div class="nv-rate">' + fmt(rate) + '/hr</div>'
    + (sub ? '<div class="nv-sub">' + sub + '</div>' : '')
    + '</div><div class="nv-badge">' + badge + '</div></div>';
}

/* ── Shared combined navy card (used on all three tabs) ── */
function combinedCard(note) {
  return '<div class="card navy-card" style="margin:.625rem .625rem 0">'
    + '<div class="slabel light">Combined earnings this job</div>'
    + '<div class="metrics">'
    + '<div class="metric"><div class="ml">Total earnings</div><div class="mv">' + fmt(S.totalPay, 0) + '</div></div>'
    + '<div class="metric"><div class="ml">Total hours</div><div class="mv">' + S.totalHrs.toFixed(1) + '\u00a0hrs</div></div>'
    + '<div class="metric"><div class="ml">Overall rate</div><div class="mv">' + fmt(S.totalPay / S.totalHrs) + '/hr</div></div>'
    + '</div>'
    + (note ? '<div class="continuity-note">' + note + '</div>' : '')
    + '</div>';
}

/* ── Hours warning ── */
function updateHrsWarn(hrs) {
  var w = el('hrsWarn'), iw = el('hrsDayIw');
  if (iw) iw.style.borderColor = '';
  if (!w) return;
  if (!hrs || hrs <= 10) {
    w.style.display = 'none'; w.className = 'hrs-warn'; return;
  }
  var cls, msg;
  if (hrs > 12) {
    cls = 'serious';
    if (iw) iw.style.borderColor = '#E24B4A';
    msg = '<strong>Serious: ' + hrs + '\u00a0hrs/day</strong> \u2014 exceeds the 12-hour maximum considered safe for sustained live-in care. Fatigue at this level impairs judgement, patience and the quality of care you can provide. This arrangement puts both you and your client at risk. See Working Time Regulations below.';
  } else {
    cls = 'hard';
    if (iw) iw.style.borderColor = '#EF9F27';
    msg = '<strong>Above recommended: ' + hrs + '\u00a0hrs/day</strong> \u2014 sector standard is 8\u201310 active hours with a 2-hour daily break. At this level your wellbeing and quality of care will be affected over a sustained placement. To care well for others, you must first be able to care for yourself.';
  }
  w.className = 'hrs-warn ' + cls;
  w.innerHTML = msg;
  w.style.display = 'block';
}

/* ══════════════════════════════════════════
   TAB 1: NLW CHECKER
══════════════════════════════════════════ */
function calc() {
  var rate = parseFloat(el('dailyRate').value) || 0;
  var days = parseFloat(el('numDays').value)   || 0;
  var hrs  = parseFloat(el('hrsDay').value)    || 0;
  var exp  = parseFloat(el('expenses').value)  || 0;
  var nlw  = NLW[yr];
  var area = el('resultsArea');

  updateHrsWarn(hrs);

  /* WTR card: show only above 10 hrs */
  var wtrCard = el('wtrCard');
  if (wtrCard) {
    wtrCard.classList.toggle('visible', hrs > 10);
    if (hrs <= 10 && wtrOpen) {
      wtrOpen = false;
      el('wtrBody').classList.remove('open');
      el('wtrChev').classList.remove('open');
    }
  }

  if (!rate || !days || !hrs) {
    S.hasData = false;
    area.innerHTML = '<div class="card" style="margin:.625rem .625rem 0">'
      + '<div class="no-data">&#9998;&nbsp; Enter job details above to check against NLW</div></div>';
    el('accWrap').style.display = 'none';
    return;
  }

  /* Daytime */
  var dayPay  = rate * days;
  var dayHrs  = hrs * days;
  var dayRate = dayPay / dayHrs;
  var dayDiff = dayRate - nlw;
  var dayStatus = dayDiff >= 0 ? 'above' : (dayDiff >= -1 ? 'close' : 'below');
  var dayNeed = dayStatus !== 'above'
    ? '<div class="need ' + dayStatus + '">To meet NLW you need <strong>' + fmt(nlw * hrs) + '/day</strong> (' + fmt(nlw * dayHrs) + ' total for this job).</div>'
    : '';

  /* Night calls */
  var totalCalls = 0, chargePerCall = 0, minsPerCall = 0;
  var nightPay = 0, nightHrs = 0, nightRate = 0, nightStatus = '';
  if (nightOn) {
    totalCalls    = parseFloat(el('totalCalls').value)    || 0;
    chargePerCall = parseFloat(el('chargePerCall').value) || 0;
    minsPerCall   = parseFloat(el('minsPerCall').value)   || 0;
    nightPay  = totalCalls * chargePerCall;
    nightHrs  = totalCalls * (minsPerCall / 60);
    nightRate = nightHrs > 0 ? nightPay / nightHrs : 0;
    var nd = nightRate - nlw;
    nightStatus = nd >= 0 ? 'above' : (nd >= -1 ? 'close' : 'below');
    var sp = el('nightSummary');
    if (sp) sp.textContent = totalCalls + ' calls \u00d7 ' + minsPerCall + ' min = ' + nightHrs.toFixed(1) + ' hrs active';
  }

  var totalPay = dayPay + nightPay;
  var totalHrs = dayHrs + nightHrs;

  /* Update shared state */
  S = {
    hasData: true, dayPay: dayPay, nightPay: nightPay, totalPay: totalPay,
    dayHrs: dayHrs, nightHrs: nightHrs, totalHrs: totalHrs,
    dayRate: dayRate, nightRate: nightRate, days: days, hrs: hrs, exp: exp,
    nightOn: nightOn, totalCalls: totalCalls,
    chargePerCall: chargePerCall, minsPerCall: minsPerCall, nlw: nlw
  };

  /* Section 1: Daytime */
  var sec1 = '<div class="card" style="margin:.625rem .625rem 0">'
    + '<div class="slabel">&#9788;\u00a0 Daytime hours</div>'
    + '<div class="metrics">'
    + '<div class="metric"><div class="ml">Total pay</div><div class="mv">' + fmt(dayPay, 0) + '</div></div>'
    + '<div class="metric"><div class="ml">Total hours</div><div class="mv">' + dayHrs.toFixed(1) + '\u00a0hrs</div></div>'
    + '<div class="metric"><div class="ml">Hourly rate</div><div class="mv">' + fmt(dayRate) + '/hr</div></div>'
    + '</div>'
    + verdictBlock('Daytime rate', dayRate, nlw, fmt(Math.abs(dayDiff)) + '/hr ' + (dayDiff >= 0 ? 'above' : 'below') + ' National Living Wage (' + fmt(nlw) + ')')
    + dayNeed + '</div>';

  /* Section 2: Night calls */
  var sec2 = '';
  if (nightOn && totalCalls > 0 && chargePerCall > 0 && minsPerCall > 0) {
    var nlwPC  = nlw * (minsPerCall / 60);
    var nNeed  = nightStatus !== 'above'
      ? '<div class="need ' + nightStatus + '">To meet NLW at ' + minsPerCall + '\u00a0min/call you need <strong>' + fmt(nlwPC) + ' per call</strong>.</div>'
      : '';
    sec2 = '<div class="card night-tint" style="margin:.625rem .625rem 0">'
      + '<div class="slabel night">&#9790;\u00a0 Night calls</div>'
      + '<div class="metrics">'
      + '<div class="metric"><div class="ml">Total pay</div><div class="mv">' + fmt(nightPay, 0) + '</div></div>'
      + '<div class="metric"><div class="ml">Active hours</div><div class="mv">' + nightHrs.toFixed(1) + '\u00a0hrs</div></div>'
      + '<div class="metric"><div class="ml">Effective rate</div><div class="mv">' + fmt(nightRate) + '/hr</div></div>'
      + '</div>'
      + verdictBlock('Night call rate', nightRate, nlw, totalCalls + ' calls \u00d7 ' + fmt(chargePerCall, 0) + '/call \u00d7 ' + minsPerCall + '\u00a0min')
      + nNeed
      + '<div class="mencap-toggle" onclick="toggleMencap()">'
      + '<span class="mencap-label">&#9432;\u00a0 Mencap ruling 2021 \u2014 sleep-in hours explained</span>'
      + '<span class="mencap-chev" id="mencapChev">\u25bc</span>'
      + '</div>'
      + '<div class="mencap-body" id="mencapBody">'
      + '<div class="mencap-inner">Sleep-in hours \u2014 when you are on premises but not actively called \u2014 <strong>do not count as NMW time</strong> following the Supreme Court ruling in <em>Mencap\u00a0v\u00a0Tomlinson-Blake</em> [2021]. Only time you are awake and actively responding must be paid at or above NLW.</div>'
      + '</div></div>';
  }

  /* Rights card */
  var showRights = dayStatus === 'below' || dayStatus === 'close'
    || (nightOn && (nightStatus === 'below' || nightStatus === 'close'));
  var rightsCard = showRights
    ? '<div class="rights-card">'
      + '<div class="rights-header"><div class="rights-icon">!</div>'
      + '<div><div class="rights-title">Your pay is below National Living Wage</div>'
      + '<div class="rights-sub">Know your rights as a self-employed carer</div></div></div>'
      + '<div class="rights-point red"><div class="rp-title">The accommodation offset cannot make up the shortfall</div>'
      + '<p>If an agency or client argues that free accommodation brings your pay above NLW \u2014 this does not hold. The HMRC accommodation offset is an employer/employee mechanism only. It has no legal application to self-employed workers.</p></div>'
      + '<div class="rights-point navy"><div class="rp-title">Where to get help</div>'
      + '<p>ACAS runs a free helpline for pay disputes. HMRC has a National Minimum Wage complaints process. Citizens Advice can help with your employment status and rights.</p></div>'
      + '<div class="rights-links">'
      + '<a class="rights-link" href="https://www.acas.org.uk/national-minimum-wage" target="_blank" rel="noopener">ACAS \u2197</a>'
      + '<a class="rights-link" href="https://www.gov.uk/pay-and-work-rights" target="_blank" rel="noopener">HMRC \u2197</a>'
      + '<a class="rights-link" href="https://www.citizensadvice.org.uk/work/rights-at-work/pay/" target="_blank" rel="noopener">Citizens Advice \u2197</a>'
      + '</div></div>'
    : '';

  /* Combined card with nav prompt */
  var sec3 = combinedCard(
    'Switch to <strong>Quick Tax</strong> or <strong>Tax Planner</strong> for take-home estimate \u2014 these numbers carry through automatically.'
  );

  /* Accommodation reference */
  var accDay = ACC[yr];
  var accHr  = hrs > 0 ? accDay / hrs : 0;
  el('refRows').innerHTML =
    '<div class="ref-row"><span class="rl">HMRC offset rate (' + yr + ')</span><span class="rv">' + fmt(accDay) + '/day</span></div>'
    + '<div class="ref-row"><span class="rl">Offset per hour (at ' + hrs + '\u00a0hrs/day)</span><span class="rv">' + fmt(accHr) + '/hr</span></div>'
    + '<div class="ref-row"><span class="rl">Day rate + offset value</span><span class="rv" style="color:' + (dayRate + accHr >= nlw ? 'var(--green-dark)' : 'var(--red-dark)') + '">' + fmt(dayRate + accHr) + '/hr vs NLW ' + fmt(nlw) + '/hr</span></div>';

  area.innerHTML = sec1 + sec2 + rightsCard + sec3;
  el('accWrap').style.display = 'flex';
  mencapOpen = false;
}

/* ══════════════════════════════════════════
   TAB 2: QUICK TAX
══════════════════════════════════════════ */
function renderQuick() {
  var ec  = el('quickEarningsCard');
  var res = el('quickResults');

  if (!S.hasData) {
    ec.innerHTML  = '<div class="card"><div class="no-data">&#9758;&nbsp; Complete the <strong>NLW Checker</strong> tab first \u2014 your job earnings carry through automatically.</div></div>';
    res.innerHTML = '';
    return;
  }

  ec.innerHTML = combinedCard('');

  /* Combined basic rate IT (20%) + Class 4 NI (6%) = 26% marginal rate above
     the personal allowance. However once the £12,570 allowance is accounted
     for the effective rate on total annual earnings is typically 10–17%.
     20% is a fair upper-end estimate assuming most of the allowance is used. */
  var MARGINAL_RATE = 0.26;  /* 20% IT + 6% C4 NI above personal allowance */
  var SET_ASIDE_RATE = 0.20; /* Upper-end estimate once allowance considered */
  var setAside = Math.round(S.totalPay * SET_ASIDE_RATE);
  var marginalSetAside = Math.round(S.totalPay * MARGINAL_RATE);

  res.innerHTML = '<div class="card" style="margin:.625rem .625rem 0">'
    + '<div class="slabel">Suggested set-aside</div>'
    + '<div class="q-row"><span class="ql">Gross earnings this job</span><span class="qv">' + fmt(S.totalPay) + '</span></div>'
    + '<div class="q-row"><span class="ql">Marginal rate above personal allowance</span><span class="qv">26% (20% tax + 6% NI)</span></div>'
    + '<div class="q-row"><span class="ql">Upper-end estimate (allowance factored in)</span><span class="qv">~20%</span></div>'
    + '<div class="set-aside-bar"><div><div class="sab-label">Suggested set-aside</div><div class="sab-sub">Upper-end estimate &mdash; likely less in practice</div></div><div class="sab-val">' + fmt(setAside, 0) + '</div></div>'
    + '<div class="disc-box">'
    + '<div class="disc-title">&#9888;&nbsp; How this is calculated</div>'
    + '<div class="disc-text">The combined marginal rate above the personal allowance is <strong>26%</strong> (20% income tax + 6% Class\u00a04 NI). But the <strong>\u00a312,570 personal allowance</strong> means most carers pay nothing on a large portion of their earnings. At typical annual incomes of \u00a320,000\u2013\u00a335,000 the effective rate is closer to 10\u201317%. <strong>20% is an upper-end estimate</strong> assuming most of your allowance is already used. Your actual liability could be significantly lower. Use the <strong>Tax Planner</strong> tab with your year-to-date figures for a proper calculation. Allowable expenses will reduce this further.</div>'
    + '</div></div>';
}

/* ══════════════════════════════════════════
   TAB 3: TAX PLANNER
══════════════════════════════════════════ */
function calcAdv() {
  var ec  = el('advEarningsCard');
  var res = el('advResults');

  if (!S.hasData) {
    ec.innerHTML  = '<div class="card"><div class="no-data">&#9758;&nbsp; Complete the <strong>NLW Checker</strong> tab first \u2014 your job earnings carry through automatically.</div></div>';
    res.innerHTML = '';
    return;
  }

  ec.innerHTML = combinedCard('');

  var ytdInc = parseFloat(el('ytdIncome').value) || 0;
  var ytdExp = parseFloat(el('ytdExp').value)    || 0;
  var jobExp = (parseFloat(el('jobExpAdv').value) || 0) + S.exp;

  /* Full year totals */
  var totalInc  = ytdInc + S.totalPay;
  var totalExp  = ytdExp + jobExp;
  var taxProfit = Math.max(0, totalInc - totalExp);
  var taxable   = Math.max(0, taxProfit - PA);
  var bb        = BRB - PA;
  var inBasic   = Math.min(taxable, bb);
  var inHigher  = Math.max(0, taxable - bb);
  var itTotal   = inBasic * BRT + inHigher * HRT;
  var c4        = Math.max(0, taxProfit - C4LPL) * C4R;
  var totalDue  = itTotal + c4;

  /* Tax attributable to this job (delta) */
  var prevProfit  = Math.max(0, ytdInc - ytdExp);
  var prevTaxable = Math.max(0, prevProfit - PA);
  var prevBasic   = Math.min(prevTaxable, bb);
  var prevHigher  = Math.max(0, prevTaxable - bb);
  var prevIT      = prevBasic * BRT + prevHigher * HRT;
  var prevC4      = Math.max(0, prevProfit - C4LPL) * C4R;
  var jobTax      = Math.max(0, (itTotal - prevIT) + (c4 - prevC4));
  var jobTakeHome = Math.max(0, S.totalPay - jobExp - jobTax);

  var band = inHigher > 0 ? 'Higher rate' : (taxable > 0 ? 'Basic rate' : 'Within personal allowance');
  var bc   = inHigher > 0 ? 'higher' : (taxable > 0 ? 'basic' : 'zero');

  res.innerHTML = '<div class="card" style="margin:.625rem .625rem 0">'
    + '<div class="slabel">Year-to-date calculation</div>'
    + '<div class="tax-row"><span class="tr-l">Total income this year</span><span class="tr-v">' + fmt(totalInc) + '</span></div>'
    + '<div class="tax-row"><span class="tr-l">Total expenses this year</span><span class="tr-v neg">\u2212' + fmt(totalExp) + '</span></div>'
    + '<div class="tax-row"><span class="tr-l">Taxable profit</span><span class="tr-v">' + fmt(taxProfit) + '</span></div>'
    + '<div class="tax-row"><span class="tr-l">Personal allowance (&pound;12,570)</span><span class="tr-v green">\u2212' + fmt(Math.min(taxProfit, PA)) + '</span></div>'
    + '<div class="tax-row"><span class="tr-l">Taxable above allowance</span><span class="tr-v">' + fmt(taxable) + '<span class="band-pill ' + bc + '">' + band + '</span></span></div>'
    + (inBasic  > 0 ? '<div class="tax-row"><span class="tr-l">Income tax at 20%</span><span class="tr-v neg">\u2212' + fmt(inBasic  * BRT) + '</span></div>' : '')
    + (inHigher > 0 ? '<div class="tax-row"><span class="tr-l">Income tax at 40%</span><span class="tr-v neg">\u2212' + fmt(inHigher * HRT) + '</span></div>' : '')
    + '<div class="tax-row"><span class="tr-l">Class\u00a04 NI at 6%</span><span class="tr-v neg">\u2212' + fmt(c4) + '</span></div>'
    + '<div class="total-bar"><div><div class="tb-label">Total tax &amp; NI due this year so far</div><div class="tb-sub">Income tax + Class\u00a04 NI combined</div></div><div class="tb-val">' + fmt(totalDue, 0) + '</div></div>'
    + '</div>'
    + '<div class="card" style="margin:.625rem .625rem 0">'
    + '<div class="slabel">This job</div>'
    + '<div class="tax-row"><span class="tr-l">Job gross earnings</span><span class="tr-v">' + fmt(S.totalPay) + '</span></div>'
    + (jobExp > 0 ? '<div class="tax-row"><span class="tr-l">Job expenses</span><span class="tr-v neg">\u2212' + fmt(jobExp) + '</span></div>' : '')
    + '<div class="tax-row"><span class="tr-l">Tax &amp; NI from this job</span><span class="tr-v neg">\u2212' + fmt(jobTax) + '</span></div>'
    + '<div class="total-bar"><div><div class="tb-label">Est. take-home from this job</div><div class="tb-sub">After tax &amp; NI attributable to this placement</div></div><div class="tb-val">' + fmt(jobTakeHome, 0) + '</div></div>'
    + '</div>';
}

/* ── Service worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function() {});
  });
}
