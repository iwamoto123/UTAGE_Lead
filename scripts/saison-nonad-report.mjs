// SAISON明細のうち広告費以外の明細を、月次PLの経費科目候補に分類して一覧化する（読み取りのみ）
import fs from "fs"; import iconv from "iconv-lite";
const AD = ["FACEBK","FACEBOOK","INSTAGRAM","META PLATFORM","META PAYMENTS","GOOGLE ADS","TIKTOK"];
const RULES = [
  [/CURSOR|ANTHROPIC|CLAUDE|UTAGE|ZOOM\.COM|GOOGLE\*WORKSPACE|GOOGLE\*CLOUD|VREW|AQUA VOICE|X CORP|LINE公式アカウント|アマゾンサービシーズインターナショナル/i, "SaaS利用料"],
  [/お名前\.com|NTT西日本|株式会社東名/i, "通信費"],
  [/印刷通販プリントパック/i, "その他経費（印刷・販促）"],
  [/アマゾン/i, "その他経費（消耗品）"],
];
function classify(s){ for (const [re,c] of RULES) if (re.test(s)) return c; return "その他経費（未分類）"; }
function split(l){const o=[];let c="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++}else q=!q}else if(ch===","&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o}
const rows=[];
for (const f of process.argv.slice(2)) {
  const base=f.split("/").pop(); let h=false;
  for (const line of iconv.decode(fs.readFileSync(f),"cp932").split(/\r?\n/)) {
    const c=split(line);
    if(c[0]==="利用日"){h=true;continue} if(!h)continue;
    const d=(c[0]??"").trim(), shop=(c[1]??"").trim(), a=parseInt((c[5]??"").trim(),10);
    if(!/^\d{4}\/\d{2}\/\d{2}$/.test(d)||!Number.isFinite(a))continue;
    const u=shop.toUpperCase();
    if(AD.some(k=>u.includes(k)))continue;
    rows.push({ym:d.slice(0,7).replace("/","-"),date:d,shop,amount:a,cat:classify(shop),file:base});
  }
}
const byM={};
for(const r of rows){ (byM[r.ym]??={})[r.cat]??=[]; byM[r.ym][r.cat].push(r); }
let grand=0;
for(const ym of Object.keys(byM).sort()){
  let mt=0; console.log(`\n================ ${ym} ================`);
  for(const cat of Object.keys(byM[ym]).sort()){
    const list=byM[ym][cat]; const t=list.reduce((a,r)=>a+r.amount,0); mt+=t;
    console.log(`\n  ▼ ${cat}  合計 ¥${t.toLocaleString()}`);
    const agg={}; for(const r of list) agg[r.shop]=(agg[r.shop]??0)+r.amount;
    for(const [s,v] of Object.entries(agg).sort((a,b)=>b[1]-a[1])) console.log(`      ${s.padEnd(34)} ¥${v.toLocaleString().padStart(9)}`);
  }
  grand+=mt; console.log(`\n  ── ${ym} 広告費以外 合計 ¥${mt.toLocaleString()}`);
}
console.log(`\n総計（広告費以外） ¥${grand.toLocaleString()}`);
