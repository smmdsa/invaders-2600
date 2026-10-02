(function(){
  'use strict';
  const {FONT,generateSprite}=ArcadeSprites;
  const {TYPES,W,H}=ArcadeCore;
  const COLORS=ArcadeCore.PALETTE;
  class Renderer {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.ctx.imageSmoothingEnabled=false;this.cache=new Map();this.clock=0;this.particles=[];this.toast=null;this.shake=0;this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let seed=1978;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      this.stars=Array.from({length:100},()=>({x:rnd()*W,y:rnd()*H,z:.3+rnd()*.7,bright:rnd()}));
    }
    text(value,x,y,size=1,color=COLORS.white,align='left'){
      const ctx=this.ctx,str=String(value).toUpperCase(),width=(str.length*6-1)*size;
      if(align==='center')x-=width/2;if(align==='right')x-=width;x=Math.round(x);y=Math.round(y);ctx.fillStyle=color;
      for(let n=0;n<str.length;n++){const char=FONT[str[n]]||FONT['?'];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(char[row][col])ctx.fillRect(x+(n*6+col)*size,y+row*size,size,size);}
    }
    sprite(kind,seed,x,y,scale=2,color=COLORS.green,frame=0){
      const key=kind+':'+seed;let grid=this.cache.get(key);if(!grid){grid=generateSprite(seed,kind);this.cache.set(key,grid);}
      this.ctx.fillStyle=color;x=Math.round(x);y=Math.round(y);
      for(let row=0;row<8;row++)for(let col=0;col<8;col++)if(grid[row][col]){
        let shift=frame&&row===7?(col<4?-1:1):0;this.ctx.fillRect(x+(col+shift)*scale,y+row*scale,scale,scale);
      }
    }
    handle(events){
      for(const e of events){
        if(['kill','hit','damage','shield','carrier-hit','pickup','explode','boss-death'].includes(e.type)){
          if(!this.reduced){const count=e.type==='boss-death'?50:e.type==='damage'?25:12;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;const speed=20+((i*17)%75);this.particles.push({x:e.x||240,y:e.y||85,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.4+(i%4)*.12,color:e.color||COLORS.orange});}}
          if(e.type==='damage'&&!this.reduced)this.shake=.2;
        }
        if(e.type==='pickup')this.toast={text:{life:'EXTRA LIFE',shield:'SHIELD ONLINE',weapon:'WEAPON UPGRADED',rate:'FIRE RATE UP'}[e.kind],color:COLORS.green,life:2};
        if(e.type==='carrier')this.toast={text:'SUPPLY SHIP INBOUND',color:COLORS.gold,life:2};
        if(e.type==='invasion')this.toast={text:'DEFENSE LINE BREACHED',color:COLORS.orange,life:2};
        if(e.type==='stage'){this.toast=null;this.particles=[];}
      }
    }
    backdrop(game,dt){
      const ctx=this.ctx;ctx.fillStyle='#000000';ctx.fillRect(0,0,W,H);
      const paused=['paused','victory','defeat'].includes(game.state);const active=!paused&&!this.reduced;
      for(const star of this.stars){
        if(active){star.y=(star.y+dt*star.z*(game.state==='transition'?155:8))%H;star.x=(star.x-(game.playerVelocity||0)*dt*star.z*.11+W)%W;}
        const lum=star.bright>.8?COLORS.gold:star.bright>.5?'#7e9175':'#334933';ctx.fillStyle=lum;ctx.globalAlpha=.6+Math.sin(this.clock*.5+star.x)*.15;ctx.fillRect(Math.floor(star.x),Math.floor(star.y),star.z>.8?2:1,game.state==='transition'?6:1);
      }ctx.globalAlpha=1;
      ctx.strokeStyle='#243121';ctx.lineWidth=1;ctx.strokeRect(7.5,7.5,W-15,H-15);
      ctx.fillStyle='#2c3c26';for(let x=8;x<472;x+=12)ctx.fillRect(x,433,4,1);
    }
    menu(){
      const ctx=this.ctx;
      this.text('1 PLAYER   /   2 WORLDS   /   10 STAGES',240,35,1,COLORS.muted,'center');
      ctx.fillStyle='#283423';ctx.fillRect(110,64,260,1);
      ['A','B','C','D','E','F'].forEach((type,i)=>this.sprite(type,12+i,113+i*44,98+(i%2)*8,3,TYPES[type].color,Math.floor(this.clock)%2));
      this.text('INVADERS',243,166,6,'#493724','center');this.text('INVADERS',240,162,6,COLORS.orange,'center');
      this.text('2600',240,220,3,COLORS.gold,'center');
      this.text('THE ARCADE STRIKES BACK',240,260,1,COLORS.muted,'center');
      this.text('DEFEND YOUR LITTLE CORNER OF THE UNIVERSE.',240,416,1,'#7d8a71','center');
      this.sprite('player',0,232,454,2,COLORS.green);
      const ctx2=this.ctx;ctx2.fillStyle='#142112';ctx2.fillRect(8,487,464,5);ctx2.fillStyle='#50633c';ctx2.fillRect(8,486,464,1);
      for(let x=22;x<464;x+=32){ctx2.fillStyle='#34442a';ctx2.fillRect(x,484,7,2);}
    }
    drawBoss(game){
      const b=game.boss,ctx=this.ctx;
      const color=b.vulnerable?COLORS.gold:game.stage.world===1?COLORS.orange:'#a980f0';
      const x=Math.round(b.x),y=Math.round(b.y);
      // Four mirrored 8-bit tiles compose the boss; every source tile stays 8×8.
      this.sprite('C',game.stage.world*19,x,y,4,color);this.sprite('C',game.stage.world*19,x+32,y,4,color);
      ctx.fillStyle='#000000';ctx.fillRect(x+22,y+11,20,16);ctx.fillStyle=b.vulnerable?COLORS.green:'#8a4941';ctx.fillRect(x+26,y+15,12,8);
      ctx.fillStyle='#303729';ctx.fillRect(108,27,264,4);ctx.fillStyle=color;ctx.fillRect(108,27,Math.ceil(264*b.hp/b.maxHp),4);
      this.text(game.stage.name,240,14,1,color,'center');
      const labels=['FAN VOLLEY','TARGET LOCK','REINFORCEMENTS'];
      if(b.phase==='telegraph'){
        this.text(labels[b.cycle%3]+' / INCOMING',240,123,1,COLORS.orange,'center');
        ctx.strokeStyle='#e3975941';ctx.setLineDash([3,7]);
        if(b.cycle%3===1){ctx.beginPath();ctx.moveTo(x+32,y+40);ctx.lineTo(game.player.x+8,game.player.y);ctx.stroke();}
        else if(b.cycle%3===0){for(const dx of [-130,0,130]){ctx.beginPath();ctx.moveTo(x+32,y+40);ctx.lineTo(x+32+dx,430);ctx.stroke();}}
        ctx.setLineDash([]);
      }else if(b.vulnerable)this.text('CORE EXPOSED / FIRE NOW',240,123,1,COLORS.green,'center');
    }
    play(game){
      const ctx=this.ctx;
      if(!game.boss){this.text('W'+game.stage.world+' / '+(game.stage.boss?'BOSS':'STAGE '+game.stage.level),16,16,1,COLORS.muted);this.text(game.stage.name,464,16,1,COLORS.muted,'right');}
      if(game.carrier){this.sprite('carrier',0,game.carrier.x,game.carrier.y,2,COLORS.gold);this.sprite('carrier',0,game.carrier.x+16,game.carrier.y,2,COLORS.gold);ctx.fillStyle='#e8cc6355';ctx.fillRect(game.carrier.x-(game.carrier.vx>0?10:-32),game.carrier.y+7,8,2);}
      if(game.boss)this.drawBoss(game);
      for(const enemy of game.enemies){
        this.sprite(enemy.type,enemy.seed,enemy.x,enemy.y,2,TYPES[enemy.type].color,enemy.mode==='dive'?Math.floor(enemy.age*5)%2:game.formationSteps%2);
        if(enemy.maxHp>1){ctx.fillStyle='#34422a';ctx.fillRect(Math.round(enemy.x),Math.round(enemy.y-4),16,1);ctx.fillStyle=TYPES[enemy.type].color;ctx.fillRect(Math.round(enemy.x),Math.round(enemy.y-4),16*enemy.hp/enemy.maxHp,1);}
      }
      ctx.fillStyle=COLORS.green;for(const shot of game.shots){ctx.fillRect(Math.round(shot.x),Math.round(shot.y),shot.w,shot.h);ctx.fillStyle='#ececec';ctx.fillRect(Math.round(shot.x),Math.round(shot.y),shot.w,2);ctx.fillStyle=COLORS.green;}
      for(const bullet of game.hostile){ctx.fillStyle=bullet.effect?TYPES[{freeze:'D',silence:'E',invert:'F'}[bullet.effect]].color:bullet.boss?COLORS.orange:COLORS.gold;const x=Math.round(bullet.x),y=Math.round(bullet.y);ctx.fillRect(x,y,bullet.w,bullet.h);if(bullet.effect){ctx.fillStyle='#000000';ctx.fillRect(x+2,y+2,2,2);}}
      const icons={life:'+',shield:'S',weapon:'W',rate:'F'};
      for(const drop of game.drops){ctx.fillStyle=COLORS.gold;ctx.fillRect(Math.round(drop.x)-1,Math.round(drop.y)-1,14,14);ctx.fillStyle='#142012';ctx.fillRect(Math.round(drop.x),Math.round(drop.y),12,12);this.text(icons[drop.kind],drop.x+3,drop.y+3,1,COLORS.gold);}
      const p=game.player;
      if(p.shield){ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=1;ctx.strokeRect(Math.round(p.x-5),Math.round(p.y-5),26,26);ctx.fillStyle='#75cceb20';ctx.fillRect(Math.round(p.x-4),Math.round(p.y-4),24,24);}
      if(p.invulnerable<=0||Math.floor(game.time*9)%2===0){const effect=Object.keys(p.effects).find(k=>p.effects[k]>0);this.sprite('player',0,p.x,p.y,2,effect?TYPES[{freeze:'D',silence:'E',invert:'F'}[effect]].color:COLORS.green);}
      if(game.state==='transition'){ctx.fillStyle=COLORS.orange;ctx.fillRect(Math.round(p.x+6),Math.round(p.y+18),4,12+Math.floor(this.clock*10)%7);this.text('STAGE CLEAR',240,228,3,COLORS.gold,'center');this.text('ONWARD, PILOT.',240,262,1,COLORS.green,'center');}
      const effects=Object.entries(p.effects).filter(([,time])=>time>0);
      if(effects.length){effects.forEach(([effect,time],i)=>{const color=TYPES[{freeze:'D',silence:'E',invert:'F'}[effect]].color;this.text(({freeze:'FROZEN',silence:'GUNS JAMMED',invert:'CONTROLS INVERTED'})[effect]+' '+time.toFixed(1)+'S',240,475-i*12,1,color,'center');});}
      else if(game.state==='playing'&&game.time<7){this.text('A / D TO MOVE   SPACE TO FIRE',240,480,1,'#708365','center');}
      if(this.toast&&game.state==='playing')this.text(this.toast.text,240,53,1,this.toast.color,'center');
      if(game.state==='intro'){
        ctx.fillStyle='#000000bc';ctx.fillRect(0,185,W,125);
        this.text('WORLD '+game.stage.world+' / '+(game.stage.boss?'BOSS':'STAGE '+game.stage.level),240,207,1,COLORS.orange,'center');
        this.text(game.stage.name,240,236,2,COLORS.gold,'center');
        const tips=['HOLD THE LINE.','WATCH FOR DIVING SHIPS.','TANKS TAKE THREE HITS.','BLUE ATTACKS FREEZE YOU.','DODGE. WAIT FOR THE CORE.','PINK ATTACKS JAM YOUR GUNS.','VIOLET ATTACKS REVERSE CONTROLS.','READ THE COLORS.','ONE LAST LINE OF DEFENSE.','BREAK THE OVERMIND.'];
        this.text(tips[game.stageIndex],240,271,1,COLORS.muted,'center');
      }
    }
    draw(game,dt){
      const paused=['paused','defeat','victory'].includes(game.state);if(!paused)this.clock+=dt;
      if(this.toast&&!paused){this.toast.life-=dt;if(this.toast.life<=0)this.toast=null;}
      if(!paused){this.shake=Math.max(0,this.shake-dt);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}this.particles=this.particles.filter(p=>p.life>0);}
      this.ctx.save();if(this.shake>0)this.ctx.translate(Math.round(Math.sin(this.clock*110)*2),Math.round(Math.cos(this.clock*90)*2));
      this.backdrop(game,dt);if(game.state==='menu')this.menu();else this.play(game);
      for(const p of this.particles){this.ctx.fillStyle=p.color;this.ctx.globalAlpha=Math.min(1,p.life*3);this.ctx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}this.ctx.globalAlpha=1;this.ctx.restore();
    }
  }
  window.ArcadeRenderer=Renderer;
})();
