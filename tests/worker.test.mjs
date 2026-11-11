import {EFFECTIVE_SAMPLES,displaySample} from '../src/readings.js';
import {render} from '../src/ui/pages.js';
import {pwaResponse} from '../src/pwa.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
function harness(ms,responses,existing=false){
 const writes=[];let calls=0;
 class FixedDate extends Date{constructor(...a){super(...(a.length?a:[ms]));}static now(){return ms;}}
 const sandbox={EFFECTIVE_SAMPLES,displaySample,render,pwaResponse,Date:FixedDate,Response,Request,URL,AbortSignal,console,setTimeout:f=>{f();return 1},fetch:async()=>{const v=responses[calls++];if(v instanceof Error)throw v;return new Response('SPA池,N/A\r\n重訓室,'+v);}};
 vm.createContext(sandbox);vm.runInContext(source.replace(/^import .*;$/gm,'').replace('export function parseCount','function parseCount').replace('export default {','globalThis.worker = {'),sandbox);
 const DB={prepare(sql){return {bind(...values){this.values=values;return this},async run(){writes.push({sql,values:this.values});return {meta:{changes:existing?0:1}}},async all(){return {results:[]}}}},async batch(){return [[],[],[],[],[]].map(results=>({results}));}};
 return {sandbox,writes,env:{DB},calls:()=>calls,run:()=>sandbox.collect({DB},ms)};
}
const at=s=>Date.parse('2026-11-11T'+s+'+08:00');
for(const time of ['08:50:00','08:55:00','20:50:00','20:55:00','21:05:00']){const h=harness(at(time),[9]);await h.run();assert.equal(h.writes[0].values[7],'observation');assert.equal(h.writes[0].values[6],9);}
for(const time of ['08:45:00','21:00:00','23:00:00']){const h=harness(at(time),[9]);await h.run();assert.equal(h.calls(),0);}
for(const time of ['09:00:00','20:45:00']){const h=harness(at(time),[19]);await h.run();assert.equal(h.writes[0].values[7],'ok');}
const zero=harness(at('10:15:00'),[0,19]);await zero.run();assert.equal(zero.writes[0].values[6],0);assert.equal(zero.writes[0].values[7],'zero_unverified');assert.equal(JSON.parse(zero.writes[1].values[0]).retry.count,19);assert(!zero.writes[1].sql.includes('SET count'));
const bad=harness(at('10:15:00'),[0,new Error('timeout')]);await bad.run();assert.equal(JSON.parse(bad.writes[1].values[0]).retry.status,'error');assert.equal(bad.writes[0].values[6],0);
const dupe=harness(at('10:15:00'),[0],true);await dupe.run();assert.equal(dupe.writes.length,1);assert.equal(dupe.calls(),1);
const err=harness(at('10:15:00'),[new Error('offline')]);await err.run();assert.equal(err.writes[0].values[6],null);assert.equal(err.writes[0].values[7],'error');
const h=harness(at('10:15:00'),[]);const response=await h.sandbox.worker.fetch(new Request('https://test/'),h.env);assert.equal(response.status,200);const html=await response.text();const script=html.match(/<\/script><script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);assert(html.includes('今天的人數走勢'));assert(html.includes('zero_recheck'));assert(html.includes('location.reload()'));
assert.equal((await h.sandbox.worker.fetch(new Request('https://test/',{method:'POST'}),h.env)).status,405);
// Exercise generated browser code without a browser engine.
class Element{constructor(){this.children=[];this.textContent='';this.value='';this.dataset={};this.style={};}append(...e){this.children.push(...e);if(!this.value&&e[0]?.value)this.value=e[0].value;}setAttribute(k,v){this[k]=v;}replaceChildren(){this.children=[];}addEventListener(){}}
const els={};const document={hidden:false,getElementById(id){return els[id]??=new Element()},body:{dataset:{}},querySelector(){return els.unit??=new Element()},createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener(){}};
const raw=JSON.parse(html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1]);raw.now=at('23:00:00');raw.today=[{slot:new Date(at('09:00:00')).toISOString(),fetched_at:new Date(at('09:00:00')).toISOString(),hour:9,minute:0,count:9,status:'ok'}];raw.latest=raw.today;document.getElementById('data').textContent=JSON.stringify(raw);
vm.runInNewContext(script,{document,window:{addEventListener(){}},location:{reload(){}},navigator:{onLine:true},setInterval(){},Date,Map,Set,JSON,Math,String,Number});assert.equal(els.count.textContent,'已閉館');assert(els.unit.hidden);assert.equal(els['today-chart'].children.length,1);assert(!html.includes('id="popular"'));
const overview=await (await h.sandbox.worker.fetch(new Request('https://test/overview'),h.env)).text();assert(overview.includes('id="popular"'));assert(!overview.includes('id="now"'));assert(!overview.includes('id="trend"'));
assert.equal((await h.sandbox.worker.fetch(new Request('https://test/manifest.webmanifest'),h.env)).status,200);
assert.equal((await h.sandbox.worker.fetch(new Request('https://test/sw.js'),h.env)).status,200);
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));assert.equal(config.name,'ncu-gym-tracker');assert.notEqual(config.d1_databases[0].database_id,'b8a840b8-1fe2-4dbf-b8ce-5c7981a0a18b');assert.deepEqual(config.triggers.crons,['*/5 * * * *']);
console.log('PASS: observation boundaries, raw zero preservation, retry/error/duplicate handling, HTML script, chart, closure UI, DB binding and cron config');



const unavailable=harness(at('10:15:00'),['N/A']);await unavailable.run();assert.equal(unavailable.writes[0].values[6],null);assert.equal(unavailable.writes[0].values[7],'unavailable');assert.equal(unavailable.calls(),1);
for(const value of ['-1','abc','5001']){const h=harness(at('10:15:00'),[value]);await h.run();assert.equal(h.writes[0].values[7],'error');}
assert.equal(h.sandbox.parseCount('\uFEFF"SPA池","N/A"\r\n"重訓室","23"'),23);assert.throws(()=>h.sandbox.parseCount('重訓室,2\n重訓室,3'));
console.log('PASS: N/A stays null, valid quoted CSV, malformed and duplicate gym rows rejected');
