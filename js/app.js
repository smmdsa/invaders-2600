(function(){
  'use strict';
  const {Game,STAGES,TYPES,readScores,saveScore,normalizeInitials}=ArcadeCore;
  const $=id=>document.getElementById(id),game=new Game(),renderer=new ArcadeRenderer($('game')),synth=new ArcadeSynth();
  const input={left:false,right:false,fire:false},held=new Set();let lastState='menu',lastFrame=0,accumulator=0,hudClock=0,submitted=false,scores=[];
  // Memory fallback keeps the session functional when private mode or file URLs deny storage.
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const memory={data:null,getItem(){return this.data},setItem(key,value){this.data=value}};const store=storage||memory;
  scores=readScores(store);
  function clearInput(){held.clear();for(const key in input)input[key]=false;document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('active'));game.playerVelocity=0;}
  function drawIcon(canvas,type,color,seed=12){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,32,32);ctx.fillStyle=color;const sprite=ArcadeSprites.generateSprite(seed,type);sprite.forEach((row,y)=>row.forEach((v,x)=>{if(v)ctx.fillRect(x*4,y*4,4,4)}));}
  drawIcon($('brand-icon'),'A','#e39759');
  function renderScores(){
    const board=$('scoreboard');board.replaceChildren();
    for(let i=0;i<5;i++){const row=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('span'),score=document.createElement('span');rank.className='rank';rank.textContent=String(i+1).padStart(2,'0');name.textContent=scores[i]?.name||'---';score.textContent=String(scores[i]?.score||0).padStart(6,'0');if(!scores[i])row.className='no-score';row.append(rank,name,score);board.append(row);}
  }
  const descriptions={A:'Straight shots',B:'Dive attack',C:'3-hit armor',D:'Freeze',E:'Gun silence',F:'Reverse controls'};
  function renderGuide(){const root=$('enemy-guide');root.replaceChildren();for(const [type,config] of Object.entries(TYPES)){const row=document.createElement('div');row.className='enemy-row';row.dataset.type=type;const icon=document.createElement('canvas');icon.width=32;icon.height=32;icon.setAttribute('aria-hidden','true');drawIcon(icon,type,config.color);const label=document.createElement('div'),name=document.createElement('strong'),desc=document.createElement('span');name.textContent=config.name;name.style.color=config.color;desc.textContent=descriptions[type];label.append(name,desc);row.append(icon,label);root.append(row);}}
  function renderTrack(){const track=$('stage-track');track.replaceChildren();STAGES.forEach((s,i)=>{const dot=document.createElement('i');dot.className=(s.boss?'boss ':'')+(i===game.stageIndex?'current':i<game.stageIndex?'cleared':'');track.append(dot)});}
  function updateHud(){
    $('hi-score').textContent=String(Math.max(scores[0]?.score||0,game.score)).padStart(6,'0');$('score').textContent=String(game.score).padStart(6,'0');
    const hearts=$('hearts');hearts.replaceChildren();hearts.append(document.createTextNode(Array(game.player.hp).fill('♥').join(' ')+' '));const empty=document.createElement('span');empty.className='empty-heart';empty.textContent=Array(5-game.player.hp).fill('♥').join(' ');hearts.append(empty);hearts.setAttribute('aria-label',game.player.hp+' of 5 lives');
    for(const [id,value] of [['weapon-meter',game.player.weapon],['rate-meter',game.player.rate]])[...$(id).children].forEach((bar,i)=>bar.classList.toggle('lit',i<value));
    $('shield-value').textContent=String(game.player.shield).padStart(2,'0');
    const stage=game.stage||STAGES[0];$('mission-world').textContent='WORLD '+String(stage.world).padStart(2,'0');$('mission-title').textContent=stage.name;
    const copies=['They came from the stars.\nSend them back.','Something broke from the pack.\nKeep moving, pilot.','Armor up front.\nFocus your fire.','Watch the blue projectiles.\nStay out of the cold.','Read the warning.\nStrike when the core opens.','A new world. A new signal.\nWatch for pink projectiles.','Trust your eyes.\nYour controls might lie.','Six threats. One ship.\nYou know their tricks.','The last fleet is here.\nHold your ground.','The source of the invasion.\nMake every opening count.'];
    $('mission-copy').textContent=copies[game.stageIndex];$('stage-label').textContent='STAGE '+String(game.stageIndex+1).padStart(2,'0')+' / 10';
    $('enemy-count').textContent=stage.boss?(game.boss?'BOSS '+Math.ceil(game.boss.hp/game.boss.maxHp*100)+'%':'CORE DESTROYED'):(game.state==='menu'?stage.count:game.enemies.length)+' HOSTILES';
    document.querySelectorAll('.enemy-row').forEach(row=>row.classList.toggle('locked',!stage.types.includes(row.dataset.type)));renderTrack();
  }
  function announce(message){$('announcer').textContent=message;}
  function start(){clearInput();synth.unlock();submitted=false;game.start();$('game').focus({preventScroll:true});syncPanels();}
  function menu(){clearInput();game.state='menu';game.stageIndex=0;game.player=game.newPlayer();game.score=0;game.stage=null;game.events=[];game.enemies=[];game.boss=null;renderer.toast=null;syncPanels();$('start-button').focus({preventScroll:true});}
  function pause(){clearInput();game.pause();syncPanels();if(game.state==='paused')$('resume-button').focus({preventScroll:true});else $('game').focus({preventScroll:true});}
  function syncPanels(){
    $('pause-button').disabled=!['playing','intro','transition','paused'].includes(game.state);$('pause-button').setAttribute('aria-label',game.state==='paused'?'Resume game':'Pause game');
    $('menu').hidden=game.state!=='menu';$('pause-panel').hidden=game.state!=='paused';$('outcome-panel').hidden=!['victory','defeat'].includes(game.state);
    if(game.state!==lastState){
      if(['victory','defeat'].includes(game.state)){
        const won=game.state==='victory';submitted=false;$('score-form').hidden=false;$('score-saved').hidden=true;$('initials').value='';$('outcome-kicker').textContent=won?'TRANSMISSION COMPLETE':'TRANSMISSION LOST';$('outcome-title').textContent=won?'EARTH IS SAFE':'GAME OVER';$('outcome-description').textContent=won?'Two worlds cleared. One legendary pilot.':'The stars will remember your fight.';$('final-score').textContent=String(game.score).padStart(6,'0');clearInput();$('initials').focus({preventScroll:true});announce((won?'Victory.':'Game over.')+' Final score '+game.score+'. Enter three initials.');
      }
      if(game.state==='intro')announce('World '+game.stage.world+', '+game.stage.name);
      if(game.state==='paused')announce('Game paused.');lastState=game.state;
    }updateHud();
  }
  $('start-button').addEventListener('click',start);$('again-button').addEventListener('click',start);$('resume-button').addEventListener('click',pause);$('pause-button').addEventListener('click',pause);$('quit-button').addEventListener('click',menu);$('outcome-menu-button').addEventListener('click',menu);
  $('initials').addEventListener('input',()=>{$('initials').value=normalizeInitials($('initials').value)});
  $('score-form').addEventListener('submit',event=>{
    event.preventDefault();if(submitted)return;const name=normalizeInitials($('initials').value);if(name.length!==3)return;
    submitted=true;scores=saveScore({getItem(){return JSON.stringify(scores)},setItem(key,value){try{store.setItem(key,value)}catch{}memory.setItem(key,value)}},name,game.score,game.state);renderScores();updateHud();$('score-form').hidden=true;$('score-saved').hidden=false;$('again-button').focus({preventScroll:true});announce('Score saved for '+name+'.');synth.melody([523,659,784],.1);
  });
  const dialog=$('info-dialog');
  function showGuide(){
    $('dialog-content').innerHTML='<p class="eyebrow">PILOT FIELD MANUAL</p><h2 class="dialog-title">HOLD THE LINE.</h2><p class="dialog-copy">Clear four formations and a boss in each world. You have three hearts. Learn each new threat before the next one arrives.</p><div class="manual-row"><strong>MOVE / FIRE</strong><span>A + D or arrow keys to move. Hold Space to fire. P or Escape pauses. On mobile, hold the buttons below the game.</span></div><div class="manual-row"><strong>ENEMY FIRE</strong><span>Scouts fire every 4 movement tiles. Tanks take 3 hits and fire every 5 tiles. Orange divers break formation.</span></div><div class="manual-row"><strong>STATUS</strong><span>Blue freezes movement for 1.4s. Pink silences guns for 3.2s. Violet reverses controls for 3.2s. These attacks cost no hearts.</span></div><div class="manual-row"><strong>SUPPLY SHIP</strong><span>Every 10 kills calls a fast craft. Shoot it, then catch the falling upgrade: + life, S shield, W weapon, F fire rate. Life and tiers cap at 5. Shields absorb 5 hits.</span></div><div class="manual-row"><strong>BOSSES</strong><span>Read the attack warning, avoid the volley, then fire when the core glows green. Clear the summoned enemies too.</span></div><p class="dialog-copy">High scores stay in this browser. Sound is generated live with native Web Audio.</p>';
    dialog.showModal();
  }
  function showScores(){
    const content=$('dialog-content');content.replaceChildren();const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='THE PILOTS WHO HELD THE LINE';const title=document.createElement('h2');title.className='dialog-title';title.textContent='HALL OF FAME';content.append(eyebrow,title);
    if(!scores.length){const p=document.createElement('p');p.className='dialog-copy';p.textContent='The board is waiting. Start a game and leave your mark.';content.append(p);}
    scores.forEach((score,i)=>{const row=document.createElement('div');row.className='dialog-score';const name=document.createElement('span'),value=document.createElement('strong');name.textContent=String(i+1).padStart(2,'0')+'  '+score.name+(score.outcome==='victory'?' ★':'');value.textContent=String(score.score).padStart(6,'0');row.append(name,value);content.append(row)});dialog.showModal();
  }
  $('guide-button').addEventListener('click',showGuide);$('scores-button').addEventListener('click',showScores);$('close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog&&e.offsetX<0)dialog.close()});
  function toggleSound(){synth.unlock();synth.setMuted(!synth.muted);$('sound-button').setAttribute('aria-pressed',String(synth.muted));$('sound-label').textContent=synth.muted?'SOUND OFF':'SOUND ON';$('sound-icon').textContent=synth.muted?'×':'♪';}
  $('sound-button').addEventListener('click',toggleSound);
  $('crt-button').addEventListener('click',()=>{const on=$('scanlines').hidden;$('scanlines').hidden=!on;$('crt-button').setAttribute('aria-pressed',String(on));$('crt-button').querySelector('span').textContent=on?'ON':'OFF'});
  $('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('cabinet').requestFullscreen)await $('cabinet').requestFullscreen();else announce('Fullscreen is unavailable in this browser.');}catch{announce('Fullscreen is unavailable in this browser.')} });
  const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'fire'};
  function syncKeys(){input.left=held.has('ArrowLeft')||held.has('KeyA');input.right=held.has('ArrowRight')||held.has('KeyD');input.fire=held.has('Space');}
  document.addEventListener('keydown',event=>{
    if(dialog.open)return;
    if(event.target.tagName==='INPUT')return;
    if(event.code in keys){event.preventDefault();if(game.state==='playing'||game.state==='intro'){held.add(event.code);syncKeys();}return;}
    if(event.repeat)return;
    if(event.code==='Enter'&&(game.state==='menu'||submitted)){event.preventDefault();start();}
    if(event.code==='KeyP'||event.code==='Escape'){event.preventDefault();held.clear();pause();}
    if(event.code==='KeyM')toggleSound();
  });
  document.addEventListener('keyup',event=>{if(event.code in keys){held.delete(event.code);syncKeys();if(event.target.tagName!=='INPUT')event.preventDefault();}});
  function lostFocus(){clearInput();if(['playing','intro','transition'].includes(game.state))pause();accumulator=0;}
  window.addEventListener('blur',lostFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)lostFocus();lastFrame=0;});
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    button.addEventListener('pointerdown',event=>{event.preventDefault();synth.unlock();button.setPointerCapture(event.pointerId);input[control]=true;button.classList.add('active')});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{input[control]=false;button.classList.remove('active')});
  });
  function frame(timestamp){
    const dt=lastFrame?Math.min(.1,(timestamp-lastFrame)/1000):0;lastFrame=timestamp;
    accumulator+=dt;while(accumulator>=1/60){game.update(1/60,input);accumulator-=1/60;}
    const events=game.drainEvents();renderer.handle(events);synth.handle(events);renderer.draw(game,dt);
    if(events.some(e=>e.type==='status'))announce('Status effect: '+events.find(e=>e.type==='status').effect);
    hudClock+=dt;if(game.state!==lastState||hudClock>.12){syncPanels();hudClock=0;}requestAnimationFrame(frame);
  }
  renderScores();renderGuide();updateHud();requestAnimationFrame(frame);
})();
