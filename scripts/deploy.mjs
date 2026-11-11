import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const db=config.d1_databases?.[0];
if(config.name!=='ncu-gym-tracker'||db?.database_name!=='ncu-gym'||!db?.database_id?.match(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i)||db.database_id==='b8a840b8-1fe2-4dbf-b8ce-5c7981a0a18b'){
 console.error('請先在 wrangler.jsonc 設定中大專用 D1 database_id，不能使用平鎮資料庫。');process.exit(1);
}
for(const args of [['d1','migrations','apply','ncu-gym','--remote'],['deploy']]){
 const result=spawnSync('npx',['--no-install','wrangler',...args],{stdio:'inherit',shell:process.platform==='win32'});
 if(result.status!==0)process.exit(result.status||1);
}
