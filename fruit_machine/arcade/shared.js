/* Shared with the original game (static/index.html): sound engine, music, symbol art,
   win effects, cash-pot drawing, topper bulbs, gamepad polling. Extracted 2026-10-11. */
/* ---------- Sound ---------- */
let AC=null, soundOn=true, spinOsc=null;
function audio(){ if(!AC){ try{AC=new(window.AudioContext||window.webkitAudioContext)(); loadSnd();}catch(e){} } return AC; }

/* ---------- Recorded sample engine (ChatGPT sound pack, embedded as data URIs) ---------- */
const SND = window.__SND || {};      // key -> data:audio/mpeg base64
const sndBuf = {};                   // key -> decoded AudioBuffer (null while loading)
// Decode a base64 data: URI straight to an ArrayBuffer in JS.
// IMPORTANT: we must NOT use fetch() here — in the sandboxed artifact iframe the
// Content-Security-Policy blocks fetch() of data: URIs, so the samples would never
// load and every sound would fall back to the synth. atob() has no such restriction.
function dataUriToBuffer(uri){
  const b64 = uri.slice(uri.indexOf(",")+1);
  const bin = atob(b64), n=bin.length, bytes=new Uint8Array(n);
  for(let i=0;i<n;i++) bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}
function loadSnd(){
  const ac=AC; if(!ac) return;
  Object.keys(SND).forEach(k=>{
    if(k in sndBuf) return; sndBuf[k]=null;
    try{
      const ab=dataUriToBuffer(SND[k]);
      // callback form of decodeAudioData for the widest browser support
      ac.decodeAudioData(ab, buf=>{ sndBuf[k]=buf; }, ()=>{});
    }catch(e){}
  });
}
// play a one-shot (or loop) sample; returns the source so loops can be stopped
function playSnd(key, vol=0.9, rate=1, loop=false){
  if(!soundOn) return null; const ac=audio(); if(!ac) return null;
  const buf=sndBuf[key]; if(!buf) return null;
  const src=ac.createBufferSource(); src.buffer=buf; src.loop=!!loop;
  src.playbackRate.value=rate;
  const g=ac.createGain(); g.gain.value=vol;
  src.connect(g); g.connect(ac.destination);
  try{ src.start(); }catch(e){ return null; }
  src._g=g; return src;
}
function stopSnd(src){ if(src){ try{ src.stop(); }catch(e){} } }
const hasSnd=k=>!!sndBuf[k];
const pitch=()=>0.98+Math.random()*0.04;   // ±2% random pitch for realism
let featureMusicSrc=null;
function startFeatureMusic(){ if(featureMusicSrc) return; featureMusicSrc=playSnd("feature_music",0.5,1,true); }
function stopFeatureMusic(){ stopSnd(featureMusicSrc); featureMusicSrc=null; }
// Decode every sample at page load (context starts suspended; it resumes on the first
// tap) so the recorded sounds are ready from the very first spin — no synth fallback gap.
try{ audio(); }catch(e){}
window.addEventListener("pointerdown", function once(){ try{ if(AC&&AC.state==="suspended") AC.resume(); }catch(e){} window.removeEventListener("pointerdown",once); }, {once:true});
function tone(f,d,type="square",v=.16,when=0){
  if(!soundOn) return; const ac=audio(); if(!ac) return; const t=ac.currentTime+when;
  const o=ac.createOscillator(),g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+0.02);
}
let spinLoopSrc=null;
function startSpinSound(){ if(!soundOn) return; const ac=audio(); if(!ac) return;
  if(hasSnd("reel_spin")){ if(!spinLoopSrc) spinLoopSrc=playSnd("reel_spin",0.35,1,true); return; }
  if(spinOsc) return;   // synth fallback
  spinOsc=ac.createOscillator(); const g=ac.createGain(); spinOsc.type="sawtooth"; spinOsc.frequency.value=46;
  g.gain.value=0.04; spinOsc.connect(g); g.connect(ac.destination); spinOsc.start(); spinOsc._g=g; }
function stopSpinSound(){ if(spinLoopSrc){ stopSnd(spinLoopSrc); spinLoopSrc=null; }
  if(spinOsc){ try{spinOsc.stop();}catch(e){} spinOsc=null; } }
const click=()=>tone(200,0.05,"square",0.1);
const coinSnd=()=>{ const k="coin"+(1+(Math.random()*6|0)); if(playSnd(k,0.6,pitch())) return; tone(880,0.06,"square",0.14); tone(1320,0.09,"square",0.12,0.05); };
function winTune(big,total){
  // real coins only — the win_* chime samples sounded like a reception bell
  if(big){ if(!hasSnd("coins_spill")) playSnd("cashfall_big",0.8,pitch()); return; }   // big wins already spill coins
  if(total!=null && total>=40*betFactor()){ if(playSnd("coins_many",0.7,pitch())) return; }
  coinSnd(); setTimeout(coinSnd,110); setTimeout(coinSnd,240);   // a few clinks for a small win
}
// a single gong strike: inharmonic metallic partials + shimmer + noise transient
function gongStrike(when, gain){
  const ac=audio(); if(!ac) return; const t=ac.currentTime+when;
  const master=ac.createGain(); master.gain.value=gain; master.connect(ac.destination);
  const base=104, ratios=[1,1.48,1.97,2.53,3.16,4.13,5.11,6.4];
  ratios.forEach((r,i)=>{
    const o=ac.createOscillator(), g=ac.createGain();
    o.type="sine"; o.frequency.setValueAtTime(base*r*(1+Math.random()*0.008), t);
    o.frequency.exponentialRampToValueAtTime(base*r*0.9, t+0.7);   // slight "wow" bend
    const peak=0.55/(i+1);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t+1.2+i*0.06);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+1.5);
  });
  // shimmering high ring (vibrato)
  const sh=ac.createOscillator(), shg=ac.createGain(), lfo=ac.createOscillator(), lfog=ac.createGain();
  sh.type="sine"; sh.frequency.value=base*6.15; lfo.type="sine"; lfo.frequency.value=6.5; lfog.gain.value=45;
  lfo.connect(lfog); lfog.connect(sh.frequency);
  shg.gain.setValueAtTime(0,t); shg.gain.linearRampToValueAtTime(0.1,t+0.02); shg.gain.exponentialRampToValueAtTime(0.0001,t+1.1);
  sh.connect(shg); shg.connect(master); lfo.start(t); sh.start(t); sh.stop(t+1.2); lfo.stop(t+1.2);
  // metallic crash transient
  const len=ac.sampleRate*0.14, buf=ac.createBuffer(1,len,ac.sampleRate), d=buf.getChannelData(0);
  for(let k=0;k<len;k++) d[k]=(Math.random()*2-1)*Math.pow(1-k/len,2);
  const nb=ac.createBufferSource(); nb.buffer=buf;
  const bp=ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=base*4.2; bp.Q.value=0.8;
  const ng=ac.createGain(); ng.gain.value=0.28;
  nb.connect(bp); bp.connect(ng); ng.connect(master); nb.start(t);
}
// the taiko/gong reel hit — a dramatic quick DOUBLE strike
function drumHit(delayMs){
  if(!soundOn) return;
  // recorded taiko impact from the sound pack (falls back to the synth gong)
  if(playSnd("pot_slam", 0.85, pitch())) return;
  const ac=audio(); if(!ac) return; const w=(delayMs||0)/1000;
  gongStrike(w, 0.42);
  gongStrike(w+0.10, 0.6);   // second hit lands quickly, a touch louder
}
// hotel reception desk bell — bright metallic "ding" with inharmonic partials
function ding(when){
  if(!soundOn) return; const ac=audio(); if(!ac) return; const t=ac.currentTime+when, base=2489;
  [1,2.76,5.4,8.9].forEach((h,i)=>{ const o=ac.createOscillator(), g=ac.createGain();
    o.type="sine"; o.frequency.value=base*h;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.22/(i+1),t+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.95); });
}
function receptionBell(){ for(let i=0;i<4;i++) ding(i*0.26); }   // 4 strokes

// Background music now plays a REAL recorded track embedded in the #bgm element.
// (The old synthesized koto loop above is disabled — musicTick is no longer scheduled.)
// Drop a royalty-free track in as a data: URI on #bgm and it plays automatically.
const bgm = document.getElementById("bgm");
function bgmReady(){ return !!(bgm && bgm.getAttribute("src")); }
function applyMusicMode(mode){ if(!bgm) return; bgm.volume = mode==="upbeat"?0.6:0.42; bgm.playbackRate = mode==="upbeat"?1.12:1.0; }
function startMusic(mode){ musicMode=mode; if(!soundOn || !bgmReady()) return; applyMusicMode(mode); bgm.play().catch(()=>{}); }
function setMusicMode(mode){ musicMode=mode; if(mode==="off"){ stopMusic(); return; } if(soundOn && bgmReady()){ applyMusicMode(mode); bgm.play().catch(()=>{}); } }
function stopMusic(){ if(bgm) try{ bgm.pause(); }catch(e){} }

/* ---------- Helpers ---------- */
function easeOutBack(t){ const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
const now=()=>performance.now();

/* ---------- Plasma win bolt ---------- */
function buildPlasmaPath(){
  const rowsByReel={}; let maxReel=-1;
  for(const key of winCells){ const p=key.split(","); const i=+p[0], r=+p[1];
    (rowsByReel[i]=rowsByReel[i]||[]).push(r); if(i>maxReel) maxReel=i; }
  if(maxReel<1) return null;
  const path=[]; let prev=1;
  for(let i=0;i<=maxReel;i++){
    const rows=rowsByReel[i]; if(!rows) continue;
    const row=rows.reduce((a,b)=>Math.abs(b-prev)<Math.abs(a-prev)?b:a);
    prev=row; path.push({x:reelX(i)+CELLW/2, y:rowCY(row)});
  }
  return path.length>=2 ? path : null;
}
function boltPoints(path,hp,tn){
  const segs=[]; let total=0;
  for(let i=1;i<path.length;i++){ const dx=path[i].x-path[i-1].x, dy=path[i].y-path[i-1].y;
    const len=Math.hypot(dx,dy)||1; segs.push({a:path[i-1],dx,dy,len}); total+=len; }
  const targetLen=total*hp, pts=[]; let acc=0;
  for(const s of segs){
    const steps=Math.max(3,Math.round(s.len/14)), nx=-s.dy/s.len, ny=s.dx/s.len;
    for(let k=0;k<=steps;k++){
      const t=k/steps, at=acc+s.len*t;
      if(at>targetLen) return pts;
      const bx=s.a.x+s.dx*t, by=s.a.y+s.dy*t, edge=Math.sin(t*Math.PI);
      const j=(Math.sin(at*0.35+tn*0.02)+0.5*Math.sin(at*0.9-tn*0.03))*8*edge;
      pts.push({x:bx+nx*j, y:by+ny*j});
    }
    acc+=s.len;
  }
  return pts;
}
function drawPlasma(tn){
  const SHOOT=240, HOLD=160, el=tn-plasmaStart;   // single fast bolt, fires once
  if(el>SHOOT+HOLD) return;
  const hp=Math.min(1, el/SHOOT);
  const fade=el>SHOOT ? Math.max(0,1-(el-SHOOT)/HOLD) : 1;
  const pts=boltPoints(plasmaPath,hp,tn);
  if(pts.length<2) return;
  const stroke=(w,col,blur)=>{ ctx.shadowBlur=blur; ctx.shadowColor="rgba(120,200,255,.9)";
    ctx.strokeStyle=col; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke(); };
  ctx.save(); ctx.globalAlpha=fade; ctx.lineCap="round"; ctx.lineJoin="round";
  stroke(10,"rgba(70,150,255,.5)",24);
  stroke(5,"rgba(170,225,255,.9)",16);
  stroke(2,"#ffffff",8);
  const h=pts[pts.length-1];
  ctx.shadowColor="#cdeaff"; ctx.shadowBlur=22; ctx.fillStyle="#ffffff";
  ctx.beginPath(); ctx.arc(h.x,h.y,5.5,0,7); ctx.fill();
  ctx.globalAlpha=fade*0.7; ctx.fillStyle="rgba(180,230,255,.9)";
  ctx.beginPath(); ctx.arc(h.x,h.y,10,0,7); ctx.fill();
  ctx.restore();
}
function drawCoinRain(tn){
  const seed=Math.floor(tn/16);
  ctx.save();
  for(let k=0;k<26;k++){
    const sx=((k*97)%CW);
    const speed=0.15+((k*53)%50)/120;
    const y=((tn*speed + k*80)% (CH+60))-30;
    const rr=6+((k*29)%5);
    ctx.fillStyle="#e8b53a"; ctx.strokeStyle="#7a5200"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(sx, y, rr*0.7, rr, 0,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#7a5200"; ctx.fillRect(sx-rr*0.18, y-rr*0.32, rr*0.36, rr*0.64);
  }
  ctx.restore();
}
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

/* ============================================================
   Symbol art
   ============================================================ */
function shiny(g,R,c1,c2,c3){ const gr=g.createRadialGradient(-R*0.3,-R*0.35,R*0.1,0,0,R*1.1);
  gr.addColorStop(0,c1); gr.addColorStop(.55,c2); gr.addColorStop(1,c3); return gr; }
function gloss(g,R,cx,cy,rr){ g.save(); g.globalAlpha=.5; const h=g.createRadialGradient(cx,cy,0,cx,cy,rr);
  h.addColorStop(0,"rgba(255,255,255,.9)"); h.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=h; g.beginPath(); g.arc(cx,cy,rr,0,7); g.fill(); g.restore(); }
function roundRectPath(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }

function royal(g,R,s){
  // gem backing — a soft coloured disc with a gilded rim so the royals read as jewels
  g.save();
  const back=g.createRadialGradient(0,-R*0.25,R*0.1,0,0,R*1.0);
  back.addColorStop(0,"rgba(255,255,255,.28)"); back.addColorStop(.45,hexA(s.color,.30));
  back.addColorStop(.9,hexA(shade(s.color),.22)); back.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle=back; g.beginPath(); g.arc(0,0,R*0.98,0,7); g.fill();
  g.lineWidth=R*0.05; g.strokeStyle="rgba(255,225,150,.5)"; g.beginPath(); g.arc(0,0,R*0.9,0,7); g.stroke();
  g.restore();
  // ornate gilded letter with colour
  const t=s.txt, fs = t.length>1 ? R*1.15 : R*1.55;
  g.font="900 "+fs+"px Georgia,'Times New Roman',serif"; g.textAlign="center"; g.textBaseline="middle";
  g.lineJoin="round";
  g.lineWidth=R*0.2; g.strokeStyle="#5a3a00"; g.strokeText(t,0,R*0.06);
  g.lineWidth=R*0.09; g.strokeStyle="#ffe9a0"; g.strokeText(t,0,R*0.06);
  const grad=g.createLinearGradient(0,-R,0,R);
  grad.addColorStop(0,"#ffffff"); grad.addColorStop(.35,s.color); grad.addColorStop(1,shade(s.color));
  g.fillStyle=grad; g.fillText(t,0,R*0.06);
  g.save(); g.globalAlpha=.4; g.fillStyle="#fff"; g.font="900 "+fs+"px Georgia,serif"; g.fillText(t,-R*0.02,-R*0.02); g.restore();
}
function hexA(hex,a){ if(hex[0]!=="#") return hex; const n=parseInt(hex.slice(1),16); return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`; }
function shade(hex){ const n=parseInt(hex.slice(1),16); const r=(n>>16)*0.5|0,gg=((n>>8)&255)*0.5|0,b=(n&255)*0.5|0; return `rgb(${r},${gg},${b})`; }

function drawCoin(g,R){
  g.fillStyle=shiny(g,R,"#fff2b8","#e8b53a","#9a6a10"); g.beginPath(); g.arc(0,0,R*0.92,0,7); g.fill();
  g.lineWidth=R*0.09; g.strokeStyle="#b8860b"; g.beginPath(); g.arc(0,0,R*0.84,0,7); g.stroke();
  g.lineWidth=R*0.04; g.strokeStyle="#7a5200"; g.beginPath(); g.arc(0,0,R*0.6,0,7); g.stroke();
  g.fillStyle="#7a5200"; for(let k=0;k<4;k++){ g.save(); g.rotate(k*Math.PI/2); g.fillRect(-R*0.07,-R*0.74,R*0.14,R*0.2); g.restore(); }
  const h=R*0.28; g.fillStyle="#170605"; g.fillRect(-h,-h,2*h,2*h);
  g.lineWidth=R*0.05; g.strokeStyle="#7a5200"; g.strokeRect(-h,-h,2*h,2*h);
  gloss(g,R,-R*0.32,-R*0.36,R*0.5);
}
function drawLantern(g,R){
  g.fillStyle=shiny(g,R*0.6,"#ffe9a0","#e0a828","#8a5c00");
  roundRectPath(g,-R*0.3,-R*0.9,R*0.6,R*0.18,R*0.04); g.fill();
  roundRectPath(g,-R*0.3,R*0.62,R*0.6,R*0.18,R*0.04); g.fill();
  g.fillStyle=shiny(g,R,"#ff6b5a","#d81f2a","#7a0a10");
  g.beginPath(); g.ellipse(0,-R*0.14,R*0.74,R*0.78,0,0,7); g.fill();
  g.strokeStyle="#8a0a12"; g.lineWidth=R*0.05; g.beginPath(); g.ellipse(0,-R*0.14,R*0.74,R*0.78,0,0,7); g.stroke();
  g.strokeStyle="rgba(122,10,16,.55)"; g.lineWidth=R*0.05;
  for(let k=-2;k<=2;k++){ const x=k*R*0.27; g.beginPath(); g.moveTo(x,-R*0.86); g.quadraticCurveTo(x*1.15,-R*0.14,x,R*0.56); g.stroke(); }
  g.strokeStyle="#e0a828"; g.lineWidth=R*0.06; g.beginPath(); g.moveTo(0,R*0.78); g.lineTo(0,R*0.94); g.stroke();
  g.fillStyle="#d81f2a"; g.beginPath(); g.moveTo(-R*0.12,R*0.92); g.lineTo(R*0.12,R*0.92); g.lineTo(0,R*1.12); g.closePath(); g.fill();
  gloss(g,R*0.7,-R*0.3,-R*0.4,R*0.42);
}
function drawKoi(g,R){
  g.save(); g.rotate(-0.28);
  g.fillStyle=shiny(g,R,"#ffd1a0","#ff7a2a","#c04a00");
  g.beginPath(); g.moveTo(-R*0.2,0); g.quadraticCurveTo(-R*0.95,-R*0.55,-R*0.98,-R*0.08);
  g.quadraticCurveTo(-R*0.68,0,-R*0.98,R*0.08); g.quadraticCurveTo(-R*0.95,R*0.55,-R*0.2,0); g.fill();
  g.fillStyle=shiny(g,R,"#fff2e0","#ff8c3a","#c85a10"); g.beginPath(); g.ellipse(R*0.18,0,R*0.66,R*0.42,0,0,7); g.fill();
  g.fillStyle="#e02a1a"; g.beginPath(); g.ellipse(R*0.02,-R*0.08,R*0.22,R*0.15,0,0,7); g.fill();
  g.beginPath(); g.ellipse(R*0.52,R*0.06,R*0.14,R*0.1,0,0,7); g.fill();
  g.fillStyle="rgba(255,140,60,.8)"; g.beginPath(); g.moveTo(R*0.1,-R*0.38); g.quadraticCurveTo(R*0.22,-R*0.66,R*0.42,-R*0.34); g.closePath(); g.fill();
  g.fillStyle="#170605"; g.beginPath(); g.arc(R*0.64,-R*0.06,R*0.07,0,7); g.fill();
  gloss(g,R*0.6,R*0.42,-R*0.2,R*0.3); g.restore();
}
function drawIngot(g,R){
  g.fillStyle=shiny(g,R,"#fff2b8","#e8b53a","#9a6a10");
  g.beginPath(); g.moveTo(-R*0.85,R*0.22); g.quadraticCurveTo(-R*0.98,R*0.58,-R*0.5,R*0.58);
  g.lineTo(R*0.5,R*0.58); g.quadraticCurveTo(R*0.98,R*0.58,R*0.85,R*0.22);
  g.quadraticCurveTo(R*0.3,R*0.36,0,R*0.32); g.quadraticCurveTo(-R*0.3,R*0.36,-R*0.85,R*0.22); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-R*0.72,R*0.2); g.quadraticCurveTo(-R*0.58,-R*0.5,-R*0.22,-R*0.22);
  g.quadraticCurveTo(0,-R*0.06,R*0.22,-R*0.22); g.quadraticCurveTo(R*0.58,-R*0.5,R*0.72,R*0.2);
  g.quadraticCurveTo(R*0.3,R*0.06,0,R*0.1); g.quadraticCurveTo(-R*0.3,R*0.06,-R*0.72,R*0.2); g.closePath(); g.fill();
  g.strokeStyle="#8a5c00"; g.lineWidth=R*0.03; g.stroke(); gloss(g,R,-R*0.22,-R*0.24,R*0.4);
}
function drawFu(g,R){
  roundRectPath(g,-R*0.82,-R*0.82,R*1.64,R*1.64,R*0.18);
  g.fillStyle=shiny(g,R,"#ff5a4a","#c81f26","#6a0a10"); g.fill();
  g.strokeStyle="#e8b53a"; g.lineWidth=R*0.1; g.stroke();
  g.fillStyle="#ffe9a0"; g.font="900 "+(R*1.15)+"px serif"; g.textAlign="center"; g.textBaseline="middle";
  g.fillText("福",0,R*0.08);
  g.fillStyle="#ffe9a0"; g.font="800 "+(R*0.3)+"px Arial"; g.fillText("WILD",0,R*0.66);
  gloss(g,R,-R*0.3,-R*0.3,R*0.4);
}
function drawEight(g,R){
  g.fillStyle=shiny(g,R,"#fff2b8","#f0c040","#9a6a10");
  g.strokeStyle="#d81f2a"; g.lineWidth=Math.max(4,R*0.14); g.lineJoin="round";
  g.font="900 "+(R*1.15)+"px Arial"; g.textAlign="center"; g.textBaseline="middle";
  g.strokeText("88",0,R*0.06); g.fillText("88",0,R*0.06);
  g.save(); g.globalAlpha=.5; g.fillStyle="#fff"; g.beginPath(); g.arc(-R*0.4,-R*0.34,R*0.08,0,7); g.fill(); g.restore();
}
// taiko drum with two crossed drumsticks
function drawDrum(g,R){
  const cx=0, cy=R*0.06, rr=R*0.78;
  g.fillStyle=shiny(g,R,"#ff5a4a","#c81f26","#6a0a10");
  g.beginPath(); g.ellipse(cx,cy,rr*1.02,rr*0.92,0,0,7); g.fill();
  g.strokeStyle="#e8b53a"; g.lineWidth=R*0.13; g.beginPath(); g.ellipse(cx,cy,rr*0.99,rr*0.9,0,0,7); g.stroke();
  g.fillStyle=shiny(g,rr,"#fff2d6","#e6cfa2","#b8945e");
  g.beginPath(); g.arc(cx,cy-R*0.02,rr*0.74,0,7); g.fill();
  g.strokeStyle="#8a5c00"; g.lineWidth=R*0.05; g.beginPath(); g.arc(cx,cy-R*0.02,rr*0.74,0,7); g.stroke();
  g.fillStyle="#7a5200"; for(let k=0;k<12;k++){ const a=k/12*7; g.beginPath(); g.arc(cx+Math.cos(a)*rr*0.74, cy-R*0.02+Math.sin(a)*rr*0.74, R*0.045,0,7); g.fill(); }
  g.strokeStyle="#caa06a"; g.lineWidth=R*0.14; g.lineCap="round";
  g.beginPath(); g.moveTo(-R*0.78,R*0.82); g.lineTo(R*0.55,-R*0.6); g.stroke();
  g.beginPath(); g.moveTo(R*0.78,R*0.82); g.lineTo(-R*0.55,-R*0.6); g.stroke();
  g.fillStyle="#e6c290"; g.beginPath(); g.arc(R*0.55,-R*0.6,R*0.11,0,7); g.fill();
  g.beginPath(); g.arc(-R*0.55,-R*0.6,R*0.11,0,7); g.fill();
}

/* ---------- Cash pot rendering ---------- */
function goldGrad(g,x,y){ const gr=g.createLinearGradient(x,y-15,x,y+15);
  gr.addColorStop(0,"#ffe9a0"); gr.addColorStop(.5,"#e0a828"); gr.addColorStop(1,"#8a5c00"); return gr; }
function drawPot(tn){
  pctx.clearRect(0,0,POTW,POTH);
  if(!potReady) return;
  const f=Math.min(1, potCoins/POT_NEED), left=POT_NEED-potCoins;
  // pick the pot-state image by fill fraction; closed lid while closing / running the feature
  let img;
  if(potState==="closing" || potState==="closed" || potState==="feature"){ img=potImgs.potC; }
  else if(f>=0.99){ img=potImgs.pot100; }
  else if(f>=0.70){ img=potImgs.pot75; }
  else if(f>=0.40){ img=potImgs.pot50; }
  else { img=potImgs.pot25; }
  img = img || potImgs.pot25 || potImgs.potC;
  if(!img) return;
  // rattle harder the closer it is to bursting
  let sx=0, sy=0;
  if(potState==="open" && potCoins>0 && left<=2){ const inten=left<=1?3.6:1.9; sx=(Math.random()*2-1)*inten; sy=(Math.random()*2-1)*inten; }
  // gentle bump per collected coin; a punch while the pot bursts
  let scale = tn<potBump ? 1+0.05*Math.sin((tn-(potBump-240))/240*Math.PI) : 1;
  if(potState==="closing"){ const p=Math.min(1,(tn-potLidStart)/700); scale*=1+0.2*Math.sin(p*Math.PI); }
  const pad=10, w=POTW-2*pad, h=POTH-2*pad, ox=pad, oy=pad;   // 320x268 source band → 320x270, true proportions
  const k=(img.naturalHeight||320)/320, S=[0, POT_SY*k, img.naturalWidth||320, POT_SH*k];
  pctx.save();
  pctx.translate(POTW/2+sx, POTH*0.6+sy); pctx.scale(scale,scale); pctx.translate(-POTW/2,-POTH*0.6);
  pctx.drawImage(img, ...S, ox, oy, w, h);
  // brighten / glow as it nears full and bursts
  if(potState!=="open" || left<=1){
    pctx.save(); pctx.globalCompositeOperation="lighter"; pctx.globalAlpha=0.22+0.2*Math.sin(tn/110);
    pctx.drawImage(img, ...S, ox, oy, w, h); pctx.restore();
  }
  pctx.restore();
}
function drawLid(cx,openY,topR,a){
  const g=pctx; g.save();
  g.translate(cx + a*topR*0.22, openY - 5 - a*30); g.rotate(-a*0.42);
  g.fillStyle=goldGrad(g,0,0);
  g.beginPath(); g.moveTo(-topR*0.95,0); g.quadraticCurveTo(0,-42,topR*0.95,0); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(0,0,topR*0.95,11,0,0,7); g.fill();
  g.strokeStyle="#8a5c00"; g.lineWidth=2; g.stroke();
  g.fillStyle="#ffe9a0"; g.beginPath(); g.arc(0,-35,7,0,7); g.fill();
  g.restore();
}
function drawFlyCoin(g,x,y,r,rot){
  g.save(); g.translate(x,y); g.rotate(Math.sin(rot)*0.5);
  g.beginPath(); g.arc(0,0,r,0,7);
  const gr=g.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r*1.1);
  gr.addColorStop(0,"#fff2b8"); gr.addColorStop(.55,"#e8b53a"); gr.addColorStop(1,"#9a6a10");
  g.fillStyle=gr; g.fill();
  g.strokeStyle="#7a5200"; g.lineWidth=Math.max(1.5,r*0.12); g.stroke();
  g.fillStyle="#7a5200"; const h=r*0.26; g.fillRect(-h,-h,2*h,2*h);
  g.restore();
}
function drawFx(tn){
  fxctx.clearRect(0,0,innerWidth,innerHeight);
  for(let n=flyers.length-1;n>=0;n--){
    const fl=flyers[n]; const p=(tn-fl.t0)/fl.dur;
    if(p>=1){ flyers.splice(n,1); onCoinLanded(); continue; }
    const x=fl.x0+(fl.x1-fl.x0)*p;
    const y=fl.y0+(fl.y1-fl.y0)*p - fl.arc*Math.sin(Math.PI*p);
    drawFlyCoin(fxctx, x, y, 14-5*p, fl.rot+p*12);
  }
}

/* ---------- Topper: embedded fonts, 88 ornaments, marquee bulbs ---------- */
// fonts are base64 in window.__FONT and loaded from bytes (atob + FontFace), never fetch()ed
(function(){
  const F=window.__FONT||{};
  const load=(fam,b64,weight)=>{ if(!b64||!window.FontFace) return;
    try{ const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
      const ff=new FontFace(fam,u.buffer,{weight}); document.fonts.add(ff); ff.load().then(()=>{ sizeBulbs(); if(window.__fit) window.__fit(); }).catch(()=>{}); }catch(e){} };
  load("Cinzel Decorative",F.cinzelDeco,"900");
  load("Cinzel",F.cinzel,"700");
  if(ART.eight){ $("ornL").src=ART.eight; $("ornR").src=ART.eight; }
})();

const bulbs=$("bulbs"), bctx=bulbs.getContext("2d");
let bulbPts=[], bulbLevel=[], bulbR=6;
function sizeBulbs(){
  const r=bulbs.parentElement.getBoundingClientRect();
  bulbs.width=Math.round(r.width*DPR); bulbs.height=Math.round(r.height*DPR);
  bulbs.style.width=r.width+"px"; bulbs.style.height=r.height+"px";
  // bulbs run round the middle of the gold band, evenly spaced, one on every corner
  const band=parseFloat(getComputedStyle(bulbs.parentElement).getPropertyValue("--band"))||22;
  const inset=band/2, W=r.width-2*inset, H=r.height-2*inset, gap=Math.max(22,band*1.35);
  bulbR=Math.max(3.5,band*0.27);
  const nx=Math.max(2,Math.round(W/gap)), ny=Math.max(1,Math.round(H/gap));
  const pts=[];
  for(let i=0;i<nx;i++) pts.push([inset+W*i/nx, inset]);              // top, left → right
  for(let i=0;i<ny;i++) pts.push([inset+W, inset+H*i/ny]);           // right, top → bottom
  for(let i=0;i<nx;i++) pts.push([inset+W-W*i/nx, inset+H]);         // bottom, right → left
  for(let i=0;i<ny;i++) pts.push([inset, inset+H-H*i/ny]);           // left, bottom → top
  bulbPts=pts.map(p=>[p[0]*DPR,p[1]*DPR]);
  bulbLevel=pts.map(()=>0);
}
// lighting programmes, cycled every 7s; a frantic chase while anything is being won
function bulbTarget(i,n,t){
  if(now()<winFlashUntil || now()<coinRainUntil || state==="bonus"){
    const s=Math.floor(t/45); return ((i+s)%3===0) || (Math.floor(t/160)%4===0) ? 1 : 0.05; }
  const prog=Math.floor(t/7000)%5, local=t%7000;
  if(prog===0){ const s=Math.floor(t/95); return ((i-s)%4+4)%4<2 ? 1 : 0.06; }                // running chase
  if(prog===1){ return (i%2)===(Math.floor(t/380)%2) ? 1 : 0.08; }                             // alternate flash
  if(prog===2){ const k=(local/18)%(2*n); return (k<n ? i<k : i>=k-n) ? 1 : 0.06; }            // wipe on, wipe off
  if(prog===3){ const b=Math.floor(t/130), h=Math.sin((i+1)*12.9898+b*78.233)*43758.5453; return (h-Math.floor(h))>0.62 ? 1 : 0.12; } // sparkle
  const half=n/2, d=Math.min(i,n-i), s=(local/40)%(half+6); return Math.abs(d-s)<2.2 ? 1 : 0.07; // pulse out from the top-left
}
function drawBulbs(t){
  const w=bulbs.width, h=bulbs.height, n=bulbPts.length, R=bulbR*DPR;
  bctx.clearRect(0,0,w,h); if(!n) return;
  const win = now()<winFlashUntil || now()<coinRainUntil || state==="bonus";
  for(let i=0;i<n;i++){
    // incandescent lag: filaments warm up quickly and cool slowly
    const tg=bulbTarget(i,n,t), L=bulbLevel[i]; bulbLevel[i]= tg>L ? L+(tg-L)*0.55 : L+(tg-L)*0.18;
  }
  // 1) sockets
  for(let i=0;i<n;i++){ const [x,y]=bulbPts[i];
    const g=bctx.createRadialGradient(x-R*0.3,y-R*0.3,R*0.2,x,y,R*1.45);
    g.addColorStop(0,"#fff0b0"); g.addColorStop(.5,"#b0800f"); g.addColorStop(1,"#4a3000");
    bctx.fillStyle=g; bctx.beginPath(); bctx.arc(x,y,R*1.4,0,7); bctx.fill(); }
  // 2) glow (additive)
  bctx.save(); bctx.globalCompositeOperation="lighter";
  for(let i=0;i<n;i++){ const L=bulbLevel[i]; if(L<0.15) continue; const [x,y]=bulbPts[i];
    const red = win && (i+Math.floor(t/90))%2===0;
    const g=bctx.createRadialGradient(x,y,0,x,y,R*4.2);
    g.addColorStop(0, red?`rgba(255,90,60,${0.55*L})`:`rgba(255,215,120,${0.6*L})`);
    g.addColorStop(1,"rgba(255,160,40,0)");
    bctx.fillStyle=g; bctx.beginPath(); bctx.arc(x,y,R*4.2,0,7); bctx.fill(); }
  bctx.restore();
  // 3) glass domes + filament core + specular
  for(let i=0;i<n;i++){ const L=bulbLevel[i], [x,y]=bulbPts[i];
    const red = win && (i+Math.floor(t/90))%2===0;
    const g=bctx.createRadialGradient(x-R*0.25,y-R*0.25,0,x,y,R);
    if(red){ g.addColorStop(0,`rgb(255,${200+55*L|0},${180*L|0})`); g.addColorStop(.5,`rgb(${150+105*L|0},${30+40*L|0},20)`); g.addColorStop(1,"#3a0606"); }
    else { g.addColorStop(0,`rgb(255,${235+20*L|0},${150+100*L|0})`); g.addColorStop(.45,`rgb(${120+135*L|0},${80+130*L|0},${20+40*L|0})`); g.addColorStop(1,`rgb(${60+60*L|0},${38+40*L|0},8)`); }
    bctx.fillStyle=g; bctx.beginPath(); bctx.arc(x,y,R,0,7); bctx.fill();
    bctx.fillStyle=`rgba(255,255,255,${0.35+0.4*L})`;
    bctx.beginPath(); bctx.ellipse(x-R*0.35,y-R*0.42,R*0.32,R*0.2,-0.6,0,7); bctx.fill();
  }
}

const QS=new URLSearchParams(location.search);
function parseMap(s){
  const m={}; if(!s) return null;
  s.split(",").forEach(p=>{ const [act,nums]=p.split(":"); if(act&&nums) nums.split("+").forEach(n=>{ m[+n]=act; }); });
  return m;
}
const DEFAULT_PADMAP={0:"select",1:"b2",2:"b3",3:"select",9:"select",8:"coin",
  12:"up",13:"down",14:"left",15:"right"};   // standard-mapping d-pad as a fallback
const PADMAP_ALL=parseMap(QS.get("map"))||DEFAULT_PADMAP;
const padMapFor=i=>parseMap(QS.get("map"+i))||PADMAP_ALL;

const padPrev={};
let quitHeldSince=0;
function pollPads(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  let quitCombo=false, dbg=[];
  for(const p of pads){ if(!p) continue;
    const map=padMapFor(p.index), prev=padPrev[p.index]||(padPrev[p.index]={b:[],dir:""});
    const held=new Set();
    p.buttons.forEach((b,i)=>{
      const down=b.pressed||b.value>0.5, act=map[i];
      if(down&&act) held.add(act);
      if(down&&!prev.b[i]&&act) doAction(act);
      prev.b[i]=down;
    });
    const ax=p.axes[0]||0, ay=p.axes[1]||0;
    const dir = ay<-0.5?"up":ay>0.5?"down":ax<-0.5?"left":ax>0.5?"right":"";
    if(dir&&dir!==prev.dir) doAction(dir);
    prev.dir=dir;
    if(held.has("coin")&&held.has("select")) quitCombo=true;
    if(QS.get("pad")==="debug") dbg.push("pad "+p.index+" "+p.id.slice(0,28)+"\n  buttons: "+
      p.buttons.map((b,i)=>b.pressed?i:null).filter(v=>v!==null).join(" ")+
      "\n  axes: "+p.axes.map(v=>v.toFixed(2)).join(" "));
  }
  if(quitCombo){ if(!quitHeldSince) quitHeldSince=performance.now();
    else if(performance.now()-quitHeldSince>1000){ quitHeldSince=0; window.close(); } }
  else quitHeldSince=0;
  if(QS.get("pad")==="debug"){ let d=$("padDebug"); if(!d){ d=document.createElement("div"); d.id="padDebug"; document.body.appendChild(d); }
    d.textContent=dbg.join("\n")||"no gamepad yet — press a button"; }
  requestAnimationFrame(pollPads);
}
requestAnimationFrame(pollPads);
// browsers need a user gesture to start audio — kick off the music on the first tap
document.addEventListener("pointerdown", ()=>{
  if(AC && AC.state==="suspended") AC.resume();
  if(soundOn && musicMode==="off") startMusic("calm");
});
