export const clientScript = String.raw`
const D=JSON.parse(document.getElementById('data').textContent);
const $=id=>document.getElementById(id);
const now=new Date(D.now+28800000),todayKey=now.toISOString().slice(0,10),weekday=now.getUTCDay(),minute=now.getUTCHours()*60+now.getUTCMinutes();
const clock=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const period=b=>clock(b*30)+'–'+clock(b*30+30);
const weeks=['日','一','二','三','四','五','六'];
const labels={ok:'正常',error:'抓取失敗',late:'排程延遲',closed:'設定休館',zero_unverified:'零人待確認',observation:'開閉館觀察',unavailable:'官方暫無人數'};
const fmt=s=>new Date(s).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
const quant=(values,p)=>{const a=[...values].sort((a,b)=>a-b),i=(a.length-1)*p,lo=Math.floor(i);return a[lo]+(a[Math.ceil(i)]-a[lo])*(i-lo);};
const summary=values=>({n:values.length,median:quant(values,.5),low:quant(values,.25),high:quant(values,.75)});
const map=new Map();
// Overview can include completed portions of today; live comparisons cannot use today.
const history=D.daily;
const priorHistory=D.baseline;
for(const r of history){const key=r.weekday+'-'+r.bucket;if(!map.has(key))map.set(key,[]);map.get(key).push(r.mean);}
const baseline=(w,b)=>{const v=priorHistory.filter(r=>r.weekday===w&&r.bucket===b).map(r=>r.mean);return v.length?summary(v):null;};
if($('now')){
const closed=D.closedDates.includes(todayKey),open=!closed&&minute>=540&&minute<1250;
const last=D.latest.find(r=>r.hour*60+r.minute>=540&&r.hour*60+r.minute<1250),fresh=last&&D.now-Date.parse(last.fetched_at)<=15*60000&&last.local_date===todayKey;
$('state').textContent=closed?'設定休館':!open?'非採樣時間':!last?'等待第一筆':!fresh?'資料待更新':last.status==='ok'?'近期採樣':'採樣待確認';
$('count').textContent=!open?'已閉館':last&&last.count!==null?last.count:'—';
document.querySelector('.unit').hidden=!open;
if(!open)$('count').style.fontSize='40px';
$('updated').textContent=last?fmt(last.fetched_at)+' · '+(last.count??'—')+' 人 · '+(last.rechecked?'複查正常':labels[last.status]||last.status):'尚無紀錄，請確認排程已啟用。';
const base=baseline(weekday,Math.floor(minute/30));
if(open&&fresh&&last.status==='ok'&&base&&base.n>=3){const diff=last.count-base.median;$('comparison').textContent='比同星期、同時段平常'+(Math.abs(diff)<1?'差不多':diff>0?'多約 '+Math.round(diff)+' 人':'少約 '+Math.round(-diff)+' 人')+'（參考 '+base.n+' 個日期）';}
else $('comparison').textContent=!open?'顯示最近一次紀錄，並非目前人數。':!fresh?'資料尚未更新，暫不判斷目前人潮。':'累積更多同時段資料後，會顯示與平常的差異。';
const due=[];if(!closed)for(let m=540;m<1250&&m<=minute-10;m+=5)due.push(m);
const recorded=new Set(D.today.map(r=>r.hour*60+r.minute));
const valid=new Set(D.today.filter(r=>r.status==='ok').map(r=>r.hour*60+r.minute));
const seen=due.filter(m=>recorded.has(m)).length,good=due.filter(m=>valid.has(m)).length,missing=due.length-seen;
$('coverage').textContent=due.length?seen+' / '+due.length:'—';$('valid').textContent=due.length?Math.round(good/due.length*100)+'%':'—';
// Schedule completeness and source availability are different signals, including after closing.
const openingRows=D.today.filter(r=>r.hour*60+r.minute>=540&&r.hour*60+r.minute<1250);
const suspect=openingRows.filter(r=>r.status!=='ok').length;
const unavailable=openingRows.filter(r=>r.status==='unavailable').length;
const zeros=openingRows.filter(r=>r.status==='zero_unverified').length;
const failed=openingRows.filter(r=>r.status==='error'||r.status==='late').length;
const recovered=openingRows.filter(r=>r.status==='ok'&&r.rechecked).length;
$('health-state').textContent=closed?'休館':missing?'排程缺漏':open&&(!last||!fresh)?'等待排程更新':open&&last.status==='unavailable'?'官方暫無人數':open&&last.status==='zero_unverified'?'人數待確認':open&&last.status!=='ok'?'採樣需留意':suspect?'部分數值待確認':!open?'休息中':'最近一次正常';
const scheduleText=closed?'今天已設定休館，不預期營業採樣。':missing?'今天有 '+missing+' 個已到期時點沒有紀錄。':due.length?'今日排程完整，已到期時點皆有紀錄。':'尚無超過寫入緩衝的應採樣時點。';
const sourceText=open&&fresh&&last?.status==='unavailable'?'排程有紀錄，官方目前暫無人數，無法判斷人潮。':open&&fresh&&last?.status==='zero_unverified'?'排程有紀錄，最近零人讀值待確認。':open&&(!last||!fresh)?'等待新的營業採樣紀錄。':open&&last?.status!=='ok'?'最近採樣需留意，請查看紀錄。':!open?'目前不在營業採樣時間。':'最近人數紀錄可用。';
$('health-text').textContent=scheduleText+' '+sourceText+' 今日有 '+openingRows.filter(r=>r.status==='ok').length+' 筆可用人數，其中 '+recovered+' 筆複查恢復；官方暫無人數 '+unavailable+' 筆、零人待確認 '+zeros+' 筆、失敗或延遲 '+failed+' 筆。';
function detailText(raw,accepted=false){try{const x=JSON.parse(raw);if(x.kind==='zero_recheck')return '首次 0 人；'+fmt(x.retry.at)+' 複查：'+(x.retry.status==='ok'?x.retry.count+' 人':x.retry.error)+(accepted?'（首次 0 人保留，統計採用複查值）':'（原始值保留，未納入統計）');}catch{}return raw||'';}
for(const r of D.latest.slice(0,20)){const e=document.createElement('div');e.className='log';e.textContent=fmt(r.fetched_at)+' · '+(r.count??'—')+' 人 · '+(r.rechecked?'複查正常':labels[r.status]||r.status)+(r.detail?'：'+detailText(r.detail,r.rechecked):'');$('logs').append(e);}
if(!D.latest.length)$('logs').textContent='尚無資料';
const pairMap=new Map(priorHistory.map(r=>[r.local_date+'-'+r.bucket,r]));
function hourStats(b){const values=[];for(const r of priorHistory){if(r.weekday!==weekday||r.bucket!==b)continue;const next=pairMap.get(r.local_date+'-'+(b+1));if(next)values.push((r.mean+next.mean)/2);}return values.length>=3?summary(values):null;}
const earliest=Math.max(18,Math.ceil(minute/30));
for(let b=earliest;b<=39;b++){const o=document.createElement('option');o.value=b;o.textContent=clock(b*30);$('after').append(o);}
function recommendations(){const out=$('recommend');out.replaceChildren();if(closed||earliest>39){out.textContent=closed?'今天已設定休館。':'今天已沒有完整 1 小時可推薦，明天再看看。';return;}
const options=[];for(let b=Number($('after').value);b<=39;b++){const s=hourStats(b);if(s)options.push({b,...s});}options.sort((a,b)=>a.median-b.median||a.b-b.b);
const picks=[];for(const p of options){if(picks.every(x=>Math.abs(x.b-p.b)>=2))picks.push(p);if(picks.length===3)break;}
if(!picks.length){out.className='empty';out.textContent='還在累積資料。相同星期的完整 1 小時至少要有 3 個有效日期，才會提供建議。';return;}out.className='';
for(const p of picks){const e=document.createElement('div');e.className='pick';const title=document.createElement('strong');title.textContent=clock(p.b*30)+'–'+clock(p.b*30+60);const sub=document.createElement('p');sub.textContent='歷史典型約 '+Math.round(p.median)+' 人 · '+p.n+' 個日期';const foot=document.createElement('small');foot.textContent='中間一半紀錄約 '+Math.round(p.low)+'–'+Math.round(p.high)+' 人'+(p.n<6?' · 初步參考':'');e.append(title,sub,foot);out.append(e);}}
$('after').disabled=closed||earliest>39;$('after').addEventListener('change',recommendations);recommendations();
// Fixed 09:00–20:50 axis; invalid or missing five-minute slots break the line.
const points=D.today.filter(r=>r.hour*60+r.minute>=540&&r.hour*60+r.minute<1250).sort((a,b)=>a.slot.localeCompare(b.slot));
const normal=points.filter(r=>r.status==='ok'&&Number.isFinite(r.count));
if(!normal.length)$('today-chart').textContent='今天還沒有可繪製的正常採樣。';
else {
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 200');svg.setAttribute('role','img');svg.setAttribute('aria-label','今日正常人數走勢，缺漏處不連線');svg.style.width='100%';
 const max=Math.max(10,...normal.map(r=>r.count))*1.15;
 const x=r=>40+(r.hour*60+r.minute-540)/710*580,y=r=>160-r.count/max*130;
 function add(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);}
 for(let h=9;h<=21;h+=3)add('text',{x:40+(Math.min(h*60,1250)-540)/710*580,y:190,'text-anchor':'middle','font-size':14,fill:'#65766d'},clock(Math.min(h*60,1250)));
 for(const n of [0,Math.round(max/2),Math.ceil(max)]){const yy=160-n/max*130;add('line',{x1:40,x2:620,y1:yy,y2:yy,stroke:'#e0e8e1'});add('text',{x:32,y:yy+5,'text-anchor':'end','font-size':13,fill:'#65766d'},String(n));}
 let prev=null;
 for(const r of points){if(r.status!=='ok'||!Number.isFinite(r.count)){prev=null;continue;}if(prev&&Date.parse(r.slot)-Date.parse(prev.slot)===300000)add('line',{x1:x(prev),y1:y(prev),x2:x(r),y2:y(r),stroke:'#276e50','stroke-width':2});add('circle',{cx:x(r),cy:y(r),r:3,fill:'#276e50'});prev=r;}
 $('today-chart').append(svg);
}
$('trend-summary').textContent=normal.length?'今日正常紀錄 '+normal.length+' 筆；統計採用人數範圍 '+Math.min(...normal.map(r=>r.count))+'–'+Math.max(...normal.map(r=>r.count))+' 人。':'資料從啟用後開始累積。';
for(const r of D.observations||[]){const e=document.createElement('div');e.className='log';e.textContent=fmt(r.fetched_at)+' · '+(r.count??'—')+' 人 · '+(r.rechecked?'複查正常':labels[r.status]||r.status)+(r.detail?'：'+detailText(r.detail,r.rechecked):'');$('observations').append(e);}
if(!D.observations?.length)$('observations').textContent='尚無開閉館觀察紀錄。';

}
if($('statistics-today')){
const excluded=D.excluded.filter(r=>r.local_date===todayKey);
const rule=D.statisticsConfig.dates[todayKey];
$('statistics-today').textContent=rule?.mode==='exclude'?'今日不參與一般日統計：'+rule.reason+'。當日走勢與原始資料照常保留。':excluded.length?'今日已有 '+excluded.length+' 個半小時暫不參與一般日統計；人數紀錄照常保留，可至全局查看原因。':'';
}
if($('popular')){
const assessed=D.assessments.filter(r=>r.assessment==='evaluated').length;
const insufficient=D.assessments.filter(r=>r.assessment==='insufficient').length;
$('statistics-status').textContent='已完成半小時於結束 10 分鐘後納入。'+(D.statisticsConfig.automatic?'自動異常判定已啟用；'+assessed+' 段可判定，'+insufficient+' 段歷史不足，未自動排除。':'自動異常判定已關閉。')+' 共排除 '+D.excluded.length+' 個日期時段。';
const overrides=Object.entries(D.statisticsConfig.dates);
for(const [date,rule] of overrides){const e=document.createElement('p');e.textContent=date+' · '+(rule.mode==='include'?'人工納入':'人工排除')+' · '+(rule.reason||'人工設定');$('statistics-exclusions').append(e);}
for(const r of D.excluded){const e=document.createElement('div');e.className='log';e.textContent=r.local_date+' '+period(r.bucket)+' · '+r.reason+(r.referenceCount>=6&&r.centre!==undefined?'（人數 '+Math.round(r.mean)+'，歷史中位數 '+Math.round(r.centre)+'，參考 '+r.referenceCount+' 日）':'');$('statistics-exclusions').append(e);}
if(!D.excluded.length&&!overrides.length)$('statistics-exclusions').textContent='目前沒有統計排除紀錄。';
let selected=weekday;
const all=[...map.values()].filter(v=>v.length>=3).map(v=>summary(v).median);
const cut=all.length?[quant(all,.25),quant(all,.5),quant(all,.75)]:[];
function showDay(w){selected=w;for(const b of $('days').children)b.setAttribute('aria-pressed',Number(b.dataset.day)===w);$('chart').replaceChildren();$('detail').textContent='星期'+weeks[w]+' · 點選時段查看詳細資料。';for(let b=18;b<41;b++){const s=baseline(w,b),usable=s&&s.n>=3;const button=document.createElement('button');button.className='tile'+(usable?' c'+(1+cut.filter(c=>s.median>c).length):'');button.setAttribute('aria-pressed','false');const t=document.createElement('span');t.textContent=clock(b*30);const n=document.createElement('strong');n.textContent=usable?Math.round(s.median):'—';button.setAttribute('aria-label','星期'+weeks[w]+' '+period(b)+(usable?'，典型 '+Math.round(s.median)+' 人':'，資料不足'));button.append(t,n);button.onclick=()=>{for(const x of $('chart').children)x.setAttribute('aria-pressed','false');button.setAttribute('aria-pressed','true');$('detail').textContent='星期'+weeks[w]+' '+period(b)+'：'+(usable?'典型 '+Math.round(s.median)+' 人；中間一半紀錄 '+Math.round(s.low)+'–'+Math.round(s.high)+' 人。共 '+s.n+' 個有效日期。'+(s.n<6?'目前僅供初步參考。':''):'只有 '+(s?s.n:0)+' 個有效日期，至少 3 個才比較人潮。');};$('chart').append(button);}}
for(let w=0;w<7;w++){const b=document.createElement('button');b.textContent='週'+weeks[w];b.dataset.day=w;b.onclick=()=>showDay(w);$('days').append(b);}showDay(selected);

}
let loadedAt=Date.now();
const offlineSnapshot=document.body.dataset.offline==='true';
function connection(){const offline=offlineSnapshot||!navigator.onLine;const banner=$('connection');banner.hidden=!offline;if(offline){banner.textContent='離線／暫時無法更新。以下為 '+fmt(D.now)+' 載入的資料，不是即時資訊。';if($('state'))$('state').textContent='離線快照';if($('comparison'))$('comparison').textContent='目前無法確認即時人潮，請連線後重新整理。';}}
connection();
function refreshIfDue(){if(navigator.onLine&&!document.hidden&&Date.now()-loadedAt>=300000){loadedAt=Date.now();location.reload();}}
setInterval(refreshIfDue,30000);document.addEventListener('visibilitychange',refreshIfDue);window.addEventListener('pageshow',refreshIfDue);window.addEventListener('offline',connection);window.addEventListener('online',()=>location.reload());
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{ console.warn('離線功能未啟用'); });

`;
