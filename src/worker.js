import {EFFECTIVE_SAMPLES,displaySample} from './readings.js';
import {render} from './ui/pages.js';
import {pwaResponse} from './pwa.js';
const SOURCE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTi7PeVb_4bE22ioWlIMlYwoaDbOQiq7fdn3VRAmS_5V60_9cmTh3P8e97jfvT5X867teqRsMoGY_Ou/pub?gid=0&single=true&output=csv&range=A1:B10';
const HEADERS = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local = ms => new Date(ms + 8 * 3600000);
const date = ms => local(ms).toISOString().slice(0,10);
const time = s => new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
const clock = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const period = b => clock(b*30)+'–'+clock(b*30+30);
const week = ['日','一','二','三','四','五','六'];

// Parse the public CSV strictly: unavailable is not zero, malformed data is an error.
export function parseCount(csv) {
  const rows=[];let row=[],cell='',quoted=false;
  csv=csv.replace(/^\uFEFF/,'');
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else if(quoted)quoted=false;else if(cell==='')quoted=true;else throw new Error('CSV 格式異常');}
    else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){rows.push(row);row=[];if(c==='\r'&&csv[i+1]==='\n')i++;}}
    else cell+=c;
  }
  if(quoted)throw new Error('CSV 引號不完整');
  if(cell||row.length){row.push(cell);rows.push(row);}
  const matches=rows.filter(r=>r[0]?.trim()==='重訓室');
  if(matches.length!==1)throw new Error('找不到唯一重訓室欄位');
  const value=matches[0][1]?.trim();
  if(value==='N/A')return null;
  if(!/^\d+(?:\s*人)?$/.test(value||''))throw new Error('重訓室人數格式異常');
  const n=Number(value.replace(/\s*人$/,''));
  if(!Number.isSafeInteger(n)||n>5000)throw new Error('重訓室人數超出範圍');
  return n;
}
// Observation samples never enter opening-hour statistics. Raw counts are never corrected.
const OBSERVATION_MINUTES = [530,535,1250,1255,1265];
async function readSource() {
  const r=await fetch(SOURCE+'&_tracker='+Date.now(),{headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error('官網 HTTP '+r.status);
  const sourceDate=r.headers.get('Date'),age=r.headers.get('Age');
  if((age!==null&&Number(age)>120)||(sourceDate&&Date.now()-Date.parse(sourceDate)>300000))throw new Error('來源回應過舊');
  return {count:parseCount(await r.text()),at:new Date().toISOString(),sourceDate,age};
}
async function collect(env, ms) {
  const d=local(ms),minute=d.getUTCHours()*60+d.getUTCMinutes();
  const observation=OBSERVATION_MINUTES.includes(minute);
  if(!observation&&(minute<540||minute>=1250))return;
  const slot=new Date(Math.floor(ms/300000)*300000).toISOString();
  let n=null,status='error',detail=null,sourceDate=null,age=null,fetchedAt=new Date().toISOString();
  if((env.CLOSED_DATES||'').split(',').map(s=>s.trim()).includes(date(ms)))status='closed';
  else if(Math.abs(Date.now()-ms)>4*60000){status='late';detail='排程延遲，未採樣';}
  else try {
    const first=await readSource();n=first.count;sourceDate=first.sourceDate;age=first.age;fetchedAt=first.at;
    status=n===null?'unavailable':observation?'observation':n===0?'zero_unverified':'ok';
    if(n===null)detail='官方試算表回傳 N/A，原因未確認';
  }catch(e){detail=String(e.message).slice(0,160);}
  const insert=()=>env.DB.prepare(`INSERT INTO samples
    (slot,fetched_at,local_date,weekday,hour,minute,count,status,detail,source_date,source_age,body_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(slot) DO NOTHING`).bind(
      slot,fetchedAt,date(ms),d.getUTCDay(),d.getUTCHours(),Math.floor(d.getUTCMinutes()/5)*5,n,status,detail,sourceDate,age).run();
  const result=await insert();
  // Save the first result before waiting. A retry only appends metadata; it cannot overwrite raw count.
  if(n===0&&result.meta?.changes>0){
    await new Promise(resolve=>setTimeout(resolve,20000));
    let retry;try{retry={status:'ok',...await readSource()};}catch(e){retry={status:'error',at:new Date().toISOString(),error:String(e.message).slice(0,160)};}
    detail=JSON.stringify({kind:'zero_recheck',first:{count:0,at:fetchedAt},retry});
    await env.DB.prepare('UPDATE samples SET detail=? WHERE slot=? AND fetched_at=? AND count=0').bind(detail,slot,fetchedAt).run();
  }
}
export default {
  async scheduled(event,env,ctx) {ctx.waitUntil(collect(env,event.scheduledTime));},
  async fetch(req,env) {
    if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:HEADERS});
    const path=new URL(req.url).pathname;
    const asset=pwaResponse(path);if(asset)return asset;
    if(path!=='/'&&path!=='/overview'&&path!=='/export.csv')return new Response('Not found',{status:404,headers:HEADERS});
    try {
      const since=date(Date.now()-55*86400000);
      if(path==='/export.csv') {
        const {results}=await env.DB.prepare(EFFECTIVE_SAMPLES+' SELECT * FROM effective_samples WHERE local_date>=? ORDER BY slot DESC').bind(since).all();
        const cols=['slot','fetched_at','local_date','weekday','hour','minute','count','status','detail','effective_count','effective_status','effective_at'];
        const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
        return new Response('\ufeff'+[cols.join(','),...results.map(r=>cols.map(c=>cell(r[c])).join(','))].join('\r\n'),{headers:{...HEADERS,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ncu.csv"'}});
      }
      const [recent,stats,daily,today,observations]=await env.DB.batch([
        env.DB.prepare(EFFECTIVE_SAMPLES+' SELECT * FROM effective_samples ORDER BY slot DESC LIMIT 20'),
        env.DB.prepare('SELECT status,COUNT(*) AS n FROM samples WHERE local_date>=? GROUP BY status').bind(since),
        env.DB.prepare(EFFECTIVE_SAMPLES+" SELECT weekday,(hour*2+CAST(minute/30 AS INTEGER)) AS bucket,local_date,AVG(effective_count) AS mean FROM effective_samples WHERE local_date>=? AND effective_status='ok' AND (hour*60+minute)>=540 AND (hour*60+minute)<1250 GROUP BY local_date,weekday,bucket HAVING COUNT(*)>=5").bind(since),
        env.DB.prepare(EFFECTIVE_SAMPLES+' SELECT * FROM effective_samples WHERE local_date=? ORDER BY slot').bind(date(Date.now())),
        env.DB.prepare('SELECT * FROM samples WHERE local_date>=? AND ((hour*60+minute)<540 OR (hour*60+minute)>=1250 OR (hour=9 AND minute<=5)) ORDER BY slot DESC LIMIT 32').bind(date(Date.now()-86400000))
      ]);
      return new Response(render(recent.results.map(displaySample),stats.results,daily.results,today.results.map(displaySample),(env.CLOSED_DATES||'').split(',').map(s=>s.trim()),observations.results,path==='/overview'?'overview':'today'),{headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8'}});
    } catch {return new Response('資料讀取失敗，請確認 D1 綁定名稱為 DB，且 samples 資料表已建立。',{status:503,headers:HEADERS});}
  }
};


