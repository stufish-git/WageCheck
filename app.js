var NLW={'2022/23':9.50,'2023/24':10.42,'2024/25':11.44,'2025/26':12.21,'2026/27':12.71,'2027/28':12.65};
var ACC={'2022/23':8.70,'2023/24':9.10,'2024/25':9.99,'2025/26':10.66,'2026/27':11.10,'2027/28':11.10};
var TAX={
  '2022/23':{basic:.20,higher:.40,c4main:.0973,c2weekly:3.15,c2paid:false},
  '2023/24':{basic:.20,higher:.40,c4main:.09,  c2weekly:3.45,c2paid:false},
  '2024/25':{basic:.20,higher:.40,c4main:.06,  c2weekly:3.45,c2paid:true},
  '2025/26':{basic:.20,higher:.40,c4main:.06,  c2weekly:3.45,c2paid:true},
  '2026/27':{basic:.20,higher:.40,c4main:.06,  c2weekly:3.45,c2paid:true},
  '2027/28':{basic:.20,higher:.40,c4main:.06,  c2weekly:3.45,c2paid:true}
};

var yr='2026/27',bracket='basic',nightOn=false,accOpen=false,wtrOpen=false,mencapOpen=false;
var openDeds={it:false,c4:false,c2:false};

var fmt=function(n,dp){
  dp=(dp===undefined)?2:dp;
  return'\u00a3'+n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g,',');
};
var pct=function(n){return(n*100).toFixed(0)+'%'};
var el=function(id){return document.getElementById(id)};

/* ── Close info popups on outside click ── */
document.addEventListener('click',function(e){
  if(!e.target.classList.contains('info-btn')){
    document.querySelectorAll('.info-popup').forEach(function(p){p.classList.remove('active')});
  }
});

function toggleInfo(id){
  var p=el(id);if(!p)return;
  var was=p.classList.contains('active');
  document.querySelectorAll('.info-popup').forEach(function(x){x.classList.remove('active')});
  if(!was)p.classList.add('active');
}

/* ── Year pills ── */
document.querySelectorAll('.yr-pill').forEach(function(p){
  p.addEventListener('click',function(){
    document.querySelectorAll('.yr-pill').forEach(function(x){x.classList.remove('on')});
    p.classList.add('on');
    yr=p.getAttribute('data-yr');
    calc();
  });
});

/* ── Input listeners ── */
['dailyRate','numDays','hrsDay','expenses','totalCalls','chargePerCall','minsPerCall'].forEach(function(id){
  var e=el(id);if(e)e.addEventListener('input',calc);
});

/* ── Bracket selector ── */
function setBracket(b){
  bracket=b;
  document.querySelectorAll('.bracket-btn').forEach(function(btn){btn.classList.remove('on')});
  document.querySelector('[data-bracket="'+b+'"]').classList.add('on');
  calc();
}

/* ── Night calls toggle ── */
function toggleNight(){
  nightOn=!nightOn;
  el('nightFields').classList.toggle('open',nightOn);
  el('ntSw').classList.toggle('on',nightOn);
  el('ntIcon').classList.toggle('on',nightOn);
  calc();
}

/* ── Accommodation toggle ── */
function toggleAcc(){
  accOpen=!accOpen;
  el('accPanel').classList.toggle('open',accOpen);
  el('accBtnTxt').innerHTML=accOpen?'\u25b2 accommodation offset reference':'\u25bc accommodation offset reference';
}

/* ── WTR card toggle ── */
function toggleWtr(){
  wtrOpen=!wtrOpen;
  el('wtrBody').classList.toggle('open',wtrOpen);
  el('wtrChev').classList.toggle('open',wtrOpen);
}

/* ── Mencap expander ── */
function toggleMencap(){
  mencapOpen=!mencapOpen;
  var b=el('mencapBody'),c=el('mencapChev');
  if(b)b.classList.toggle('open',mencapOpen);
  if(c)c.classList.toggle('open',mencapOpen);
}

/* ── Deduction block toggle ── */
function toggleDed(id){
  openDeds[id]=!openDeds[id];
  var b=el('db-'+id),c=el('dc-'+id);
  if(b)b.classList.toggle('open',openDeds[id]);
  if(c)c.classList.toggle('open',openDeds[id]);
}

/* ── Hours warning ── */
function updateHrsWarn(hrs){
  var w=el('hrsWarn');
  var iw=el('hrsDayIw');
  /* Always reset border first */
  if(iw)iw.style.borderColor='';
  if(!w)return;
  /* Only trigger above 10 — no gentle/green level */
  if(!hrs||hrs<=10){
    w.style.display='none';
    w.className='hrs-warn';
    return;
  }
  var cls,msg;
  if(hrs>12){
    cls='serious';
    if(iw)iw.style.borderColor='#E24B4A';
    msg='<strong>Serious: '+hrs+'\u00a0hrs/day</strong> \u2014 this exceeds the 12-hour maximum considered safe for sustained live-in care. At this level fatigue will impair your judgement, patience and ability to give good care. This arrangement puts both you and your client at risk. See the Working Time comparison below.';
  } else {
    cls='hard';
    if(iw)iw.style.borderColor='#EF9F27';
    msg='<strong>Above recommended: '+hrs+'\u00a0hrs/day</strong> \u2014 the sector standard is 8\u201310 active hours with a 2-hour daily break. At this level your wellbeing and quality of care will be affected over a sustained placement. To care well for others, you must first be able to care for yourself. See the Working Time comparison below.';
  }
  w.className='hrs-warn '+cls;
  w.innerHTML=msg;
  w.style.display='block';
}

/* ── WTR card visibility ── */
function updateWtrCard(hrs){
  var card=el('wtrCard');
  if(!card)return;
  if(hrs>10){
    card.classList.add('visible');
  } else {
    card.classList.remove('visible');
    /* Collapse if open when hours drop */
    if(wtrOpen){
      wtrOpen=false;
      var b=el('wtrBody'),c=el('wtrChev');
      if(b)b.classList.remove('open');
      if(c)c.classList.remove('open');
    }
  }
}

/* ── Verdict block builder ── */
function verdictBlock(label,rate,nlw,sub){
  var diff=rate-nlw;
  var s=diff>=0?'above':(diff>=-1?'close':'below');
  var badge={above:'Above NLW',close:'Just below NLW',below:'Below NLW'}[s];
  return '<div class="nlw-verdict '+s+'">'
    +'<div><div class="nv-label">'+label+'</div>'
    +'<div class="nv-rate">'+fmt(rate)+'/hr</div>'
    +(sub?'<div class="nv-sub">'+sub+'</div>':'')
    +'</div>'
    +'<div class="nv-badge">'+badge+'</div>'
    +'</div>';
}

/* ── Main calculation ── */
function calc(){
  var rate=parseFloat(el('dailyRate').value)||0;
  var days=parseFloat(el('numDays').value)||0;
  var hrs =parseFloat(el('hrsDay').value)||0;
  var exp =parseFloat(el('expenses').value)||0;

  /* Always update warnings regardless of other inputs */
  updateHrsWarn(hrs);
  updateWtrCard(hrs);

  var area=el('resultsArea');
  var accBtn=el('accBtn');

  if(!rate||!days||!hrs){
    area.innerHTML='<div class="card" style="margin:.625rem .625rem 0">'
      +'<div class="empty"><div class="empty-icon">&#9998;</div>'
      +'Enter job details above to check against NLW</div></div>';
    accBtn.style.display='none';
    return;
  }

  var nlw=NLW[yr];
  var dayPay =rate*days;
  var dayHrs =hrs*days;
  var dayRate=dayPay/dayHrs;
  var dayDiff=dayRate-nlw;
  var dayStatus=dayDiff>=0?'above':(dayDiff>=-1?'close':'below');
  var dayNeed=dayStatus!=='above'
    ?'<div class="need '+dayStatus+'">To meet NLW you need <strong>'+fmt(nlw*hrs)+'/day</strong> ('+fmt(nlw*dayHrs)+' total for this job).</div>'
    :'';

  /* Night calls */
  var totalCalls=0,chargePerCall=0,minsPerCall=0;
  var nightPay=0,nightHrs=0,nightRate=0,nightStatus='';
  if(nightOn){
    totalCalls   =parseFloat(el('totalCalls').value)||0;
    chargePerCall=parseFloat(el('chargePerCall').value)||0;
    minsPerCall  =parseFloat(el('minsPerCall').value)||0;
    nightPay =totalCalls*chargePerCall;
    nightHrs =totalCalls*(minsPerCall/60);
    nightRate=nightHrs>0?nightPay/nightHrs:0;
    var nd=nightRate-nlw;
    nightStatus=nd>=0?'above':(nd>=-1?'close':'below');
    var sp=el('nightSummary');
    if(sp)sp.textContent=totalCalls+' calls \u00d7 '+minsPerCall+' min = '+nightHrs.toFixed(1)+' hrs active';
  }

  var totalPay=dayPay+nightPay;
  var totalHrs=dayHrs+nightHrs;
  var taxProfit=Math.max(0,totalPay-exp);
  var weeks=days/7;
  var ty=TAX[yr];
  var itRate=bracket==='none'?0:(bracket==='basic'?ty.basic:ty.higher);
  var propTax=taxProfit*itRate;
  var propC4 =bracket==='none'?0:taxProfit*ty.c4main;
  var c2paid =ty.c2paid;
  var propC2 =c2paid?0:ty.c2weekly*weeks;
  var takeHome  =taxProfit-propTax-propC4-propC2;
  var afterTaxHr=totalHrs>0?takeHome/totalHrs:0;

  /* ── Section 1: Daytime ── */
  var sec1='<div class="card" style="margin:.625rem .625rem 0">'
    +'<div class="slabel">&#9788;\u00a0 Daytime hours</div>'
    +'<div class="metrics">'
    +'<div class="metric"><div class="ml">Total pay</div><div class="mv">'+fmt(dayPay,0)+'</div></div>'
    +'<div class="metric"><div class="ml">Total hours</div><div class="mv">'+(dayHrs%1===0?dayHrs:dayHrs.toFixed(1))+'\u00a0hrs</div></div>'
    +'<div class="metric"><div class="ml">Hourly rate</div><div class="mv">'+fmt(dayRate)+'/hr</div></div>'
    +'</div>'
    +verdictBlock('Daytime rate',dayRate,nlw,fmt(Math.abs(dayDiff))+'/hr '+(dayDiff>=0?'above':'below')+' National Living Wage ('+fmt(nlw)+')')
    +dayNeed
    +'</div>';

  /* ── Section 2: Night ── */
  var sec2='';
  if(nightOn&&totalCalls>0&&chargePerCall>0&&minsPerCall>0){
    var nlwPC=nlw*(minsPerCall/60);
    var nightNeed=nightStatus!=='above'
      ?'<div class="need '+nightStatus+'">To meet NLW at '+minsPerCall+'\u00a0min/call you need <strong>'+fmt(nlwPC)+' per call</strong>.</div>'
      :'';
    sec2='<div class="card night-tint" style="margin:.625rem .625rem 0">'
      +'<div class="slabel night">&#9790;\u00a0 Night calls</div>'
      +'<div class="metrics">'
      +'<div class="metric"><div class="ml">Total pay</div><div class="mv">'+fmt(nightPay,0)+'</div></div>'
      +'<div class="metric"><div class="ml">Active hours</div><div class="mv">'+nightHrs.toFixed(1)+'\u00a0hrs</div></div>'
      +'<div class="metric"><div class="ml">Effective rate</div><div class="mv">'+fmt(nightRate)+'/hr</div></div>'
      +'</div>'
      +verdictBlock('Night call rate',nightRate,nlw,totalCalls+' calls \u00d7 '+fmt(chargePerCall,0)+'/call \u00d7 '+minsPerCall+'\u00a0min')
      +nightNeed
      +'<div class="mencap-toggle" onclick="toggleMencap()">'
      +'<span class="mencap-label">&#9432;\u00a0 Mencap ruling 2021 \u2014 sleep-in hours explained</span>'
      +'<span class="mencap-chev" id="mencapChev">\u25bc</span>'
      +'</div>'
      +'<div class="mencap-body" id="mencapBody">'
      +'<div class="mencap-inner">Sleep-in hours \u2014 when you are on premises but not actively called \u2014 <strong>do not count as NMW time</strong> following the Supreme Court ruling in <em>Mencap\u00a0v\u00a0Tomlinson-Blake</em> [2021]. Only time you are awake and actively responding to a call must be paid at or above NLW.</div>'
      +'</div>'
      +'</div>';
  }

  /* ── Section 3: Combined ── */
  var sec3='<div class="card navy-card" style="margin:.625rem .625rem 0">'
    +'<div class="slabel light">Combined earnings</div>'
    +'<div class="metrics">'
    +'<div class="metric"><div class="ml">Total earnings</div><div class="mv">'+fmt(totalPay,0)+'</div></div>'
    +'<div class="metric"><div class="ml">Total hours</div><div class="mv">'+totalHrs.toFixed(1)+'\u00a0hrs</div></div>'
    +'<div class="metric"><div class="ml">Overall rate</div><div class="mv">'+fmt(totalPay/totalHrs)+'/hr</div></div>'
    +'</div>'
    +'<div class="combined-th">'
    +'<div><div class="cth-label">Est. take-home this job</div>'
    +'<div class="cth-sub">'+fmt(afterTaxHr)+'/hr after tax \u00b7 '+bracket+' rate</div></div>'
    +'<div class="cth-val">'+fmt(takeHome)+'</div>'
    +'</div></div>';

  /* ── Tax card ── */
  var itAmt=bracket==='none'?'<span class="ded-amt zero">\u00a30.00</span>':'<span class="ded-amt">\u2212'+fmt(propTax)+'</span>';
  var c4Amt=bracket==='none'?'<span class="ded-amt zero">\u00a30.00</span>':'<span class="ded-amt">\u2212'+fmt(propC4)+'</span>';
  var c2Amt=c2paid?'<span class="ded-amt free">No cost</span>':(propC2>0?'<span class="ded-amt">\u2212'+fmt(propC2)+'</span>':'<span class="ded-amt zero">\u00a30.00</span>');
  var c2Body=c2paid
    ?'<div class="drow"><span>From 2024/25</span><span class="dr green">Treated as paid automatically</span></div>'
     +'<div class="drow"><span>Cost</span><span class="dr zero">\u00a30.00</span></div>'
     +'<div class="dnote">From April 2024 Class\u00a02\u00a0NI is treated as automatically paid if annual profits exceed \u00a312,570. You receive full state pension credits at no cost.</div>'
    :'<div class="drow"><span>Rate</span><span class="dr">'+fmt(ty.c2weekly)+'/week</span></div>'
     +'<div class="drow"><span>Weeks this job</span><span class="dr">'+weeks.toFixed(1)+'\u00a0wks</span></div>'
     +'<div class="drow"><span>Cost</span><span class="dr neg">\u2212'+fmt(propC2)+'</span></div>'
     +'<div class="dnote">Flat weekly rate. Buys state pension credits.</div>';

  var taxCard='<div class="card" style="margin:.625rem .625rem 0">'
    +'<div class="slabel">Estimated deductions \u2014 self-employed</div>'
    +(exp>0
      ?'<div class="total-row"><span class="tl">Gross earnings</span><span class="tv">'+fmt(totalPay)+'</span></div>'
       +'<div class="total-row"><span class="tl">Expenses deducted</span><span class="tv-neg">\u2212'+fmt(exp)+'</span></div>'
       +'<div class="total-row" style="border-top:.5px solid var(--border-light);padding-top:5px;margin-top:2px"><span class="tl">Taxable profit</span><span class="tv">'+fmt(taxProfit)+'</span></div>'
      :'<div class="total-row"><span class="tl">Taxable profit</span><span class="tv">'+fmt(taxProfit)+'</span></div>')
    +'<div style="margin-top:.5rem">'
    +'<div class="ded-block"><div class="ded-header" onclick="toggleDed(\'it\')">'
    +'<span class="ded-name">Income tax</span>'
    +'<div class="ded-right">'+itAmt+'<span class="ded-chev" id="dc-it">\u25bc</span></div></div>'
    +'<div class="ded-body" id="db-it"><div class="ded-inner">'
    +'<div class="drow"><span>Bracket</span><span class="dr">'+(bracket==='none'?'No tax':bracket==='basic'?'Basic 20%':'Higher 40%')+'</span></div>'
    +(bracket!=='none'?'<div class="drow"><span>Tax this job</span><span class="dr neg">\u2212'+fmt(propTax)+'</span></div>':'')
    +'<div class="dnote">Applied at your selected bracket rate directly to this job\'s taxable earnings.</div>'
    +'</div></div></div>'
    +'<div class="ded-block"><div class="ded-header" onclick="toggleDed(\'c4\')">'
    +'<span class="ded-name">Class\u00a04\u00a0NI</span>'
    +'<div class="ded-right">'+c4Amt+'<span class="ded-chev" id="dc-c4">\u25bc</span></div></div>'
    +'<div class="ded-body" id="db-c4"><div class="ded-inner">'
    +'<div class="drow"><span>Rate ('+yr+')</span><span class="dr">'+pct(ty.c4main)+'</span></div>'
    +(bracket!=='none'?'<div class="drow"><span>Class\u00a04 this job</span><span class="dr neg">\u2212'+fmt(propC4)+'</span></div>':'')
    +'<div class="dnote">Main NI contribution for self-employed workers. Not applied in no-tax bracket.</div>'
    +'</div></div></div>'
    +'<div class="ded-block"><div class="ded-header" onclick="toggleDed(\'c2\')">'
    +'<span class="ded-name">Class\u00a02\u00a0NI</span>'
    +'<div class="ded-right">'+c2Amt+'<span class="ded-chev" id="dc-c2">\u25bc</span></div></div>'
    +'<div class="ded-body" id="db-c2"><div class="ded-inner">'+c2Body+'</div></div></div>'
    +'</div>'
    +'<div class="est-note">Tax applied at your selected bracket directly to this job\'s earnings. No annualisation. Adjust your bracket above if your situation changes.</div>'
    +'</div>';

  /* ── Rights card (below NLW only) ── */
  var showRights=dayStatus==='below'||dayStatus==='close'
    ||(nightOn&&(nightStatus==='below'||nightStatus==='close'));
  var rightsCard=showRights
    ?'<div class="rights-card">'
     +'<div class="rights-header"><div class="rights-icon">!</div>'
     +'<div><div class="rights-title">Your pay is below National Living Wage</div>'
     +'<div class="rights-sub">Know your rights as a self-employed carer</div></div></div>'
     +'<div class="rights-point red"><div class="rp-title">The accommodation offset cannot make up the shortfall</div>'
     +'<p>If an agency or client argues that free accommodation brings your pay above NLW \u2014 this does not hold. The HMRC accommodation offset is an employer/employee mechanism only. It has no legal application to self-employed workers.</p></div>'
     +'<div class="rights-point navy"><div class="rp-title">Where to get help</div>'
     +'<p>ACAS runs a free helpline for pay disputes. HMRC has a National Minimum Wage complaints process. Citizens Advice can help with your employment status and rights.</p></div>'
     +'<div class="rights-links">'
     +'<a class="rights-link" href="https://www.acas.org.uk/national-minimum-wage" target="_blank" rel="noopener">ACAS \u2197</a>'
     +'<a class="rights-link" href="https://www.gov.uk/pay-and-work-rights" target="_blank" rel="noopener">HMRC \u2197</a>'
     +'<a class="rights-link" href="https://www.citizensadvice.org.uk/work/rights-at-work/pay/" target="_blank" rel="noopener">Citizens Advice \u2197</a>'
     +'</div></div>'
    :'';

  /* ── Accommodation reference rows ── */
  var accDay=ACC[yr];
  var accHr=hrs>0?accDay/hrs:0;
  el('refRows').innerHTML=
    '<div class="ref-row"><span class="rl">HMRC offset rate ('+yr+')</span><span class="rv">'+fmt(accDay)+'/day</span></div>'
    +'<div class="ref-row"><span class="rl">Offset per hour (at '+hrs+'\u00a0hrs/day)</span><span class="rv">'+fmt(accHr)+'/hr</span></div>'
    +'<div class="ref-row"><span class="rl">Day rate + offset value</span><span class="rv" style="color:'+(dayRate+accHr>=nlw?'var(--green-dark)':'var(--red-dark)')+'">'+fmt(dayRate+accHr)+'/hr</span></div>'
    +'<div class="ref-row"><span class="rl">National Living Wage ('+yr+')</span><span class="rv">'+fmt(nlw)+'/hr</span></div>';

  area.innerHTML=sec1+sec2+sec3+taxCard+rightsCard;
  accBtn.style.display='flex';
  mencapOpen=false;

  /* Restore open deduction panels after re-render */
  ['it','c4','c2'].forEach(function(id){
    if(openDeds[id]){
      var b=el('db-'+id),c=el('dc-'+id);
      if(b)b.classList.add('open');
      if(c)c.classList.add('open');
    }
  });
}

/* ── Service worker ── */
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
