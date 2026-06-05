import fs from "fs";
function parseCsv(text){const r=[];let c=[],f="",q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}else{if(ch==='"')q=true;else if(ch===","){c.push(f);f="";}else if(ch==="\n"){c.push(f);r.push(c);c=[];f="";}else if(ch==="\r"){}else f+=ch;}} if(f||c.length){c.push(f);r.push(c);}return r;}
const text=fs.readFileSync("/Users/takeshi/Downloads/バイト生 武士道 振込 - 7月.csv","utf8");
const rows=parseCsv(text);
const idx=rows[0].findIndex(h=>h.includes("お名前"));
const idxBr=rows[0].findIndex(h=>h.includes("内訳"));
for(let i=1;i<rows.length;i++){const n=(rows[i][idx]||"").replace(/\s/g,"");if(n==="湯淺祥平")console.log(JSON.stringify(rows[i][idxBr]));}
