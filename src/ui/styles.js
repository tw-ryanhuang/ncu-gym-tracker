export const styles = String.raw`
/* Quiet, data-first visual system. Keep state colors meaningful. */
:root{
  --ink:#183e32;--green:#276e50;--muted:#5e7066;--line:#dce4dc;
  --bg:#f5f5ef;--surface:#fff;--soft:#edf2e9;--focus:#9a6418;
  --radius:20px;--control-radius:12px;--shadow:0 3px 16px #183e3206;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei",sans-serif;-webkit-text-size-adjust:100%;font-variant-numeric:tabular-nums}
main{max-width:1000px;margin:auto;padding:24px 20px calc(112px + env(safe-area-inset-bottom));padding-top:max(24px,env(safe-area-inset-top))}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:20px;border-bottom:1px solid var(--line)}
header small{max-width:230px;font-size:12px;letter-spacing:.04em;line-height:1.6}
h1,h2,h3,p{overflow-wrap:anywhere;text-wrap:pretty}
h1{font-size:clamp(25px,4vw,36px);line-height:1.3;letter-spacing:-.04em;font-weight:650;margin:26px 0 8px}
h2{font-size:19px;line-height:1.45;letter-spacing:-.025em;margin:0 0 8px;font-weight:650}
h3{font-size:16px;margin:0}p{margin:8px 0}
small,.muted{font-size:13px;line-height:1.7;color:var(--muted)}
main>p.muted{margin-bottom:24px;font-size:14px}
a{color:var(--green);text-underline-offset:4px}
button,select,input{font:inherit}
button,select,.action{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--control-radius);padding:10px 14px;min-height:44px;transition:background .16s ease,border-color .16s ease,transform .16s ease}
button{cursor:pointer;touch-action:manipulation}
.action{text-decoration:none;white-space:nowrap;font-size:13px;font-weight:600}
:where(button,a,select,input,summary):focus-visible{outline:3px solid var(--focus);outline-offset:4px}
button:active,.action:active,.bottom a:active{transform:translateY(1px)}
button:disabled{opacity:.5;cursor:not-allowed}
.hero{background:var(--ink);color:white;border-radius:var(--radius);padding:28px 30px;margin:0 0 24px}
.hero-top{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px}
.hero>p:first-of-type{margin:18px 0 12px}
.hero strong{font-size:clamp(48px,11vw,76px);line-height:1.12;letter-spacing:-.055em;font-weight:650}
.hero .unit{font-size:17px;margin-left:12px;color:#d3e1d6}
.hero .muted{color:#c6d8ce;font-size:12px}
#comparison{font-size:14px}#updated{margin-top:16px;padding-top:14px;border-top:1px solid #ffffff26}
.badge{display:inline-flex;align-items:center;flex-shrink:0;border-radius:100px;padding:5px 10px;font-size:11px;font-weight:600;background:var(--soft);color:var(--ink);white-space:nowrap}
.hero .badge{background:#35574a;color:#f1f6ef}
.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:24px;min-width:0;box-shadow:var(--shadow)}
.full{grid-column:1/-1}
.row{display:flex;justify-content:space-between;gap:12px;align-items:center}.row h2{margin-bottom:0}
.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0;font-size:14px}
.controls select{margin-left:auto;min-width:112px;font-weight:600}
.pick{background:var(--soft);border-radius:var(--control-radius);padding:16px;margin:12px 0}
.pick strong{font-size:24px;letter-spacing:-.025em}
.empty{padding:20px 0;color:var(--muted);font-size:14px;line-height:1.85}
.metric{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}
.metric>div+div{border-left:1px solid var(--line);padding-left:20px}
.metric strong{font-size:30px;line-height:1.3;letter-spacing:-.04em;display:block;margin-bottom:6px}
.metric small{font-size:12px}
#health-text{font-size:14px;margin-top:16px}
.choices{display:flex;gap:4px;padding:4px;background:var(--soft);border-radius:14px;margin:24px 0 16px}
.choices button{flex:1;min-width:0;border:0;border-radius:10px;padding:10px 0;background:transparent;font-size:14px}
.choices button[aria-pressed=true]{background:var(--ink);color:white}
.chart{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.tile{border:0;border-radius:10px;min-height:76px;padding:10px 3px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--soft);font-size:12px;line-height:1.5}
.tile strong{font-size:20px;font-weight:600;line-height:1.4}
.tile[aria-pressed=true]{outline:2px solid var(--ink);outline-offset:2px}
.c1{background:#e4efdc}.c2{background:#bad5a9}.c3{background:#7da87a;color:#102d20}.c4{background:#35674e;color:white}
.legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12px;margin:16px 0;color:var(--muted)}
.swatch{width:16px;height:10px;border-radius:2px}
.detail{padding:16px;background:var(--soft);border-radius:var(--control-radius);margin-top:20px;min-height:88px;font-size:14px}
#today-chart{margin-top:20px}#today-chart svg{display:block;max-width:100%;height:auto}
details{border-top:1px solid var(--line);padding-top:12px;margin-top:20px}
summary{cursor:pointer;min-height:44px;padding:8px 0;font-size:14px;font-weight:500}
.log{padding:14px 0;border-bottom:1px solid var(--line);font-size:12px;line-height:1.8;overflow-wrap:anywhere}
.notice{color:#8a4f13}
.connection{padding:14px 16px;border:1px solid #e5d4b4;border-radius:var(--control-radius);background:#fff0d4;color:#754712;margin:16px 0;font-size:14px}
section{scroll-margin-top:20px}
footer{font-size:12px;line-height:1.85;color:var(--muted);margin-top:28px}
footer p{margin:12px 0}footer a{display:inline-block;min-height:44px;padding:10px 0}
.install{font-size:13px}.install summary{color:var(--ink)}
.bottom{position:fixed;bottom:0;left:0;right:0;z-index:5;display:flex;gap:8px;background:var(--bg);border-top:1px solid var(--line);padding:12px max(16px,calc((100vw - 960px)/2)) calc(12px + env(safe-area-inset-bottom))}
.bottom a{flex:1;min-width:0;min-height:48px;text-align:center;text-decoration:none;font-size:16px;font-weight:600;line-height:24px;border-radius:var(--control-radius);padding:12px;background:var(--surface);color:var(--ink);transition:background .16s ease,transform .16s ease}
.bottom a[aria-current="page"]{background:var(--ink);color:white}
@media(hover:hover){button:not(:disabled):not([aria-pressed=true]):hover,.action:hover,.bottom a:not([aria-current]):hover{background:#e4ebdf}a:hover{text-decoration-thickness:2px}summary:hover{color:var(--green)}}
@media(max-width:650px){main{padding-left:16px;padding-right:16px;padding-top:max(16px,env(safe-area-inset-top))}header{padding-bottom:16px;gap:12px}header small{max-width:190px}h1{margin-top:22px}.hero{padding:24px;margin-bottom:16px}.grid{grid-template-columns:minmax(0,1fr);gap:16px}.card{padding:20px}.metric{gap:16px}.metric>div+div{padding-left:16px}}
@media(min-width:651px){.chart{grid-template-columns:repeat(8,minmax(0,1fr))}}
@media(max-width:360px){.card,.hero{padding:18px}.row{gap:8px}.row h2{font-size:17px}.choices{gap:0}.hero-top{font-size:13px}}
@media(display-mode:standalone){header{padding-top:8px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
`;
