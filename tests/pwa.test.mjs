import assert from 'node:assert/strict';
import vm from 'node:vm';
import {render} from '../src/ui/pages.js';
import {clientScript} from '../src/ui/client.js';
import {manifest,pwaResponse,serviceWorker} from '../src/pwa.js';
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
for(const size of [192,512]){const r=pwaResponse('/icons/'+size+'.png');const bytes=new Uint8Array(await r.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);}
class Element{constructor(){this.children=[];this.dataset={};this.style={};this.value='';}append(...e){this.children.push(...e);if(!this.value&&e[0]?.value)this.value=e[0].value;}setAttribute(k,v){this[k]=v;}replaceChildren(){this.children=[];}addEventListener(){}}
for(const page of ['today','overview']){
 const html=render([],[],[],[],[],[],page),ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);const els=Object.fromEntries(ids.map(id=>[id,new Element()]));els.data.textContent=html.match(/type="application\/json">([\s\S]*?)<\/script>/)[1];
 const doc={body:{dataset:{offline:'true'}},hidden:false,getElementById:id=>els[id]||null,querySelector:()=>new Element(),createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener(){}};
 vm.runInNewContext(clientScript,{document:doc,navigator:{onLine:false},window:{addEventListener(){}},location:{reload(){throw Error('offline reload')}},setInterval(){},Date,Map,Set,JSON,Math,String,Number});
 assert(els.connection.textContent.includes('不是即時資訊'));
 if(page==='overview'){assert.equal(els.chart.children.length,23);assert(!els.now);}else {assert(els.now);assert(!els.popular);}
}
const handlers={},store=new Map();let online=true;
const cache={put:async(k,v)=>store.set(k,v),match:async k=>store.get(k)?.clone()};
vm.runInNewContext(serviceWorker,{self:{location:{origin:'https://test'},addEventListener:(t,f)=>handlers[t]=f,skipWaiting(){},clients:{claim(){}}},caches:{open:async()=>cache,keys:async()=>[],delete:async()=>{}},fetch:async()=>{if(!online)throw Error('offline');return new Response('<body>online</body>',{headers:{'content-type':'text/html'}})},URL,Response,AbortSignal,Error});
async function navigate(path){let result;handlers.fetch({request:{method:'GET',url:'https://test'+path,mode:'navigate'},respondWith:r=>result=r});return result;}
assert.equal(await (await navigate('/')).text(),'<body>online</body>');online=false;assert((await (await navigate('/')).text()).includes('data-offline="true"'));assert.equal((await navigate('/overview')).status,503);assert.equal(await navigate('/export.csv'),undefined);
console.log('PASS: standalone manifest, PNG icons, separate page scripts, offline banner, network-first navigation, uncached offline and CSV bypass');

