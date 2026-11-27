// Headless checks for levels, bosses, weapons, chest upgrades and online sync.
const assert = require('assert');
const { loadGame } = require('./harness');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); }
}
const fresh = () => { const g = loadGame(); g.run('start(true)'); return g; };
const frames = (g, n, draw = true) => g.run(`for(let i=0;i<${n};i++){update();${draw ? 'if(i%3===0)draw();' : ''}}`);
// Puts player 1 inside the given arena of the given level and starts the fight.
function arena(g, lv, a) {
  g.run(`level=${lv};loadLevel();state='play';if(${a}===1)arenaDone[0]=true;
    P[0].x=(arenaCol(${a})+6)*T;P[0].y=G*T-28;enemies=[]`);
  frames(g, 2);
}

test('20 bosses, two per level, new ones in levels 1-5', () => {
  const g = fresh();
  const r = JSON.parse(g.run(`JSON.stringify({n:BOSSES.length,defs:BOSSES.every(k=>BOSSDEF[k]),
    first:[1,2,3,4,5].map(l=>[bossKind(l,0),bossKind(l,1)])})`));
  assert.strictEqual(r.n, 20); assert(r.defs);
  assert.deepStrictEqual(r.first.map(x => x[1]), ['mimic', 'astronomer', 'gorgon', 'prism', 'architect']);
});

test('levels 1-25: longer maps, clear mid arena, nothing important inside it', () => {
  const g = fresh();
  for (let lv = 1; lv <= 25; lv++) {
    const bad = g.run(`level=${lv};loadLevel();(()=>{const e=[];const lo=AX*T,hi=(AX+28)*T;
      if(COLS<260)e.push('short');
      for(let c=AX;c<AX+28;c++){for(let y=2;y<G;y++)if(grid[y*COLS+c])e.push('block '+c+','+y);if(!solid(c,G))e.push('pit '+c)}
      if(enemies.some(m=>!m.gold&&m.x+m.w>lo&&m.x<hi))e.push('enemy');
      if(cps.some(c=>c.x>=lo-T&&c.x<=hi))e.push('lantern');
      if(traders.length!==3||traders.some(c=>c.x>=lo-T&&c.x<=hi))e.push('trader');
      if(chests.some(c=>c.x>=lo-T&&c.x<=hi))e.push('chest');
      if(chests.length<3)e.push('few chests');
      return e.slice(0,4).join(';')})()`);
    assert.strictEqual(bad, '', 'level ' + lv + ': ' + bad);
  }
});

test('walking in starts the mid boss, locks the room; killing it opens the path', () => {
  const g = fresh(); arena(g, 1, 0);
  assert.strictEqual(g.run('boss&&boss.kind'), 'moth');
  assert(g.run('solid(AX,G-3)&&solid(AX+27,G-3)'), 'walls closed');
  g.run('P[0].x=(AX+60)*T'); frames(g, 1);
  assert(g.run('P[0].x<(AX+27)*T'), 'confined');
  g.run('killBoss()'); frames(g, 110);
  assert.strictEqual(g.run('state'), 'play');
  assert(g.run('!boss&&arenaDone[0]&&!solid(AX,G-3)&&!solid(AX+27,G-3)'), 'opened');
  assert(g.run('Object.keys(P[0].buffs).length>0'), 'blessing');
  g.run('P[0].x=(AX+10)*T'); frames(g, 2);
  assert(g.run('!boss'), 'does not respawn');
  g.run('P[0].x=(GX+6)*T'); frames(g, 2);
  assert.strictEqual(g.run('boss.kind'), 'mimic');
  g.run('killBoss()'); frames(g, 110);
  assert.strictEqual(g.run('state'), 'clear');
  frames(g, 320);
  assert.strictEqual(g.run('level'), 2);
  assert(g.run('!arenaDone[0]&&Object.keys(P[0].buffs).length===0'), 'reset on new level');
});

test('dying in the mid arena resets it and respawns before it', () => {
  const g = fresh(); arena(g, 1, 0);
  g.run('P[0].hp=1;P[0].inv=0;p=P[0];hurt(P[0].x+30)');
  assert(g.run('!boss&&!solid(AX,G-3)&&P[0].x<AX*T&&P[0].x>(AX-14)*T'));
});

test('every boss survives long fights (both arenas, enraged, drawing) without errors', () => {
  for (let i = 0; i < 20; i++) {
    const g = fresh(), lv = (i >> 1) + 1, a = i % 2;
    arena(g, lv, a);
    const kind = g.run('boss.kind');
    for (let k = 0; k < 90; k++) {
      g.run(`state='play';freeze=0;P[0].inv=99;P[0].hp=P[0].max;
        K['a']=${k % 7 < 2};K['d']=${k % 7 > 4};K['w']=${k % 9 === 0};K['j']=${k % 2 === 0};K['c']=${k % 11 === 0};
        if(boss){boss.hp=${k > 45 ? 'boss.max*.4' : 'boss.max'}}`);
      frames(g, 60);
      assert(g.run('!!boss'), kind + ' vanished');
      assert(g.run('Number.isFinite(boss.x)&&Number.isFinite(boss.y)&&Number.isFinite(P[0].x)'), kind + ' NaN');
    }
    g.run('P[0].inv=0');
    for (let k = 0; k < 40; k++) { g.run("state='play';P[0].hp=P[0].max;boss&&(boss.hp=boss.max)"); frames(g, 30); if (!g.run('!!boss')) break; }
  }
});

test('Petrifying Eye punishes movement, spares a still player', () => {
  const g = fresh(); arena(g, 3, 1);
  assert.strictEqual(g.run('boss.kind'), 'gorgon');
  const gaze = "boss.state='gaze';boss.tm=80;boss.pt=0;waves=[];P[0].inv=0;P[0].hp=6;P[0].x=(GX+4)*T;P[0].vx=0;freeze=0;boss.x=(GX+18)*T;";
  g.run(gaze); frames(g, 60);
  assert.strictEqual(g.run('P[0].hp'), 6, 'still player was hurt');
  g.run(gaze + "K['d']=true"); frames(g, 40);
  assert(g.run('P[0].hp<6'), 'moving player not hurt');
});

test('lava hurts on the floor but not on conjured ledges, which vanish afterwards', () => {
  const g = fresh(); arena(g, 5, 1);
  assert.strictEqual(g.run('boss.kind'), 'architect');
  g.run("P[0].x=(GX+11)*T;boss.state='windup';boss.pat=0;boss.tm=1;P[0].inv=999"); frames(g, 2, false);
  assert(g.run('tplats.length===4'), 'ledges');
  const k = g.run('tplats[0].cells[0]');
  g.run(`P[0].x=(GX+3)*T+8;P[0].y=(Math.floor(${k}/COLS))*T-28;P[0].vy=0;P[0].hp=6;P[0].inv=0;boss.stun=900`);
  frames(g, 180);
  assert.strictEqual(g.run('P[0].hp'), 6, 'hurt on ledge');
  g.run('P[0].x=(GX+12)*T+20;P[0].y=G*T-28;P[0].inv=0'); frames(g, 40);
  assert(g.run('P[0].hp<6'), 'floor lava did nothing');
  frames(g, 200);
  assert(g.run(`tplats.length===0&&grid[${k}]===0`), 'ledges remained');
});

test('prism beam, mimic echo and gravity well all affect the player', () => {
  const g = fresh(); arena(g, 4, 1); g.run('boss.stun=999;P[0].x=(GX+8)*T;P[0].inv=0;P[0].hp=6');
  g.run("waves=[{kind:'beam',x:P[0].x-100,y:P[0].y+14,w:300,h:10,vx:0,vy:0,dir:0,va:0,delay:0,life:5}]"); frames(g, 2);
  assert(g.run('P[0].hp<6'), 'beam');
  g.run("P[0].inv=0;P[0].hp=6;P[0].stun=0;freeze=0;waves=[{kind:'echo',x:0,y:0,w:18,h:28,vx:0,vy:0,delay:0,life:50,i:0,path:Array(20).fill([P[0].x,P[0].y,1])}]"); frames(g, 3);
  assert(g.run('P[0].hp<6'), 'echo');
  g.run("freeze=0;P[0].stun=0;P[0].vx=0;P[0].x=(GX+8)*T;P[0].y=G*T-28;waves=[{kind:'well',x:P[0].x+150,y:G*T-30,w:24,h:24,vx:0,vy:0,delay:0,life:100}]");
  const x0 = g.run('P[0].x'); frames(g, 30);
  assert(g.run('P[0].x') > x0 + 30, 'no pull');
});

test('new flying bosses drop within jump-attack reach', () => {
  for (const [lv, kind] of [[2, 'astronomer'], [3, 'gorgon'], [4, 'prism'], [5, 'architect']]) {
    const g = fresh(); arena(g, lv, 1);
    assert.strictEqual(g.run('boss.kind'), kind);
    let low = 0;
    for (let k = 0; k < 80; k++) { g.run("state='play';freeze=0;P[0].inv=99;P[0].hp=P[0].max"); frames(g, 20, false); low = Math.max(low, g.run('boss?boss.y+boss.h:0')); }
    assert(low > g.run('G*T') - 180, kind + ' lowest bottom ' + low);
  }
});

test('every weapon at every level damages an enemy', () => {
  const g = fresh();
  const list = [['s'], ['m', 'forge'], ['d', 'dag'], ['w', 'whip'], ['c', 'chak'], ['a', 'bow'], ['y', 'scy'], ['r', 'rod'],
    ['f', 'frost'], ['v', 'voidg'], ['l', 'wisp'], ['o', 'bomb']];
  for (const [w, id] of list) for (let lv = 1; lv <= (id ? 4 : 1); lv++) {
    g.run(`level=1;loadLevel();state='play';Object.keys(up).forEach(k=>up[k]=0);${id ? `up.${id}=${lv};` : ''}
      meta.settings.wepOrder=['${w}'];meta.settings.wepCycle={...DEFAULT_WEP_CYCLE};
      CHARS[P[0].chr].base='s';chaks=[];K={};enemies=[{type:'c',x:P[0].x+${w === 'o' ? 90 : 34},y:G*T-18,w:26,h:18,vx:0,vy:0,dir:1,hp:9999,flash:0,onGround:true,spd:0}]`.replace('K={};', "Object.keys(K).forEach(k=>delete K[k]);"));
    if (w === 's' && g.run('curW()') !== 's') continue;
    assert.strictEqual(g.run('curW()'), w, 'cannot select ' + w);
    for (let k = 0; k < 40; k++) {
      g.run(`K['j']=${k % 2 === 0};P[0].inv=99;freeze=0;P[0].face=1;if(enemies[0]){enemies[0].x=P[0].x+${w === 'o' ? 90 : 34};enemies[0].y=G*T-18;enemies[0].spd=0}`);
      frames(g, 12);
    }
    assert(g.run('enemies[0].hp<9999'), `weapon ${w} level ${lv} did no damage`);
    assert(g.run('chaks.length<30'), `weapon ${w} leaks projectiles`);
  }
});

test('traders sell the new weapons and old saves can use them', () => {
  const storage = { 'emberdeep-meta-v1': JSON.stringify({ gold: 5, settings: { wepOrder: ['s', 'm'], wepCycle: { s: true, m: true } } }) };
  const g = loadGame(storage); g.run('start(true)');
  g.run("shards=999;const tr=traders[2];P[0].x=tr.x;P[0].y=G*T-28;interact()");
  assert.strictEqual(g.run('menu.tr.stock.slice(0,4).join()'), 'frost,voidg,wisp,bomb');
  g.run("for(let i=0;i<4;i++){menu.sel=i;menuKey('enter')}draw();closeMenu()");
  assert(g.run("['f','v','l','o'].every(w=>weps().includes(w))"));
  g.run("interact();P[0].x=0;menu={mode:'inv',sel:0,tab:0,msg:''};state='menu';draw();closeMenu()");
  g.run("openSettings();settingsMenu.mode='weapons';draw();closeSettings()");
  assert(g.run('saveGame(),JSON.parse(localStorage.getItem(SAVE_KEY)).up.bomb===1'));
});

test('chests grant temporary upgrades and each upgrade works', () => {
  const g = fresh();
  g.run('enemies=[];const h=chests[0];P[0].x=h.x;P[0].y=h.y-8;P[0].atk=5;P[0].atkMax=15;updateChests()');
  assert(g.run('chests[0].open&&Object.keys(P[0].buffs).length>0'));
  g.run('P[0].buffs={};p=P[0];applyCharms()');
  const m = g.run('pmel()'); g.run("giveBuff(P[0],'fury')"); assert(g.run('pmel()') > m);
  const hp = g.run('P[0].max'); g.run("giveBuff(P[0],'iron')"); assert.strictEqual(g.run('P[0].max'), hp + 2);
  g.run("giveBuff(P[0],'aegis');P[0].inv=0;P[0].hp=4;p=P[0];hurt(0)");
  assert.strictEqual(g.run('P[0].hp+":"+P[0].buffs.aegis'), '4:2');
  g.run("giveBuff(P[0],'ward');P[0].spCd=0;p=P[0];P[0].onGround=true;doSpecial()");
  assert(g.run('P[0].spCd<180'));
  g.run("Object.keys(BUFFS).forEach(k=>{for(let i=0;i<5;i++)giveBuff(P[0],k)})");
  assert(g.run('Object.keys(BUFFS).every(k=>P[0].buffs[k]<=BUFFS[k].max)'));
  assert.strictEqual(g.run('giveBuff(P[0])'), null);
  frames(g, 60); g.run('nextLevel()');
  assert(g.run('Object.keys(P[0].buffs).length===0&&P[0].max===CHARS[P[0].chr].hp'));
});

test('co-op, versus, boss rush and daily run still start and run', () => {
  let g = loadGame(); g.run('coop=true;start(true)'); frames(g, 200); assert.strictEqual(g.run('P.length'), 2);
  g = loadGame(); g.run('pvp=true;startPvp()'); frames(g, 400); assert(g.run('!boss&&tplats.length===0'));
  g = loadGame(); g.run("rmode='rush';startRun()"); frames(g, 5);
  assert.strictEqual(g.run('boss.kind'), 'moth');
  g.run('killBoss()'); frames(g, 440); assert.strictEqual(g.run('level+":"+(boss&&boss.kind)'), '2:mimic');
  g = loadGame(); g.run("rmode='daily';startRun()"); frames(g, 100); assert.strictEqual(g.run('level'), 1);
});

// Two sandboxes joined by an in-memory room, like the relay server.
function online() {
  const host = loadGame(), guest = loadGame(), toGuest = [], toHost = [];
  host.box.__send = d => toGuest.push(JSON.stringify(d));
  guest.box.__send = d => toHost.push(JSON.stringify(d));
  host.run("state='lobby';lobby={step:'host',versus:false,rm:{emit:(e,d)=>__send(d),leave(){}}}");
  guest.run("state='lobby';lobby={step:'joining',t0:0,rm:{emit:(e,d)=>__send(d),leave(){}}};net={role:'guest',rm:lobby.rm,seq:0,gen:-1,got:false,lm:-1,hb:0,obj:{},gold:0,lastS:Date.now(),pl:null,boss:null,peerShop:false};netSend({t:'join',c:0})");
  const deliver = (q, g, role) => { while (q.length) { g.box.__in = q.shift(); g.run(`onMsg(JSON.parse(__in),'${role}')`); } };
  const step = n => { for (let i = 0; i < n; i++) { deliver(toHost, host, 'host'); host.run('update()'); deliver(toGuest, guest, 'guest'); guest.run('update()'); if (i % 3 === 0) { host.run('draw()'); guest.run('draw()'); } } };
  step(12);
  return { host, guest, step };
}
const same = (o, expr, msg) => assert.strictEqual(o.guest.run(expr), o.host.run(expr), msg || expr);

test('online: guest sees the same map, gates, bosses, ledges, buffs and weapons', () => {
  const o = online(), { host, guest, step } = o;
  same(o, 'level'); same(o, 'grid.join("")', 'map differs');
  host.run("level=5;loadLevel();state='play'"); step(8);
  same(o, 'grid.join("")');
  host.run('P.forEach(q=>{q.x=(AX+6)*T;q.y=G*T-28});enemies=[]'); step(8);
  same(o, 'boss.kind'); same(o, 'gateClosed'); same(o, 'grid.join("")', 'mid walls differ');
  host.run('killBoss()'); step(112);
  same(o, 'gateClosed'); same(o, 'arenaDone.join()'); same(o, 'grid.join("")', 'walls not reopened');
  same(o, 'JSON.stringify(P[1].buffs)');
  assert(guest.run('Object.keys(P[1].buffs).length>0'));
  host.run('P.forEach(q=>{q.x=(GX+6)*T;q.y=G*T-28});enemies=[]'); step(8);
  same(o, 'boss.kind'); assert.strictEqual(guest.run('boss.kind'), 'architect');
  host.run("boss.state='windup';boss.pat=0;boss.tm=1;P.forEach(q=>q.inv=9999)"); step(10);
  assert(host.run('tplats.length>0')); same(o, 'grid.join("")', 'ledges differ');
  step(420); same(o, 'grid.join("")', 'ledges not removed');
});

test('online: every new boss and weapon renders for the guest', () => {
  const o = online(), { host, guest, step } = o;
  for (const lv of [1, 2, 3, 4, 5]) {
    host.run(`level=${lv};loadLevel();state='play';arenaDone[0]=true;P.forEach(q=>{q.x=(GX+6)*T;q.y=G*T-28});enemies=[];Object.assign(up,{frost:4,voidg:4,wisp:4,bomb:4})`);
    for (let k = 0; k < 60; k++) {
      host.run(`state='play';P.forEach(q=>{q.inv=99;q.hp=q.max});if(boss)boss.hp=boss.max;
        meta.settings.wepOrder=['f','v','l','o'];P[0].wep=${k % 4};P[1].wep=${(k + 1) % 4};K['j']=${k % 2 === 0};net.rin={...zeroIn(),atk:${k % 2 === 1}}`);
      step(15);
    }
    same(o, 'boss.kind');
  }
});

test('online: the guest can buy a new weapon from the third trader', () => {
  const o = online(), { host, guest, step } = o;
  host.run('shards=999;enemies=[];P[1].x=traders[2].x;P[1].y=G*T-28'); step(10);
  guest.run("guestKey('e')"); step(10);
  assert.strictEqual(guest.run('menu&&menu.mode'), 'shop');
  guest.run("guestKey('enter')"); step(10);
  assert.strictEqual(host.run('up.frost'), 1);
  same(o, 'up.frost');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
