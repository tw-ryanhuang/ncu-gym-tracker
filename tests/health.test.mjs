import assert from 'node:assert/strict';
import vm from 'node:vm';
import {render} from '../src/ui/pages.js';
import {clientScript} from '../src/ui/client.js';
const start=540,end=1250;
const at=m=>Date.parse('2026-11-13T00:00:00+08:00')+m*60000;
const row=(m,status='ok')=>({slot:new Date(at(m)).toISOString(),fetched_at:new Date(at(m)+40000).toISOString(),local_date:'2026-11-13',hour:Math.floor(m/60),minute:m%60,count:status==='ok'?30:null,status});
class Element{constructor(){this.children=[];this.dataset={};this.style={};this.value='';}append(...x){this.children.push(...x);if(!this.value&&x[0]?.value)this.value=x[0].value;}setAttribute(){}replaceChildren(){this.children=[];}addEventListener(){}}
function screen(rows,minute,closed=[]){const html=render([...rows].reverse(),[],[],rows,closed,[]),ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);const els=Object.fromEntries(ids.map(id=>[id,new Element()]));const payload=JSON.parse(html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1]);payload.now=at(minute);els.data.textContent=JSON.stringify(payload);const document={body:{dataset:{}},hidden:false,getElementById:id=>els[id]||null,querySelector:()=>new Element(),createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener(){}};vm.runInNewContext(clientScript,{document,navigator:{onLine:true},window:{addEventListener(){}},location:{reload(){}},setInterval(){},Date,Map,Set,JSON,Math,String,Number});return els;}
const full=Array.from({length:(end-start)/5},(_,i)=>row(start+i*5));
const missed=screen(full.slice(1),1410);assert.equal(missed['health-state'].textContent,'排程缺漏');assert(missed['health-text'].textContent.includes('1 個'));
const sourceGap=full.map((x,i)=>i===0?{...x,count:null,status:'unavailable'}:x);const afterClose=screen(sourceGap,1410);assert.equal(afterClose['health-state'].textContent,'部分數值待確認');assert(afterClose['health-text'].textContent.includes('官方暫無人數 1 筆'));assert(afterClose.coverage.textContent.endsWith(' / '+full.length));
const fresh=screen([row(start,'unavailable')],start+1);assert.equal(fresh['health-state'].textContent,'官方暫無人數');assert(fresh['health-text'].textContent.includes('排程有紀錄'));
const normal=screen(full,1410);assert.equal(normal['health-state'].textContent,'休息中');assert(normal['health-text'].textContent.includes('今日排程完整'));
const retry=full.map((x,i)=>i===0?{...x,rechecked:true}:x);const recovered=screen(retry,1410);assert.equal(recovered['health-state'].textContent,'休息中');assert(recovered['health-text'].textContent.includes('1 筆複查恢復'));
const rest=screen([],700,['2026-11-13']);assert.equal(rest['health-state'].textContent,'休館');
console.log('PASS: schedule/source separation, closed-day anomalies, recovered readings and closures');
