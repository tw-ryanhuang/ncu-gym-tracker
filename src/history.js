// Shared, read-only projection. No sample or original daily mean is overwritten.
export function analyseHistory(daily,{now=Date.now(),start=360,end=1320,closedDates=[],dates={},automatic=true}={}) {
  const dayMs=86400000,localNow=now+8*3600000;
  const today=new Date(localNow).toISOString().slice(0,10);
  const midnight=d=>Date.parse(d+'T00:00:00+08:00');
  const since=new Date(localNow-55*dayMs).toISOString().slice(0,10);
  const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const unique=new Map();
  for(const r of daily){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.local_date)||r.local_date<since||r.local_date>today||!Number.isInteger(r.bucket)||r.bucket*30<start||(r.bucket+1)*30>end||!Number.isFinite(r.mean)||r.mean<=0)continue;
    if(now<midnight(r.local_date)+(r.bucket*30+40)*60000)continue;
    const weekday=new Date(midnight(r.local_date)+8*3600000).getUTCDay();
    unique.set(r.local_date+'-'+r.bucket,{...r,weekday});
  }
  const rows=[...unique.values()].sort((a,b)=>a.local_date.localeCompare(b.local_date)||a.bucket-b.bucket);
  const days=new Map();for(const r of rows){if(!days.has(r.local_date))days.set(r.local_date,[]);days.get(r.local_date).push(r);}
  const accepted=[],excluded=[],assessments=[];
  for(const [date,group] of days){
    const rule=dates[date]||{},manual=rule.mode==='exclude',force=rule.mode==='include';
    const candidates=group.map(r=>{
      const values=accepted.filter(p=>p.local_date<date&&midnight(p.local_date)>=midnight(date)-56*dayMs&&p.weekday===r.weekday&&p.bucket===r.bucket).map(p=>p.mean);
      if(!automatic||manual||force||closedDates.includes(date)||values.length<6)return {...r,referenceCount:values.length,direction:0,assessment:!automatic?'disabled':manual||force?'manual':values.length<6?'insufficient':'closed'};
      const centre=median(values),mad=median(values.map(v=>Math.abs(v-centre))),threshold=Math.max(3*1.4826*mad,15,centre*.5),delta=r.mean-centre;
      return {...r,referenceCount:values.length,centre,mad,threshold,direction:Math.abs(delta)>threshold?Math.sign(delta):0,assessment:'evaluated'};
    });
    const evaluated=candidates.filter(r=>r.assessment==='evaluated');
    let previous=null,run=0,maxRun=0;
    for(const r of candidates){run=r.direction?(previous&&previous.direction===r.direction&&r.bucket===previous.bucket+1?run+1:1):0;maxRun=Math.max(maxRun,run);previous=r;}
    const unusual=evaluated.filter(r=>r.direction!==0).length;
    const special=automatic&&!force&&!manual&&maxRun>=4&&unusual>=evaluated.length/2;
    for(const r of candidates){
      const reason=closedDates.includes(date)?'設定休館':manual?(rule.reason||'人工排除'):special?'特殊人潮日候選：連續至少 2 小時且過半可判定時段異常':r.direction?'同星期、同時段人數明顯偏離歷史':null;
      const projected={...r,reason,manual:force?'include':manual?'exclude':null};
      assessments.push(projected);
      if(reason)excluded.push(projected);else accepted.push(projected);
    }
  }
  return {accepted,baseline:accepted.filter(r=>r.local_date<today),excluded,assessments,today,automatic};
}
