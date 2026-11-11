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
// Exclude today's incomplete data and explicitly configured closed dates.
const history=D.daily.filter(r=>r.local_date<todayKey&&r.bucket>=18&&r.bucket<41&&!D.closedDates.includes(r.local_date));
for(const r of history){const key=r.weekday+'-'+r.bucket;if(!map.has(key))map.set(key,[]);map.get(key).push(r.mean);}
const baseline=(w,b)=>{const v=map.get(w+'-'+b);return v?summary(v):null;};
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
$('health-state').textContent=closed?'休館':!open?'休息中':missing||!fresh||last?.status!=='ok'?'需要留意':'最近一次正常';
$('health-text').textContent=closed?'今天已設定休館，不預期正常採樣。':missing?'今天有 '+missing+' 個已到期時點沒有紀錄；可能是排程尚未啟用或漏採。':!open?'目前不在採樣時間，營業時段會繼續記錄。':!last?'等待排程送回第一筆資料。':!fresh?'最新紀錄超過 15 分鐘，請檢查排程或執行紀錄。':last.status!=='ok'?'最近採樣為「'+(last.rechecked?'複查正常':labels[last.status]||last.status)+'」，暫不拿來估計人潮。':'最近採樣正常，已到期時點皆有紀錄。';
const suspect=D.today.filter(r=>r.hour*60+r.minute>=540&&r.hour*60+r.minute<1250&&r.status!=='ok').length;
$('health-text').textContent+=' 今日另有 '+suspect+' 筆非正常紀錄（含來源無資料、零人待確認、失敗或延遲）。';
function detailText(raw,accepted=false){try{const x=JSON.parse(raw);if(x.kind==='zero_recheck')return '首次 0 人；'+fmt(x.retry.at)+' 複查：'+(x.retry.status==='ok'?x.retry.count+' 人':x.retry.error)+(accepted?'（首次 0 人保留，統計採用複查值）':'（原始值保留，未納入統計）');}catch{}return raw||'';}
for(const r of D.latest.slice(0,20)){const e=document.createElement('div');e.className='log';e.textContent=fmt(r.fetched_at)+' · '+(r.count??'—')+' 人 · '+(r.rechecked?'複查正常':labels[r.status]||r.status)+(r.detail?'：'+detailText(r.detail,r.rechecked):'');$('logs').append(e);}
if(!D.latest.length)$('logs').textContent='尚無資料';
const pairMap=new Map(history.map(r=>[r.local_date+'-'+r.bucket,r]));
function hourStats(b){const values=[];for(const r of history){if(r.weekday!==weekday||r.bucket!==b)continue;const next=pairMap.get(r.local_date+'-'+(b+1));if(next)values.push((r.mean+next.mean)/2);}return values.length>=3?summary(values):null;}
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
if($('popular')){
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
