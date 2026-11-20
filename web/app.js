const $ = id => document.getElementById(id);
const storageKey = 'releaselens.checkout.v1';
let state = JSON.parse(localStorage.getItem(storageKey) || '{"cases":[],"decisions":[]}');
let release, lastRun, replayed, busy = false;
const revision = () => $('revision').value;
const label = rev => rev === 'candidate' ? 'r1 · Proposed change' : 'r2 · Correction';
const currency = value => '₹' + value.toLocaleString('en-IN');
const notice = message => $('status').textContent = message;
const clear = node => node.replaceChildren();
function element(tag, text, cls) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function commit(next) {
  localStorage.setItem(storageKey,JSON.stringify(next));
  state = next;
}
function lock(active) {
  busy = active;
  for (const id of ['revision','subtotal','delivery','expected','run','save','replay','block','approve']) $(id).disabled = active;
}
async function runCase(input,rev) {
  const response = await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,revision:rev})});
  const result = await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}
function safe(action) {
  return async event => {
    event?.preventDefault();
    if (busy) return;
    lock(true);
    try {await action();} catch(e) {notice(e.message);} finally {lock(false);}
  };
}
function displayCode(id,code,cls) {
  const container = $(id);
  clear(container);
  for (const line of code.split('\n')) container.append(element('span',line+'\n',line.includes('return') ? cls : ''));
}
function drawGate() {
  clear($('saved'));
  $('count').textContent = state.cases.length+' saved case'+(state.cases.length===1?'':'s');
  if (!state.cases.length) $('saved').textContent='Save a test result to attach evidence to this review.';
  state.cases.forEach((c,i) => {
    const result = replayed?.[i];
    let line = 'C'+(i+1)+' · Merchandise '+currency(c.subtotal)+' + delivery '+currency(c.delivery)+' · Expected '+currency(c.expected);
    if (result) line += ' · Observed '+currency(result.actual)+' · '+(result.pass?'Pass':'Fail');
    const row=element('div',line,'row');
    const remove=element('button','Remove','remove');
    remove.setAttribute('aria-label','Remove case C'+(i+1));
    remove.onclick=safe(()=>{
      commit({...state,cases:state.cases.filter((_,index)=>index!==i)});
      replayed=null;drawGate();notice('Case removed from future replays.');
    });
    row.append(remove);$('saved').append(row);
  });
  const current = state.decisions.filter(d=>d.revision===revision()).at(-1);
  $('decision').textContent = current ? 'Last decision · '+current.verdict+' · '+current.note : 'Decision pending';
  clear($('history'));
  for (const d of state.decisions) $('history').append(element('div',label(d.revision)+' — '+d.verdict+' · '+d.rows.length+' case(s) · '+d.note,'row'));
}
function drawRevision() {
  lastRun=null; replayed=null;
  $('result').hidden=true; $('note').value='';notice('');
  displayCode('baseline',release.snippets.baseline,'old');
  displayCode('source',release.snippets[revision()],'changed');
  $('revlabel').textContent=label(revision()).toUpperCase();
  const rows=release.suites[revision()];
  $('suite').textContent=rows.filter(r=>r.pass).length+' / '+rows.length+' existing checks pass';
  clear($('suiteRows'));
  for(const row of rows) $('suiteRows').append(element('div',row.name+' · '+currency(row.subtotal)+' merchandise + '+currency(row.delivery)+' delivery · Expected '+currency(row.expected)+' · Observed '+currency(row.actual),'row'));
  drawGate();
}
$('caseform').onsubmit=safe(async()=>{
  lastRun = await runCase({subtotal:Number($('subtotal').value),delivery:Number($('delivery').value),expected:Number($('expected').value)},revision());
  const r=lastRun;
  $('result').hidden=false;
  $('outcome').className=r.pass?'yes':'no';
  $('outcome').textContent=r.pass?'Pass · Prediction matches':'Fail · Prediction mismatch';
  clear($('metrics'));
  for(const [name,value] of [['Predicted',r.expected],['Baseline',r.previous],['Reviewed revision',r.actual]]) {
    const metric=element('div',name);
    metric.append(element('b',currency(value)));$('metrics').append(metric);
  }
  notice('');
});
$('caseform').oninput=()=>{lastRun=null;$('result').hidden=true;notice('');};
$('save').onclick=safe(()=>{
  if (!lastRun) return;
  const {subtotal,delivery,expected}=lastRun;
  const same=state.cases.find(c=>c.subtotal===subtotal && c.delivery===delivery);
  if (same) {notice(same.expected===expected?'Case already saved.':'These inputs already have a saved prediction.');return;}
  commit({...state,cases:[...state.cases,{subtotal,delivery,expected}]});
  replayed=null;drawGate();notice('Regression case saved.');
});
async function replay() {
  if (!state.cases.length) throw Error('Save a regression case first.');
  replayed=await Promise.all(state.cases.map(c=>runCase(c,revision())));
  drawGate();
}
$('replay').onclick=safe(async()=>{await replay();notice('Saved cases replayed against '+label(revision())+'.');});
async function decide(verdict) {
  const note=$('note').value.trim();
  if (!note) throw Error('Add your decision rationale first.');
  await replay();
  if(verdict==='Approved' && (replayed.some(r=>!r.pass)||release.suites[revision()].some(r=>!r.pass))) throw Error('Approval blocked by failing checks.');
  if(verdict==='Changes requested' && replayed.every(r=>r.pass)) throw Error('Attach a failing case to request changes in this exercise.');
  const decision={revision:revision(),verdict,note,at:new Date().toISOString(),rows:replayed};
  commit({...state,decisions:[...state.decisions,decision]});drawGate();notice('Decision recorded.');
}
$('block').onclick=safe(()=>decide('Changes requested'));
$('approve').onclick=safe(()=>decide('Approved'));
$('revision').onchange=drawRevision;
$('export').onclick=()=>{
  if (!state.decisions.length) {notice('Record a decision to export its evidence.');return;}
  const lines=['# PR-018 · Coupon eligibility','', 'Acceptance criterion CP-07: ₹100 off when merchandise subtotal reaches ₹1,000. Delivery is excluded.',''];
  for(const d of state.decisions) {
    lines.push('## '+label(d.revision)+' — '+d.verdict,'',d.at,'',d.note,'','| Merchandise | Delivery | Expected | Baseline | Reviewed | Result |','|---:|---:|---:|---:|---:|---|');
    for(const r of d.rows) lines.push('| '+[r.subtotal,r.delivery,r.expected,r.previous,r.actual,r.pass?'Pass':'Fail'].join(' | ')+' |');
    lines.push('');
  }
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='PR-018-release-evidence.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
const navLinks=[...document.querySelectorAll('nav a')];
function highlight(){for(const a of navLinks)a.classList.toggle('active',a.hash===(location.hash||'#change'));}
addEventListener('hashchange',highlight);highlight();
try {
  const response=await fetch('/api/release');
  if(!response.ok) throw Error('Could not load release data.');
  release=await response.json();drawRevision();
} catch(e){lock(true);notice(e.message);}
