import vm from 'node:vm';
import {clientScript} from '../src/ui/client.js';
import assert from 'node:assert/strict';
import {analyseHistory} from '../src/history.js';
import {render} from '../src/ui/pages.js';
const event='2027-02-12';
const at=s=>Date.parse(s+'+08:00');
const dateBefore=(n)=>new Date(at(event+'T00:00:00')-n*7*86400000+8*3600000).toISOString().slice(0,10);
const row=(date,bucket,mean=20)=>({local_date:date,weekday:5,bucket,mean});
const bases=(buckets,values=[20,20,20,20,20,20])=>values.flatMap((v,i)=>buckets.map(b=>row(dateBefore(i+1),b,v)));
const run=(rows,extra={})=>analyseHistory(rows,{now:at(event+'T23:00:00'),...extra});
// Only a completed half hour with the full ten-minute buffer can enter overview.
const current=row(event,28,30);
assert.equal(run([current],{now:at(event+'T14:39:59')}).accepted.length,0);
assert.equal(run([current],{now:at(event+'T14:40:00')}).accepted.length,1);
assert.equal(run([current],{now:at(event+'T14:40:00')}).baseline.length,0);
assert.equal(run([current,row(event,29,30)],{now:at(event+'T14:40:00')}).accepted.length,1);
// With five dates an extreme value must remain; six allows isolation, even with MAD zero.
assert.equal(run([...bases([28]).slice(0,5),row(event,28,100)]).excluded.length,0);
const isolated=run([...bases([28]),row(event,28,100)]);
assert.equal(isolated.excluded.length,1);assert.equal(isolated.excluded[0].threshold,15);
assert.equal(run([...bases([28]),row(event,28,35)]).excluded.length,0);
assert.equal(run([...bases([28]),row(event,28,36)]).excluded.length,1);
assert.equal(run([...bases([28],[100,100,100,100,100,100]),row(event,28,145)]).excluded.length,0);
assert.equal(run([...bases([28],[10,20,30,40,50,60]),row(event,28,80)]).excluded.length,0);
assert.equal(run([...bases([28],[10,20,30,40,50,60]),row(event,28,120)]).excluded.length,1);
assert.equal(run([...bases([28]),row(event,28,1)]).excluded.length,1);
// Event classification requires consecutive, same-direction anomalies and >= half eligible.
const buckets=Array.from({length:10},(_,i)=>12+i);
const full=[...bases(buckets),...buckets.map(b=>row(event,b,b<16?100:20))];
const early=run(full,{now:at(event+'T08:10:00')});
assert.equal(early.excluded.filter(r=>r.local_date===event).length,4);
assert(early.excluded.every(r=>r.reason.includes('特殊人潮日')));
const later=run(full,{now:at(event+'T11:10:00')});
assert.equal(later.excluded.filter(r=>r.local_date===event).length,4);
assert(later.excluded.every(r=>!r.reason.includes('特殊人潮日')));
assert.equal(later.accepted.filter(r=>r.local_date===event).length,6);
const eventRows=[...bases(buckets),...buckets.map(b=>row(event,b,b<18?100:20))];
assert.equal(run(eventRows).excluded.filter(r=>r.local_date===event).length,10);
const alternating=[...bases(buckets),...buckets.map(b=>row(event,b,b<18?(b%2?1:100):20))];
assert(run(alternating).excluded.every(r=>!r.reason.includes('特殊人潮日')));
// Manual override and disable are reversible, with raw objects untouched.
const original=JSON.stringify(eventRows);
assert.equal(run(eventRows,{dates:{[event]:{mode:'include'}}}).excluded.length,0);
assert.equal(run(eventRows,{automatic:false}).excluded.length,0);
assert.equal(run(eventRows,{dates:{[event]:{mode:'exclude',reason:'免費日'}}}).excluded.filter(r=>r.local_date===event).length,10);
assert.equal(run(eventRows,{closedDates:[event],dates:{[event]:{mode:'include'}}}).accepted.filter(r=>r.local_date===event).length,0);
assert.equal(JSON.stringify(eventRows),original);
// Neither future rows, duplicate dates nor another weekday can inflate the reference count.
const one=[row(dateBefore(1),28),row(dateBefore(1),28),row(event,28,100),row('2027-02-19',28)];
assert.equal(run(one).assessments.find(r=>r.local_date===event).referenceCount,1);
const bad=[...bases([28]).slice(0,5),row('2027-02-11',28,20),row(event,28,100)];
assert.equal(run(bad).excluded.length,0);
const withFuture=run([...bases([28]),row(event,28,100),row('2027-02-19',28,999)]);
assert.deepEqual(withFuture,isolated);
const laterAsOf=run([...bases([28]),row(event,28,100),row('2027-02-19',28,999)],{now:at('2027-02-19T23:00:00')});
assert.deepEqual(laterAsOf.assessments.find(r=>r.local_date===event),isolated.assessments.find(r=>r.local_date===event));
assert.equal(run([row('2026-12-01',28),row(event,28)]).assessments.find(r=>r.local_date===event).referenceCount,0);
assert.equal(run([row(event,28,null),row(event,29,0),row(event,30,NaN)]).accepted.length,0);
assert.equal(run([row(event,40),row(event,41)],{start:540,end:1250}).accepted.length,1);
// Server payload uses the same projection; source rows and today records stay intact.
const realNow=Date.now;Date.now=()=>at(event+'T14:40:00');
try{
 const rawToday=[{count:0,status:'zero_unverified',fetched_at:event+'T06:25:00Z'}];
 const html=render([],[],[current,row(event,29)],rawToday,[],[],'overview');
 const payload=JSON.parse(html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(payload.daily.length,1);assert.equal(payload.baseline.length,0);
 assert.deepEqual(payload.today,rawToday);assert(html.includes('statistics-exclusions'));
}finally{Date.now=realNow;}
console.log('PASS: completed buckets, ten-minute buffer, MAD gates, six-date minimum, event re-evaluation, overrides, causality and server projection');

// Regression: the overview must display today's completed bucket as the third date.
class Element{
 constructor(){this.children=[];this.dataset={};this.style={};}
 append(...elements){this.children.push(...elements);}
 setAttribute(){}
 replaceChildren(){this.children=[];}
 addEventListener(){}
}
function overviewScreen(now){
 const originalNow=Date.now;Date.now=()=>now;
 let html;try{html=render([],[],[row(dateBefore(2),28,20),row(dateBefore(1),28,30),row(event,28,40)],[],[],[],'overview');}finally{Date.now=originalNow;}
 const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 els.data.textContent=html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1];
 const document={body:{dataset:{}},hidden:false,getElementById:id=>els[id]||null,createElement:()=>new Element(),addEventListener(){}};
 vm.runInNewContext(clientScript,{document,navigator:{onLine:true},window:{addEventListener(){}},location:{reload(){}},setInterval(){},Date,Map,Set,JSON,Math,String,Number,Object});
 return els;
}
const completed=overviewScreen(at(event+'T14:40:00'));
const tile=completed.chart.children.find(e=>e.children[0].textContent==='14:00');
assert.equal(tile.children[1].textContent,30);
tile.onclick();assert.match(completed.detail.textContent,/3 個有效日期/);
const pending=overviewScreen(at(event+'T14:39:59'));
const pendingTile=pending.chart.children.find(e=>e.children[0].textContent==='14:00');
assert.equal(pendingTile.children[1].textContent,'—');
pendingTile.onclick();assert.match(pending.detail.textContent,/只有 2 個有效日期/);
console.log('PASS: rendered overview tiles and date counts include today only after completion buffer');
