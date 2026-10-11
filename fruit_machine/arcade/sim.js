/* RTP simulator for the arcade edition: node sim.js [spins] [wager]
   Plays the full game loop headless with the same maths as the game (gm.js)
   and reports RTP by feature plus how often each feature triggers. */
const GM = require("./gm.js");
const N = +process.argv[2] || 1000000, WAGER = +process.argv[3] || 88;
// optional overrides: '{"T":{"PAY_SCALE":0.1},"W":{"lantern":1}}'  (W = strip weights by symbol id)
const OV = process.argv[4] ? JSON.parse(process.argv[4]) : {};
Object.assign(GM.T, OV.T || {});
for(const id in (OV.W || {})) GM.SYMS[GM.IDX[id]].w = OV.W[id];
const rng = Math.random, T = GM.T, BF = WAGER / 8;
let hits = 0;
const base = GM.baseStrips(), free = GM.freeStrips();   // the game's fixed strips

const R = { base:0, free:0, hs:0, wheel:0, pot:0 }, C = { free:0, hs:0, wheel:0, pot:0, hsGrand:0 };
let potCoins = GM.potStart(rng);
function potAdd(n){
  potCoins += n;
  if(potCoins >= T.POT_NEED){ potCoins = GM.potStart(rng); C.pot++; R.pot += GM.JP[GM.pickWinner(GM.pickBoard(rng))]; }
}

let lastExpanded = 0;
function waysWin(grid, freeMode){
  const ex = GM.expandReels(grid, freeMode, rng); GM.applyExpand(grid, ex); lastExpanded = ex.length;
  return GM.evalWays(grid).raw * T.PAY_SCALE * BF;
}
function holdSpin(grid){
  C.hs++; const hs = GM.hsStart(grid, rng, WAGER);
  while(hs.respins > 0 && !GM.hsFull(hs)) GM.hsRespin(hs, rng, WAGER);
  if(GM.hsFull(hs)) C.hsGrand++;
  return GM.hsTotal(hs, WAGER);
}
function collectCoins(grid, bucket){
  const n = GM.count(grid, GM.COIN);
  if(n >= T.HS_TRIGGER){ R.hs += holdSpin(grid); return; }
  potAdd(n * WAGER / T.JP_REF);
}
function freeSpins(n){
  C.free++; let left = n, step = 0, guard = 0;
  while(left > 0 && guard++ < 2000){
    left--;
    const g = GM.gridFrom(free, GM.randomStops(free, rng));
    // ladder: each expanding wild steps the multiplier up BEFORE this spin pays
    const raw = waysWin(g, true); step += lastExpanded;
    R.free += raw * T.LADDER[Math.min(step, T.LADDER.length-1)];
    collectCoins(g);
    if(GM.count(g, GM.LANTERN) >= 3) left += T.RETRIGGER;
  }
}
function wheel(){
  C.wheel++; const seg = GM.WHEEL[GM.wheelPick(rng, WAGER)];
  if(seg.t === "cr") R.wheel += seg.m * WAGER;
  else if(seg.t === "jp") R.wheel += GM.JP[seg.k];
  else if(seg.t === "fs"){ const before = R.free; freeSpins(seg.n); R.wheel += R.free - before; R.free = before; }
  else if(seg.t === "hs"){ // wheel H&S starts with 6 random coins
    const g = GM.gridFrom(base, GM.randomStops(base, rng));
    let placed = 0; for(let i=0;i<6;i++) for(let r=0;r<4 && placed<6;r++) if(g[i][r]!==GM.COIN && rng()<0.3){ g[i][r]=GM.COIN; placed++; }
    while(GM.count(g, GM.COIN) < 6){ g[rng()*6|0][rng()*4|0] = GM.COIN; }
    const before = R.hs; R.wheel += holdSpin(g); R.hs = before;
  }
}
for(let s = 0; s < N; s++){
  const g = GM.gridFrom(base, GM.randomStops(base, rng));
  const bw = waysWin(g, false); R.base += bw; if(bw > 0) hits++;
  collectCoins(g);
  const boost = GM.potBoost(rng, WAGER); if(boost) potAdd(boost);
  const lan = GM.count(g, GM.LANTERN);
  if(lan >= 3) freeSpins(GM.freeAward(lan));
  if(GM.drumRun(g) >= 3) wheel();
}
const stake = N * WAGER, pct = v => (100 * v / stake).toFixed(1) + "%";
console.log(`wager ${WAGER}, ${N} spins`);
for(const k in R) console.log(k.padEnd(6), pct(R[k]));
console.log("TOTAL ", pct(Object.values(R).reduce((a,b)=>a+b,0)));
console.log("base hit rate", (100 * hits / N).toFixed(1) + "%");
console.log("1 in:", Object.fromEntries(Object.entries(C).map(([k,v]) => [k, v ? Math.round(N / v) : "-"])));
