const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, STAGES, TYPES, formationBounds, applyPowerup, readScores, saveScore, normalizeInitials } = require('../js/core.js');
const tick = (g, seconds, input = {}) => { for (let t = 0; t < seconds; t += 1/60) g.update(1/60, input); };
const play = (stage = 0) => { const g = new Game(42); g.start(); g.loadStage(stage); g.state = 'playing'; g.player.invulnerable = 0; return g; };

test('campaign has two worlds of four waves plus a boss and increasing unique waves', () => {
  assert.equal(STAGES.length, 10);
  assert.deepEqual(STAGES.filter(s => s.boss).map(s => s.world), [1, 2]);
  const waves = STAGES.filter(s => !s.boss);
  assert.equal(new Set(waves.map(s => s.shape)).size, 8);
  for (let i=1; i<waves.length; i++) assert.ok(waves[i].count > waves[i-1].count);
  assert.deepEqual(STAGES[0].types, ['A']);
  assert.equal(new Set(waves.flatMap(s => s.types)).size, 6);
});
test('starts with three hearts and caps movement at eight pixel borders', () => {
  const g = play(); assert.equal(g.player.hp,3);
  tick(g, 3, {left:true}); assert.equal(g.player.x, 8);
  tick(g, 4, {right:true}); assert.equal(g.player.x, 480-8-g.player.w);
});
test('held fire is cooldown-limited and weapon tiers create more shots', () => {
  const g=play(); g.fire(); assert.equal(g.shots.length,1); g.fire(); assert.equal(g.shots.length,1);
  g.player.weapon=5; g.player.cooldown=0; g.fire(); assert.equal(g.shots.length,6);
  assert.ok(g.shots.every(s=>s.vy<0));
});
test('living edge columns shrink bounds while divers are excluded', () => {
  const enemies=[{x:8,y:80,w:16,h:16,hp:1,mode:'formation'}, {x:80,y:80,w:16,h:16,hp:1,mode:'formation'}, {x:200,y:80,w:16,h:16,hp:0,mode:'formation'}, {x:400,y:300,w:16,h:16,hp:1,mode:'dive'}];
  assert.deepEqual(formationBounds(enemies),{left:8,right:96,bottom:96});
  enemies[0].hp=0; assert.equal(formationBounds(enemies).left,80);
});
test('formation bounces at eight pixel border and freed columns extend movement', () => {
  const g=play(); g.enemies=[g.makeEnemy('A',8,80),g.makeEnemy('A',40,80)]; g.direction=-1;
  g.moveFormation(); assert.equal(g.direction,1); assert.equal(g.enemies[0].y,88);
  g.enemies[0].hp=0; g.direction=-1; g.moveFormation(); assert.equal(g.enemies[1].x,32);
});
test('scouts fire every four steps and tanks every five with extra health', () => {
  const g=play(); g.enemies=[g.makeEnemy('A',180,80)];
  for(let i=0;i<3;i++)g.moveFormation(); assert.equal(g.hostile.length,0);
  g.moveFormation(); assert.equal(g.hostile.length,1); assert.equal(g.hostile[0].vx,0);
  g.enemies=[g.makeEnemy('C',220,80)]; g.hostile=[];
  for(let i=0;i<5;i++)g.moveFormation(); assert.equal(g.hostile.length,1); assert.ok(g.enemies[0].hp>1); assert.ok(g.hostile[0].vy<100);
});
test('tanks occupy the lowest formation position of their columns',()=>{
  const g=play(2); for(const tank of g.enemies.filter(e=>e.type==='C')) assert.ok(!g.enemies.some(e=>e.x===tank.x&&e.y>tank.y));
});
test('kamikaze detaches and moves toward the player with an erratic path',()=>{
  const g=play(); const e=g.makeEnemy('B',100,80); g.enemies=[e]; g.beginDive(e); const x=e.x,y=e.y;
  tick(g,.5); assert.equal(e.mode,'dive'); assert.ok(e.y>y); assert.notEqual(e.x,x);
});
test('damage removes one heart, grants invulnerability and loses at zero',()=>{
  const g=play(); g.damage(); assert.equal(g.player.hp,2); g.damage(); assert.equal(g.player.hp,2);
  g.player.invulnerable=0; g.damage(); g.player.invulnerable=0; g.damage(); assert.equal(g.state,'defeat');
});
test('shield absorbs exactly five damaging hits before hearts decrease',()=>{
  const g=play(); applyPowerup(g.player,'shield');
  for(let i=0;i<5;i++){g.player.invulnerable=0;g.damage();}
  assert.equal(g.player.shield,0); assert.equal(g.player.hp,3); g.player.invulnerable=0;g.damage();assert.equal(g.player.hp,2);
});
test('all upgrades respect five-tier limits',()=>{
  const g=play(); for(const kind of ['life','weapon','rate','shield']) for(let i=0;i<8;i++)applyPowerup(g.player,kind);
  assert.equal(g.player.hp,5); assert.equal(g.player.weapon,5);assert.equal(g.player.rate,5);assert.equal(g.player.shield,5);
});
test('freeze, silence and inversion apply no life damage and expire',()=>{
  for(const effect of ['freeze','silence','invert']) {const g=play();g.applyEffect(effect);assert.equal(g.player.hp,3);assert.ok(g.player.effects[effect]>0);tick(g,5);assert.equal(g.player.effects[effect],0);}
});
test('freeze prevents movement, silence prevents fire, inversion reverses movement',()=>{
  const g=play(); const x=g.player.x; g.applyEffect('freeze');tick(g,.2,{right:true});assert.equal(g.player.x,x);
  g.applyEffect('silence');g.fire();assert.equal(g.shots.length,0);
  g.player.effects.freeze=0;g.applyEffect('invert');tick(g,.2,{right:true});assert.ok(g.player.x<x);
});
test('status bullets collide without removing hearts',()=>{
  const g=play();for(const effect of ['freeze','silence','invert'])g.hostile.push({x:g.player.x+4,y:g.player.y+2,w:6,h:6,vx:0,vy:0,effect});
  g.update(1/60);assert.equal(g.player.hp,3);assert.ok(Object.values(g.player.effects).every(v=>v>0));
});
test('every tenth player kill queues a supply ship; shooting it drops an upgrade',()=>{
  const g=play();for(let i=0;i<10;i++)g.killEnemy(g.makeEnemy('A',100,80));assert.equal(g.kills,10);assert.equal(g.supplyQueue,1);
  g.update(1/60); assert.ok(g.carrier);g.hitCarrier();assert.equal(g.carrier,null);assert.equal(g.drops.length,1);
});
test('pickup requires collision and missed drops leave the screen',()=>{
  const g=play();g.player.hp=2;g.drops=[{x:g.player.x,y:g.player.y,w:12,h:12,kind:'life',vy:45}];g.update(1/60);assert.equal(g.player.hp,3);assert.equal(g.drops.length,0);
  g.drops=[{x:0,y:510,w:12,h:12,kind:'life',vy:45}];g.update(1/60);assert.equal(g.drops.length,0);
});
test('boss alternates telegraph, attack and recovery and summons enemies',()=>{
  const g=play(4);assert.ok(g.boss);assert.equal(g.boss.phase,'telegraph');tick(g,1.3);assert.equal(g.boss.phase,'attack');assert.ok(g.hostile.length>0);
  tick(g,2);assert.equal(g.boss.phase,'recover');assert.equal(g.boss.vulnerable,true);
  g.boss.cycle=2;g.boss.phase='telegraph';g.boss.timer=.01;g.update(1/60);assert.ok(g.enemies.length>0);
});
test('boss is protected during windup and can be damaged in recovery',()=>{
  const g=play(4);const hp=g.boss.hp;g.hitBoss();assert.equal(g.boss.hp,hp);g.boss.vulnerable=true;g.hitBoss();assert.equal(g.boss.hp,hp-1);
});
test('clearing waves transitions, preserves upgrades and completes all ten stages',()=>{
  const g=play();g.player.weapon=3;
  for(let stage=0;stage<10;stage++) { assert.equal(g.stageIndex,stage);g.enemies=[];g.boss=null;g.state='playing';g.update(1/60);if(stage<9){assert.equal(g.state,'transition');tick(g,3.5);assert.equal(g.player.weapon,3);assert.equal(g.state,'playing');}}
  assert.equal(g.state,'victory');
});
test('defeat wins over simultaneous stage clear and pause freezes simulation',()=>{
  const g=play();g.player.hp=1;g.enemies=[];g.hostile=[{x:g.player.x,y:g.player.y,w:8,h:8,vx:0,vy:0}];g.update(1/60);assert.equal(g.state,'defeat');
  const p=play();p.pause();const x=p.player.x;tick(p,1,{right:true});assert.equal(p.player.x,x);p.pause();assert.equal(p.state,'playing');
});
test('initials and stored leaderboard validate, sort and survive storage errors',()=>{
  assert.equal(normalizeInitials('a!b9cd'),'ABC');
  const store={value:null,getItem(){return this.value},setItem(k,v){this.value=v}};
  saveScore(store,'zed',1234,'defeat');saveScore(store,'ace',2345,'victory');const scores=readScores(store);assert.equal(scores[0].name,'ACE');assert.equal(scores[0].score,2345);
  store.value='not json';assert.deepEqual(readScores(store),[]);
  store.value=JSON.stringify([{name:'abc',score:-2},{name:'ok!',score:Infinity}]);assert.deepEqual(readScores(store),[]);
  const broken={getItem(){throw Error()},setItem(){throw Error()}};assert.doesNotThrow(()=>saveScore(broken,'AAA',200,'defeat'));
});
test('enemy configuration includes three non-damaging status variants',()=>{
  assert.equal(TYPES.D.effect,'freeze');assert.equal(TYPES.E.effect,'silence');assert.equal(TYPES.F.effect,'invert');
});
test('real shot collisions kill scouts, damage tanks and award score only on death',()=>{
  const g=play();const tank=g.makeEnemy('C',200,100);g.enemies=[tank,g.makeEnemy('A',300,100)];
  for(let i=0;i<3;i++){g.shots.push({x:204,y:106,w:2,h:8,vx:0,vy:-340});g.update(1/60);assert.equal(g.score,i<2?0:250);}
  assert.equal(g.kills,1);g.shots.push({x:304,y:106,w:2,h:8,vx:0,vy:-340});g.update(1/60);assert.equal(g.kills,2);assert.equal(g.state,'transition');
});
test('inversion diver applies a status through contact without taking a heart',()=>{
  const g=play();const e=g.makeEnemy('F',g.player.x,g.player.y);g.enemies.push(e);g.beginDive(e);g.update(1/60);assert.ok(g.player.effects.invert>0);assert.equal(g.player.hp,3);
});
test('higher fire rate really fires more often at an equal simulation duration',()=>{
  const count=rate=>{const g=play();g.player.rate=rate;g.drainEvents();tick(g,1,{fire:true});return g.drainEvents().filter(e=>e.type==='fire').length};assert.ok(count(5)>count(1));
});
test('multiple supply milestones queue separate ships and all four rewards cycle',()=>{
  const g=play();for(let i=0;i<40;i++)g.killEnemy(g.makeEnemy('A',100,80));assert.equal(g.supplyQueue,4);
  const kinds=[];for(let i=0;i<4;i++){g.update(1/60);assert.ok(g.carrier);g.hitCarrier();kinds.push(g.drops.at(-1).kind);}assert.deepEqual(kinds,['life','shield','weapon','rate']);assert.equal(g.supplyQueue,0);
});
test('a boss cannot clear its stage while summoned enemies remain',()=>{
  const g=play(4);g.enemies.push(g.makeEnemy('A',100,140));g.boss.vulnerable=true;g.boss.hp=1;g.hitBoss();g.update(1/60);assert.equal(g.state,'playing');g.killEnemy(g.enemies[0]);g.update(1/60);assert.equal(g.state,'transition');
});
test('all authored waves have their promised counts and include every introduced type',()=>{
  for(let i=0;i<10;i++){if(STAGES[i].boss)continue;const g=play(i);assert.equal(g.enemies.length,STAGES[i].count);for(const type of STAGES[i].types)assert.ok(g.enemies.some(e=>e.type===type),i+':'+type);assert.ok(g.enemies.every(e=>e.x>=8&&e.x+e.w<=472));}
});
test('the fourth formation has a distinct symmetric diamond silhouette',()=>{
  const g=play(3),rows=new Map();for(const e of g.enemies)rows.set(e.y,(rows.get(e.y)||0)+1);assert.deepEqual([...rows.values()],[4,6,8,8,6,4]);assert.equal(g.enemies.length,36);
});
test('invasion costs at most one heart and resets altitude without ending the wave',()=>{
  const g=play();g.enemies=[g.makeEnemy('A',8,432),g.makeEnemy('A',40,432)];g.direction=-1;g.moveFormation();assert.equal(g.player.hp,2);assert.equal(g.state,'playing');assert.ok(g.enemies.every(e=>e.y<400));
});
test('game restarts reset score, hearts, upgrades, kills and supply queue',()=>{
  const g=play(9);g.score=200;g.player.weapon=5;g.player.hp=1;g.kills=23;g.supplyQueue=2;g.start();assert.equal(g.stageIndex,0);assert.equal(g.player.hp,3);assert.equal(g.player.weapon,1);assert.equal(g.score,0);assert.equal(g.kills,0);assert.equal(g.supplyQueue,0);
});
test('leaderboard keeps only the eight highest finite valid scores',()=>{
  const s={value:null,getItem(){return this.value},setItem(k,v){this.value=v}};for(let i=0;i<12;i++)saveScore(s,'AAA',i*100,'defeat');const scores=readScores(s);assert.equal(scores.length,8);assert.equal(scores[0].score,1100);assert.equal(scores.at(-1).score,400);
});
test('full campaign clears through real enemy and boss projectile collisions',()=>{
  const g=new Game(1978);g.start();
  let visited=[];
  for(let frame=0;frame<10000&&g.state!=='victory'&&g.state!=='defeat';frame++){
    if(g.state==='playing'){
      if(!visited.includes(g.stageIndex))visited.push(g.stageIndex);
      // Place test projectiles at collision surfaces to exercise the entire campaign
      // without a test bot's aiming skill determining the outcome of a rules test.
      for(const e of g.enemies)g.shots.push({x:e.x+4,y:e.y+6,w:2,h:8,vx:0,vy:-340});
      if(g.boss?.vulnerable)g.shots.push({x:g.boss.x+8,y:g.boss.y+8,w:2,h:8,vx:0,vy:-340});
    }
    g.update(1/60);
  }
  assert.equal(g.state,'victory');assert.deepEqual(visited,[0,1,2,3,4,5,6,7,8,9]);assert.ok(g.score>30000);assert.ok(g.kills>=STAGES.filter(s=>!s.boss).reduce((sum,s)=>sum+s.count,0));assert.ok(g.player.hp>0);
});
