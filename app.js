(()=>{"use strict";
// ================= utils =================
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const mk=(w,h)=>{const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rr=(a,b)=>a+Math.random()*(b-a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const hx=(r,g,b)=>"#"+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,"0")).join("");
const mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return hx(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)};
const h=(tag,p,...kids)=>{const e=document.createElement(tag);if(p)for(const k in p){const v=p[k];if(k==="class")e.className=v;else if(k==="style")e.style.cssText=v;else if(k==="html")e.innerHTML=v;else if(k.startsWith("on"))e[k]=v;else e.setAttribute(k,v)}kids.flat().forEach(c=>{if(c!=null)e.append(c.nodeType?c:document.createTextNode(c))});return e};
const toBlob=(c,t="image/png",q)=>new Promise(r=>c.toBlob(r,t,q));
const loadImg=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src});
function shrink(src,w,hh){let c=src,cw=src.naturalWidth||src.width,ch=src.naturalHeight||src.height;while(cw/2>w&&ch/2>hh){const nw=Math.max(w,Math.ceil(cw/2)),nh=Math.max(hh,Math.ceil(ch/2)),d=mk(nw,nh),x=d.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(c,0,0,cw,ch,0,0,nw,nh);c=d;cw=nw;ch=nh}const o=mk(w,hh),y=o.getContext("2d");y.imageSmoothingQuality="high";y.drawImage(c,0,0,cw,ch,0,0,w,hh);return o}
const IC={
 back:'<path d="M15 5l-7 7 7 7"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
 play:'<path d="M8 5l11 7-11 7z" fill="currentColor"/>',menu:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
 fill:'<path d="M5 13l7-8 7 8-7 6z"/><path d="M19.5 15.5c1 1.4 1.8 2.5 1.8 3.5a1.8 1.8 0 0 1-3.6 0c0-1 .8-2.100 1.800-3.500z" fill="currentColor"/>',
 brush:'<path d="M20 4l-9 9"/><path d="M11 13c-3 0-5 2-5 4.500 0 1.500-1 2.500-2 3 5 1 10-.5 10-5"/>',
 sparkle:'<path d="M11 3l1.800 5.200L18 10l-5.200 1.800L11 17l-1.800-5.200L4 10l5.200-1.800z" fill="currentColor"/><path d="M18.500 15l.8 2.200 2.200.8-2.200.8-.8 2.200-.8-2.200-2.200-.8 2.200-.8z" fill="currentColor"/>',
 erase:'<path d="M4 15l9-9 7 7-5 5H8z"/><path d="M9 20h11"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>'};
const icon=n=>`<svg viewBox="0 0 24 24">${IC[n]}</svg>`;
// ================= storage =================
const MEM={p:{},s:{},m:{}};
const DB=new Promise(res=>{try{const r=indexedDB.open("kl-v4",1);r.onupgradeneeded=()=>{["p","s","m"].forEach(n=>r.result.createObjectStore(n))};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}});
async function dbGet(st,k){const d=await DB;if(!d)return MEM[st][k];return new Promise(r=>{try{const q=d.transaction(st).objectStore(st).get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(undefined)}catch(e){r(undefined)}})}
async function dbPut(st,k,v){const d=await DB;if(!d){MEM[st][k]=v;return}return new Promise(r=>{try{const t=d.transaction(st,"readwrite");t.objectStore(st).put(v,k);t.oncomplete=()=>r();t.onerror=()=>r();t.onabort=()=>r()}catch(e){r()}})}
async function dbDel(st,k){const d=await DB;if(!d){delete MEM[st][k];return}return new Promise(r=>{try{const t=d.transaction(st,"readwrite");t.objectStore(st).delete(k);t.oncomplete=()=>r();t.onerror=()=>r()}catch(e){r()}})}
async function dbRange(st,prefix){const d=await DB,out={};if(!d){for(const k in MEM[st])if(k.startsWith(prefix))out[k]=MEM[st][k];return out}return new Promise(r=>{try{const q=d.transaction(st).objectStore(st).openCursor(IDBKeyRange.bound(prefix,prefix+"\uffff"));q.onsuccess=()=>{const c=q.result;if(c){out[c.key]=c.value;c.continue()}else r(out)};q.onerror=()=>r(out)}catch(e){r(out)}})}
// ================= state =================
const BRAND={name:"{{BRAND_NAME}}",short:"{{BRAND_SHORT}}",tagline:"{{BRAND_TAGLINE}}",sub:"{{BRAND_SUB}}"};
const PAPERS={A4:{w:210,h:297,name:"A4"},Letter:{w:215.9,h:279.4,name:"US Letter"}};
const S={paper:"A4",dpi:300,book:null,story:null,kind:"pages",idx:0,page:null,key:"",img:null,W:0,H:0,tool:"fill",zoom:1,mode:"",dirty:false,dev:false,sum:{},clip:null,
 fill:{type:"solid",color:"#d9a441",pat:0,ps:1,colorB:"#fff6e0",grad:{a:"#f9c74f",b:"#c0392b",dir:"down"}},
 brush:{type:"marker",size:18},glit:{style:0,amount:3,mode:"fill",size:34},erase:{size:30},
 recent:[],styleIdx:0,sound:true,name:"",last:null,ctab:"colors"};
const BASE=["#ffffff","#f6e7c8","#efc39b","#c68642","#8a5a3a","#5a3a2a","#2b2218","#9aa5b1","#f9c74f","#f0c040","#d9a441","#f08a24","#e8745a","#d1495b","#a52a3a","#7a1f2b","#f2a7be","#e88aa6","#c94f7c","#b28dd6","#7a5aa6","#4d96ff","#2a6f97","#1e5e94","#8ccbea","#4ecdc4","#7fd1ae","#2f8f5b","#58a64a","#a8cf45","#1f7a5c","#14301f","#ffd8a8","#cfe9fa","#fbd7c0","#ffe9a8","#dfe7a8","#bde8b0","#c9b8f0","#0e1a3a"];
const STYLES=[
 {n:"Royal Gold",c:["#d9a441","#f0c040","#a52a3a","#7a1f2b","#f6e7c8","#2f8f5b","#1e5e94","#e8745a","#7a5aa6","#efc39b","#3b2a1e","#f2a7be"]},
 {n:"Jade & Rose",c:["#2f8f5b","#7fd1ae","#f2a7be","#e8745a","#f6e7c8","#d9a441","#1f7a5c","#b28dd6","#8ccbea","#efc39b","#5a3a2a","#c94f7c"]},
 {n:"Golden Hour",c:["#f9a03f","#f26b3a","#d1495b","#edae49","#fbd7c0","#9db9e6","#4f6d9e","#6a994e","#f6e7c8","#efc39b","#7a4e2d","#b56576"]},
 {n:"Midnight Naga",c:["#1e3a5f","#2f6690","#3a7ca5","#81c3d7","#2f8f5b","#d9a441","#f6e7c8","#7a5aa6","#c94f7c","#efc39b","#16324f","#a8dadc"]},
 {n:"Candy Pop",c:["#ff6b9d","#ffc93c","#4ecdc4","#9b5de5","#ff9f1c","#06d6a0","#4d96ff","#f15bb5","#fee440","#efc39b","#6d597a","#ffffff"]}];
const GRADS=[["#f9c74f","#c0392b"],["#cfe9fa","#1e5e94"],["#fff1f5","#e88aa6"],["#fff1b8","#b8862b"],["#c8f7d8","#14604a"],["#f9c74f","#4d96ff"],["#b28dd6","#c0392b"],["#ffd8a8","#7a1f2b"]];
const DIRS=[["down","↓"],["up","↑"],["right","→"],["left","←"],["diag","↘"]];
const GL=[{n:"Gold",c:["#ffd76a","#f5b83d","#fff1b8","#e8a33a"]},{n:"Silver",c:["#ffffff","#dde6f2","#b9c8dd","#f2f6fb"]},{n:"Rose",c:["#ffc1d6","#ff8fb3","#ffe3ec","#f06292"]},{n:"Aqua",c:["#bdf3ff","#7fe0f5","#e6fbff","#4fc3f7"]},{n:"Jade",c:["#c8f7d8","#6fe0a0","#effff5","#2fb384"]},{n:"Rainbow",c:["#ff6b9d","#ffc93c","#4ecdc4","#9b5de5","#4d96ff"]}];
const PATS_OLD=[
 {n:"Dots",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;for(const[x,y]of[[s/2,s/2],[0,0],[s,0],[0,s],[s,s]]){g.beginPath();g.arc(x,y,s*.2,0,6.283);g.fill()}}},
 {n:"Stripes",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;g.fillRect(0,0,s*.5,s)}},
 {n:"Checks",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;g.fillRect(0,0,s/2,s/2);g.fillRect(s/2,s/2,s/2,s/2)}},
 {n:"Diamonds",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;g.beginPath();g.moveTo(s/2,s*.08);g.lineTo(s*.92,s/2);g.lineTo(s/2,s*.92);g.lineTo(s*.08,s/2);g.closePath();g.fill()}},
 {n:"Scales",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.lineWidth=s*.09;for(const[x,y]of[[s/2,0],[0,s/2],[s,s/2],[s/2,s]]){g.beginPath();g.arc(x,y+s/2,s/2,Math.PI,0);g.stroke()}}},
 {n:"Waves",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.lineWidth=s*.1;for(const y of[s*.25,s*.75]){g.beginPath();g.moveTo(0,y);g.quadraticCurveTo(s*.25,y-s*.2,s*.5,y);g.quadraticCurveTo(s*.75,y+s*.2,s,y);g.stroke()}}},
 {n:"Stars",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;g.beginPath();for(let i=0;i<10;i++){const r=i%2?s*.1:s*.28,an=-1.5708+i*.6283;g.lineTo(s/2+Math.cos(an)*r,s/2+Math.sin(an)*r)}g.closePath();g.fill()}},
 {n:"Flowers",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;for(let i=0;i<5;i++){const an=i*1.2566;g.beginPath();g.arc(s/2+Math.cos(an)*s*.17,s/2+Math.sin(an)*s*.17,s*.12,0,6.283);g.fill()}g.fillStyle=b;g.beginPath();g.arc(s/2,s/2,s*.07,0,6.283);g.fill()}},
 {n:"Zigzag",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.lineWidth=s*.1;g.lineJoin="round";for(const y of[s*.3,s*.8]){g.beginPath();g.moveTo(0,y);g.lineTo(s*.25,y-s*.18);g.lineTo(s*.75,y+s*.18);g.lineTo(s,y);g.stroke()}}},
 {n:"Lattice",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.lineWidth=s*.08;g.beginPath();g.moveTo(0,0);g.lineTo(s,s);g.moveTo(s,0);g.lineTo(0,s);g.stroke()}},
 {n:"Hearts",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;g.beginPath();g.moveTo(s/2,s*.78);g.bezierCurveTo(s*.1,s*.5,s*.25,s*.15,s/2,s*.38);g.bezierCurveTo(s*.75,s*.15,s*.9,s*.5,s/2,s*.78);g.fill()}},
 {n:"Lotus",f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;for(const[dx,rot]of[[0,0],[-.18,-.5],[.18,.5]]){g.save();g.translate(s/2,s*.82);g.rotate(rot);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-s*.16,-s*.35,0,-s*.6);g.quadraticCurveTo(s*.16,-s*.35,0,0);g.fill();g.restore()}}}];
// ================= Khmer motif patterns (drawn as original vector tiles, inspired by traditional kbach) =================
const TAU2=6.2832;
function kPetal(g,L,Wd){g.beginPath();g.moveTo(0,0);g.bezierCurveTo(Wd*1.05,-L*.28,Wd*.85,-L*.78,0,-L);g.bezierCurveTo(-Wd*.85,-L*.78,-Wd*1.05,-L*.28,0,0);g.closePath();g.fill()}
function kFlame(g,L,Wd){g.beginPath();g.moveTo(0,0);g.bezierCurveTo(Wd*1.25,-L*.12,Wd*1.15,-L*.5,Wd*.3,-L*.7);g.bezierCurveTo(Wd*1.0,-L*.78,Wd*.7,-L*.98,-Wd*.05,-L);g.bezierCurveTo(-Wd*.3,-L*.78,-Wd*1.0,-L*.5,-Wd*.55,-L*.2);g.bezierCurveTo(-Wd*.35,-L*.08,-Wd*.2,-L*.03,0,0);g.closePath();g.fill()}
function kDisc(g,x,y,r,c){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,TAU2);g.fill()}
function kRosette(g,x,y,n,L,Wd,rot,cut,a,b){for(let i=0;i<n;i++){g.save();g.translate(x,y);g.rotate(rot+i*TAU2/n);g.fillStyle=a;kPetal(g,L,Wd);if(cut){g.fillStyle=b;g.save();g.translate(0,-L*.13);kPetal(g,L*.6,Wd*.46);g.restore()}g.restore()}}
function kCore(g,x,y,r,a,b){kDisc(g,x,y,r,a);kDisc(g,x,y,r*.6,b);kDisc(g,x,y,r*.3,a)}
const KH=[
 {n:"Lotus Rosette",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const R=(x,y,k,rot)=>{kRosette(g,x,y,8,s*.37*k,s*.1*k,rot,true,a,b);kCore(g,x,y,s*.085*k,a,b)};
  R(s/2,s/2,1,0);for(const[x,y]of[[0,0],[s,0],[0,s],[s,s]])R(x,y,.55,TAU2/16)}},
 {n:"Bead Rosette",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);const c=s/2;
  kRosette(g,c,c,8,s*.47,s*.085,TAU2/16,false,a,b);kDisc(g,c,c,s*.215,b);
  for(let i=0;i<12;i++){const an=i*TAU2/12;kDisc(g,c+Math.cos(an)*s*.165,c+Math.sin(an)*s*.165,s*.034,a)}
  kCore(g,c,c,s*.085,a,b);
  for(const[x,y]of[[0,0],[s,0],[0,s],[s,s]]){kRosette(g,x,y,4,s*.2,s*.06,TAU2/8,true,a,b);kDisc(g,x,y,s*.03,a)}}},
 {n:"Flame Pinwheel",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const P=(x,y,k,rot)=>{for(let i=0;i<4;i++){g.save();g.translate(x,y);g.rotate(rot+i*TAU2/4);g.fillStyle=a;kFlame(g,s*.38*k,s*.1*k);g.fillStyle=b;g.save();g.translate(s*.012*k,-s*.07*k);g.scale(.42,.5);kFlame(g,s*.38*k,s*.1*k);g.restore();g.restore()}kCore(g,x,y,s*.06*k,a,b)};
  P(s/2,s/2,1,0);for(const[x,y]of[[0,0],[s,0],[0,s],[s,s]])P(x,y,.6,TAU2/8)}},
 {n:"Star Flower",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const R=(x,y,k)=>{kRosette(g,x,y,6,s*.4*k,s*.12*k,0,true,a,b);kCore(g,x,y,s*.07*k,a,b)};
  R(s/2,s/2,1);for(const[x,y]of[[0,0],[s,0],[0,s],[s,s]])R(x,y,.55)}},
 {n:"Lotus Trellis",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  g.strokeStyle=a;g.lineWidth=s*.04;g.lineJoin="round";g.beginPath();g.moveTo(s/2,s*.05);g.lineTo(s*.95,s/2);g.lineTo(s/2,s*.95);g.lineTo(s*.05,s/2);g.closePath();g.stroke();
  g.lineWidth=s*.016;g.beginPath();g.moveTo(s/2,s*.14);g.lineTo(s*.86,s/2);g.lineTo(s/2,s*.86);g.lineTo(s*.14,s/2);g.closePath();g.stroke();
  g.save();g.translate(s/2,s*.66);for(const r of[-.62,.62]){g.save();g.rotate(r);g.fillStyle=a;kPetal(g,s*.3,s*.085);g.restore()}g.fillStyle=a;kPetal(g,s*.36,s*.1);g.fillStyle=b;g.save();g.translate(0,-s*.05);kPetal(g,s*.2,s*.04);g.restore();g.fillStyle=a;g.beginPath();g.ellipse(0,s*.01,s*.1,s*.03,0,0,TAU2);g.fill();g.restore();
  for(const[x,y]of[[0,0],[s,0],[0,s],[s,s]])kDisc(g,x,y,s*.05,a);kDisc(g,s/2,s*.2,s*.022,a);kDisc(g,s/2,s*.8,s*.022,a)}},
 {n:"Petal Scales",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const row=(xs,base,L,Wd)=>{for(const x of xs){g.save();g.translate(x,base);g.fillStyle=a;g.strokeStyle=b;g.lineWidth=s*.022;kPetal(g,L,Wd);g.stroke();g.fillStyle=b;g.save();g.translate(0,-L*.1);kPetal(g,L*.58,Wd*.44);g.restore();kDisc(g,0,-L*.3,s*.018,a);g.restore()}};
  row([s*.25,s*.75],s*.62,s*.62,s*.27);row([0,s*.5,s],s*1.12,s*.62,s*.27);row([s*.25,s*.75],s*1.62,s*.62,s*.27);row([0,s*.5,s],s*.12,s*.62,s*.27)}},
 {n:"Vine Stripe",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const vine=(cx,ph)=>{g.strokeStyle=a;g.lineWidth=s*.03;g.lineCap="round";g.beginPath();for(let i=0;i<=40;i++){const t=i/40,x=cx+s*.14*Math.sin(TAU2*t+ph),y=t*s;if(i)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke();
   for(const[t,side]of[[.12,1],[.37,-1],[.62,1],[.87,-1]]){const x=cx+s*.14*Math.sin(TAU2*t+ph),y=t*s;g.save();g.translate(x,y);g.rotate(side>0?1.05:-1.05);if(side<0)g.scale(-1,1);g.fillStyle=a;kFlame(g,s*.26,s*.075);g.fillStyle=b;g.save();g.translate(s*.008,-s*.04);g.scale(.4,.48);kFlame(g,s*.26,s*.075);g.restore();g.restore()}
   for(const t of[0,.5]){const x=cx+s*.14*Math.sin(TAU2*t+ph),y=t*s;kDisc(g,x,y,s*.035,a);kDisc(g,x,y,s*.016,b)}};
  vine(s*.25,0);vine(s*.75,Math.PI)}},
 {n:"Framed Rosette",sz:32,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  g.strokeStyle=a;g.lineWidth=s*.035;g.strokeRect(s*.06,s*.06,s*.88,s*.88);g.lineWidth=s*.014;g.strokeRect(s*.115,s*.115,s*.77,s*.77);
  for(const[x,y,r]of[[.06,.06,2.356],[.94,.06,-2.356],[.94,.94,-.785],[.06,.94,.785]]){g.save();g.translate(s*x,s*y);g.rotate(r);g.fillStyle=a;kFlame(g,s*.3,s*.075);g.restore();kDisc(g,s*x,s*y,s*.04,a)}
  kRosette(g,s/2,s/2,4,s*.27,s*.085,TAU2/8,true,a,b);kRosette(g,s/2,s/2,4,s*.2,s*.07,0,false,a,b);kCore(g,s/2,s/2,s*.07,a,b)}}
];

function holTile(n,rule){return(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;const c=s/n;for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(rule(x,y)){const x0=Math.round(x*c),y0=Math.round(y*c);g.fillRect(x0,y0,Math.round((x+1)*c)-x0,Math.round((y+1)*c)-y0)}}}
const HOL=[
 {n:"Hol Diamond",nn:13,sz:26,f:holTile(13,(x,y)=>{const d=Math.abs(x-6)+Math.abs(y-6);return d===6||d===3||d===0||(x%12===0&&y%12===0)})},
 {n:"Hol Dotted Diamond",nn:9,sz:18,f:holTile(9,(x,y)=>{const d=Math.abs(x-4)+Math.abs(y-4);return d<=1||(x%8===0&&y%8===0)})},
 {n:"Hol Chevron",nn:8,sz:16,f:holTile(8,(x,y)=>((y+Math.floor(Math.abs(x-3.5)))%4)===0)},
 {n:"Hol Net",nn:8,sz:16,f:holTile(8,(x,y)=>(x+y)%8===0||((x-y)%8+8)%8===0||(x%8===4&&y%8===0)||(x%8===0&&y%8===4))},
 {n:"Hol Flower",nn:11,sz:22,f:holTile(11,(x,y)=>{const dx=x-5,dy=y-5;return Math.abs(dx)+Math.abs(dy)<=1||((dx===0||dy===0)&&Math.abs(dx+dy)===3)||(Math.abs(dx)===2&&Math.abs(dy)===2)||(x%10===0&&y%10===0)})},
 {n:"Hol Hem Band",nn:8,sz:16,f:holTile(8,(x,y)=>(y<4&&Math.abs(x-3.5)<=y+.5)||y===6)}];
const ROOF={n:"Roof Tiles",sz:24,f:(g,s,a,b)=>{g.fillStyle=a;g.fillRect(0,0,s,s);g.strokeStyle=b;g.lineWidth=Math.max(1,s*.07);g.lineCap="round";g.beginPath();g.moveTo(0,s*.5);g.lineTo(s,s*.5);g.moveTo(0,0);g.lineTo(s,0);g.moveTo(0,s);g.lineTo(s,s);g.moveTo(0,0);g.lineTo(0,s*.5);g.moveTo(s,0);g.lineTo(s,s*.5);g.moveTo(s*.5,s*.5);g.lineTo(s*.5,s);g.stroke();g.beginPath();for(const[cx,cy]of[[s*.25,s*.25],[s*.75,s*.25],[s*.5,s*.75],[0,s*.75],[s,s*.75]]){g.moveTo(cx-s*.14,cy+s*.2);g.quadraticCurveTo(cx,cy+s*.06,cx+s*.14,cy+s*.2)}g.stroke()}};
function kSpiral(g,cx,cy,r0,dir,w,turns){turns=turns||1.4;const N=56;let px=null,py=null;g.lineCap="round";
 for(let i=0;i<=N;i++){const t=i/N,ang=dir*(t*turns*TAU2),r=r0*(1-.84*t),x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;
  if(i){g.lineWidth=w*(1-.62*t);g.beginPath();g.moveTo(px,py);g.lineTo(x,y);g.stroke()}px=x;py=y}
 g.beginPath();g.arc(px,py,w*.5,0,TAU2);g.fill()}
const BLD=[
 {n:"Kbach Scroll",g:"b",sz:64,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.fillStyle=a;g.lineCap="round";const w=s*.068;
  g.lineWidth=s*.04;g.beginPath();g.moveTo(s/2,0);g.lineTo(s/2,s);g.stroke();
  for(const[y,k]of[[.5,1],[0,.7],[1,.7]]){g.save();g.translate(s/2,s*y);for(const r of[-.75,.75]){g.save();g.rotate(r);g.fillStyle=a;kPetal(g,s*.19*k,s*.058*k);g.restore()}g.fillStyle=a;kPetal(g,s*.26*k,s*.075*k);g.fillStyle=b;g.save();g.translate(0,-s*.045*k);kPetal(g,s*.13*k,s*.026*k);g.restore();g.fillStyle=a;g.beginPath();g.ellipse(0,s*.006,s*.08*k,s*.024*k,0,0,TAU2);g.fill();g.restore()}
  for(const[x,y,sx,sy]of[[.26,.26,1,1],[.74,.26,-1,1],[.26,.74,1,-1],[.74,.74,-1,-1]]){g.save();g.translate(s*x,s*y);g.scale(sx,sy);g.strokeStyle=a;g.fillStyle=a;kSpiral(g,0,0,s*.14,1,w);g.save();g.translate(s*.13,-s*.02);g.rotate(-.55);kFlame(g,s*.17,s*.046);g.restore();
   g.save();g.rotate(-2.2);kFlame(g,s*.24,s*.066);g.restore();g.save();g.translate(s*.02,s*.15);g.rotate(2.35);kFlame(g,s*.22,s*.06);g.restore();g.save();g.translate(-s*.1,s*.02);g.rotate(-1.2);kFlame(g,s*.16,s*.045);g.restore();g.restore()}}},
 {n:"Running Scroll",g:"b",sz:48,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.fillStyle=a;g.lineCap="round";const w=s*.05;
  g.lineWidth=s*.045;g.beginPath();for(let i=0;i<=60;i++){const t=i/60,x=t*s,y=s/2+Math.sin(t*TAU2)*s*.2;if(i)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke();
  for(const[x,up]of[[.25,-1],[.75,1]]){g.save();g.translate(s*x,s/2+up*s*.2);g.scale(1,up<0?-1:1);kSpiral(g,0,-s*.13,s*.115,up<0?1:-1,w);g.restore()}
  for(const[x,sg]of[[.5,1],[0,1],[1,1]]){g.save();g.translate(s*x,s/2);g.rotate(-.5);kFlame(g,s*.2,s*.05);g.restore();g.save();g.translate(s*x,s/2);g.rotate(Math.PI+.5);kFlame(g,s*.2,s*.05);g.restore()}}},
 {n:"Lotus Fascia",g:"b",sz:40,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);
  const row=(xs,base,L,Wd)=>{for(const x of xs){g.save();g.translate(x,base);g.fillStyle=a;g.strokeStyle=b;g.lineWidth=s*.02;kPetal(g,L,Wd);g.stroke();g.fillStyle=b;g.save();g.translate(0,-L*.1);kPetal(g,L*.55,Wd*.42);g.restore();kDisc(g,0,-L*.32,s*.022,a);g.restore()}};
  row([s*.25,s*.75],s*.56,s*.56,s*.24);row([0,s*.5,s],s*1.06,s*.56,s*.24);
  for(const x of[0,s*.5,s])kDisc(g,x,s*.56,s*.035,a);for(const x of[s*.25,s*.75])kDisc(g,x,s*.06,s*.035,a)}},
 {n:"Flame Edge",g:"b",sz:36,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.fillStyle=a;
  g.fillRect(0,s*.78,s,s*.07);for(const x of[s*.25,s*.75]){g.save();g.translate(x,s*.78);kFlame(g,s*.7,s*.2);g.fillStyle=b;g.save();g.translate(s*.01,-s*.1);g.scale(.42,.5);kFlame(g,s*.7,s*.2);g.restore();g.restore();g.fillStyle=a}kDisc(g,s*.5,s*.9,s*.03,a);kDisc(g,0,s*.9,s*.03,a);kDisc(g,s,s*.9,s*.03,a)}},
 {n:"Lattice Window",g:"b",sz:40,f:(g,s,a,b)=>{g.fillStyle=b;g.fillRect(0,0,s,s);g.strokeStyle=a;g.lineWidth=s*.11;g.lineCap="butt";g.beginPath();g.moveTo(0,0);g.lineTo(s,s);g.moveTo(s,0);g.lineTo(0,s);g.moveTo(s/2,-s*.05);g.lineTo(s*1.05,s/2);g.moveTo(-s*.05,s/2);g.lineTo(s/2,s*1.05);g.moveTo(s/2,-s*.05);g.lineTo(-s*.05,s/2);g.moveTo(s*1.05,s/2);g.lineTo(s/2,s*1.05);g.stroke();kDisc(g,s/2,s/2,s*.085,a);kDisc(g,s/2,s/2,s*.04,b);kDisc(g,0,0,s*.085,a);kDisc(g,s,0,s*.085,a);kDisc(g,0,s,s*.085,a);kDisc(g,s,s,s*.085,a)}}
];
const flipY=fn=>(g,s,a,b)=>{g.save();g.translate(0,s);g.scale(1,-1);fn(g,s,a,b);g.restore()},cl=a=>a.map(x=>({...x,g:"c"})),sc0=PATS_OLD.find(p=>p.n==="Scales");
const PATS=[...cl(KH),...cl(HOL),{...sc0,g:"c",n:"Naga Scales"},...BLD.map(x=>x.n==="Lotus Fascia"?{...x,f:flipY(x.f)}:x),{...ROOF,g:"b",f:flipY(ROOF.f)},{...KH[0],g:"b",sz:56,n:"Grand Rosette"},{...KH[7],g:"b",sz:60,n:"Framed Panel"},{...KH[5],g:"b",sz:44,n:"Petal Roof",f:flipY(KH[5].f)},{...sc0,g:"b",sz:30,n:"Naga Scales"}];
const PALACE=[
 {n:"Royal palace (gold + red)",p:[["Roof","grad","#c0583a","#7a1e24",1],["Gable","Kbach Scroll","#e0b24a","#7a1e24"],["Eaves","Lotus Fascia","#e0b24a","#7a1e24"],["Trim","","#e0b24a"],["Walls","","#f1e4c0"],["Door","Lattice Window","#e0b24a","#4a1418"]]},
 {n:"Golden palace (all gold)",p:[["Roof","grad","#f0cf6a","#9a6b16",1],["Gable","Kbach Scroll","#f3d77f","#6e430a"],["Eaves","Lotus Fascia","#f3d77f","#6e430a"],["Trim","","#f0d47a"],["Walls","","#f3dca0"],["Door","Lattice Window","#f3d77f","#6e430a"]]}];
function usePart(pt){const[lab,pn,ca,cb,drag]=pt,f=S.fill;
 if(pn==="grad"){f.type="grad";f.grad={a:ca,b:cb,dir:"down"}}else if(pn){f.type="pattern";f.pat=PATS.findIndex(p=>p.n===pn&&p.g==="b");f.color=ca;f.colorB=cb;f.ps=1}else{f.type="solid";f.color=ca}
 noteColor(ca);S.fillArea=!!drag;dbPut("m","fillArea",S.fillArea);S.tool="fill";syncTools();syncWell();closeSheet();
 toast(drag?lab+": slide your finger over the roof tiles.":lab+": tap that part.",3200)}
function palaceBlock(){const si=S.pset||0;return h("div",null,h("h3",null,"Palace sets"),
 h("div",{class:"row"},...PALACE.map((st,i)=>h("button",{class:"btn sm"+(si===i?" pri":""),onclick:()=>{S.pset=i;colorsSheet("pattern")}},st.n))),
 h("div",{class:"row",style:"margin-top:8px"},...PALACE[si].p.map(pt=>h("button",{class:"btn sm",onclick:()=>usePart(pt)},h("span",{style:`display:inline-block;width:15px;height:15px;border-radius:50%;background:${pt[3]||pt[2]};border:3px solid ${pt[2]};margin-right:7px;vertical-align:-3px`}),pt[0]))),
 h("p",{style:"margin:6px 0 0;color:var(--mut);font-size:13px"},"Tap a part, then tap that part of the building. Roof turns on Drag to fill many."))}
const BCOL=[["Gold on red","#e0b24a","#7a1e24"],["Gold on green","#e0b24a","#1f5f4a"],["Gold on blue","#e0b24a","#1f3f7a"],["Stone","#7d8186","#d9d8d2"],["Cream on terracotta","#fff6e0","#a8452a"]];
function tileOf(i,a,b,s){const c=mk(s,s);PATS[i].f(c.getContext("2d"),s,a,b);return c}
// ================= ui helpers =================
let toastT=0;
function toast(m,ms=2600){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toastT);toastT=setTimeout(()=>t.style.display="none",ms)}
function busy(on,txt,pct){const b=$("#busy");b.classList.toggle("hid",!on);if(txt)$("#busyT").textContent=txt;if(pct!=null)$("#busyB").style.width=pct+"%"}
function openSheet(title,...kids){const sh=$("#sheet"),p=$(".panel",sh);p.innerHTML="";p.append(h("div",{class:"grab"}),h("h1",null,title),...kids.filter(Boolean));sh.classList.remove("hid");p.scrollTop=0}
function closeSheet(){$("#sheet").classList.add("hid")}
$(".scrim").onclick=closeSheet;
function screen(id){["home","story","editor"].forEach(s=>$("#"+s).classList.toggle("hid",s!==id))}
function sw(c,on,f){return h("button",{class:"sw"+(on?" on":""),style:"background:"+c,onclick:f})}
function slider(min,max,v,f){const i=h("input",{type:"range",min,max,value:v});i.oninput=()=>f(+i.value);return i}
// ================= book / home / story =================
async function loadBook(){if(window.BOOK){S.book=window.BOOK;return}const r=await fetch("book/manifest.json",{cache:"no-cache"});S.book=await r.json()}
const keyOf=(st,pg)=>st.id+"/"+pg.id;
const isDone=s=>!!(s&&(s.md||s.cov>=.5));
async function loadSums(st){const m=await dbRange("s",st.id+"/");Object.assign(S.sum,m);return m}
function storyProgress(st){const all=[...st.pages];let d=0;all.forEach(p=>{if(isDone(S.sum[keyOf(st,p)]))d++});return{d,n:all.length}}
async function renderHome(){
 screen("home");const box=$("#stories");box.innerHTML="";
 for(const st of S.book.stories){await loadSums(st);const pr=storyProgress(st);
  box.append(h("button",{class:"card story",onclick:()=>openStory(st)},
   h("div",{class:"cv"},st.cover?h("img",{src:st.cover,alt:""}):"🪷"),
   h("div",{class:"in"},h("b",null,st.title),h("small",null,st.titleKh||""),h("div",{class:"prog"},h("i",{style:`width:${100*pr.d/pr.n}%`})),h("small",null,`${pr.d} / ${pr.n} pages colored`),h("div",{class:"chip"+(pr.d===pr.n?" go":"")},pr.d===pr.n?"🎬 Story clip ready!":`🎬 Story clip ${pr.d}/${pr.n}`))))}
 [["🐘","The Elephant & the Moon"],["🐉","The Dragon of the Lake"],["🌾","The Rice Spirit"]].forEach(([e,t])=>box.append(h("div",{class:"card story soon"},h("div",{class:"cv"},e),h("div",{class:"in"},h("b",null,t),h("small",null,"Coming soon")))));
 const c=$("#cont");c.innerHTML="";const L=S.last;
 if(S.storageOk===false)c.append(h("div",{class:"card",style:"padding:12px;margin-top:14px;border-color:var(--acc2)"},h("b",null,"Saving is limited in this window"),h("div",{style:"color:var(--mut);font-size:14px;margin-top:4px"},"Your colors stay while this window is open, but they may be lost when you close it. Open the app from its own link (for example your GitHub page) and add it to your Home Screen to keep your work. You can always use ⋯ → Save image.")));
 if(L){const st=S.book.stories.find(s=>s.id===L.story);if(st){const list=st[L.kind||"pages"],pg=list[L.idx];if(pg){const sm=S.sum[keyOf(st,pg)];
  c.append(h("button",{class:"card cont",onclick:()=>openEditor(st,L.kind||"pages",L.idx),style:"width:100%;text-align:left"},
   h("img",{src:(sm&&sm.th)||pg.th,alt:""}),h("div",{style:"flex:1;min-width:0"},h("small",{style:"color:var(--mut)"},"Continue where you left off"),h("b",{style:"display:block;font-size:18px"},pg.title),h("small",{style:"color:var(--mut)"},st.title)),h("span",{class:"btn pri sm"},"Continue")))}}}
}
async function openStory(st,kind){
 S.story=st;S.kind=kind||S.kind||"pages";screen("story");$("#sTitle").innerHTML="";$("#sTitle").append(st.title,h("small",null,st.titleKh||""));
 await loadSums(st);renderStory()}
function renderStory(){
 const st=S.story,pr=storyProgress(st),hero=$("#sHero");hero.innerHTML="";
 const allDone=pr.d===pr.n,left=pr.n-pr.d;
 hero.append(h("div",{class:"card",style:"padding:14px;margin-top:6px"},
  h("div",{style:"display:flex;justify-content:space-between;align-items:baseline"},h("b",null,"Your story"),h("small",{style:"color:var(--mut)"},`${pr.d} / ${pr.n} pages colored`)),
  h("div",{class:"prog"},h("i",{style:`width:${100*pr.d/pr.n}%`})),
  h("button",{class:"btn pri",style:"width:100%;margin-top:12px",onclick:continueStory},"Continue coloring"),
  h("button",{class:"clipbtn"+(allDone?" go":""),onclick:()=>{if(allDone||S.dev)makeStoryClip(st);else toast(`Color ${left} more page${left>1?"s":""} to unlock your story clip (about half a page counts), or tap Preview now.`)}},h("span",{class:"big"},allDone?"🎬 Make my story clip":"🔒 Story clip"),h("small",null,allDone?"Your whole story as a video, with captions and music":`${left} more page${left>1?"s":""} to unlock`)),
  h("div",{class:"row",style:"margin-top:10px"},allDone?null:h("button",{class:"btn sm",onclick:()=>makeStoryClip(st)},"▶ Preview now"),h("button",{class:"btn sm",onclick:storyMenu},"Save / print")),(hasAbout(st)||hasVisit(st)||allDone)?h("div",{class:"row",style:"margin-top:8px"},hasAbout(st)?h("button",{class:"btn sm",onclick:()=>aboutSheet(st)},"ℹ️ About & sources"):null,hasVisit(st)?h("button",{class:"btn sm",onclick:()=>visitSheet(st)},"📍 Where to see it"):null,allDone?h("button",{class:"btn sm",onclick:()=>afterStory(st)},"🏁 The end"):null):null));
 $$("#story .tabs button").forEach(b=>b.classList.toggle("on",b.dataset.k===S.kind));
 const g=$("#sGrid");g.innerHTML="";st[S.kind].forEach((pg,i)=>{const sm=S.sum[keyOf(st,pg)];
  g.append(h("button",{class:"pg",onclick:()=>openEditor(st,S.kind,i)},
   h("img",{class:"im",loading:"lazy",src:(sm&&sm.th)||pg.th,alt:""}),isDone(sm)?h("div",{class:"ok"},"✓"):null,sm&&sm.vd?h("div",{class:"vd"},"🎞"):null,
   h("div",{class:"nm"},pg.title,h("small",null,sm?Math.round(sm.cov*100)+"% colored":"Not started"))))})}
function continueStory(){const st=S.story,L=S.last;if(L&&L.story===st.id){openEditor(st,L.kind||"pages",L.idx);return}
 let i=st.pages.findIndex(p=>!isDone(S.sum[keyOf(st,p)]));if(i<0)i=0;openEditor(st,"pages",i)}
$$("#story .tabs button").forEach(b=>b.onclick=()=>{S.kind=b.dataset.k;renderStory()});
function storyMenu(){const st=S.story,mi=(i,t,s,f)=>h("button",{class:"mi",onclick:()=>{closeSheet();f()}},h("span",null,i),h("div",null,t,s?h("small",null,s):null));
 const pp=S.paper||"A4",k=[h("h3",null,"Print at home"),h("div",{class:"row"},...["A4","Letter"].map(p=>h("button",{class:"btn sm"+(pp===p?" pri":""),onclick:()=>{S.paper=p;dbPut("m","paper",p);storyMenu()}},PAPERS[p].name))),h("p",{style:"margin:6px 0 8px;color:var(--mut);font-size:13px"},"Print quality, 300 dpi. Everything stays inside a safe margin, so any home printer can print it."),
  mi("📖","Coloring book to print","Blank pages with the story text",()=>exportBook(st,false)),mi("🎨","My colored book","All your pages as a book",()=>exportBook(st,true)),mi("🏷️","Sticker sheets","Print on sticker paper and cut them out",()=>exportStickers(st))];
 if(hasAbout(st)||hasVisit(st))k.push(h("h3",null,"The story"),hasAbout(st)?mi("ℹ️","About & sources",null,()=>aboutSheet(st)):null,hasVisit(st)?mi("📍","Where to see it",null,()=>visitSheet(st)):null);
 if(S.dev)k.push(h("h3",null,"Test tools"),mi("✓","Mark every page done",null,async()=>{for(const p of st.pages){const key=keyOf(st,p),s=S.sum[key]||{cov:0,th:""};s.md=true;S.sum[key]=s;await dbPut("s",key,s)}renderStory();toast("All pages marked done")}),mi("🎲","Demo colors on every page","Fills pages with sample colors for testing",()=>demoStory(st)));
 openSheet("Story",...k)}
$("#sBack").onclick=()=>renderHome();$("#sBack").innerHTML=icon("back");$("#sMenu").innerHTML=icon("menu");$("#sMenu").onclick=storyMenu;
let tapN=0,tapT=0;$("#brand").onclick=()=>{clearTimeout(tapT);tapN++;tapT=setTimeout(()=>tapN=0,1500);if(tapN>=5){tapN=0;S.dev=!S.dev;dbPut("m","dev",S.dev);toast(S.dev?"Test tools on":"Test tools off")}};
// ================= editor core =================
const cv=$("#cv"),gc=$("#gc"),fxc=$("#fx"),ghc=$("#gh"),wrap=$("#wrap"),stage=$("#stage"),hit=$("#hit"),ln=$("#ln"),selb=$("#sel");
const WRF={willReadFrequently:true};let cx=cv.getContext("2d",WRF),gx=gc.getContext("2d",WRF),W=0,H=0,bar=null;const pcv=mk(1,1),pgc=mk(1,1);let pcx=pcv.getContext("2d",WRF),pgx=pgc.getContext("2d",WRF);
const U={s:[],r:[]};
function star(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r*.3,y-r*.3);g.lineTo(x+r,y);g.lineTo(x+r*.3,y+r*.3);g.lineTo(x,y+r);g.lineTo(x-r*.3,y+r*.3);g.lineTo(x-r,y);g.lineTo(x-r*.3,y-r*.3);g.closePath();g.fill()}
function spark(g,x,y,r,col){if(Math.random()<.32){g.fillStyle=col;g.beginPath();g.arc(x,y,r*.55,0,6.283);g.fill()}else star(g,x,y,r,col)}
async function openEditor(st,kind,idx){
 busy(true,"Opening page…");
 try{
  if(S.page)await saveNow();
  const pg=st[kind][idx],img=await loadImg(pg.src);
  S.story=st;S.kind=kind;S.idx=idx;S.page=pg;S.key=keyOf(st,pg);S.img=img;W=img.naturalWidth;H=img.naturalHeight;
  for(const c of[cv,gc,ghc,pcv,pgc]){c.width=W;c.height=H}
  cx=cv.getContext("2d",{willReadFrequently:true});gx=gc.getContext("2d",{willReadFrequently:true});pcx=pcv.getContext("2d",{willReadFrequently:true});pgx=pgc.getContext("2d",{willReadFrequently:true});
  cx.fillStyle="#fff";cx.fillRect(0,0,W,H);gx.clearRect(0,0,W,H);
  try{const raw=RAW[S.key];if(raw){cx.putImageData(raw.c,0,0);gx.putImageData(raw.g,0,0)}else{const rec=await readLayers(S.key);if(rec){if(rec.c)cx.drawImage(await decodeBlob(rec.c),0,0);if(rec.g)gx.drawImage(await decodeBlob(rec.g),0,0)}}}catch(e){console.error(e)}
  bar=barOf(img);
  ln.src=crispLines(img);setCap(pg,kind);S.lab=null;U.s=[];U.r=[];S.dirty=false;S.zoom=1;S.mode="";cpEnd();stopPreview();
  S.last={story:st.id,kind,idx};dbPut("m","last",S.last);
  screen("editor");const T=$("#eTitle");T.innerHTML="";$("#ePgN").textContent=`${idx+1}/${st[kind].length}`;T.append(pg.title,h("small",{class:"pnav"},h("button",{class:"pn","aria-label":"Previous page",onclick:()=>gotoPage(-1)},"‹"),h("span",null,`${idx+1}/${st[kind].length} `),h("span",{id:"sv"},S.sum[S.key]?"✓":""),h("button",{class:"pn","aria-label":"Next page",onclick:()=>gotoPage(1)},"›")));
  fit();syncUndo();syncWell();syncTools();stage.scrollLeft=0;stage.scrollTop=0;
 }catch(e){console.error(e);toast("Could not open this page")}
 busy(false)}
async function leaveEditor(){await saveNow();await loadSums(S.story);S.page=null;S.mode="";cpEnd();stopPreview();openStory(S.story,S.kind)}
function fit(){const cc=$("#capcard");document.documentElement.style.setProperty("--capH",cc&&cc.offsetHeight?cc.offsetHeight+8+"px":"0px");if(!W)return;const aw=stage.clientWidth-16,ah=stage.clientHeight-16;if(aw<40||ah<40)return;const w=Math.round(Math.min(aw,ah*W/H)*S.zoom);wrap.style.width=w+"px";wrap.style.height=Math.round(w*H/W)+"px"}
new ResizeObserver(fit).observe(stage);addEventListener("orientationchange",()=>setTimeout(fit,250));
function setZoom(z,cxp,cyp){z=clamp(z,1,5);const r=wrap.getBoundingClientRect(),u=(cxp-r.left)/r.width,v=(cyp-r.top)/r.height;S.zoom=z;fit();const r2=wrap.getBoundingClientRect();stage.scrollLeft+=r2.left+u*r2.width-cxp;stage.scrollTop+=r2.top+v*r2.height-cyp}
const pt=e=>{const r=wrap.getBoundingClientRect();return{x:clamp(Math.round((e.clientX-r.left)*W/r.width),0,W-1),y:clamp(Math.round((e.clientY-r.top)*H/r.height),0,H-1)}};
// ---- regions ----
function regionAt(x,y){
 let q=y*W+x;if(bar[q]){let f=-1;for(let d=1;d<=7&&f<0;d++)for(let dy=-d;dy<=d&&f<0;dy++)for(let dx=-d;dx<=d;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&!bar[yy*W+xx]){f=yy*W+xx;break}}if(f<0)return null;q=f}
 const m=new Uint8Array(W*H);if(!S._stk||S._stk.length!==W*H)S._stk=new Int32Array(W*H);const s=S._stk;let sp=0,x0=W,x1=0,y0=H,y1=0,n=0;s[sp++]=q;m[q]=1;
 while(sp){const p=s[--sp],py=(p/W)|0,px=p-py*W;n++;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;
  if(px>0&&!m[p-1]&&!bar[p-1]){m[p-1]=1;s[sp++]=p-1}if(px<W-1&&!m[p+1]&&!bar[p+1]){m[p+1]=1;s[sp++]=p+1}if(py>0&&!m[p-W]&&!bar[p-W]){m[p-W]=1;s[sp++]=p-W}if(py<H-1&&!m[p+W]&&!bar[p+W]){m[p+W]=1;s[sp++]=p+W}}
 for(let pass=0;pass<2;pass++){const add=[];for(let y=Math.max(0,y0-1);y<=Math.min(H-1,y1+1);y++)for(let x=Math.max(0,x0-1);x<=Math.min(W-1,x1+1);x++){const p=y*W+x;if(!m[p]&&bar[p]&&((x>0&&m[p-1])||(x<W-1&&m[p+1])||(y>0&&m[p-W])||(y<H-1&&m[p+W])))add.push(p)}add.forEach(p=>m[p]=1)}
 return{m,q,x0:Math.max(0,x0-2),y0:Math.max(0,y0-2),x1:Math.min(W-1,x1+2),y1:Math.min(H-1,y1+2),n}}
function labelFrom(bar,W,H){const lab=new Int32Array(W*H),s=new Int32Array(W*H),sz=[0];let id=0;
 for(let s0=0;s0<W*H;s0++){if(bar[s0]||lab[s0])continue;id++;let sp=0,n=0;s[sp++]=s0;lab[s0]=id;while(sp){const p=s[--sp],py=(p/W)|0,px=p-py*W;n++;
  if(px>0&&!bar[p-1]&&!lab[p-1]){lab[p-1]=id;s[sp++]=p-1}if(px<W-1&&!bar[p+1]&&!lab[p+1]){lab[p+1]=id;s[sp++]=p+1}if(py>0&&!bar[p-W]&&!lab[p-W]){lab[p-W]=id;s[sp++]=p-W}if(py<H-1&&!bar[p+W]&&!lab[p+W]){lab[p+W]=id;s[sp++]=p+W}}sz.push(n)}
 return{lab,sz,n:id}}
function barOf(img){const w=img.naturalWidth,hh=img.naturalHeight,t=mk(w,hh),tx=t.getContext("2d",{willReadFrequently:true});tx.drawImage(img,0,0);const d=tx.getImageData(0,0,w,hh).data,b=new Uint8Array(w*hh);for(let i=0;i<w*hh;i++)b[i]=d[i*4]<170?1:0;return b}
function labelAll(){if(S.lab&&S.labKey===S.key)return S.lab;S.labKey=S.key;return S.lab=labelFrom(bar,W,H)}
// ---- painting ----
const gdir=(d,w,hh)=>d==="up"?[0,hh,0,0]:d==="right"?[0,0,w,0]:d==="left"?[w,0,0,0]:d==="diag"?[0,0,w,hh]:[0,0,0,hh];
function paintRegion(r){const bw=r.x1-r.x0+1,bh=r.y1-r.y0+1,t=mk(bw,bh),tx=t.getContext("2d",{willReadFrequently:true}),f=S.fill;
 if(f.type==="solid"){tx.fillStyle=f.color;tx.fillRect(0,0,bw,bh)}
 else if(f.type==="pattern"){const pp=PATS[f.pat];let ts=Math.max(10,Math.round((pp.sz||34)*(f.ps||1)*W/900));if(pp.nn)ts=pp.nn*Math.max(1,Math.round(ts/pp.nn));const tile=tileOf(f.pat,f.color,f.colorB,ts);tx.translate(-r.x0,-r.y0);tx.fillStyle=tx.createPattern(tile,"repeat");tx.fillRect(r.x0,r.y0,bw,bh);tx.setTransform(1,0,0,1,0,0)}
 else{const g=f.grad,d=gdir(g.dir,bw,bh),gr=tx.createLinearGradient(d[0],d[1],d[2],d[3]);gr.addColorStop(0,g.a);gr.addColorStop(1,g.b);tx.fillStyle=gr;tx.fillRect(0,0,bw,bh)}
 const id=tx.getImageData(0,0,bw,bh),d=id.data;for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(!r.m[(y+r.y0)*W+x+r.x0])d[(y*bw+x)*4+3]=0;
 tx.putImageData(id,0,0);cx.drawImage(t,r.x0,r.y0)}
function glitterRegion(r){const gl=GL[S.glit.style],n=Math.min(9000,Math.round(r.n*[0,.004,.008,.014,.022,.035][S.glit.amount])),k=W/900;let placed=0,tries=0;
 while(placed<n&&tries<n*8+50){tries++;const x=r.x0+((Math.random()*(r.x1-r.x0+1))|0),y=r.y0+((Math.random()*(r.y1-r.y0+1))|0);if(!r.m[y*W+x])continue;spark(gx,x,y,rr(1.6,5.4)*k,gl.c[(Math.random()*gl.c.length)|0]);placed++}}
const brushColor=()=>S.fill.type==="grad"?S.fill.grad.a:S.fill.color;
function stamp(x,y,sz,t){
 if(t==="erase"){cx.fillStyle="#fff";cx.beginPath();cx.arc(x,y,sz/2,0,6.283);cx.fill();gx.globalCompositeOperation="destination-out";gx.beginPath();gx.arc(x,y,sz/2,0,6.283);gx.fill();gx.globalCompositeOperation="source-over";return}
 if(t==="sparkle"){const gl=GL[S.glit.style],n=1+S.glit.amount;for(let i=0;i<n;i++){const a=rr(0,6.283),d=Math.sqrt(Math.random())*sz/2;spark(gx,x+Math.cos(a)*d,y+Math.sin(a)*d,rr(1.5,5)*W/900,gl.c[(Math.random()*gl.c.length)|0])}return}
 const col=brushColor();
 if(t==="marker"){cx.fillStyle=col;cx.beginPath();cx.arc(x,y,sz/2,0,6.283);cx.fill()}
 else if(t==="soft"){const g=cx.createRadialGradient(x,y,0,x,y,sz/2),c=rgb(col);g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},.55)`);g.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);cx.fillStyle=g;cx.fillRect(x-sz/2,y-sz/2,sz,sz)}
 else if(t==="pencil"){cx.fillStyle=col;cx.globalAlpha=.55;for(let i=0;i<7;i++){const a=rr(0,6.283),d=Math.sqrt(Math.random())*sz/2;cx.beginPath();cx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(.7,sz*.07),0,6.283);cx.fill()}cx.globalAlpha=1}
 else if(t==="water"){cx.fillStyle=col;cx.globalAlpha=.07;cx.beginPath();cx.arc(x+rr(-sz*.1,sz*.1),y+rr(-sz*.1,sz*.1),sz*.62,0,6.283);cx.fill();cx.globalAlpha=1}
 else if(t==="spray"){cx.fillStyle=col;for(let i=0;i<14;i++){const a=rr(0,6.283),d=Math.sqrt(Math.random())*sz/2;cx.beginPath();cx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(.8,sz*.04),0,6.283);cx.fill()}}}
let stroke=null;
function strokeType(){return S.tool==="erase"?"erase":S.tool==="sparkle"?"sparkle":S.brush.type}
function strokeSize(){return(S.tool==="erase"?S.erase.size:S.tool==="sparkle"?S.glit.size:S.brush.size)*W/900}
function strokeStart(p){beginAction();stroke={last:p,bb:{x0:p.x,y0:p.y,x1:p.x,y1:p.y},acc:0};strokeSeg(p,p)}
function strokeSeg(a,b){const t=strokeType(),sz=strokeSize(),d=Math.hypot(b.x-a.x,b.y-a.y),step=Math.max(1,sz*(t==="sparkle"?.6:.2)),n=Math.max(1,Math.ceil(d/step));for(let i=1;i<=n;i++){const u=i/n;stamp(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,sz,t)}
 const bb=stroke.bb,m=sz/2+8;bb.x0=Math.min(bb.x0,a.x,b.x)-m;bb.y0=Math.min(bb.y0,a.y,b.y)-m;bb.x1=Math.max(bb.x1,a.x,b.x)+m;bb.y1=Math.max(bb.y1,a.y,b.y)+m}
function strokeMove(p){if(!stroke)return;strokeSeg(stroke.last,p);stroke.last=p}
function strokeEnd(){if(!stroke)return;endAction(stroke.bb);stroke=null}
// ---- undo / redo ----
function beginAction(){pcx.drawImage(cv,0,0);pgx.clearRect(0,0,W,H);pgx.drawImage(gc,0,0)}
function clampBB(b){const x0=clamp(Math.floor(b.x0),0,W-1),y0=clamp(Math.floor(b.y0),0,H-1),x1=clamp(Math.ceil(b.x1),0,W-1),y1=clamp(Math.ceil(b.y1),0,H-1);return{x0,y0,w:Math.max(1,x1-x0+1),h:Math.max(1,y1-y0+1)}}
function endAction(bb){const b=clampBB(bb);U.s.push({b,c:pcx.getImageData(b.x0,b.y0,b.w,b.h),g:pgx.getImageData(b.x0,b.y0,b.w,b.h)});if(U.s.length>14)U.s.shift();U.r=[];syncUndo();touch()}
function swapAct(from,to){const a=from.pop();if(!a)return;const b=a.b;to.push({b,c:cx.getImageData(b.x0,b.y0,b.w,b.h),g:gx.getImageData(b.x0,b.y0,b.w,b.h)});cx.putImageData(a.c,b.x0,b.y0);gx.putImageData(a.g,b.x0,b.y0);syncUndo();touch()}
const undo=()=>swapAct(U.s,U.r),redo=()=>swapAct(U.r,U.s);
function syncUndo(){$("#eUndo").classList.toggle("off",!U.s.length);$("#eRedo").classList.toggle("off",!U.r.length)}
// ---- autosave ----
const CACHE={};let saveT=0,saving=Promise.resolve();
function badge(t){const e=$("#sv");if(e)e.textContent=t}
function touch(){S.dirty=true;badge("…");clearTimeout(saveT);saveT=setTimeout(saveNow,500)}
function coverage(){const d=cx.getImageData(0,0,W,H).data;let n=0,f=0;for(let i=0;i<bar.length;i++){if(!bar[i]){f++;const j=i*4;if(d[j]<246||d[j+1]<246||d[j+2]<246)n++}}return f?n/f:0}
function thumb(){const tw=150,th=Math.round(tw*H/W),a=shrink(cv,tw,th),x=a.getContext("2d");x.globalCompositeOperation="multiply";x.drawImage(shrink(S.img,tw,th),0,0);x.globalCompositeOperation="source-over";x.drawImage(shrink(gc,tw,th),0,0);return a.toDataURL("image/jpeg",.72)}
const dataBlob=u=>{const p=u.split(","),bin=atob(p[1]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:"image/png"})};
const asBlob=v=>!v?null:(typeof v==="string"?dataBlob(v):(v instanceof Blob?v:new Blob([v],{type:"image/png"})));
async function canvasBlob(c){let b=null;try{b=await toBlob(c)}catch(e){}return b||dataBlob(c.toDataURL("image/png"))}
async function decodeBlob(b){try{return await createImageBitmap(b)}catch(e){const u=URL.createObjectURL(b);try{return await loadImg(u)}finally{setTimeout(()=>URL.revokeObjectURL(u),5000)}}}
async function readLayers(key){const c=CACHE[key];if(c&&(c.c||c.g))return{c:c.c,g:c.g};const r=await dbGet("p",key);return r?{c:asBlob(r.c),g:asBlob(r.g)}:null}
function saveNow(){saving=saving.then(doSave,doSave);return saving}
const RAW={},RAWQ=[];
function keepRaw(key){RAW[key]={c:cx.getImageData(0,0,W,H),g:gx.getImageData(0,0,W,H)};const i=RAWQ.indexOf(key);if(i>=0)RAWQ.splice(i,1);RAWQ.push(key);while(RAWQ.length>6)delete RAW[RAWQ.shift()]}
async function doSave(){if(!S.page||!S.dirty)return;S.dirty=false;const key=S.key;let ok=false;
 try{keepRaw(key);const cov=coverage(),th=thumb(),[cb,gb]=await Promise.all([canvasBlob(cv),canvasBlob(gc)]);CACHE[key]={c:cb,g:gb};
  await dbPut("p",key,{c:cb?await cb.arrayBuffer():null,g:gb?await gb.arrayBuffer():null});
  const chk=await dbGet("p",key);ok=!!(chk&&chk.c);
  const st0=S.story,was0=!!st0&&S.kind==="pages"&&storyProgress(st0).d===st0.pages.length,prev=S.sum[key]||{},sm={cov,th,t:Date.now(),md:!!prev.md,vd:prev.vd||0};S.sum[key]=sm;await dbPut("s",key,sm);if(st0&&S.kind==="pages"&&!was0&&storyProgress(st0).d===st0.pages.length)offerClip(st0);
  if(S.key===key){badge(ok?"✓":"⚠")}
  if(!ok&&!S.warned){S.warned=true;toast("Heads up: this window may not keep your colors after you close it. Use ⋯ → Save image to keep your work, or open the app from your own link.",6500)}
  if(cov>=.5&&!(prev.cov>=.5)&&!prev.md&&S.key===key)celebrate()}
 catch(e){console.error(e);S.dirty=true;if(S.key===key)badge("⚠")}}
addEventListener("pagehide",()=>{saveNow()});document.addEventListener("visibilitychange",()=>{if(document.hidden)saveNow()});
// ---- feedback ----
let AC=null;const PENT=[261.63,293.66,329.63,392,440,523.25,587.33,659.25,783.99,880];
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==="suspended")AC.resume();return AC}
function ping(f,v,len){const a=ac();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain(),o2=a.createOscillator(),g2=a.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+len);o2.type="triangle";o2.frequency.value=f*2;g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(v*.25,t+.01);g2.gain.exponentialRampToValueAtTime(.0008,t+len*.6);o.connect(g);g.connect(a.destination);o2.connect(g2);g2.connect(a.destination);o.start(t);o2.start(t);o.stop(t+len+.05);o2.stop(t+len+.05)}
function fxSize(){fxc.width=wrap.clientWidth;fxc.height=wrap.clientHeight;return fxc.getContext("2d")}
function feel(p){const g=fxSize(),k=fxc.width/W,x=p.x*k,y=p.y*k,t0=performance.now(),R=Math.max(fxc.width,fxc.height)*.18,col=brushColor();
 (function f(){const t=(performance.now()-t0)/520;g.clearRect(0,0,fxc.width,fxc.height);if(t>=1)return;const r=R*Math.sqrt(t),a=(1-t)*.55;g.globalAlpha=a;g.strokeStyle=col;g.lineWidth=6*(1-t)+1;g.beginPath();g.arc(x,y,r,0,6.283);g.stroke();for(let i=0;i<7;i++){const an=i*.9+t;star(g,x+Math.cos(an)*r*1.15,y+Math.sin(an)*r*1.15,4*(1-t)+1,"#fff3c4")}g.globalAlpha=1;requestAnimationFrame(f)})();
 if(S.sound)ping(PENT[clamp(Math.floor((1-p.y/H)*10),0,9)],.08,.5);try{navigator.vibrate&&navigator.vibrate(5)}catch(e){}}
function celebrate(){const g=fxSize(),t0=performance.now(),P=Array.from({length:44},()=>({x:Math.random()*fxc.width,y:-20-Math.random()*fxc.height*.4,v:60+Math.random()*120,r:3+Math.random()*7,c:["#ffe08a","#f7a8a0","#9bd1f2","#bde8b0","#e9b8f0"][(Math.random()*5)|0],p:Math.random()*6}));
 (function f(){const t=(performance.now()-t0)/1000;g.clearRect(0,0,fxc.width,fxc.height);if(t>2.4)return;P.forEach(q=>{g.globalAlpha=Math.min(1,(2.4-t)/.8);star(g,q.x+Math.sin(t*2+q.p)*18,q.y+q.v*t,q.r,q.c)});g.globalAlpha=1;requestAnimationFrame(f)})();
 if(S.sound)[0,2,4,7].forEach((k,i)=>setTimeout(()=>ping(PENT[k],.09,1),i*130));toast("✨ Lovely! This page counts as colored. Tap ▶ to see it sparkle.",3600)}
// ---- sparkle preview ----
let pv=null;
function stopPreview(){if(pv){cancelAnimationFrame(pv.raf);if(pv.sc)pv.sc.dispose();pv=null;fxc.getContext("2d").clearRect(0,0,fxc.width,fxc.height);$("#ePlay").style.color=""}}
function togglePreview(){if(!S.page)return;if(pv){stopPreview();return}
 if((S.sum[S.key]||{}).vd){playVideoPreview();return}
 const g=fxSize(),fw=fxc.width,fh=fxc.height,ow=Math.min(fw,720),P=prepPage({img:S.img,cc:cv,gg:gc,w:W,h:H},ow,S.kind==="pages"?S.idx:-1);P.kz=0;P.kx=0;P.ky=0;P.round=0;
 const t0=performance.now();$("#ePlay").style.color="var(--acc)";pv={raf:0,sc:P};
 const f=()=>{const t=(performance.now()-t0)/1000;g.clearRect(0,0,fw,fh);g.save();g.scale(fw/P.FW,fh/P.FH);drawPage(g,P,t,0,0,1);g.restore();pv.raf=requestAnimationFrame(f)};f()}
// ================= pointer input =================
const ptrs=new Map();let drag=null,gest=null;
function cancelDrag(){if(dfs){if(dfs.any)endAction(dfs.bb);dfs=null}if(stroke){cx.drawImage(pcv,0,0);gx.clearRect(0,0,W,H);gx.drawImage(pgc,0,0);stroke=null}drag=null}
hit.addEventListener("pointerdown",e=>{e.preventDefault();if(pv){stopPreview();return}try{hit.setPointerCapture(e.pointerId)}catch(_){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});
 if(ptrs.size===2){cancelDrag();const a=[...ptrs.values()];gest={d0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,z0:S.zoom,cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};return}
 if(ptrs.size>2)return;const p=pt(e);
 if(S.mode==="select"){selStart(p);return}if(S.mode==="paste"){ghStart(p);return}
 drag={pid:e.pointerId,moved:false,p};dfs=(S.fillArea&&S.tool==="fill")?{seen:new Set(),bb:null,any:false,began:false,last:p}:null;
 if(S.tool==="brush"||S.tool==="erase"||(S.tool==="sparkle"&&S.glit.mode==="brush"))strokeStart(p)});
hit.addEventListener("pointermove",e=>{const o=ptrs.get(e.pointerId);if(!o)return;o.x=e.clientX;o.y=e.clientY;
 if(ptrs.size===2&&gest){const a=[...ptrs.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,cxn=(a[0].x+a[1].x)/2,cyn=(a[0].y+a[1].y)/2;stage.scrollLeft-=cxn-gest.cx;stage.scrollTop-=cyn-gest.cy;gest.cx=cxn;gest.cy=cyn;setZoom(gest.z0*d/gest.d0,cxn,cyn);return}
 const p=pt(e);if(S.mode==="select"){selMove(p);return}if(S.mode==="paste"){ghMove(p);return}
 if(!drag||drag.pid!==e.pointerId)return;if(Math.hypot(e.clientX-o.x0,e.clientY-o.y0)>7)drag.moved=true;if(stroke)strokeMove(p);else if(dfs&&drag.moved)dfMove(p)});
function up(e,ok){const o=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)gest=null;
 if(S.mode==="select"){selEnd();return}if(S.mode==="paste"){ghEnd();return}
 if(!drag||drag.pid!==e.pointerId)return;const d=drag;drag=null;
 if(dfs){const s0=dfs;dfs=null;if(s0.any){endAction(s0.bb);return}}
 if(stroke){strokeEnd();return}
 if(ok&&!d.moved&&o){if(S.tool==="fill")fillTap(d.p);else if(S.tool==="sparkle"&&S.glit.mode==="fill")sparkTap(d.p);}}
hit.addEventListener("pointerup",e=>up(e,true));hit.addEventListener("pointercancel",e=>{cancelDrag();up(e,false)});
// ---- drag to fill: slide a finger over small shapes (roof tiles, scales, lattice) and every shape you touch is filled ----
let dfs=null,dfT=0;
function lbbox(){if(S.lbb&&S.lbbKey===S.key)return S.lbb;S.lbbKey=S.key;const L=labelAll(),lab=L.lab,b=new Int32Array((L.n+1)*4);for(let i=0;i<=L.n;i++){b[i*4]=W;b[i*4+1]=H;b[i*4+2]=-1;b[i*4+3]=-1}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const l=lab[y*W+x];if(!l)continue;const o=l*4;if(x<b[o])b[o]=x;if(y<b[o+1])b[o+1]=y;if(x>b[o+2])b[o+2]=x;if(y>b[o+3])b[o+3]=y}return S.lbb=b}
function cellFill(x,y){const L=labelAll(),lab=L.lab;let l=lab[y*W+x];
 if(!l){for(let d=1;d<=3&&!l;d++)for(let dy=-d;dy<=d&&!l;dy++)for(let dx=-d;dx<=d;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&lab[yy*W+xx]){l=lab[yy*W+xx];break}}}
 if(!l||dfs.seen.has(l)||L.sz[l]>2500)return null;dfs.seen.add(l);
 const b=lbbox(),o=l*4,x0=Math.max(0,b[o]-3),y0=Math.max(0,b[o+1]-3),x1=Math.min(W-1,b[o+2]+3),y1=Math.min(H-1,b[o+3]+3),m=(S._dm&&S._dm.length===W*H)?S._dm:(S._dm=new Uint8Array(W*H));
 for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const p=yy*W+xx;if(lab[p]===l)m[p]=1}
 for(let pass=0;pass<2;pass++){const add=[];for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const p=yy*W+xx;if(!m[p]&&bar[p]&&((xx>0&&m[p-1])||(xx<W-1&&m[p+1])||(yy>0&&m[p-W])||(yy<H-1&&m[p+W])))add.push(p)}add.forEach(p=>m[p]=1)}
 const r={m,x0,y0,x1,y1,n:L.sz[l],q:y*W+x};if(!dfs.began){beginAction();dfs.began=true}paintRegion(r);
 for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)m[yy*W+xx]=0;return r}
function dfMove(p){const a=dfs.last,n=Math.max(1,Math.ceil(Math.hypot(p.x-a.x,p.y-a.y)/5));
 for(let i=0;i<=n;i++){const x=Math.round(a.x+(p.x-a.x)*i/n),y=Math.round(a.y+(p.y-a.y)*i/n),r=cellFill(clamp(x,0,W-1),clamp(y,0,H-1));
  if(r){dfs.any=true;dfs.bb=dfs.bb?{x0:Math.min(dfs.bb.x0,r.x0),y0:Math.min(dfs.bb.y0,r.y0),x1:Math.max(dfs.bb.x1,r.x1),y1:Math.max(dfs.bb.y1,r.y1)}:{x0:r.x0,y0:r.y0,x1:r.x1,y1:r.y1};
   const t=performance.now();if(t-dfT>140){dfT=t;feel({x,y})}}}
 dfs.last=p}
function fillTap(p){const r=regionAt(p.x,p.y);if(!r){toast("Tap inside an area to color it");return}beginAction();paintRegion(r);endAction(r);feel(p)}
function sparkTap(p){const r=regionAt(p.x,p.y);if(!r){toast("Tap inside an area to sprinkle sparkles");return}beginAction();glitterRegion(r);endAction(r);feel(p)}
// ================= tray / tools =================
const TOOLS=[["fill","Fill"],["brush","Brush"],["sparkle","Sparkle"],["erase","Eraser"]];
$$("#tray .tool").forEach(b=>{const t=b.dataset.t,nm=TOOLS.find(x=>x[0]===t)[1];b.innerHTML=icon(t)+`<span>${nm}</span>`;
 b.onclick=()=>{if(S.tool===t){toolSheet(t)}else{S.tool=t;syncTools()}}});
function syncTools(){$$("#tray .tool").forEach(b=>b.classList.toggle("on",b.dataset.t===S.tool))}
$("#well").onclick=()=>colorsSheet();
function syncWell(){const f=S.fill,w=$("#well");document.documentElement.style.setProperty("--cur",f.type==="grad"?f.grad.a:f.color);w.style.backgroundImage="none";if(f.type==="solid")w.style.background=f.color;else if(f.type==="grad"){const g=f.grad,d={down:"180deg",up:"0deg",right:"90deg",left:"270deg",diag:"135deg"}[g.dir];w.style.background=`linear-gradient(${d},${g.a},${g.b})`}else{w.style.background=f.color;w.style.backgroundImage=`url(${tileOf(f.pat,f.color,f.colorB,PATS[f.pat].nn?PATS[f.pat].nn*Math.round(48/PATS[f.pat].nn):48).toDataURL()})`;w.style.backgroundSize="24px"}}
function noteColor(c){S.recent=[c,...S.recent.filter(x=>x!==c)].slice(0,12);dbPut("m","recent",S.recent)}
function useSolid(c){S.fill.type="solid";S.fill.color=c;noteColor(c);if(S.tool==="erase"||S.tool==="sparkle"&&false)S.tool="fill";syncTools();syncWell()}
function toolSheet(t){if(t==="fill")colorsSheet();else if(t==="brush")brushSheet();else if(t==="sparkle")sparkleSheet();else eraserSheet()}
// ================= sheets =================
function colorsSheet(tab){tab=tab||S.ctab;S.ctab=tab;const f=S.fill;
 const tabs=h("div",{class:"tabs"},...[["colors","Colors"],["pattern","Patterns"],["grad","Gradients"]].map(([k,n])=>h("button",{class:tab===k?"on":"",onclick:()=>colorsSheet(k)},n)));
 const body=[];
 if(tab==="colors"){
  body.push(h("h3",null,"Shades of your color"),h("div",{class:"row"},...shadesOf(f.color).map(c=>sw(c,false,()=>{useSolid(c);closeSheet()}))));
  body.push(h("h3",null,"My colors"),h("div",{class:"row"},...(S.recent.length?S.recent:STYLES[S.styleIdx].c.slice(0,6)).map(c=>sw(c,f.type==="solid"&&c===f.color,()=>{useSolid(c);closeSheet()}))));
  body.push(h("h3",null,"Palettes"),h("div",{class:"row"},...STYLES.map((s,i)=>h("button",{class:"chip"+(i===S.styleIdx?" on":""),onclick:()=>{S.styleIdx=i;dbPut("m","style",i);colorsSheet("colors")}},s.n))),h("div",{class:"row",style:"margin-top:10px"},...STYLES[S.styleIdx].c.map(c=>sw(c,f.type==="solid"&&c===f.color,()=>{useSolid(c);closeSheet()}))));
  const pick=h("input",{type:"color",value:f.color,style:"width:100%;height:46px;border:0;border-radius:12px;background:none;padding:0"});pick.onchange=()=>{useSolid(pick.value);closeSheet()};
  body.push(h("h3",null,"All colors"),h("div",{class:"row"},...BASE.map(c=>sw(c,f.type==="solid"&&c===f.color,()=>{useSolid(c);closeSheet()}))),h("h3",null,"Any color you like"),pick)}
 else if(tab==="pattern"){
  const sel=h("div",{class:"row"});PATS.forEach((p,i)=>{if(p.g!==(S.pgrp||"c"))return;const ts0=Math.round(156/3),c=tileOf(i,f.color,f.colorB,p.nn?p.nn*Math.max(1,Math.round(ts0/p.nn)):ts0),big=mk(156,156),bx=big.getContext("2d");bx.fillStyle=bx.createPattern(c,"repeat");bx.fillRect(0,0,156,156);big.style.cssText="width:78px;height:78px";sel.append(h("button",{class:"tile"+(f.type==="pattern"&&f.pat===i?" on":""),onclick:()=>{f.type="pattern";f.pat=i;syncWell();closeSheet();toast(p.n+" pattern. Tap an area to fill it.")}},big))});
  body.push(h("div",{class:"tabs"},...[["c","Cloth"],["b","Building"]].map(([k,n])=>h("button",{class:(S.pgrp||"c")===k?"on":"",onclick:()=>{S.pgrp=k;colorsSheet("pattern")}},n))),S.pgrp==="b"?h("div",null,palaceBlock(),h("h3",null,"Color pairs"),h("div",{class:"row"},...BCOL.map(([n,ca,cb])=>h("button",{class:"btn sm",onclick:()=>{f.color=ca;f.colorB=cb;noteColor(ca);syncWell();colorsSheet("pattern")}},n)))):"",h("h3",null,"Pattern size"),h("div",{class:"row"},...[["Tiny",.5],["Small",.75],["Medium",1],["Large",1.6]].map(([t,v])=>h("button",{class:"btn sm"+((f.ps||1)===v?" pri":""),onclick:()=>{f.ps=v;colorsSheet("pattern")}},t))),h("h3",null,"Pattern"),sel,h("h3",null,"Pattern color"),h("div",{class:"row"},...STYLES[S.styleIdx].c.map(c=>sw(c,c===f.color,()=>{f.color=c;noteColor(c);syncWell();colorsSheet("pattern")}))),h("h3",null,"Background color"),h("div",{class:"row"},...["#ffffff","#fff6e0","#f6e7c8",...STYLES[S.styleIdx].c.slice(0,9)].map(c=>sw(c,c===f.colorB,()=>{f.colorB=c;syncWell();colorsSheet("pattern")}))))}
 else{
  body.push(h("h3",null,"Presets"),h("div",{class:"row"},...GRADS.map(g=>{const b=h("button",{class:"sw"+(f.type==="grad"&&f.grad.a===g[0]&&f.grad.b===g[1]?" on":""),style:`background:linear-gradient(135deg,${g[0]},${g[1]});border-radius:14px;width:64px`,onclick:()=>{f.type="grad";f.grad.a=g[0];f.grad.b=g[1];syncWell();closeSheet();toast("Gradient on. Tap an area to fill it.")}});return b})));
  const ca=h("input",{type:"color",value:f.grad.a,style:"width:70px;height:46px;border:0;background:none;padding:0"}),cb=h("input",{type:"color",value:f.grad.b,style:"width:70px;height:46px;border:0;background:none;padding:0"});ca.onchange=()=>{f.type="grad";f.grad.a=ca.value;syncWell()};cb.onchange=()=>{f.type="grad";f.grad.b=cb.value;syncWell()};
  body.push(h("h3",null,"Make your own"),h("div",{class:"row"},ca,h("span",null,"to"),cb),h("h3",null,"Direction"),h("div",{class:"row"},...DIRS.map(([d,l])=>h("button",{class:"chip"+(f.grad.dir===d?" on":""),onclick:()=>{f.type="grad";f.grad.dir=d;syncWell();colorsSheet("grad")}},l))))}
 openSheet("Colors",h("h3",null,"Fill mode"),h("div",{class:"row"},h("button",{class:"btn sm"+(S.fillArea?"":" pri"),onclick:()=>{S.fillArea=false;dbPut("m","fillArea",false);colorsSheet(tab)}},"Tap one shape"),h("button",{class:"btn sm"+(S.fillArea?" pri":""),onclick:()=>{S.fillArea=true;dbPut("m","fillArea",true);colorsSheet(tab)}},"Drag to fill many")),h("p",{style:"margin:6px 0 0;color:var(--mut);font-size:13px"},S.fillArea?"Slide your finger over small shapes, like roof tiles and scales, to fill them all. A tap still fills one shape. Use two fingers to move or zoom the page.":"Each tap fills one shape."),tabs,...body)}
function brushSheet(){const B=[["marker","Marker"],["soft","Soft"],["pencil","Pencil"],["water","Watercolor"],["spray","Spray"]],row=h("div",{class:"row"});
 B.forEach(([k,n])=>{const c=mk(120,56),g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,120,56);const keep=cx,col=brushColor();g.strokeStyle=col;const old={cx,W};let pts=[];for(let i=0;i<=24;i++)pts.push([10+i*4,28+Math.sin(i/3)*12]);
  // tiny preview stroke
  const cxs=g;cxs.fillStyle=col;pts.forEach(([x,y])=>{if(k==="marker"){cxs.beginPath();cxs.arc(x,y,7,0,6.283);cxs.fill()}else if(k==="soft"){const gr=cxs.createRadialGradient(x,y,0,x,y,9),c3=rgb(col);gr.addColorStop(0,`rgba(${c3[0]},${c3[1]},${c3[2]},.5)`);gr.addColorStop(1,`rgba(${c3[0]},${c3[1]},${c3[2]},0)`);cxs.fillStyle=gr;cxs.fillRect(x-9,y-9,18,18)}else if(k==="pencil"){cxs.fillStyle=col;cxs.globalAlpha=.6;for(let j=0;j<6;j++){cxs.beginPath();cxs.arc(x+rr(-7,7),y+rr(-7,7),.9,0,6.283);cxs.fill()}cxs.globalAlpha=1}else if(k==="water"){cxs.globalAlpha=.1;cxs.beginPath();cxs.arc(x,y,9,0,6.283);cxs.fill();cxs.globalAlpha=1}else{cxs.fillStyle=col;for(let j=0;j<8;j++){cxs.beginPath();cxs.arc(x+rr(-8,8),y+rr(-8,8),.8,0,6.283);cxs.fill()}}});
  c.style.cssText="width:120px;height:56px;display:block";row.append(h("button",{class:"tile"+(S.brush.type===k?" on":""),style:"width:124px",onclick:()=>{S.brush.type=k;S.tool="brush";syncTools();brushSheet()}},c,h("div",{style:"font-size:12px;font-weight:700;padding:4px"},n)))});
 openSheet("Brushes",row,h("h3",null,`Size · ${S.brush.size}`),slider(4,90,S.brush.size,v=>S.brush.size=v),h("div",{class:"row",style:"margin-top:10px"},h("button",{class:"btn pri",onclick:closeSheet},"Done")))}
function sparkleSheet(){const row=h("div",{class:"row"});GL.forEach((g,i)=>{const c=mk(60,40),x=c.getContext("2d");x.fillStyle="#2b2218";x.fillRect(0,0,60,40);for(let k=0;k<14;k++)spark(x,rr(6,54),rr(6,34),rr(2,5),g.c[k%g.c.length]);c.style.cssText="width:60px;height:40px;display:block;border-radius:8px";row.append(h("button",{class:"tile"+(S.glit.style===i?" on":""),style:"padding:3px",onclick:()=>{S.glit.style=i;S.tool="sparkle";syncTools();sparkleSheet()}},c,h("div",{style:"font-size:12px;font-weight:700;padding:3px"},g.n)))});
 openSheet("Sparkle",h("p",{style:"margin:0 0 6px;color:var(--mut)"},"Sparkles sit on top of everything on the page."),h("h3",null,"How"),h("div",{class:"row"},h("button",{class:"chip"+(S.glit.mode==="fill"?" on":""),onclick:()=>{S.glit.mode="fill";S.tool="sparkle";syncTools();sparkleSheet()}},"Tap an area"),h("button",{class:"chip"+(S.glit.mode==="brush"?" on":""),onclick:()=>{S.glit.mode="brush";S.tool="sparkle";syncTools();sparkleSheet()}},"Paint with sparkle")),h("h3",null,"Style"),row,h("h3",null,"Amount"),slider(1,5,S.glit.amount,v=>S.glit.amount=v),h("h3",null,"Brush size"),slider(10,90,S.glit.size,v=>S.glit.size=v),h("div",{class:"row",style:"margin-top:10px"},h("button",{class:"btn pri",onclick:closeSheet},"Done")))}
function eraserSheet(){openSheet("Eraser",h("p",{style:"margin:0;color:var(--mut)"},"Removes colors and sparkles."),h("h3",null,"Size"),slider(8,100,S.erase.size,v=>S.erase.size=v),h("div",{class:"row",style:"margin-top:10px"},h("button",{class:"btn pri",onclick:closeSheet},"Done")))}
// ================= page menu =================
function mi(i,t,s,f,keep){return h("button",{class:"mi",onclick:()=>{if(!keep)closeSheet();f()}},h("span",null,i),h("div",null,t,s?h("small",null,s):null))}
function pageMenu(){const st=S.story,pg=S.page,sm=S.sum[S.key]||{},md=!!sm.md;
 openSheet(pg.title,
  (()=>{const pr=storyProgress(st),all=pr.d===pr.n;return mi("🎬",all?"Make my story clip":`Story clip · ${pr.d}/${pr.n} pages`,all?"Your whole story as a moving video":"Color or mark every page to unlock",()=>{if(all)makeStoryClip(st);else toast(`${pr.n-pr.d} more page${pr.n-pr.d>1?"s":""} to unlock. Use ⋯ → Mark page as colored to count a page.`)})})(),
  mi("✨",((S.sum[S.key]||{}).vd)?"Animation video added":"Animate this page with AI",((S.sum[S.key]||{}).vd)?"Tap to change. It plays in your story clip":"Make it move like real animation",()=>animSheet()),
  mi("📖","Read this page's story",pg.en?pg.en.slice(0,60)+"…":"",()=>storySheet()),
  mi(md||sm.cov>=.5?"✅":"☑️",md?"Marked as colored":"Mark page as colored","Counts toward your story clip",async()=>{const was=storyProgress(st).d===st.pages.length,s=S.sum[S.key]||{cov:0,th:"",t:Date.now()};s.md=!s.md;S.sum[S.key]=s;await dbPut("s",S.key,s);toast(s.md?"Marked as colored":"Mark removed");if(!was&&storyProgress(st).d===st.pages.length)offerClip(st)}),
  h("h3",null,"Save & share"),
  mi("🖼️","Save as image",null,()=>exportImage()),
  mi("📄","Save this page as PDF",null,()=>exportPagePdf()),
  mi("🎞️","Save a 5-second sparkle clip","Share it anywhere",()=>makePageClip()),
  mi("📚","Save the whole story as a book (PDF)",null,()=>exportBook(st,true)),
  h("h3",null,"Start over"),
  mi("🧽","Clear colors on this page","You can undo",()=>{beginAction();cx.fillStyle="#fff";cx.fillRect(0,0,W,H);endAction({x0:0,y0:0,x1:W-1,y1:H-1});toast("Cleared. Tap ↶ to undo.")}),
  mi("✨","Clear sparkles on this page","You can undo",()=>{beginAction();gx.clearRect(0,0,W,H);endAction({x0:0,y0:0,x1:W-1,y1:H-1});toast("Sparkles cleared. Tap ↶ to undo.")}),
  h("h3",null,"You"),
  h("div",{style:"padding:6px 0"},h("div",{style:"font-weight:600;margin-bottom:6px"},"Your name (goes on your story clip)"),(()=>{const i=h("input",{type:"text",value:S.name,placeholder:"Your name"});i.oninput=()=>{S.name=i.value.trim();dbPut("m","name",S.name)};return i})()),
  h("label",{style:"display:flex;gap:10px;align-items:center;padding:10px 0"},(()=>{const c=h("input",{type:"checkbox",style:"width:22px;height:22px"});c.checked=S.sound;c.onchange=()=>{S.sound=c.checked;dbPut("m","sound",S.sound)};return c})(),h("span",null,"Soft sounds when I color")))}
function storySheet(){const pg=S.page;openSheet(pg.title,h("p",{style:"font-size:18px;line-height:1.6;margin:6px 0"},pg.kh||""),h("p",{style:"color:var(--mut);margin:6px 0 14px"},pg.en||""),h("button",{class:"btn pri",onclick:closeSheet},"Back to coloring"))}
$("#eBack").onclick=leaveEditor;$("#eBack").innerHTML=icon("back");$("#eUndo").innerHTML=icon("undo");$("#eRedo").innerHTML=icon("redo");$("#ePlay").innerHTML=icon("play");$("#eMenu").innerHTML=icon("menu");
$("#eUndo").onclick=undo;$("#eRedo").onclick=redo;$("#ePlay").onclick=togglePreview;$("#eMenu").onclick=pageMenu;
// page nav + zoom buttons
const nav=(id,txt,css,f)=>{const b=h("button",{class:"fab",id,style:css,onclick:f},txt);$("#editor").append(b);return b};
$("#ePrev").onclick=()=>gotoPage(-1);$("#eNext").onclick=()=>gotoPage(1);
const zp=nav("zp","","right:10px;bottom:calc(142px + var(--capH,0px) + env(safe-area-inset-bottom))",()=>setZoom(S.zoom*1.4,innerWidth/2,innerHeight/2)),zm=nav("zm","","right:10px;bottom:calc(92px + var(--capH,0px) + env(safe-area-inset-bottom))",()=>setZoom(S.zoom/1.4,innerWidth/2,innerHeight/2));zp.innerHTML=icon("plus");zm.innerHTML=icon("minus");
async function gotoPage(d){const l=S.story[S.kind],i=S.idx+d;if(i<0||i>=l.length){toast(d<0?"This is the first page":"This is the last page");return}await openEditor(S.story,S.kind,i)}
// ================= copy & paste colors =================
let sel=null,G=null,gdrag=null;
const barBox=$("#cbar");
function cbar(msg,btns){$("#cmsg").textContent=msg;const r=$("#cbtn");r.innerHTML="";btns.forEach(([t,f,cls])=>r.append(h("button",{class:"btn sm "+(cls||""),onclick:f},t)));barBox.classList.remove("hid")}
function cpEnd(){S.mode="";sel=null;G=null;gdrag=null;selb.classList.add("hid");barBox.classList.add("hid");if(ghc.width)ghc.getContext("2d").clearRect(0,0,ghc.width,ghc.height)}
function copyStart(){S.mode="select";sel=null;selb.classList.add("hid");cbar("Drag a box around what you want to copy.",[["Whole page",()=>{sel={x0:0,y0:0,x1:W-1,y1:H-1};drawSel();copyReady()}],["Cancel",cpEnd]])}
function copyReady(){cbar("Ready. Copy the colors inside the box?",[["Copy",doCopy,"pri"],["Redraw",copyStart],["Cancel",cpEnd]])}
function drawSel(){if(!sel)return;selb.classList.remove("hid");selb.style.left=100*sel.x0/W+"%";selb.style.top=100*sel.y0/H+"%";selb.style.width=100*(sel.x1-sel.x0)/W+"%";selb.style.height=100*(sel.y1-sel.y0)/H+"%"}
let selA=null;
function selStart(p){selA=p;sel={x0:p.x,y0:p.y,x1:p.x,y1:p.y};drawSel()}
function selMove(p){if(!selA)return;sel={x0:Math.min(selA.x,p.x),y0:Math.min(selA.y,p.y),x1:Math.max(selA.x,p.x),y1:Math.max(selA.y,p.y)};drawSel()}
function selEnd(){if(!selA)return;selA=null;if(sel&&sel.x1-sel.x0>30&&sel.y1-sel.y0>30)copyReady();else{sel=null;selb.classList.add("hid")}}
function doCopy(){const w=sel.x1-sel.x0+1,hh=sel.y1-sel.y0+1,data=cx.getImageData(sel.x0,sel.y0,w,hh),g=mk(w,hh);g.getContext("2d").drawImage(gc,sel.x0,sel.y0,w,hh,0,0,w,hh);
 const gh=mk(w,hh),gg=gh.getContext("2d"),id=gg.createImageData(w,hh),d=data.data;for(let i=0;i<d.length;i+=4){const white=d[i]>246&&d[i+1]>246&&d[i+2]>246;id.data[i]=d[i];id.data[i+1]=d[i+1];id.data[i+2]=d[i+2];id.data[i+3]=white?0:255}gg.putImageData(id,0,0);
 S.clip={story:S.story.id,w,h:hh,data,g,ghost:gh};cpEnd();toast("Copied! Open another page in this story, tap ⋯ and choose “Paste colors here”.",3800)}
function pasteStart(){const c=S.clip;S.mode="paste";const s=Math.min(.7*W/c.w,.7*H/c.h);G={x:W/2,y:H/2,s,flip:false};drawGhost();
 cbar("Drag the ghost over the same character or object. Use − + to resize.",[["−",()=>{G.s*=.9;drawGhost()}],["+",()=>{G.s*=1.1;drawGhost()}],["⇋ Flip",()=>{G.flip=!G.flip;drawGhost()}],["Paste",doPaste,"pri"],["Cancel",cpEnd]])}
function drawGhost(){const c=S.clip,g=ghc.getContext("2d");g.clearRect(0,0,W,H);g.save();g.translate(G.x,G.y);g.scale(G.flip?-G.s:G.s,G.s);g.globalAlpha=.72;g.drawImage(c.ghost,-c.w/2,-c.h/2);g.globalAlpha=1;g.restore();g.strokeStyle="#ff2d6f";g.lineWidth=Math.max(2,W/300);g.setLineDash([12,8]);g.strokeRect(G.x-c.w*G.s/2,G.y-c.h*G.s/2,c.w*G.s,c.h*G.s)}
function ghStart(p){gdrag={dx:G.x-p.x,dy:G.y-p.y}}function ghMove(p){if(!gdrag)return;G.x=p.x+gdrag.dx;G.y=p.y+gdrag.dy;drawGhost()}function ghEnd(){gdrag=null}
function doPaste(){const c=S.clip,L=labelAll(),lab=L.lab,hw=c.w*G.s/2,hh=c.h*G.s/2,x0=clamp(Math.floor(G.x-hw),0,W-1),x1=clamp(Math.ceil(G.x+hw),0,W-1),y0=clamp(Math.floor(G.y-hh),0,H-1),y1=clamp(Math.ceil(G.y+hh),0,H-1),n=L.n+1,D=c.data.data;
 const cnt=new Uint32Array(n),cov=new Uint32Array(n),sr=new Float64Array(n),sg=new Float64Array(n),sb=new Float64Array(n),sl=new Float64Array(n),sl2=new Float64Array(n);
 const src=(px,py)=>{let u=(px-G.x)/G.s;if(G.flip)u=-u;u+=c.w/2;const v=(py-G.y)/G.s+c.h/2;if(u<0||v<0||u>=c.w||v>=c.h)return-1;return((v|0)*c.w+(u|0))*4};
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const r=lab[y*W+x];if(!r)continue;const j=src(x,y);if(j<0)continue;cov[r]++;if(D[j]<246||D[j+1]<246||D[j+2]<246){cnt[r]++;sr[r]+=D[j];sg[r]+=D[j+1];sb[r]+=D[j+2];const l=(D[j]+D[j+1]+D[j+2])/3;sl[r]+=l;sl2[r]+=l*l}}
 const ok=new Uint8Array(n),flat=new Uint8Array(n);let regs=0;for(let r=1;r<n;r++){if(cov[r]>=L.sz[r]*.3&&cnt[r]>=cov[r]*.35&&cnt[r]>=12){ok[r]=1;regs++;const m=sl[r]/cnt[r],vr=sl2[r]/cnt[r]-m*m;flat[r]=vr<350?1:0}}
 if(!regs){toast("Nothing matched under the ghost. Move it over the same colored shapes.");return}
 beginAction();const bw=x1-x0+1,bh=y1-y0+1,id=cx.getImageData(x0,y0,bw,bh),d=id.data,done=new Uint8Array(bw*bh);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const r=lab[y*W+x];if(!r||!ok[r])continue;const o=((y-y0)*bw+(x-x0));if(flat[r]){d[o*4]=sr[r]/cnt[r];d[o*4+1]=sg[r]/cnt[r];d[o*4+2]=sb[r]/cnt[r];d[o*4+3]=255;done[o]=1}else{const j=src(x,y);if(j>=0&&(D[j]<246||D[j+1]<246||D[j+2]<246)){d[o*4]=D[j];d[o*4+1]=D[j+1];d[o*4+2]=D[j+2];d[o*4+3]=255;done[o]=1}}}
 for(let pass=0;pass<2;pass++)for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const o=y*bw+x;if(done[o]||!bar[(y+y0)*W+x+x0])continue;let q=-1;if(x>0&&done[o-1])q=o-1;else if(x<bw-1&&done[o+1])q=o+1;else if(y>0&&done[o-bw])q=o-bw;else if(y<bh-1&&done[o+bw])q=o+bw;if(q>=0){d[o*4]=d[q*4];d[o*4+1]=d[q*4+1];d[o*4+2]=d[q*4+2];done[o]=2}}
 cx.putImageData(id,x0,y0);gx.save();gx.translate(G.x,G.y);gx.scale(G.flip?-G.s:G.s,G.s);gx.drawImage(c.g,-c.w/2,-c.h/2);gx.restore();
 endAction({x0,y0,x1,y1});cpEnd();toast(`Pasted onto ${regs} shapes. Tap ↶ if you want to undo.`)}


// ================= scene effects (clean only: fish glide, leaves, petals, bubbles, light) =================
const TAU=6.2832,pickOf=a=>a[Math.floor(Math.random()*a.length)];
const TOPF=[[.075,.245,.322,.332],[.725,.243,.912,.332]];
const MOTION={
 1:{petals:{n:9}},2:{petals:{n:10}},
 3:{surface:.24,bottom:.85,fish:TOPF},
 4:{fish:[[.68,.15,.955,.26,1]],leaves:{box:[.04,.12,.96,.52],n:7}},
 5:{fish:[[.045,.15,.33,.25,1],[.37,.115,.57,.20,1]],leaves:{box:[.04,.10,.96,.50],n:7}},
 6:{fish:[[.70,.24,.955,.36,1]],leaves:{box:[.04,.14,.96,.55],n:7}},
 7:{fish:[[.075,.215,.335,.268],[.145,.268,.275,.328],[.725,.21,.925,.315]],surface:.215,bottom:.86},
 8:{surface:.24,bottom:.84,fish:[...TOPF,[.225,.725,.32,.77],[.70,.728,.775,.772]]},
 9:{surface:.24,bottom:.84,fish:TOPF},
 10:{petals:{n:10,gold:1}},
 11:{leaves:{box:[.55,.12,.95,.62],n:7}},
 12:{fish:[[.045,.14,.34,.225,1],[.57,.15,.84,.21,1]],leaves:{box:[.04,.12,.96,.50],n:8}},
 13:{petals:{n:9}},14:{petals:{n:8}},15:{petals:{n:10}}
};
function mkScene(src,mo,ow){
 const W0=src.width,H0=src.height,oh=Math.round(ow*H0/W0),sc=ow/540,SK=.5*sc;
 const so=mk(ow,oh),o=so.getContext("2d"),base=mk(ow,oh),bc=base.getContext("2d",{willReadFrequently:true});bc.drawImage(src,0,0,ow,oh);
 const bd=(mo.fish&&mo.fish.length)?bc.getImageData(0,0,ow,oh).data:null,ink=(x,y)=>{if(x<0||y<0||x>=ow||y>=oh)return false;const j=(y*ow+x)*4;return bd[j]+bd[j+1]+bd[j+2]<330},
 rects=(()=>{if(!bd)return[];let R=(mo.fish||[]).map(z=>({x0:Math.round(z[0]*ow),y0:Math.round(z[1]*oh),x1:Math.round(z[2]*ow),y1:Math.round(z[3]*oh),nb:!!z[4]}));
  for(let ch=true,n=0;ch&&n<9;n++){ch=false;for(let a=0;a<R.length&&!ch;a++)for(let b=a+1;b<R.length&&!ch;b++){const A=R[a],B=R[b];if(A.x0<=B.x1+2&&B.x0<=A.x1+2&&A.y0<=B.y1+2&&B.y0<=A.y1+2){R[a]={x0:Math.min(A.x0,B.x0),y0:Math.min(A.y0,B.y0),x1:Math.max(A.x1,B.x1),y1:Math.max(A.y1,B.y1),nb:A.nb&&B.nb};R.splice(b,1);ch=true}}}
  return R})(),
 fz=rects.map((r,i)=>{ // grow the area until no line crosses its edge, so each fish/cloud moves as a whole
  let {x0,y0,x1,y1}=r;const lim=34;let ok=false;
  for(let it=0;it<lim;it++){let ex=false;
   for(let x=x0;x<=x1;x++){if(ink(x,y0-1)){y0--;ex=true;break}}
   for(let x=x0;x<=x1;x++){if(ink(x,y1+1)){y1++;ex=true;break}}
   for(let y=y0;y<=y1;y++){if(ink(x0-1,y)){x0--;ex=true;break}}
   for(let y=y0;y<=y1;y++){if(ink(x1+1,y)){x1++;ex=true;break}}
   if(!ex){ok=true;break}}
  x0=Math.max(2,x0);y0=Math.max(2,y0);x1=Math.min(ow-3,x1);y1=Math.min(oh-3,y1);
  if(!ok||x1-x0<8||y1-y0<6)return null;
  const w=x1-x0+1,h2=y1-y0+1,id=bc.getImageData(x0-1,y0,w+2,h2).data,bgc=mk(w,h2),bx=bgc.getContext("2d"),bim=bx.createImageData(w,h2),spr=mk(w,h2),sx=spr.getContext("2d"),sim=sx.createImageData(w,h2),W2=w+2;
  for(let y=0;y<h2;y++){const L=y*W2*4,Rr=(y*W2+W2-1)*4;for(let x=0;x<w;x++){const t=w>1?x/(w-1):0,o4=(y*w+x)*4,p4=(y*W2+x+1)*4;
    const br=id[L]*(1-t)+id[Rr]*t,bg2=id[L+1]*(1-t)+id[Rr+1]*t,bb=id[L+2]*(1-t)+id[Rr+2]*t;
    bim.data[o4]=br;bim.data[o4+1]=bg2;bim.data[o4+2]=bb;bim.data[o4+3]=255;
    const df=Math.abs(id[p4]-br)+Math.abs(id[p4+1]-bg2)+Math.abs(id[p4+2]-bb),a=Math.max(0,Math.min(1,(df-22)/70));
    sim.data[o4]=id[p4];sim.data[o4+1]=id[p4+1];sim.data[o4+2]=id[p4+2];sim.data[o4+3]=Math.round(a*255)}}
  bx.putImageData(bim,0,0);sx.putImageData(sim,0,0);
  return{x:x0,y:y0,w,h:h2,bgc,spr,ax:r.nb?16:24,ay:r.nb?0:4,p:i*.31+.07}}).filter(Boolean),
  lv=mo.leaves?Array.from({length:mo.leaves.n||7},()=>({a:Math.random(),b:Math.random(),v:rr(.1,.2),fl:rr(.6,1.4),ph:Math.random(),s:rr(3.5,6)*sc,c:pickOf(["#4C9954","#6FB24E","#A8CF45","#2F7D4F"])})):[],
  pt=mo.petals?Array.from({length:mo.petals.n||9},()=>({x:Math.random(),v:rr(.05,.1),ph:Math.random(),s:rr(4,7)*sc,c:pickOf(mo.petals.gold?["#ffe9a8","#ffd36b","#fff3c4"]:["#f7b7c9","#ffd6e0","#ffe3a3","#f2a0b6"])})):[],
  bt=mo.surface?mo.surface*oh+6:0,bm=mo.surface?(mo.bottom||.86)*oh:0,
  bub=bt?Array.from({length:16},()=>({x:rr(.07,.93)*ow,off:Math.random(),v:rr(22,40)*sc,r:rr(2,4.8)*sc,p:Math.random()})):[];
 function draw(t,ramp){ramp=ramp==null?1:ramp;const U=t/4,ph=((U%1)+1)%1;o.globalAlpha=1;o.drawImage(base,0,0);
  fz.forEach(z=>{o.drawImage(z.bgc,z.x,z.y);const dx=z.ax*SK*Math.sin(TAU*(U+z.p))*ramp,dy=z.ay*SK*Math.sin(TAU*(2*U+z.p))*ramp;o.drawImage(z.spr,z.x+dx,z.y+dy)});
  o.save();o.globalAlpha=ramp;o.globalCompositeOperation="screen";for(let i=0;i<3;i++){const cx=((i+ph)/3)*(ow+500*sc)-250*sc,gr=o.createLinearGradient(cx-70*sc,0,cx+70*sc,0);gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(.5,"rgba(255,255,255,.06)");gr.addColorStop(1,"rgba(255,255,255,0)");o.fillStyle=gr;o.save();o.translate(cx,oh/2);o.rotate(.35);o.translate(-cx,-oh/2);o.fillRect(cx-70*sc,-oh,140*sc,oh*3);o.restore()}o.restore();
  if(lv.length){const L=mo.leaves.box,bx0=L[0]*ow,by0=L[1]*oh,bwd=(L[2]-L[0])*ow,bht=(L[3]-L[1])*oh;lv.forEach(l=>{const fr=((l.a+l.v*t*.6)%1+1)%1,x=bx0+fr*bwd,y=by0+((l.b+.06*t)%1)*bht+16*sc*Math.sin(TAU*(t*l.fl*.3+l.ph)),al=Math.min(1,fr/.12,(1-fr)/.12)*.9*ramp;o.save();o.globalAlpha=al;o.translate(x,y);o.rotate(.9*Math.sin(TAU*(t*l.fl*.35+l.ph))+t*.8);o.fillStyle=l.c;o.beginPath();o.ellipse(0,0,l.s,l.s*.45,0,0,TAU);o.fill();o.strokeStyle="rgba(30,70,40,.7)";o.lineWidth=.8;o.beginPath();o.moveTo(-l.s,0);o.lineTo(l.s,0);o.stroke();o.restore()})}
  pt.forEach(p=>{const fr=((p.ph+p.v*t)%1+1)%1,y=fr*(oh+40*sc)-20*sc,x=p.x*ow+Math.sin(TAU*(t*.25+p.ph))*26*sc,al=Math.min(1,fr/.1,(1-fr)/.1)*.85*ramp;o.save();o.globalAlpha=al;o.translate(x,y);o.rotate(Math.sin(TAU*(t*.3+p.ph))*1.1+t*.5);o.fillStyle=p.c;o.beginPath();o.ellipse(0,0,p.s,p.s*.55,0,0,TAU);o.fill();o.restore()});
  if(bub.length){const span=bm-bt;bub.forEach(b=>{const pos=(((b.off*span-t*b.v)%span)+span)%span,yy=bt+pos,al=Math.min(1,pos/(.07*span))*Math.min(1,(span-pos)/(.05*span))*.8*ramp;if(al<.03)return;const xx=b.x+Math.sin(t*1.6+b.p*6)*4*sc;o.globalAlpha=al;o.lineWidth=1.2;o.strokeStyle="rgba(42,111,151,.8)";o.fillStyle="rgba(200,232,255,.3)";o.beginPath();o.arc(xx,yy,b.r,0,6.3);o.fill();o.stroke()})}
  o.globalAlpha=1}
 return{cv:so,draw,oh,dispose(){base.width=so.width=1}}}

function offerClip(st){setTimeout(()=>openSheet("🎉 Your story is complete!",h("p",{style:"margin:0 0 12px;color:var(--mut)"},"Every page is colored. Watch your whole story come alive as a video."),st.lesson?h("p",{style:"margin:0 0 12px;font-weight:700"},st.lesson):null,h("button",{class:"clipbtn go",onclick:()=>{closeSheet();makeStoryClip(st)}},h("span",{class:"big"},"🎬 Make my story clip"),h("small",null,"About a minute and a half, with music and captions")),hasVisit(st)?mi("📍","Where to see it","Visit the real place",()=>visitSheet(st)):null,h("button",{class:"btn",style:"width:100%;margin-top:10px",onclick:closeSheet},"Later")),1600)}

// ================= about, sources, where to see it, the end =================
const hasAbout=st=>!!(st.lesson||st.period||st.versionNote||(st.sources&&st.sources.length)),hasVisit=st=>!!((st.site&&(st.site.name||st.site.mapLink))||st.reference),srcLink=st=>((st.sources||[]).find(s=>s.link)||{}).link||"";
function openLink(u){if(!u)return;try{const w=window.open(u,"_blank","noopener");if(!w)throw 0}catch(e){copyText(u,"Link copied. Paste it in your browser.")}}
const mapUrl=st=>{const s=st.site||{};return s.mapLink||"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([s.name,s.place].filter(Boolean).join(", "))};
function aboutSheet(st){openSheet("About this story",
 st.lesson?h("div",{class:"card",style:"padding:14px;margin-bottom:10px"},h("small",{style:"color:var(--mut)"},"What this story teaches"),h("div",{style:"font-weight:700;font-size:18px;margin-top:4px"},st.lesson),st.lessonKh?h("div",{style:"font-size:17px;margin-top:6px"},st.lessonKh):null):null,
 st.period?h("p",{style:"margin:0 0 10px"},h("b",null,"Period: "),st.period):null,
 (st.sources&&st.sources.length)?h("h3",null,"Sources"):null,
 ...(st.sources||[]).map(s=>h("div",{class:"card",style:"padding:12px;margin-bottom:8px"},h("b",null,s.title||"Source"),s.volume?h("div",{style:"color:var(--mut);font-size:14px"},s.volume):null,s.versionFollowed?h("div",{style:"color:var(--mut);font-size:14px"},"Version followed: "+s.versionFollowed):null,s.link?h("button",{class:"btn sm",style:"margin-top:8px",onclick:()=>openLink(s.link)},"📖 Read the source"):null)),
 st.versionNote?h("p",{style:"color:var(--mut);font-size:14px"},"Other versions: "+st.versionNote):null)}
function visitSheet(st){const s=st.site||{},r=st.reference;openSheet("Where to see it",
 r?h("img",{src:r.src,alt:"",style:"width:100%;border-radius:14px;display:block"}):null,
 r&&r.caption?h("p",{style:"margin:8px 0 0;font-weight:600"},r.caption):null,
 r&&r.credit?h("p",{style:"margin:4px 0 12px;color:var(--mut);font-size:12px"},"Picture: "+r.credit):null,
 s.name?h("div",{class:"card",style:"padding:14px;margin:8px 0"},h("b",{style:"font-size:18px"},s.name),s.nameKh?h("div",null,s.nameKh):null,s.place?h("div",{style:"color:var(--mut)"},s.place):null,s.distance?h("div",{style:"margin-top:6px"},"🚗 "+s.distance):null,s.tips?h("div",{style:"margin-top:6px"},"💡 "+s.tips):null,s.respectLine?h("div",{style:"margin-top:8px;font-style:italic;color:var(--mut)"},s.respectLine):null):null,
 s.name?mi("🗺️","Open the map","Find it on your maps app",()=>openLink(mapUrl(st)),true):null,
 srcLink(st)?mi("📖","Read the original story",null,()=>openLink(srcLink(st)),true):null)}
async function shareStory(st){const text=`${BRAND.name}: I colored "${st.title}".`+(st.lesson?` ${st.lesson}`:""),url=location.href.split("#")[0];try{if(navigator.share){await navigator.share({title:BRAND.name,text,url});return}}catch(e){if(e&&e.name==="AbortError")return}copyText(text+" "+url,"Link copied. Paste it to share.")}
function afterStory(st){openSheet("The end",
 st.lesson?h("div",{class:"card",style:"padding:14px;margin-bottom:10px"},h("small",{style:"color:var(--mut)"},"What this story teaches"),h("div",{style:"font-weight:700;font-size:18px;margin-top:4px"},st.lesson),st.lessonKh?h("div",{style:"font-size:17px;margin-top:6px"},st.lessonKh):null):null,
 mi("🎬","Watch my story clip","Your whole story as a video",()=>makeStoryClip(st)),
 hasVisit(st)?mi("📍","Where to see it","Visit the real place",()=>visitSheet(st)):null,
 srcLink(st)?mi("📖","Read the original story",null,()=>openLink(srcLink(st)),true):null,
 mi("↗️","Share",null,()=>shareStory(st)))}
// ================= export: image / pdf / book =================
const MSP=h("span",{style:"position:fixed;left:-9999px;top:0;white-space:nowrap;visibility:hidden"});document.body.append(MSP);
const dw=(t,f)=>{MSP.style.font=f;MSP.textContent=t;return MSP.getBoundingClientRect().width};
const KF='"Noto Sans Khmer","Khmer Sangam MN","Khmer UI",sans-serif';
function wrapD(t,f,mw){const sg=window.Intl&&Intl.Segmenter,parts=[];for(const w of String(t||"").split(/(\s+)/)){if(sg&&dw(w,f)>mw)[...new Intl.Segmenter("km",{granularity:"grapheme"}).segment(w)].forEach(q=>parts.push(q.segment));else parts.push(w)}const L=[];let ln="";for(const w of parts){const te=ln+w;if(dw(te,f)>mw&&ln.trim()){L.push(ln.trim());ln=w.trimStart()}else ln=te}if(ln.trim())L.push(ln.trim());return L}
async function fontsReady(){try{await document.fonts.load('24px "Noto Sans Khmer"');await document.fonts.ready}catch(e){}}
async function layersOf(st,kind,pg){const key=keyOf(st,pg),img=await loadImg(pg.src),w=img.naturalWidth,hh=img.naturalHeight,cc=mk(w,hh),gg=mk(w,hh),x=cc.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,hh);
 if(S.page&&S.key===key){x.drawImage(cv,0,0);gg.getContext("2d").drawImage(gc,0,0)}else{try{const rec=await readLayers(key);if(rec){if(rec.c)x.drawImage(await decodeBlob(rec.c),0,0);if(rec.g)gg.getContext("2d").drawImage(await decodeBlob(rec.g),0,0)}}catch(e){}}
 return{img,cc,gg,w,h:hh}}
function composeFull(img,cc,gg,w,hh){const c=mk(w,hh),x=c.getContext("2d");x.imageSmoothingQuality="high";x.fillStyle="#fff";x.fillRect(0,0,w,hh);if(cc)x.drawImage(cc,0,0,w,hh);x.globalCompositeOperation="multiply";x.drawImage(img,0,0,w,hh);x.globalCompositeOperation="source-over";if(gg)x.drawImage(gg,0,0,w,hh);return c}
function crispLines(img){const w=Math.min(1800,img.naturalWidth*2),hh=Math.round(w*img.naturalHeight/img.naturalWidth),c=hiLine(img,w,hh),u=c.toDataURL("image/png");c.width=1;return u}
function setCap(pg,kind){const c=$("#capcard");if(!c)return;c.innerHTML="";if(kind!=="pages"||!(pg.en||pg.kh)){c.classList.add("hid");document.documentElement.style.setProperty("--capH","0px");return}c.append(pg.kh?h("div",{class:"kh"},pg.kh):null,pg.en?h("div",{class:"en"},pg.en):null);c.classList.remove("hid");document.documentElement.style.setProperty("--capH",c.offsetHeight?c.offsetHeight+8+"px":"0px")}
const hexOf=(r,g,b)=>"#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const hsl=hex=>{const[r,g,b]=rgb(hex).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let H=0,Sa=0;if(d){Sa=d/(1-Math.abs(2*l-1));H=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;H*=60}return[H,Sa,l]},
 fromHsl=(H,Sa,l)=>{const c=(1-Math.abs(2*l-1))*Sa,x=c*(1-Math.abs((H/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(H<60)[r,g,b]=[c,x,0];else if(H<120)[r,g,b]=[x,c,0];else if(H<180)[r,g,b]=[0,c,x];else if(H<240)[r,g,b]=[0,x,c];else if(H<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return hexOf((r+m)*255,(g+m)*255,(b+m)*255)},
 shadesOf=hex=>{const[H,Sa]=hsl(hex);return[.93,.84,.75,.66,.57,.48,.39,.30,.21].map(l=>fromHsl(H,Math.max(.25,Math.min(.95,Sa)),l))};
function hiLine(img,w,hh){const c=mk(w,hh),x=c.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,w,hh);x.imageSmoothingQuality="high";x.drawImage(img,0,0,w,hh);const id=x.getImageData(0,0,w,hh),d=id.data;for(let i=0;i<d.length;i+=4){const v=d[i],o=v<110?0:v>210?255:Math.round((v-110)*2.55);d[i]=d[i+1]=d[i+2]=o}x.putImageData(id,0,0);return c}
async function showResult(blob,name,kind){const ov=$("#ov");ov.innerHTML="";let el;
 if(kind==="video"){el=h("video",{controls:"",playsinline:"",loop:"",autoplay:""});el.src=URL.createObjectURL(blob)}else if(kind==="image"){el=h("img",{src:URL.createObjectURL(blob)})}else el=h("div",{style:"color:#fff;font-size:56px"},"📄");
 ov.append(el,h("div",{style:"color:#fff;text-align:center"},kind==="pdf"?"Your PDF is ready.":kind==="video"?"Your clip is ready.":"Your picture is ready."),
  h("div",{class:"row",style:"justify-content:center"},h("button",{class:"btn pri",onclick:()=>save(blob,name)},"Save / Share"),h("button",{class:"btn",onclick:()=>{ov.classList.add("hid");ov.innerHTML=""}},"Close")));ov.classList.remove("hid");
 if(kind==="video")el.onerror=()=>{if(!el.dataset.e){el.dataset.e=1;const fr=new FileReader();fr.onload=()=>{el.src=fr.result};fr.readAsDataURL(blob)}}}
async function save(blob,name){try{if(window.claude&&window.claude.use){const d=await window.claude.use("downloads");if(d){await d.save({filename:name,data:blob});return}}}catch(e){if(e&&e.code==="declined")return}
 const f=new File([blob],name,{type:blob.type});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==="AbortError")return}
 const u=URL.createObjectURL(blob),a=h("a",{href:u,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);toast("Saved "+name)}
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function exportImage(){busy(true,"Making your picture…");try{await saveNow();const L=await layersOf(S.story,S.kind,S.page),c=composeFull(L.img,L.cc,L.gg,L.w,L.h);const b=await toBlob(c);busy(false);showResult(b,"khmer-legends-"+slug(S.page.title)+".png","image")}catch(e){busy(false);toast("Could not make the picture")}}
async function makePdfN(cs){const enc=new TextEncoder(),parts=[],off=[];let len=0;const add=d=>{const u=typeof d==="string"?enc.encode(d):d;parts.push(u);len+=u.length},N=cs.length;
 add("%PDF-1.4\n");off[1]=len;add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");off[2]=len;add("2 0 obj\n<< /Type /Pages /Kids ["+cs.map((_,i)=>(3+3*i)+" 0 R").join(" ")+"] /Count "+N+" >>\nendobj\n");
 for(let i=0;i<N;i++){const c=cs[i],b=3+3*i,st="q "+c.pw+" 0 0 "+c.ph+" 0 0 cm /Im"+i+" Do Q";off[b]=len;add(b+" 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+c.pw+" "+c.ph+"] /Resources << /XObject << /Im"+i+" "+(b+2)+" 0 R >> >> /Contents "+(b+1)+" 0 R >>\nendobj\n");
  off[b+1]=len;add((b+1)+" 0 obj\n<< /Length "+st.length+" >>\nstream\n"+st+"\nendstream\nendobj\n");off[b+2]=len;add((b+2)+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+c.w+" /Height "+c.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+c.u8.length+" >>\nstream\n");add(c.u8);add("\nendstream\nendobj\n")}
 const xr=len,M=3+3*N;let t="xref\n0 "+M+"\n0000000000 65535 f \n";for(let i=1;i<M;i++)t+=String(off[i]).padStart(10,"0")+" 00000 n \n";add(t+"trailer\n<< /Size "+M+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF");return new Blob(parts,{type:"application/pdf"})}
async function toItem(c){const dpi=S.dpi||300,b=await toBlob(c,"image/jpeg",.9),u8=new Uint8Array(await b.arrayBuffer()),it={u8,w:c.width,h:c.height,pw:+(c.width*72/dpi).toFixed(2),ph:+(c.height*72/dpi).toFixed(2)};c.width=1;return it}
const paperDims=land=>{const p=PAPERS[S.paper]||PAPERS.A4,dpi=S.dpi||300;return{PW:Math.round((land?p.h:p.w)/25.4*dpi),PH:Math.round((land?p.w:p.h)/25.4*dpi),k:dpi/150,M:Math.round(8/25.4*dpi)}};
function coverPage(st,colored){const{PW,PH,k}=paperDims(false),c=mk(PW,PH),x=c.getContext("2d"),g=x.createLinearGradient(0,0,0,PH);g.addColorStop(0,"#1f7a5c");g.addColorStop(1,"#0e4d3a");x.fillStyle=g;x.fillRect(0,0,PW,PH);for(let i=0;i<70;i++)spark(x,Math.random()*PW,Math.random()*PH,rr(3,10)*k,"rgba(255,233,168,.85)");
 const t=(s,y,f,col)=>{x.font=f;x.fillStyle=col;x.fillText(s,(PW-dw(s,f))/2,y)};let fs=72*k;while(fs>30*k&&dw(st.title,`700 ${fs}px system-ui`)>PW-160*k)fs-=2;t(st.title,PH*.433,`700 ${fs}px system-ui`,"#fff6e0");t(st.titleKh||"",PH*.49,`${52*k}px `+KF,"#fff6e0");t(colored?"Colored by "+(S.name||"you"):BRAND.sub,PH*.547,`${34*k}px system-ui`,"#e9d8a6");return c}
async function bookPage(st,kind,pg,colored){const L=await layersOf(st,kind,pg),sticker=kind==="stickers",land=sticker&&L.w>L.h*1.15,{PW,PH,k,M}=paperDims(land),c=mk(PW,PH),x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,PW,PH);
 const capH=sticker?40*k:260*k,sc=Math.min((PW-2*M)/L.w,(PH-2*M-capH)/L.h),aw=Math.round(L.w*sc),ah=Math.round(L.h*sc),ax=Math.round((PW-aw)/2),hl=hiLine(L.img,aw,ah);
 if(colored){x.drawImage(L.cc,ax,M,aw,ah);x.globalCompositeOperation="multiply"}x.drawImage(hl,ax,M);x.globalCompositeOperation="source-over";if(colored)x.drawImage(L.gg,ax,M,aw,ah);hl.width=1;
 if(!sticker){let y=M+ah+54*k;const tf=`700 ${34*k}px system-ui`,kf=`${30*k}px `+KF,ef=`${22*k}px system-ui`;x.fillStyle="#2b2218";x.font=tf;x.fillText(pg.title,(PW-dw(pg.title,tf))/2,y);y+=48*k;wrapD(pg.kh,kf,PW-2*M).forEach(l=>{x.font=kf;x.fillText(l,(PW-dw(l,kf))/2,y);y+=46*k});x.fillStyle="#7a6a58";wrapD(pg.en,ef,PW-2*M).forEach(l=>{x.font=ef;x.fillText(l,(PW-dw(l,ef))/2,y);y+=32*k})}
 x.fillStyle="#a09282";const ff=`${18*k}px system-ui`;x.font=ff;const ft=BRAND.name;x.fillText(ft,(PW-dw(ft,ff))/2,PH-M);return c}
async function exportBook(st,colored,dpi){dpi=dpi||300;S.dpi=dpi;busy(true,"Preparing your book…",0);await fontsReady();
 try{await saveNow();const items=[await toItem(coverPage(st,colored))];for(let i=0;i<st.pages.length;i++){busy(true,`Preparing your book · ${i+1} / ${st.pages.length}`,100*(i+1)/st.pages.length);await sleep(10);items.push(await toItem(await bookPage(st,"pages",st.pages[i],colored)))}
  const b=await makePdfN(items);busy(false);showResult(b,`${slug(BRAND.short)}-${slug(st.title)}-${S.paper.toLowerCase()}-${colored?"my-colored-book":"coloring-book"}.pdf`,"pdf")}
 catch(e){console.error(e);busy(false);if(dpi>150){toast("Not enough memory for the best quality. Trying a lighter version…");return await exportBook(st,colored,150)}toast("Could not make the book on this device")}finally{S.dpi=300}}
async function exportStickers(st,dpi){dpi=dpi||300;S.dpi=dpi;busy(true,"Preparing your stickers…",0);
 try{await saveNow();const items=[];for(let i=0;i<st.stickers.length;i++){busy(true,`Preparing your stickers · ${i+1} / ${st.stickers.length}`,100*(i+1)/st.stickers.length);await sleep(10);items.push(await toItem(await bookPage(st,"stickers",st.stickers[i],true)))}const b=await makePdfN(items);busy(false);showResult(b,`${slug(BRAND.short)}-${slug(st.title)}-${S.paper.toLowerCase()}-stickers.pdf`,"pdf")}
 catch(e){console.error(e);busy(false);if(dpi>150){toast("Not enough memory for the best quality. Trying a lighter version…");return await exportStickers(st,150)}toast("Could not make the stickers")}finally{S.dpi=300}}
async function exportPagePdf(){busy(true,"Making your PDF…");await fontsReady();try{await saveNow();const c=await bookPage(S.story,S.kind,S.page,true),b=await makePdfN([await toItem(c)]);busy(false);showResult(b,"khmer-legends-"+slug(S.page.title)+".pdf","pdf")}catch(e){busy(false);toast("Could not make the PDF")}}
// ================= clips =================
const NOSLEEP="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAANQbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAnp0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAHybWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABnW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAV1zdGJsAAAAuXN0c2QAAAAAAAAAAQAAAKlhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAL2F2Y0MBQsAe/+EAF2dCwB7ZBCbARAAAAwAEAAADAFA8WLkgAQAFaMuDyyAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAXsAAAF7AAAAAYc3R0cwAAAAAAAAABAAAACgAABAAAAAAYc3RzcwAAAAAAAAACAAAAAQAAAAYAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAoAAAABAAAAPHN0c3oAAAAAAAAAAAAAAAoAAAKLAAAACgAAAAoAAAAKAAAACgAAABsAAAAKAAAACgAAAAoAAAAKAAAAFHN0Y28AAAAAAAAAAQAAA4AAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjE2LjEwMAAAAAhmcmVlAAAC/m1kYXQAAAJtBgX//2ncRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTY0IHIzMTA4IDMxZTE5ZjkgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDIzIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MCByZWY9MyBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgxOjB4MTExIG1lPWhleCBzdWJtZT03IHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTEgbWVfcmFuZ2U9MTYgY2hyb21hX21lPTEgdHJlbGxpcz0xIDh4OGRjdD0wIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD01IGtleWludF9taW49MSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTUgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAFmWIhA/yYoAAw+ycnJ1111111111114AAAAGQZo4H+EYAAAABkGaVAf4RgAAAAZBmmA/wjAAAAAGQZqAP8IwAAAAF2WIggEfJigADYjJycnXXXXXXXXXXXXgAAAABkGaOB/hGAAAAAZBmlQH+EYAAAAGQZpgO8IwAAAABkGagDfCMA==";
function keepAwake(){let wl=null,v=null,dead=false;
 try{if(navigator.wakeLock)navigator.wakeLock.request("screen").then(l=>{wl=l;if(dead)try{l.release()}catch(e){}}).catch(()=>{})}catch(e){}
 try{v=document.createElement("video");v.setAttribute("playsinline","");v.setAttribute("muted","");v.muted=true;v.loop=true;v.style.cssText="position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";v.src=NOSLEEP;document.body.append(v);const pl=v.play();if(pl&&pl.catch)pl.catch(()=>{})}catch(e){}
 return()=>{dead=true;try{if(wl)wl.release()}catch(e){}try{if(v){v.pause();v.remove()}}catch(e){}}}
const canRec=()=>window.MediaRecorder&&HTMLCanvasElement.prototype.captureStream;
function record(cvs,fn,dur,prog,audio,acx,opt){return new Promise((res,rej)=>{const ls=audio?["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm"]:["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm"],mime=ls.find(m=>MediaRecorder.isTypeSupported(m));if(!mime)return rej(new Error("no recorder"));
 const st=cvs.captureStream(30);if(audio)st.addTrack(audio);const rec=new MediaRecorder(st,{mimeType:mime,videoBitsPerSecond:(opt&&opt.bps)||4500000}),ch=[];let tt=0,done=false,rel=null;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const finish=early=>{try{if(rel)rel()}catch(e){}document.removeEventListener("visibilitychange",vis);res({blob:new Blob(ch,{type:mime.split(";")[0]}),mime,early:!!early,at:tt,dur})};
 rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
 rec.onstop=()=>{if(!done){done=true;finish(tt<dur-1)}else finish(false)};
 rec.onerror=()=>{if(!done){done=true;try{rec.stop()}catch(e){finish(true)}}};
 rel=keepAwake();
 rec.start(250);
 let last=performance.now(),paused=document.hidden;
 function vis(){if(document.hidden){paused=true;if(!ios){try{rec.pause()}catch(e){}if(acx)try{acx.suspend()}catch(e){}}}else{paused=false;last=performance.now();if(!ios){try{rec.resume()}catch(e){}}if(acx)try{acx.resume()}catch(e){}}}
 document.addEventListener("visibilitychange",vis);
 (function f(){if(done)return;if(tt>=dur){done=true;try{rec.stop()}catch(e){finish(false)}return}const now=performance.now();if(!paused){tt+=Math.min(.1,(now-last)/1000);try{fn(tt)}catch(e){console.error(e)}try{if(prog)prog(tt)}catch(e){}}last=now;requestAnimationFrame(f)})()})}
function sparkPts(L,k,n){const gd=L.gg.getContext("2d").getImageData(0,0,L.w,L.h).data,cd=L.cc.getContext("2d").getImageData(0,0,L.w,L.h).data,pts=[];
 for(let i=0;i<30000&&pts.length<n*.7;i++){const x=(Math.random()*L.w)|0,y=(Math.random()*L.h)|0;if(gd[(y*L.w+x)*4+3]>150)pts.push({x:x*k,y:y*k,r:rr(3,8)*k,p:Math.random(),s:rr(.6,1.5)})}
 for(let i=0;i<30000&&pts.length<n;i++){const x=(Math.random()*L.w)|0,y=(Math.random()*L.h)|0,j=(y*L.w+x)*4;if(!(cd[j]>246&&cd[j+1]>246&&cd[j+2]>246)&&Math.max(cd[j],cd[j+1],cd[j+2])>150&&Math.random()<.4)pts.push({x:x*k,y:y*k,r:rr(2,6)*k,p:Math.random(),s:rr(.5,1.2)})}return pts}
function buildReveal(P,L){
 const LW=360,LH=Math.max(2,Math.round(LW*P.FH/P.FW)),N=LW*LH,sm=composeFull(L.img,null,null,LW,LH),d=sm.getContext("2d").getImageData(0,0,LW,LH).data,lab=new Uint16Array(N),bar=new Uint8Array(N);
 for(let i=0;i<N;i++)bar[i]=d[i*4]<205?1:0;
 const stk=new Int32Array(N),cxs=[0],cys=[0];let nl=0;
 for(let s=0;s<N;s++){if(bar[s]||lab[s])continue;if(nl>=65534)break;nl++;let sp=0,sx=0,sy=0,c=0;stk[sp++]=s;lab[s]=nl;
  while(sp){const p=stk[--sp],x=p%LW,y=(p/LW)|0;sx+=x;sy+=y;c++;
   if(x>0&&!bar[p-1]&&!lab[p-1]){lab[p-1]=nl;stk[sp++]=p-1}
   if(x<LW-1&&!bar[p+1]&&!lab[p+1]){lab[p+1]=nl;stk[sp++]=p+1}
   if(y>0&&!bar[p-LW]&&!lab[p-LW]){lab[p-LW]=nl;stk[sp++]=p-LW}
   if(y<LH-1&&!bar[p+LW]&&!lab[p+LW]){lab[p+LW]=nl;stk[sp++]=p+LW}}
  cxs[nl]=sx/c;cys[nl]=sy/c}
 for(let pass=0;pass<4;pass++){const nx=lab.slice();for(let p=0;p<N;p++){if(lab[p])continue;const x=p%LW,y=(p/LW)|0;let v=0;if(x>0&&lab[p-1])v=lab[p-1];else if(x<LW-1&&lab[p+1])v=lab[p+1];else if(y>0&&lab[p-LW])v=lab[p-LW];else if(y<LH-1&&lab[p+LW])v=lab[p+LW];nx[p]=v}lab.set(nx)}
 const rt=new Float32Array(nl+1);let mx=0;for(let i=1;i<=nl;i++){const q=(cxs[i]/LW*.55+cys[i]/LH*.85)/1.4;rt[i]=.12+q*1.7+Math.random()*.45;if(rt[i]>mx)mx=rt[i]}
 P.lab=lab;P.rt=rt;P.tdone=mx+.5;
 P.mc=mk(LW,LH);P.mctx=P.mc.getContext("2d");P.mimg=P.mctx.createImageData(LW,LH);P.gcv=mk(LW,LH);P.gctx=P.gcv.getContext("2d");P.gimg=P.gctx.createImageData(LW,LH);P.mimg.data.fill(255);P.gimg.data.fill(255)}
function paintMask(P,t){const a=P.mimg.data,b=P.gimg.data,lab=P.lab,rt=P.rt;for(let i=0,n=lab.length;i<n;i++){const v=(t-rt[lab[i]])/.5;let m=0,gl=0;if(v>=1)m=255;else if(v>0){m=v*v*(3-2*v)*255;gl=Math.sin(3.1416*v)*235}a[i*4+3]=m;b[i*4+3]=gl}P.mctx.putImageData(P.mimg,0,0);P.gctx.putImageData(P.gimg,0,0)}
function prepPage(L,FW,idx){const k=FW/L.w,FH=Math.round(L.h*k),lines=composeFull(L.img,null,null,FW,FH),col=composeFull(L.img,L.cc,null,FW,FH),gl=mk(FW,FH);gl.getContext("2d").drawImage(L.gg,0,0,FW,FH);
 const n=idx==null?-1:idx,mo=n>=0?(MOTION[n+1]||{petals:{n:6}}):{petals:{n:5,gold:1}},P={lines,col,gl,pts:sparkPts(L,k,260),FW,FH,mo,dur:5,kz:.04+(Math.max(n,0)%3)*.01,kx:n%2?1:-1,ky:(n%3===1?-1:1)*.6,scene:null};
 buildReveal(P,L);
 P.dispose=()=>{if(P.scene){P.scene.dispose();P.scene=null}P.lines=P.col=P.gl=P.mc=P.gcv=null};return P}
let TA=null,TB=null;const temps=(w,h)=>{if(!TA||TA.width!==w||TA.height!==h){TA=mk(w,h);TB=mk(w,h)}return[TA,TB]};
const easeIO=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
function rpath(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawPage(g,P,t,ox,oy,al){ // your colors paint in shape by shape, then the page comes alive (clean effects, slow camera, twinkles)
 const fw=P.FW,fh=P.FH,paint=t<P.tdone;let A,B,top;
 if(paint){[A,B]=temps(fw,fh);paintMask(P,t);const a=A.getContext("2d");a.globalCompositeOperation="copy";a.drawImage(P.col,0,0);a.globalCompositeOperation="destination-in";a.drawImage(P.mc,0,0,fw,fh);a.globalCompositeOperation="source-over";
  const b=B.getContext("2d");b.globalCompositeOperation="copy";b.fillStyle="#ffd36b";b.fillRect(0,0,fw,fh);b.globalCompositeOperation="destination-in";b.drawImage(P.gcv,0,0,fw,fh);b.globalCompositeOperation="source-over"}
 else{const sc=P.scene||(P.scene=mkScene(P.col,P.mo||{},fw));sc.draw(t,clamp((t-P.tdone)/1.2,0,1));top=sc.cv}
 const u=clamp(t/(P.dur||5),0,1),z=1+(P.kz==null?.045:P.kz)*easeIO(u);
 g.save();g.globalAlpha=al;rpath(g,ox,oy,fw,fh,P.round==null?18:P.round);g.clip();
 g.translate(ox+fw/2+(P.kx||0)*u*fw*.02,oy+fh/2+(P.ky||0)*u*fh*.016);g.scale(z,z);g.translate(-fw/2,-fh/2);
 g.drawImage(P.lines,0,0);
 if(paint){g.drawImage(A,0,0);g.save();g.globalCompositeOperation="screen";g.globalAlpha=al*.6;g.drawImage(B,0,0);g.restore()}else g.drawImage(top,0,0);
 const sa=clamp((t-P.tdone+.2)/.7,0,1);if(sa>0){g.globalAlpha=al*sa;g.drawImage(P.gl,0,0);P.pts.forEach(q=>{const a2=Math.max(0,Math.sin(6.283*(t*q.s*.6+q.p))),v=a2*a2*a2;if(v>.05){g.globalAlpha=al*sa*v;star(g,q.x,q.y,q.r*(.6+.7*v),"#fff8d8")}})}
 g.restore()}
// ================= AI animation clips (videos you make with an AI tool, played in your story clip) =================
const ANIMTXT=["Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Preah Thong (left, prince with a pointed Khmer crown) and Neang Neak (right, princess with a golden crown) stand side by side with hands joined in a respectful prayer greeting. Behind them a huge seven-headed naga rises with its coils around the bottom. Water and lotus flowers are at the bottom corners.\n\nMOTION: Both characters breathe slowly and blink softly; a tiny gentle head tilt. The seven naga heads sway very slowly one after another, the hoods swelling a little. Lotus flowers and leaves rock gently on the water, small ripples spread across the water, tiny golden sparkles drift upward.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 1, \"The legend\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-legend.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: A decorative frame made of a long naga body coiling around the page with lotus flowers and lily pads in the corners. The center of the frame is empty.\n\nMOTION: The naga body slowly slithers along the frame in a smooth loop, its scales shimmering with moving highlights. Lotus petals and lily pads sway gently. Keep the empty center completely clean and still.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 2, \"Story frame\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-story-frame.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: An underwater naga kingdom: a grand Khmer-style palace in the center, coral and seaweed on both sides, wave lines at the surface at the top, small fish near the top, bubbles, and lotus-covered rocks at the bottom.\n\nMOTION: Fish glide smoothly across the water in gentle curves. Bubbles rise slowly and wobble. Coral and seaweed sway with the current. Soft light rays slowly sweep down from the surface, and the surface waves roll gently. The palace itself stays still.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 3, \"Beneath the waves\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-beneath-the-waves.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Prince Preah Thong stands on the deck of a wooden sailing ship with a large sail decorated with a lotus emblem. A small green island with a huge banyan tree is on the right, a big sun with rays shines in the sky, with clouds. A naga body and lotus flowers fill the bottom.\n\nMOTION: The ship rocks very gently on the waves and glides slowly forward. The sail billows softly and the flag at the mast flutters. The prince's clothes and hair move lightly in the breeze and he blinks. Waves roll, clouds drift slowly, the sun glows softly, banyan leaves rustle, a few seabirds fly across the sky. Lotus flowers sway.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 4, \"The prince sails\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-prince-sails.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Neang Neak sits in the middle of a long carved boat with four maids (two on each side), rowing across the water to the island. A big tree stands on the right, clouds in the sky, lotus flowers at the bottom.\n\nMOTION: The boat glides slowly forward, rocking gently with small ripples around it. Neang Neak and the maids breathe, blink, and their hair and clothes move lightly in the breeze. Tree leaves rustle, clouds drift slowly, a few birds fly across, lotus flowers sway.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 5, \"Neang Neak arrives\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-neang-neak-arrives.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Preah Thong sits on the ground at the left beneath a great tree, looking up. Neang Neak and three maids stand beside him. Big leaves form the canopy at the top, clouds drift in the sky, lotus flowers at the bottom.\n\nMOTION: All characters breathe and blink. Preah Thong turns his head slightly toward Neang Neak and back. Hair and clothing sway lightly in the breeze. Tree leaves rustle and sunlight flickers through them, a few leaves fall, clouds drift slowly, lotus flowers sway.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 6, \"The meeting\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-meeting.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Underwater: Neang Neak swims forward guiding Preah Thong, who holds the end of her flowing cloth (sbai) behind her. Fish swim near the top, bubbles rise, coral and seaweed grow on both sides.\n\nMOTION: Both characters glide forward with slow, graceful swimming movements. Neang Neak's sbai and hair flow and billow in the water, Preah Thong's cloth and hair float. Bubbles rise, fish swim past, seaweed and coral sway with the current, soft light rays sweep from the surface.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 7, \"Hold the hem\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-hold-the-hem.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: A shining underwater palace in the center guarded by four multi-headed naga guards, two on each side. Fish swim near the top, coral and bubbles around, a lotus pond at the bottom.\n\nMOTION: The naga guards' hoods sway slowly and their eyes blink. Fish swim across, bubbles rise, seaweed and coral sway with the current, light rays sweep gently from the surface. Lotus flowers bob softly. The palace stays still.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 8, \"The naga palace\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-naga-palace.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Preah Thong at the left bows with his hands joined, the great seven-headed naga king sits on a carved throne in the center, and Neang Neak stands at the right with her hands joined. Fish swim above, coral behind.\n\nMOTION: Preah Thong makes a slow respectful bow and rises. The naga king's seven heads sway slowly and his chest rises with breathing. Neang Neak blinks and her clothes move lightly. Fish swim across the top, bubbles rise, coral sways, soft light rays move through the water.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 9, \"Asking the naga king\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-asking-the-naga-king.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Preah Thong and Neang Neak sit side by side under a flower-covered arch at a grand wedding feast. Musicians at the left play a drum and a xylophone, dancers at the right perform, a food table is in front, and lanterns and flower garlands hang above.\n\nMOTION: The musicians' hands move as they play the drum and xylophone. The dancers perform slow graceful Khmer hand and body movements. The couple smile, blink and breathe. Lanterns swing gently, garlands and curtains sway, and a few golden sparkles and flower petals float down.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 10, \"The wedding feast\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-wedding-feast.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: The seven-headed naga king rises behind a river, one head lowering to drink the water. Preah Thong points toward the land while Neang Neak stands beside him with her hands joined. Trees and hills are on the right.\n\nMOTION: The naga head drinks, the river water slowly drains and swirls with ripples. The other heads sway gently. Preah Thong's pointing arm moves slightly, both characters breathe and blink. Tree leaves rustle, leaves fall, clouds drift slowly.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 11, \"The king drinks the sea\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-the-king-drinks-the-sea.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: A bird's-eye view of green rice fields with a winding river, a Khmer palace on a hill at the top right, village houses on stilts, farmers working and oxen walking. Preah Thong and Neang Neak stand in the foreground on the right.\n\nMOTION: Farmers bend and work the fields, oxen walk slowly, the river flows gently with sparkling ripples, rice plants sway in the wind, clouds drift, birds fly across the sky, smoke rises from the village. Preah Thong and Neang Neak breathe and blink.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 12, \"A new kingdom\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-a-new-kingdom.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: A modern Khmer wedding: the bride walks in front and the groom follows holding the end of her sbai (cloth). Musicians and guests sit at both sides, lanterns and garlands hang above.\n\nMOTION: The bride and groom walk slowly forward in a gentle walking motion while their feet stay in the frame, the sbai flows between them. They blink and smile. Musicians play, guests clap softly, lanterns swing and garlands sway, a few flower petals fall.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 13, \"A wedding today\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-a-wedding-today.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: Five standing figures in Khmer clothing from five eras, standing in a row. The reference image has a printed label strip at the bottom: in the video that strip must be plain empty paper-colored background with no letters at all (tip: crop the label strip off the picture before uploading).\n\nMOTION: Each figure breathes slowly, blinks, and makes a very small head tilt. Fabric and jewelry move lightly. Small flowers sway. Nothing else changes.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 14, \"Dress through time\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-dress-through-time.png, as the first frame).", "Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: A decorative naga frame with lotus flowers in the corners; the center is left empty for the user.\n\nMOTION: The naga body slowly slithers along the frame in a smooth loop with moving scale highlights. Lotus petals sway gently. Keep the empty center completely clean and still.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking, no sudden zooms.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of page 15, \"Color your own\" (in the app use the page menu, Save as image, then upload that PNG, named khmer-legends-color-your-own.png, as the first frame)."];
const genericAnim=(i,pg)=>`Animate this exact illustration into a smooth looping 5-second video, keeping the same 3:4 vertical framing.\n\nSTYLE LOCK: Keep the artwork exactly as in the reference image: same line art, colors, painting style, characters, faces, costumes, jewelry and composition. Do not redraw, restyle, add, remove or replace anything. Do not change any Khmer clothing and do not mix in clothing from other cultures.\n\nSCENE: ${pg.en||pg.title}\n\nMOTION: Natural gentle motion of everything that can move: breathing and blinking of characters, hair and cloth in a light breeze, water ripples, leaves, clouds, bubbles, sparkles. Keep still anything that should stay still.\n\nCAMERA: a very slow, gentle push-in of about 4 percent. No cuts, no shaking.\n\nNO LETTERS: absolutely no letters, no text, no words, no numbers, no captions, no logos and no watermarks anywhere in the video.\n\nSOUND: soft natural ambient sounds only. No music, no speech.\n\nREFERENCE IMAGE TO UPLOAD: the picture of this page, "${pg.title}" (page menu, Save as image, then upload that PNG as the first frame).`;
const animText=(idx,pg)=>S.kind==="pages"&&ANIMTXT[idx]?ANIMTXT[idx]:genericAnim(idx,pg);
const VIDS={};
async function getVid(key){if(VIDS[key]!==undefined)return VIDS[key];const r=await dbGet("p","v:"+key);VIDS[key]=r&&r.b?new Blob([r.b],{type:r.t||"video/mp4"}):null;return VIDS[key]}
async function putVid(key,file){const t=file.type||"video/mp4",ab=await file.arrayBuffer();await dbPut("p","v:"+key,{b:ab,t});VIDS[key]=new Blob([ab],{type:t});const s0=S.sum[key]||{cov:0,th:"",t:Date.now()};s0.vd=1;S.sum[key]=s0;await dbPut("s",key,s0)}
async function delVid(key){await dbPut("p","v:"+key,null);VIDS[key]=null;const s0=S.sum[key];if(s0){s0.vd=0;await dbPut("s",key,s0)}}
function mkVideo(blob){const v=document.createElement("video");v.muted=true;v.defaultMuted=true;v.loop=true;v.preload="auto";v.setAttribute("playsinline","");v.setAttribute("muted","");v.style.cssText="position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";document.body.appendChild(v);v.src=URL.createObjectURL(blob);return v}
const vidMeta=v=>new Promise(res=>{if(v.readyState>=1)return res(v.duration);v.onloadedmetadata=()=>res(v.duration);v.onerror=()=>res(0);setTimeout(()=>res(v.duration||0),6000)});
function dropVideo(v){try{v.pause();URL.revokeObjectURL(v.src);v.removeAttribute("src");v.load();v.remove()}catch(e){}}
function drawVid(g,v,x,y,w,hh,al,r){const vw=v.videoWidth,vh=v.videoHeight;if(!vw||v.readyState<2)return false;const k=Math.max(w/vw,hh/vh),dw2=vw*k,dh2=vh*k;g.save();g.globalAlpha=al;rpath(g,x,y,w,hh,r);g.clip();g.drawImage(v,x+(w-dw2)/2,y+(hh-dh2)/2,dw2,dh2);g.restore();return true}
async function copyText(t,msg){msg=msg||"Prompt copied";try{await navigator.clipboard.writeText(t);toast(msg);return}catch(e){}try{const ta=h("textarea",{style:"position:fixed;opacity:0;left:-999px"});ta.value=t;document.body.append(ta);ta.select();document.execCommand("copy");ta.remove();toast(msg)}catch(e){toast("Press and hold the text to copy it")}}
function animSheet(){const idx=S.idx,pg=S.page,key=S.key,has=!!(S.sum[key]||{}).vd,txt=animText(idx,pg);
 const ta=h("textarea",{readonly:"",rows:8,style:"width:100%;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:inherit;font:13px/1.45 system-ui;resize:none"});ta.value=txt;
 const fi=h("input",{type:"file",accept:"video/*",style:"display:none",onchange:async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;busy(true,"Adding your video…");try{await putVid(key,f);busy(false);toast("Video added to this page 🎞");animSheet()}catch(err){console.error(err);busy(false);toast("Could not add that video")}}});
 openSheet("✨ Animate this page with AI",
  h("p",{style:"margin:0 0 6px;color:var(--mut)"},"For real animation, like breathing, flowing cloth and flying birds, make a short video of this page in an AI video tool, then add it here. Your story clip will play it."),
  h("h3",null,"1 · Save this page as a picture"),mi("🖼️","Save as image","Upload it to the AI tool as the first frame",()=>exportImage()),
  h("h3",null,"2 · Copy the prompt"),ta,h("button",{class:"btn pri",style:"width:100%;margin-top:8px",onclick:()=>copyText(txt)},"Copy prompt"),
  h("h3",null,"3 · Add the video you made"),h("button",{class:"btn",style:"width:100%",onclick:()=>fi.click()},has?"Replace video":"Choose video"),fi,
  has?h("button",{class:"btn",style:"width:100%;margin-top:8px",onclick:async()=>{await delVid(key);toast("Video removed");animSheet()}},"Remove video"):null)}
async function playVideoPreview(){const b=await getVid(S.key);if(!b){toast("No video found for this page");return}const g=fxSize(),fw=fxc.width,fh=fxc.height,v=mkVideo(b);$("#ePlay").style.color="var(--acc)";pv={raf:0,sc:{dispose(){dropVideo(v)}}};try{await v.play()}catch(e){}
 const f=()=>{if(!pv)return;g.clearRect(0,0,fw,fh);drawVid(g,v,0,0,fw,fh,1,0);pv.raf=requestAnimationFrame(f)};f()}
async function makePageClip(){if(!canRec()){toast("Clips are not supported in this browser");return}busy(true,"Making your sparkle clip…",0);try{await saveNow();const L=await layersOf(S.story,S.kind,S.page),P=prepPage(L,720,S.kind==="pages"?S.idx:-1),c=mk(720,P.FH),g=c.getContext("2d"),D=6;P.dur=D;P.round=0;
  const r=await record(c,t=>{g.fillStyle="#fff";g.fillRect(0,0,720,P.FH);drawPage(g,P,t,0,0,1)},D,t=>busy(true,"Making your sparkle clip…",100*t/D));busy(false);P.dispose();showResult(r.blob,"khmer-legends-"+slug(S.page.title)+(r.mime.includes("mp4")?".mp4":".webm"),"video");if(r.early)setTimeout(()=>toast("The recorder stopped early, so this clip is shorter than planned. Keep this screen in front and try again.",9000),600)}catch(e){console.error(e);busy(false);toast("Could not make the clip on this device")}}
function makeMusic(ac,dest,total){const sr=ac.sampleRate,ir=ac.createBuffer(2,Math.floor(sr*2.4),sr);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6)}
 const comp=ac.createDynamicsCompressor(),m=ac.createGain(),wet=ac.createGain(),rev=ac.createConvolver();rev.buffer=ir;wet.gain.value=.5;m.connect(comp);comp.connect(dest);m.connect(rev);rev.connect(wet);wet.connect(comp);
 const a0=ac.currentTime+.25;m.gain.setValueAtTime(0,a0);m.gain.linearRampToValueAtTime(.6,a0+2);m.gain.setValueAtTime(.6,a0+total-2.5);m.gain.linearRampToValueAtTime(0,a0+total-.1);
 const T=t=>a0+t,note=(f,t,l,v,type)=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type||"triangle";o.frequency.value=f;g.gain.setValueAtTime(0,T(t));g.gain.linearRampToValueAtTime(v,T(t)+.012);g.gain.exponentialRampToValueAtTime(.0008,T(t)+l);o.connect(g);g.connect(m);o.start(T(t));o.stop(T(t)+l+.05)};
 const pad=(fs,t,l)=>fs.forEach(f=>[-6,6].forEach(dt=>{const o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter();o.type="sawtooth";o.frequency.value=f;o.detune.value=dt;fl.type="lowpass";fl.frequency.value=800;g.gain.setValueAtTime(0,T(t));g.gain.linearRampToValueAtTime(.02,T(t)+l*.35);g.gain.linearRampToValueAtTime(0,T(t)+l);o.connect(fl);fl.connect(g);g.connect(m);o.start(T(t));o.stop(T(t)+l+.1)}));
 const CH=[[110,164.81,220,261.63],[87.31,130.81,174.61,261.63],[130.81,196,261.63,329.63],[98,146.83,196,293.66]],SC=[261.63,293.66,329.63,392,440,523.25,587.33,659.25],ph=[0,2,4,2,3,1,2,0,4,5,4,2,3,1,0,1];
 for(let b=0,t=0;t<total;b++,t+=4.8)pad(CH[b%4],t,6);for(let i=0,t=0;t<total;i++,t+=.6)note(SC[Math.min(7,ph[i%16]+(((i/16)|0)%2))],t,1.2,i%4===0?.5:.36);
 return()=>{try{m.gain.cancelScheduledValues(ac.currentTime);m.gain.linearRampToValueAtTime(0,ac.currentTime+.4)}catch(e){}}}
// ---- keep the phone awake while a clip is being recorded (a locked screen stops the recording) ----
const NS_MP4="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMzbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAl10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAACAAAAAgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAAAAABAAAAAAHVbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAgABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABgG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAUBzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAe/+EAFmdCwB7ZCWwEQAAAAwBAAAADAQPFi5IBAAVoy4PLIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAAqMAAAKjAAAABhzdHRzAAAAAAAAAAEAAAAEAAAgAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAEAAAAAQAAACRzdHN6AAAAAAAAAAAAAAAEAAAChQAAAAoAAAAKAAAACgAAABRzdGNvAAAAAAAAAAEAAANjAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDAAAAAIZnJlZQAAAqttZGF0AAACcAYF//9s3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MiBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAA1liIQFPJigAD+/J114AAAABkGaOAp5YAAAAAZBmlQCnlgAAAAGQZpgEvLA",NS_WEBM="data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIoEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggIS7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECfQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYgEqBuxy3JL0ZyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhB3NZQDgibCBILqBIJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYgEqBuxy3JL0WfIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDIuMDAwMDAwMDAwAB9DtnXu54EAo6SBAACAMAIAnQEqIAAgAABHCIWFiIWEiAICAAeQ88nA/v+rUICjlYEB9ACxAQABEBAAGAAYWC/0AAhwAKOVgQPoALEBAAEQEAAYABhYL/QACHAAo5WBBdwAsQEAARAQABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGf8IED";
let _nos=null,_wl=null;
function keepAwake(){try{if(navigator.wakeLock)navigator.wakeLock.request("screen").then(l=>{_wl=l}).catch(()=>{})}catch(e){}
 try{if(!_nos){const v=document.createElement("video");v.setAttribute("playsinline","");v.setAttribute("muted","");v.muted=true;v.loop=true;v.style.cssText="position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;pointer-events:none";v.onerror=()=>{if(v.src.indexOf("video/webm")<0){v.src=NS_WEBM;const q=v.play();if(q&&q.catch)q.catch(()=>{})}};v.src=NS_MP4;document.body.appendChild(v);_nos=v}const pr=_nos.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}}
function releaseAwake(){try{if(_wl){_wl.release();_wl=null}}catch(e){}try{if(_nos){_nos.pause();_nos.remove();_nos=null}}catch(e){}}
async function makeStoryClip(st){if(!canRec()){toast("Clips are not supported in this browser");return}keepAwake();await saveNow();await fontsReady();const N=st.pages.length;busy(true,"Getting your pages ready…",0);
 let acx=null,dest=null;try{acx=new(window.AudioContext||window.webkitAudioContext)();acx.resume();dest=acx.createMediaStreamDestination()}catch(e){acx=null}
 const lite=/iPhone|iPod/.test(navigator.userAgent)||Math.min(screen.width,screen.height)<500,K=lite?.75:1,MW=720,MH=1280,PW=660,PX=30,PY=72,PD=lite?5:5.6,OV=.6,T0=3.4,TE=3.4,ez=x=>x*x*(3-2*x),D=Array(N).fill(PD),St=[],VB={};let endAt=0,total=0;
 const prs={},pages={},ths=[];
 const mkCap=pg=>{const w=MW,c=mk(w,300),x=c.getContext("2d"),en=pg.en||"",kh=pg.kh||"";let fs=30,el=[],kl=[];
  for(;fs>=20;fs-=2){el=wrapD(en,`600 ${fs}px system-ui`,w-90);kl=wrapD(kh,`${fs-2}px ${KF}`,w-90);if(el.length<=3&&kl.length<=3)break}
  const lh=Math.round(fs*1.34);x.textBaseline="top";x.shadowColor="rgba(0,0,0,.6)";x.shadowBlur=8;let y=0;x.font=`600 ${fs}px system-ui`;x.fillStyle="#fff6e0";
  el.forEach(l=>{x.fillText(l,(w-dw(l,x.font))/2,y);y+=lh});y+=12;x.font=`${fs-2}px ${KF}`;x.fillStyle="#f3d98f";kl.forEach(l=>{x.fillText(l,(w-dw(l,x.font))/2,y);y+=lh});return c};
 const ensure=i=>prs[i]||(prs[i]=(async()=>{const L=await layersOf(st,"pages",st.pages[i]),P=prepPage(L,PW,i);P.dur=D[i];P.cap=mkCap(st.pages[i]);if(VB[i])P.video={el:mkVideo(VB[i])};const th=mk(110,Math.round(110*P.FH/P.FW));th.getContext("2d").drawImage(P.col,0,0,th.width,th.height);ths[i]=th;pages[i]=P;return P})());
 let cover=null;try{if(st.cover)cover=await loadImg(st.cover)}catch(e){}
 try{for(let i=0;i<N;i++){const key=keyOf(st,st.pages[i]);if(!(S.sum[key]||{}).vd)continue;const b=await getVid(key);if(!b)continue;VB[i]=b;const tv=mkVideo(b),d=await vidMeta(tv);dropVideo(tv);D[i]=clamp(isFinite(d)&&d>0?d:PD,3,8)}}catch(e){console.error(e)}
 St[0]=T0;for(let n=1;n<N;n++)St[n]=St[n-1]+D[n-1]-OV;endAt=St[N-1]+D[N-1];total=endAt+TE;
 try{await ensure(0);busy(true,"Getting your pages ready…",50);await ensure(1)}catch(e){console.error(e);busy(false);releaseAwake();toast("Not enough memory to make the clip");return}
 const m=mk(Math.round(MW*K),Math.round(MH*K)),g=m.getContext("2d"),shc={},shadowOf=fh=>shc[fh]||(shc[fh]=(()=>{const c=mk(PW+160,fh+160),x=c.getContext("2d");x.shadowColor="rgba(0,0,0,.55)";x.shadowBlur=36;x.shadowOffsetY=12;rpath(x,80,80,PW,fh,18);x.fillStyle="#fff";x.fill();return c})()),stars=Array.from({length:70},()=>({x:Math.random()*MW,y:Math.random()*MH,r:rr(2,6),p:Math.random(),s:rr(.5,1.2)})),dust=Array.from({length:22},()=>({x:Math.random()*MW,y:Math.random(),v:rr(.02,.05),r:rr(2,4.5),p:Math.random()*6}));
 const bg=t=>{const gr=g.createLinearGradient(0,0,0,MH);gr.addColorStop(0,"#1f7a5c");gr.addColorStop(1,"#0a3a2c");g.globalAlpha=1;g.fillStyle=gr;g.fillRect(0,0,MW,MH);stars.forEach(q=>{const a=Math.max(0,Math.sin(6.283*(t*q.s*.5+q.p)));g.globalAlpha=a*a*.9;star(g,q.x,q.y,q.r,"#ffe9a8")});dust.forEach(q=>{const y=(((q.y-q.v*t)%1)+1)%1*MH;g.globalAlpha=.35+.3*Math.sin(t*1.5+q.p);g.fillStyle="#ffe9a8";g.beginPath();g.arc(q.x+Math.sin(t*.6+q.p)*14,y,q.r,0,6.283);g.fill()});g.globalAlpha=1};
 const cen=(s,y,f,c)=>{g.font=f;g.fillStyle=c;g.fillText(s,(MW-dw(s,f))/2,y)};
 const fit=(s,px,w,wt)=>{while(px>20&&dw(s,`${wt} ${px}px system-ui`)>w)px-=2;return`${wt} ${px}px system-ui`};
 const title=(t,al)=>{g.globalAlpha=al;let y0=520;
  if(cover&&cover.naturalWidth){let cw=PW,ch=Math.round(cw*cover.naturalHeight/cover.naturalWidth);if(ch>840){cw=Math.round(cw*840/ch);ch=840}const cx0=(MW-cw)/2,cy=110,zz=1+.035*clamp(t/T0,0,1);g.save();g.shadowColor="rgba(0,0,0,.5)";g.shadowBlur=30;rpath(g,cx0,cy,cw,ch,22);g.fillStyle="#fff";g.fill();g.restore();g.save();rpath(g,cx0,cy,cw,ch,22);g.clip();g.translate(MW/2,cy+ch/2);g.scale(zz,zz);g.drawImage(cover,-cw/2,-ch/2,cw,ch);g.restore();y0=cy+ch+78}
  g.globalAlpha=al*Math.min(1,t/.8);cen(st.title,y0,fit(st.title,52,MW-80,700),"#fff6e0");cen(st.titleKh||"",y0+62,"34px "+KF,"#f3d98f");cen(S.name?"colored by "+S.name:"colored by you",y0+112,"22px system-ui","#e9d8a6");g.globalAlpha=1};
 const finale=(t,al)=>{g.globalAlpha=al;g.fillStyle="#0a3a2c";g.fillRect(0,0,MW,MH);bg(t);g.globalAlpha=al;cen("You brought it to life",170,"700 46px system-ui","#fff6e0");cen(S.name?"Thank you, "+S.name+" ♥":"Thank you for coloring ♥",224,"26px system-ui","#e9d8a6");const cols=5,tw=110,gap=14,x0=(MW-(cols*tw+(cols-1)*gap))/2;ths.forEach((c,n)=>{if(!c)return;const r=Math.floor(n/cols),k=n%cols,a=ez(clamp((t-.3-n*.12)/.4,0,1));if(a<=0)return;const w=tw*a,hh=c.height*a;g.globalAlpha=al*a;g.drawImage(c,x0+k*(tw+gap)+tw/2-w/2,330+r*(c.height+gap)+c.height/2-hh/2,w,hh)});g.globalAlpha=al;cen("Made with "+BRAND.name,MH-60,"20px system-ui","#9fc9b4");g.globalAlpha=1};
 const fn=t=>{g.setTransform(K,0,0,K,0,0);let cur=0;while(cur<N-1&&t>=St[cur+1])cur++;for(let j=cur;j<=cur+2&&j<N;j++)ensure(j);
  bg(t);if(t<T0+OV)title(t,t<T0?1:1-clamp((t-T0)/OV,0,1));
  for(let n=0;n<N;n++){const lt=t-St[n];
   if(lt>=0&&lt<D[n]){const P=pages[n];if(!P)continue;const al=clamp(lt/OV,0,1),ya=PY+Math.round((1-ez(al))*34);
    g.globalAlpha=al;g.drawImage(shadowOf(P.FH),PX-80,ya-80);g.globalAlpha=1;
    if(P.video&&!P.vs){P.vs=1;const vv=P.video.el;try{vv.currentTime=0}catch(e){}vv.play().catch(()=>{})}
    if(!(P.video&&drawVid(g,P.video.el,PX,ya,PW,P.FH,al,18)))drawPage(g,P,lt,PX,ya,al);
    const fo=clamp((D[n]-lt)/OV,0,1);g.globalAlpha=al*fo;g.font="600 22px system-ui";g.fillStyle="#bfe0d0";const tt=`${n+1} / ${N}  ·  ${st.pages[n].title}`;g.fillText(tt,(MW-dw(tt,g.font))/2,ya-26);
    const ca=clamp((lt-1)/.7,0,1)*al*fo;if(ca>0){g.globalAlpha=ca;g.drawImage(P.cap,0,ya+P.FH+34+(1-ca)*16)}g.globalAlpha=1}
   else if(lt>=D[n]&&pages[n]){if(pages[n].video)dropVideo(pages[n].video.el);pages[n].dispose();delete pages[n]}}
  if(t>endAt-OV)finale(t-(endAt-OV),clamp((t-(endAt-OV))/OV,0,1))};
 let stopM=null;try{if(acx)stopM=makeMusic(acx,dest,total+1);const r=await record(m,fn,total,t=>busy(true,`Making your story clip · ${Math.round(t)} / ${Math.round(total)} s. Keep this screen on and in front. Do not lock the phone.`,100*t/total),acx?dest.stream.getAudioTracks()[0]:null,acx,{bps:lite?3000000:4500000});busy(false);showResult(r.blob,"khmer-legends-"+slug(st.title)+"-story"+(r.mime.includes("mp4")?".mp4":".webm"),"video");if(r.early)setTimeout(()=>toast(`The recorder stopped early, at ${Math.round(r.at)} of ${Math.round(r.dur)} seconds, so this clip is not the full story. On iPhone, a locked screen stops the recording. Keep the screen on and in front, or set Settings > Display & Brightness > Auto-Lock to Never while you make the clip, then try again.`,14000),600)}catch(e){console.error(e);busy(false);toast("Could not make the clip on this device")}
 releaseAwake();if(stopM)stopM();if(acx)setTimeout(()=>acx.close&&acx.close(),900)}
// ================= test tools =================
async function demoStory(st){busy(true,"Adding demo colors…",0);const PAL=STYLES[S.styleIdx].c.map(rgb);
 try{for(let i=0;i<st.pages.length;i++){busy(true,`Adding demo colors · ${i+1} / ${st.pages.length}`,100*(i+1)/st.pages.length);await sleep(20);const pg=st.pages[i],img=await loadImg(pg.src),w=img.naturalWidth,hh=img.naturalHeight,b=barOf(img),L=labelFrom(b,w,hh),ys=new Int32Array(L.n+1).fill(hh),ye=new Int32Array(L.n+1);
  for(let q=0;q<w*hh;q++){const r=L.lab[q];if(r){const y=(q/w)|0;if(y<ys[r])ys[r]=y;if(y>ye[r])ye[r]=y}}
  const c=mk(w,hh),x=c.getContext("2d"),id=x.createImageData(w,hh),d=id.data;d.fill(255);const c1=[],c2=[];for(let r=1;r<=L.n;r++){const a=PAL[(Math.imul(r,2654435761)>>>0)%PAL.length],bb=PAL[((Math.imul(r,2654435761)>>>0)+5)%PAL.length],big=L.sz[r]>w*hh*.02;c1[r]=big?a.map((v,k)=>v*.75+255*.25):a;c2[r]=big?bb.map(v=>v*.8):a}
  for(let q=0;q<w*hh;q++){const r=L.lab[q];if(!r)continue;const t=ye[r]>ys[r]?((q/w|0)-ys[r])/(ye[r]-ys[r]):0,j=q*4;d[j]=c1[r][0]+(c2[r][0]-c1[r][0])*t;d[j+1]=c1[r][1]+(c2[r][1]-c1[r][1])*t;d[j+2]=c1[r][2]+(c2[r][2]-c1[r][2])*t}
  x.putImageData(id,0,0);const th=shrink(c,150,Math.round(150*hh/w)),tx=th.getContext("2d");tx.globalCompositeOperation="multiply";tx.drawImage(shrink(img,150,th.height),0,0);const key=keyOf(st,pg),sm={cov:.9,th:th.toDataURL("image/jpeg",.7),t:Date.now(),md:false};const cb0=await toBlob(c);CACHE[key]={c:cb0,g:null};await dbPut("p",key,{c:await cb0.arrayBuffer(),g:null});await dbPut("s",key,sm);S.sum[key]=sm}}
 catch(e){console.error(e)}busy(false);renderStory();toast("Demo colors added")}
// ================= start =================
async function init(){
 S.sound=(await dbGet("m","sound"))!==false;S.name=(await dbGet("m","name"))||"";S.recent=(await dbGet("m","recent"))||[];S.paper=(await dbGet("m","paper"))||(/-(US|CA|MX|PH)$/i.test(navigator.language||"")?"Letter":"A4");S.dpi=300;S.fillArea=!!(await dbGet("m","fillArea"));S.styleIdx=(await dbGet("m","style"))||0;S.last=(await dbGet("m","last"))||null;S.dev=!!(await dbGet("m","dev"));
 try{await loadBook()}catch(e){document.body.append(h("p",{style:"padding:24px"},"Could not load the book files."));return}
 try{await dbPut("m","selftest",new Uint8Array([1,2,3]).buffer);const v=await dbGet("m","selftest");S.storageOk=!!(v&&v.byteLength===3)}catch(e){S.storageOk=false}
 await renderHome();syncWell();
 if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)&&!window.BOOK)navigator.serviceWorker.register("sw.js").catch(()=>{})}
init()})();
