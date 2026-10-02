(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ArcadeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 480, H = 500, BORDER = 8;
  // Selected from Stella's standard 128-color Atari 2600 NTSC palette.
  const PALETTE = {black:'#000000',white:'#ececec',muted:'#8e8e8e',orange:'#e39759',green:'#b4e775',gold:'#e8cc63',cyan:'#75cceb',pink:'#ec8ce0',violet:'#a980f0'};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlaps = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const TYPES = {
    A: { name:'SCOUT', color:'#b4e775', hp:1, score:100, interval:4 },
    B: { name:'DIVER', color:'#e39759', hp:1, score:150, interval:6 },
    C: { name:'TANK', color:'#e8cc63', hp:3, score:250, interval:5 },
    D: { name:'FROST', color:'#75cceb', hp:1, score:180, interval:6, effect:'freeze' },
    E: { name:'JAMMER', color:'#ec8ce0', hp:2, score:220, interval:7, effect:'silence' },
    F: { name:'MIRROR', color:'#a980f0', hp:2, score:240, interval:8, effect:'invert' }
  };
  const STAGES = [
    {world:1,level:1,name:'FIRST CONTACT',shape:'ranks',count:18,types:['A'],beat:.72},
    {world:1,level:2,name:'BREAK FORMATION',shape:'wings',count:24,types:['A','B'],beat:.66},
    {world:1,level:3,name:'HEAVY METAL',shape:'bastion',count:30,types:['A','B','C'],beat:.60},
    {world:1,level:4,name:'COLD FRONT',shape:'diamond',count:36,types:['A','B','C','D'],beat:.56},
    {world:1,level:5,name:'THE GATEKEEPER',boss:true,types:['A','B'],beat:.55},
    {world:2,level:1,name:'DEAD AIR',shape:'chevron',count:42,types:['A','B','C','D','E'],beat:.54},
    {world:2,level:2,name:'WRONG WAY',shape:'cross',count:48,types:['A','B','C','D','E','F'],beat:.50},
    {world:2,level:3,name:'SIGNAL STORM',shape:'ring',count:54,types:['A','B','C','D','E','F'],beat:.46},
    {world:2,level:4,name:'LAST DEFENSE',shape:'armada',count:60,types:['A','B','C','D','E','F'],beat:.42},
    {world:2,level:5,name:'THE OVERMIND',boss:true,types:['A','B','D','E','F'],beat:.45}
  ];
  function formationBounds(enemies) {
    const living = enemies.filter(e => e.hp > 0 && e.mode === 'formation');
    if (!living.length) return null;
    return {left:Math.min(...living.map(e=>e.x)),right:Math.max(...living.map(e=>e.x+e.w)),bottom:Math.max(...living.map(e=>e.y+e.h))};
  }
  function applyPowerup(player, kind) {
    if(kind==='life') player.hp=Math.min(5,player.hp+1);
    if(kind==='shield') player.shield=5;
    if(kind==='weapon') player.weapon=Math.min(5,player.weapon+1);
    if(kind==='rate') player.rate=Math.min(5,player.rate+1);
  }
  function normalizeInitials(value) { return String(value).toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); }
  const SCORE_KEY='invaders2600.scores.v1';
  function readScores(storage) {
    try {
      const parsed=JSON.parse(storage.getItem(SCORE_KEY)||'[]');
      if(!Array.isArray(parsed))return [];
      return parsed.filter(s=>s && /^[A-Z]{3}$/.test(s.name) && Number.isSafeInteger(s.score) && s.score>=0)
        .map(s=>({name:s.name,score:s.score,outcome:s.outcome==='victory'?'victory':'defeat'})).sort((a,b)=>b.score-a.score).slice(0,8);
    } catch { return []; }
  }
  function saveScore(storage,name,score,outcome) {
    const normalized=normalizeInitials(name);
    if(normalized.length!==3 || !Number.isSafeInteger(score) || score<0) return readScores(storage);
    const scores=[...readScores(storage),{name:normalized,score,outcome:outcome==='victory'?'victory':'defeat'}].sort((a,b)=>b.score-a.score).slice(0,8);
    try { storage.setItem(SCORE_KEY,JSON.stringify(scores)); } catch { /* A blocked store must not block the arcade. */ }
    return scores;
  }
  class Game {
    constructor(seed=Date.now()) { this.seed=seed>>>0;this.state='menu';this.events=[];this.time=0;this.stageIndex=0;this.score=0;this.enemies=[];this.shots=[];this.hostile=[];this.drops=[];this.carrier=null;this.boss=null;this.player=this.newPlayer(); }
    random() {this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
    newPlayer() {return {x:232,y:452,w:16,h:16,hp:3,shield:0,weapon:1,rate:1,cooldown:0,invulnerable:0,effects:{freeze:0,silence:0,invert:0}};}
    emit(type,data={}) {this.events.push({type,...data});}
    drainEvents() {const events=this.events;this.events=[];return events;}
    start() {this.events=[];this.player=this.newPlayer();this.score=0;this.kills=0;this.supplyQueue=0;this.carrierSerial=0;this.time=0;this.loadStage(0);}
    loadStage(index) {
      this.stageIndex=index;this.stage=STAGES[index];this.enemies=[];this.shots=[];this.hostile=[];this.drops=[];this.carrier=null;this.direction=1;this.stepClock=0;this.formationSteps=0;this.fireCursor=0;this.boss=null;
      this.player.y=452;this.player.x=clamp(this.player.x,8,W-24);this.player.cooldown=0;this.player.invulnerable=1.5;
      this.player.effects={freeze:0,silence:0,invert:0};
      this.state='intro';this.stateTimer=1.5;
      if(this.stage.boss) this.boss={x:208,y:66,w:64,h:40,hp:this.stage.world===1?40:65,maxHp:this.stage.world===1?40:65,phase:'telegraph',timer:1.2,cycle:0,vulnerable:false,attackClock:0};
      else {
        const cols=this.stage.shape==='diamond'?8:this.stageIndex<4?6:10, rows=this.stageIndex<4?3+this.stageIndex:6;
        const slots=[];
        for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
          const cx=Math.abs(col-(cols-1)/2),cy=Math.abs(row-(rows-1)/2);
          const shape=this.stage.shape;
          let rank=row*cols+col;
          if(shape==='chevron')rank=Math.abs(row-cx)*10+row;
          if(shape==='cross')rank=Math.min(cx,cy)*10+row;
          if(shape==='ring')rank=-Math.abs(cx+cy-3)*10+row;
          if(shape==='diamond')rank=cx+cy;
          slots.push({row,col,rank});
        }
        slots.sort((a,b)=>a.rank-b.rank || a.col-b.col);
        const selected=slots.slice(0,this.stage.count).sort((a,b)=>a.row-b.row||a.col-b.col);
        const left=(W-(cols-1)*32-16)/2;
        for(const slot of selected){
          const bottom=!selected.some(s=>s.col===slot.col && s.row>slot.row);
          let type='A';
          if(bottom && this.stage.types.includes('C'))type='C';
          else {
            const allowed=this.stage.types.filter(t=>t!=='C');
            type=allowed[(slot.row*3+slot.col+Math.floor(slot.col/3))%allowed.length];
          }
          let offset=0;
          if(this.stage.shape==='wings')offset=Math.abs(slot.col-2.5)*4;
          if(this.stage.shape==='bastion')offset=slot.col%2*6;
          if(this.stage.shape==='armada')offset=slot.col%3*4;
          const e=this.makeEnemy(type,left+slot.col*32,82+slot.row*27+offset);e.col=slot.col;this.enemies.push(e);
        }
      }
      this.initialCount=this.enemies.length;this.emit('stage',{stage:this.stage,index});
    }
    makeEnemy(type,x,y) {return {type,x,y,w:16,h:16,hp:TYPES[type].hp,maxHp:TYPES[type].hp,mode:'formation',steps:0,seed:Math.floor(this.random()*65536),age:0};}
    pause() {if(['playing','intro','transition'].includes(this.state)){this.resumeState=this.state;this.state='paused';this.emit('pause');}else if(this.state==='paused'){this.state=this.resumeState;this.emit('resume');}}
    fire() {
      const p=this.player;if(this.state!=='playing'||p.cooldown>0||p.effects.silence>0)return;
      for(let i=0;i<p.weapon;i++)this.shots.push({x:p.x+7+(i-(p.weapon-1)/2)*5,y:p.y-6,w:2,h:8,vx:(i-(p.weapon-1)/2)*12,vy:-340});
      p.cooldown=.34-(p.rate-1)*.045;this.emit('fire');
    }
    damage() {
      const p=this.player;if(p.invulnerable>0||this.state!=='playing')return;
      if(p.shield>0){p.shield--;this.emit('shield',{x:p.x+8,y:p.y+8});}
      else {p.hp--;this.emit('damage',{x:p.x+8,y:p.y+8});}
      p.invulnerable=1.25;
      if(p.hp<=0){this.state='defeat';this.emit('defeat');}
    }
    applyEffect(effect) {if(!(effect in this.player.effects))return;this.player.effects[effect]=effect==='freeze'?1.4:3.2;this.emit('status',{effect,x:this.player.x+8,y:this.player.y+8});}
    killEnemy(e) {if(e.hp<=0)return;e.hp=0;this.score+=TYPES[e.type].score;this.kills++;this.emit('kill',{x:e.x+8,y:e.y+8,color:TYPES[e.type].color});if(this.kills%10===0){this.supplyQueue++;this.emit('supply-ready');}}
    beginDive(e) {e.homeX=e.x;e.homeY=e.y;e.mode='dive';e.age=0;this.emit('dive',{effect:TYPES[e.type].effect});}
    rejoinFormation(e) {
      e.x=e.homeX;e.y=e.homeY;e.mode='formation';e.steps=0;e.age=0;
      // While a column was away the surviving block could travel farther.
      // Restore room for that column without changing its relative grid slot.
      const bounds=formationBounds(this.enemies);
      const dx=bounds.left<BORDER?BORDER-bounds.left:bounds.right>W-BORDER?W-BORDER-bounds.right:0;
      if(dx)for(const member of this.enemies){
        if(member.hp<=0)continue;
        if(member.mode==='formation')member.x+=dx;
        else member.homeX+=dx;
      }
    }
    enemyFire(e) {
      const type=TYPES[e.type],origin={x:e.x+6,y:e.y+16,w:4,h:7,effect:type.effect};
      if(e.type==='D'){
        const dx=this.player.x-e.x;this.hostile.push({...origin,vx:clamp(dx*.18,-35,35),vy:95,w:7,h:7});
      }else if(e.type==='E'){
        for(const vx of [-32,32])this.hostile.push({...origin,vx,vy:82,w:7,h:5,wave:18,age:0});
      }else this.hostile.push({...origin,vx:0,vy:e.type==='C'?72:112+(this.stage.world-1)*12});
      this.emit('enemy-fire',{effect:type.effect});
    }
    moveFormation() {
      const bounds=formationBounds(this.enemies);if(!bounds)return;
      let dx=8*this.direction,dy=0;
      if(bounds.left+dx<BORDER || bounds.right+dx>W-BORDER){this.direction*=-1;dx=0;dy=8;}
      const candidates=[];
      for(const e of this.enemies){
        if(e.hp<=0)continue;
        if(e.mode!=='formation'){e.homeX+=dx;e.homeY+=dy;continue;}
        e.x+=dx;e.y+=dy;e.steps++;
        if(e.steps%TYPES[e.type].interval===0)candidates.push(e);
      }
      if(candidates.length){
        const budget=this.stage.world===1?1:2;
        for(let i=0;i<Math.min(budget,candidates.length);i++){
          const e=candidates[(this.fireCursor+i)%candidates.length];
          if(e.type==='B'||e.type==='F'){
            const divers=this.enemies.filter(e=>e.hp>0&&e.mode==='dive').length;
            if(divers<budget)this.beginDive(e);
          }else this.enemyFire(e);
        }
        this.fireCursor++;
      }
      this.formationSteps++;this.emit('march',{note:this.formationSteps%4});
      if(bounds.bottom+dy>428){
        this.damage();
        for(const e of this.enemies){
          if(e.hp<=0)continue;
          if(e.mode==='formation')e.y=Math.max(65,e.y-100);
          else e.homeY=Math.max(65,e.homeY-100);
        }
        this.emit('invasion');
      }
    }
    hitCarrier() {if(!this.carrier)return;const c=this.carrier;const kinds=['life','shield','weapon','rate'];this.drops.push({x:c.x+6,y:c.y+12,w:12,h:12,kind:kinds[this.carrierSerial++%4],vy:66});this.score+=300;this.carrier=null;this.emit('carrier-hit',{x:c.x+16,y:c.y+8});}
    hitBoss() {if(!this.boss||!this.boss.vulnerable)return;this.boss.hp--;this.emit('boss-hit');if(this.boss.hp<=0){this.score+=2500*this.stage.world;this.emit('boss-death',{x:this.boss.x+32,y:this.boss.y+20});this.boss=null;this.hostile=[];}}
    bossVolley(boss, pattern) {
      const x=boss.x+boss.w/2,y=boss.y+boss.h;
      if(pattern===2){
        if(this.enemies.filter(e=>e.hp>0).length<6){
          for(let i=0;i<3;i++){const type=this.stage.types[(boss.cycle+i)%this.stage.types.length];this.enemies.push(this.makeEnemy(type,150+i*64,136));}
          this.emit('summon');
        }
        return;
      }
      const count=pattern===0?(this.stage.world===1?5:7):(this.stage.world===1?3:5);
      const aim=Math.atan2(this.player.y-y,this.player.x+8-x);
      for(let i=0;i<count;i++){
        const angle=pattern===0?Math.PI/2+(i-(count-1)/2)*.22:aim+(i-(count-1)/2)*.14;
        const speed=pattern===0?95:122;
        this.hostile.push({x:x-3,y,w:6,h:6,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,boss:true});
      }
      if(this.stage.world===2&&pattern===0)for(const vx of [-80,80])this.hostile.push({x,y:y+8,w:6,h:6,vx,vy:62,boss:true});
      this.emit('boss-fire');
    }
    updateBoss(dt) {
      const b=this.boss;if(!b)return;b.timer-=dt;b.x=208+Math.sin(this.time*.8)*118;
      if(b.phase==='telegraph'&&b.timer<=0){b.phase='attack';b.timer=1.6;b.attackClock=.65;this.bossVolley(b,b.cycle%3);}
      else if(b.phase==='attack'){
        b.attackClock-=dt;if(b.attackClock<=0&&b.cycle%3!==2){b.attackClock=.65;this.bossVolley(b,b.cycle%3);}
        if(b.timer<=0){b.phase='recover';b.timer=this.stage.world===1?2.7:2.3;b.vulnerable=true;this.emit('boss-open');}
      }else if(b.phase==='recover'&&b.timer<=0){b.phase='telegraph';b.timer=1.2;b.vulnerable=false;b.cycle++;this.emit('boss-cue');}
    }
    update(dt,input={}) {
      dt=clamp(dt,0,.05);
      if(this.state==='paused'||this.state==='menu'||this.state==='defeat'||this.state==='victory')return;
      this.time+=dt;
      if(this.state==='intro'){this.stateTimer-=dt;if(this.stateTimer<=0)this.state='playing';return;}
      if(this.state==='transition'){
        this.stateTimer-=dt;this.player.y-=dt*150;
        if(this.stateTimer<=0)this.loadStage(this.stageIndex+1);return;
      }
      const p=this.player;p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
      for(const effect in p.effects)p.effects[effect]=Math.max(0,p.effects[effect]-dt);
      let axis=(input.right?1:0)-(input.left?1:0);if(p.effects.invert>0)axis*=-1;if(p.effects.freeze>0)axis=0;
      this.playerVelocity=axis*210;p.x=clamp(p.x+this.playerVelocity*dt,8,W-8-p.w);
      if(input.fire)this.fire();
      this.stepClock+=dt;const living=this.enemies.filter(e=>e.hp>0&&e.mode==='formation').length;
      const beat=Math.max(.18,this.stage.beat*(.48+.52*living/Math.max(1,this.initialCount)));
      if(this.stepClock>=beat){this.stepClock-=beat;this.moveFormation();}
      this.updateBoss(dt);
      for(const e of this.enemies){
        if(e.hp<=0)continue;
        if(e.mode==='returning'){
          e.x=clamp(e.homeX,BORDER,W-BORDER-e.w);e.y=Math.min(e.homeY,e.y+160*dt);
          if(e.y>=e.homeY)this.rejoinFormation(e);
          continue;
        }
        if(e.mode!=='dive')continue;e.age+=dt;e.y+=dt*(e.type==='F'?115:132);
        const target=p.x+8-e.x-8;const sway=Math.sin(e.age*8+e.seed)*65;
        e.x=clamp(e.x+(clamp(target*1.1,-90,90)+sway)*dt,8,W-24);
        if(overlaps(e,p)){if(TYPES[e.type].effect)this.applyEffect(TYPES[e.type].effect);else this.damage();e.hp=0;this.emit('explode',{x:e.x+8,y:e.y+8});}
        if(e.hp>0&&e.y>=H){e.mode='returning';e.x=clamp(e.homeX,BORDER,W-BORDER-e.w);e.y=-e.h;e.age=0;}
      }
      if(!this.carrier&&this.supplyQueue>0){this.supplyQueue--;const right=this.carrierSerial%2===0;this.carrier={x:right?-32:W+2,y:34,w:32,h:16,vx:right?155:-155};this.emit('carrier');}
      if(this.carrier){this.carrier.x+=this.carrier.vx*dt;if(this.carrier.x>W+40||this.carrier.x<-40)this.carrier=null;}
      for(const shot of this.shots){
        shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;if(shot.dead)continue;
        if(this.carrier&&overlaps(shot,this.carrier)){shot.dead=true;this.hitCarrier();continue;}
        if(this.boss&&overlaps(shot,this.boss)){shot.dead=true;this.hitBoss();continue;}
        for(const e of this.enemies){if(e.hp>0&&overlaps(shot,e)){shot.dead=true;if(e.hp===1)this.killEnemy(e);else{e.hp--;this.emit('hit',{x:e.x+8,y:e.y+8});}break;}}
      }
      for(const bullet of this.hostile){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;if(bullet.wave){bullet.age+=dt;bullet.x+=Math.cos(bullet.age*7)*bullet.wave*dt;}
        if(overlaps(bullet,p)){bullet.dead=true;if(bullet.effect)this.applyEffect(bullet.effect);else this.damage();}
      }
      for(const drop of this.drops){drop.y+=drop.vy*dt;if(overlaps(drop,p)){drop.dead=true;applyPowerup(p,drop.kind);this.emit('pickup',{kind:drop.kind,x:p.x+8,y:p.y+8});}}
      this.shots=this.shots.filter(s=>!s.dead&&s.y>-12&&s.x>-8&&s.x<W+8);
      this.hostile=this.hostile.filter(s=>!s.dead&&s.y<H+12&&s.x>-20&&s.x<W+20);
      this.drops=this.drops.filter(s=>!s.dead&&s.y<H);this.enemies=this.enemies.filter(e=>e.hp>0);
      if(this.state==='defeat')return;
      if(!this.enemies.length&&!this.boss){
        this.shots=[];this.hostile=[];this.score+=500*this.stage.world;
        if(this.stageIndex===STAGES.length-1){this.state='victory';this.emit('victory');}
        else{this.state='transition';this.stateTimer=1.8;this.emit('clear');}
      }
    }
  }
  return {Game,STAGES,TYPES,PALETTE,W,H,BORDER,formationBounds,applyPowerup,normalizeInitials,readScores,saveScore,overlaps};
});
