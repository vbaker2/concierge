/* ============================================================
   ALEKS' LUCKY 8's · ARCADE EDITION — game maths (pure, no DOM)
   6 reels × 4 rows, 4,096 ways. Shared by the game (embedded into
   arcade.html by build.py) and by sim.js, which runs it headless to
   tune the RTP. Change numbers here, then re-run sim.js.
   ============================================================ */
const GM = (function(){
  const REELS = 6, ROWS = 4;

  // w = strip weight per reel (array) or for every reel (number). Wilds only land on reels 2-5.
  const SYMS = [
    { id:"nine",   name:"9",          kind:"pay",  w:8, pay:{3:2, 4:4,  5:8,   6:16 } },
    { id:"ten",    name:"10",         kind:"pay",  w:8, pay:{3:2, 4:4,  5:8,   6:16 } },
    { id:"jack",   name:"J",          kind:"pay",  w:7, pay:{3:2, 4:5,  5:10,  6:20 } },
    { id:"queen",  name:"Q",          kind:"pay",  w:7, pay:{3:2, 4:5,  5:10,  6:20 } },
    { id:"king",   name:"K",          kind:"pay",  w:6, pay:{3:3, 4:6,  5:12,  6:25 } },
    { id:"ace",    name:"A",          kind:"pay",  w:6, pay:{3:3, 4:6,  5:12,  6:25 } },
    { id:"koi",    name:"KOI FISH",   kind:"pay",  w:5, pay:{3:5, 4:12, 5:30,  6:60 } },
    { id:"ingot",  name:"GOLD INGOT", kind:"pay",  w:4, pay:{3:8, 4:25, 5:60,  6:120} },
    { id:"eight",  name:"LUCKY 88",   kind:"pay",  w:3, pay:{3:12,4:50, 5:150, 6:400} },
    { id:"fu",     name:"福 WILD",    kind:"wild", w:[0,3,3,3,3,0] },
    { id:"coin",   name:"GOLD COIN",  kind:"coin", w:4 },
    { id:"lantern",name:"LANTERN",    kind:"free", w:1 },
    { id:"drum",   name:"TAIKO DRUM", kind:"drum", w:2 },
  ];
  SYMS.forEach((s,i)=>{ s.idx=i; });
  const IDX = Object.fromEntries(SYMS.map(s=>[s.id,s.idx]));
  const WILD=IDX.fu, COIN=IDX.coin, LANTERN=IDX.lantern, DRUM=IDX.drum;

  // ---- tuning (see sim.js) ----
  const T = {
    PAY_SCALE: 0.105,             // ways pays × PAY_SCALE × (wager/8)
    EXPAND_P:      0.30,          // chance a landed wild expands to fill its reel (base game)
    EXPAND_P_FREE: 0.30,          // …during free spins (each expansion also steps the ladder up)
    FREE_BOOST: { fu:1.6, eight:1.6, coin:1.4 },   // richer strips during free spins
    LADDER: [1,2,3,5,8,10],       // free-spin multiplier ladder (steps up on every expanding wild)
    FREE_AWARD: {3:8, 4:10, 5:15},// lanterns → free spins (5+ → 15)
    RETRIGGER: 8,
    HS_TRIGGER: 6,                // coins needed for Hold & Spin
    HS_RESPINS: 3,
    HS_LAND_P: 0.045,             // chance each empty cell lands a coin per respin
    // Hold & Spin coin values: wager multiples, plus jackpot labels whose chance scales with wager/JP_REF
    HS_MULTS: [[1,35],[2,28],[3,15],[5,10],[8,6],[10,3],[15,2],[25,0.8],[50,0.2]],
    HS_JP:    { mini:2.0, minor:0.5 },
    JMULT: { mini:1, minor:4, major:16, grand:80 },
    JP_REF: 88,                   // jackpots fixed at JMULT × 88 whatever the bet
    POT_NEED: 175,                // full-bet coins to fill the Cash Pot (fill per coin = wager/JP_REF)
    POT_START: [0.15, 0.45],      // after a pot win the pot restarts this full (fraction), so it's never dead
    POT_BOOST_P: 0.012,           // per paid spin: chance of a Lucky Boost…
    POT_BOOST: [0.05, 0.25],      // …that adds this much fill (fraction), scaled by wager/JP_REF like coins
    PICK_WEIGHTS: { mini:6, minor:4, major:2, grand:1 },
  };
  const JP = {}; for(const k in T.JMULT) JP[k]=T.JMULT[k]*T.JP_REF;

  // Dragon wheel: 12 equal segments; weights decide where it stops. Jackpot weights × wager/JP_REF.
  const WHEEL = [
    { t:"cr", m:15, w:15, lab:"×15" },
    { t:"fs", n:8,  w:12, lab:"8 FREE" },
    { t:"cr", m:20, w:12, lab:"×20" },
    { t:"jp", k:"mini",  w:6,    lab:"MINI" },
    { t:"cr", m:30, w:8,  lab:"×30" },
    { t:"hs",       w:10, lab:"HOLD & SPIN" },
    { t:"cr", m:15, w:15, lab:"×15" },
    { t:"fs", n:12, w:7,  lab:"12 FREE" },
    { t:"jp", k:"minor", w:2.5,  lab:"MINOR" },
    { t:"cr", m:75, w:3,  lab:"×75" },
    { t:"jp", k:"major", w:0.8,  lab:"MAJOR" },
    { t:"jp", k:"grand", w:0.15, lab:"GRAND" },
  ];

  // deterministic PRNG so the game and the simulator use identical reel strips (strips are fixed, like a real machine)
  function seeded(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  const wOf = (s,reel,boost) => { const b=(boost&&boost[s.id])||1; return (Array.isArray(s.w)?s.w[reel]:s.w)*b; };
  const baseStrips = () => makeStrips(seeded(888), null);
  const freeStrips = () => makeStrips(seeded(8888), T.FREE_BOOST);
  function makeStrips(rng, boost){
    const strips=[];
    for(let r=0;r<REELS;r++){
      const pool=[];
      SYMS.forEach(s=>{ const n=Math.round(wOf(s,r,boost)); for(let k=0;k<n;k++) pool.push(s.idx); });
      for(let i=pool.length-1;i>0;i--){ const j=rng()*(i+1)|0; [pool[i],pool[j]]=[pool[j],pool[i]]; }
      strips.push(pool);
    }
    return strips;
  }
  const at=(st,p)=>st[((p%st.length)+st.length)%st.length];
  function gridFrom(strips, stops){ const g=[]; for(let i=0;i<REELS;i++){ g[i]=[]; for(let r=0;r<ROWS;r++) g[i][r]=at(strips[i],stops[i]+r); } return g; }
  function randomStops(strips, rng){ return strips.map(st=>rng()*st.length|0); }

  // Expanding wilds: returns the reels that expand (caller decides how to show it)
  function expandReels(grid, free, rng){
    const p = free ? T.EXPAND_P_FREE : T.EXPAND_P, out=[];
    for(let i=1;i<=4;i++) if(grid[i].includes(WILD) && rng()<p) out.push(i);
    return out;
  }
  function applyExpand(grid, reels){ reels.forEach(i=>{ for(let r=0;r<ROWS;r++) grid[i][r]=WILD; }); }

  // All-ways evaluation (left to right, adjacent reels). Returns raw pay units.
  function evalWays(grid){
    let raw=0; const cells=new Set(), parts=[];
    for(const s of SYMS){
      if(s.kind!=="pay") continue;
      const counts=[];
      for(let i=0;i<REELS;i++){ let c=0; for(let r=0;r<ROWS;r++){ const g=grid[i][r]; if(g===s.idx||g===WILD) c++; } counts.push(c); }
      let k=0; while(k<REELS && counts[k]>0) k++;
      if(k>=3 && s.pay[k]){
        let ways=1; for(let i=0;i<k;i++) ways*=counts[i];
        raw+=s.pay[k]*ways; parts.push({sym:s.idx,k,ways});
        for(let i=0;i<k;i++) for(let r=0;r<ROWS;r++){ const g=grid[i][r]; if(g===s.idx||g===WILD) cells.add(i+","+r); }
      }
    }
    return {raw, cells, parts};
  }
  const count=(grid,s)=>{ let c=0; for(const col of grid) for(const v of col) if(v===s) c++; return c; };
  const drumRun=grid=>{ let n=0; for(const col of grid){ if(col.includes(DRUM)) n++; else break; } return n; };
  const freeAward=n=> n>=5?T.FREE_AWARD[5]:(T.FREE_AWARD[n]||0);

  function pickW(rng, items){ let tot=0; for(const it of items) tot+=it[1]; let x=rng()*tot; for(const it of items){ x-=it[1]; if(x<0) return it[0]; } return items[items.length-1][0]; }
  // a Hold & Spin coin value
  function coinValue(rng, wager){
    const s=wager/T.JP_REF, items=T.HS_MULTS.map(([m,w])=>[{cr:m},w]);
    items.push([{jp:"mini"},T.HS_JP.mini*s],[{jp:"minor"},T.HS_JP.minor*s]);
    return pickW(rng, items);
  }
  const coinCredits=(v,wager)=> v.jp ? JP[v.jp] : v.cr*wager;

  // one respin of Hold & Spin: mutates hs.cells (array ROWS*REELS of null|value); returns new cell indexes
  function hsRespin(hs, rng, wager){
    const landed=[];
    for(let c=0;c<REELS*ROWS;c++) if(!hs.cells[c] && rng()<T.HS_LAND_P){ hs.cells[c]=coinValue(rng,wager); landed.push(c); }
    hs.respins = landed.length ? T.HS_RESPINS : hs.respins-1;
    return landed;
  }
  function hsStart(grid, rng, wager){
    const cells=new Array(REELS*ROWS).fill(null);
    for(let i=0;i<REELS;i++) for(let r=0;r<ROWS;r++) if(grid[i][r]===COIN) cells[r*REELS+i]=coinValue(rng,wager);
    return { cells, respins:T.HS_RESPINS };
  }
  const hsFull=hs=>hs.cells.every(Boolean);
  function hsTotal(hs, wager){ let t=0; for(const v of hs.cells) if(v) t+=coinCredits(v,wager); if(hsFull(hs)) t+=JP.grand; return t; }

  function wheelPick(rng, wager){
    const s=wager/T.JP_REF;
    return pickW(rng, WHEEL.map((seg,i)=>[i, seg.t==="jp" ? seg.w*s : seg.w]));
  }

  // Jackpot Pick (Cash Pot full): 12 coins weighted by tier, guarantee a 3-match; reveal in order
  function pickBoard(rng){
    const pool=[]; for(const k in T.PICK_WEIGHTS) for(let i=0;i<T.PICK_WEIGHTS[k];i++) pool.push(k);
    const tiers=[]; for(let i=0;i<12;i++) tiers.push(pool[rng()*pool.length|0]);
    const cnt={}; tiers.forEach(t=>cnt[t]=(cnt[t]||0)+1);
    if(!Object.values(cnt).some(v=>v>=3)) tiers[0]=tiers[1]=tiers[2]="mini";
    for(let i=tiers.length-1;i>0;i--){ const j=rng()*(i+1)|0; [tiers[i],tiers[j]]=[tiers[j],tiers[i]]; }
    return tiers;
  }
  // Cash pot: random restart level, and occasional Lucky Boosts (amounts in full-bet coins)
  const potStart = rng => T.POT_NEED*(T.POT_START[0]+rng()*(T.POT_START[1]-T.POT_START[0]));
  const potBoost = (rng, wager) => rng()<T.POT_BOOST_P ? T.POT_NEED*(T.POT_BOOST[0]+rng()*(T.POT_BOOST[1]-T.POT_BOOST[0]))*Math.min(1,wager/T.JP_REF) : 0;
  function pickWinner(tiers){ const f={}; for(const t of tiers){ f[t]=(f[t]||0)+1; if(f[t]>=3) return t; } return "mini"; }

  return { REELS, ROWS, SYMS, IDX, WILD, COIN, LANTERN, DRUM, T, JP, WHEEL,
    makeStrips, baseStrips, freeStrips, gridFrom, randomStops, expandReels, applyExpand, evalWays, count, drumRun, freeAward,
    coinValue, coinCredits, hsStart, hsRespin, hsFull, hsTotal, wheelPick, pickBoard, pickWinner, potStart, potBoost };
})();
if(typeof module!=="undefined") module.exports=GM;
