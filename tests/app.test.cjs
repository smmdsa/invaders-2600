const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const core=require('../js/core.js'),sprites=require('../js/sprites.js');

// Tiny DOM adapter runs the actual app and real simulation, without a browser dependency.
// Canvas/audio presentation is separately verified in browser and audio tests.
function boot({brokenStorage=false}={}){
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.hidden=false;this.style={};this.dataset={};this.value='';this.textContent='';this.className='';this.open=false;
      this.classList={add:c=>{if(!this.className.includes(c))this.className+=' '+c},remove:c=>{this.className=this.className.split(' ').filter(v=>v!==c).join(' ')},toggle:(c,on)=>{on?this.classList.add(c):this.classList.remove(c)}};
    }
    append(...children){this.children.push(...children)}replaceChildren(...children){this.children=children}setAttribute(k,v){this.attributes[k]=v}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
    emit(type,data={}){const event={target:this,code:'',repeat:false,preventDefault(){this.prevented=true},...data};for(const fn of this.listeners[type]||[])fn(event);return event;}
    focus(){document.activeElement=this}getContext(){return {clearRect(){},fillRect(){}}}setPointerCapture(){}querySelector(){return this.children[0]}showModal(){this.open=true}close(){this.open=false}
  }
  const ids=['game','brand-icon','scoreboard','enemy-guide','stage-track','hi-score','score','hearts','weapon-meter','rate-meter','shield-value','mission-world','mission-title','mission-copy','stage-label','enemy-count','announcer','menu','pause-panel','outcome-panel','initials','score-form','score-saved','outcome-kicker','outcome-title','outcome-description','final-score','start-button','again-button','resume-button','quit-button','outcome-menu-button','guide-button','scores-button','close-dialog','info-dialog','dialog-content','sound-button','sound-label','sound-icon','crt-button','scanlines','fullscreen-button','cabinet','pause-button'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element(id==='initials'?'input':id.includes('button')?'button':'div')]));
  for(const name of ['weapon-meter','rate-meter'])for(let i=0;i<5;i++)nodes[name].append(new Element('i'));
  nodes['crt-button'].append(new Element('span'));
  const touch=['left','right','fire'].map(key=>{const e=new Element('button');e.dataset.control=key;return e});
  const document=new Element('document');document.getElementById=id=>nodes[id];document.createElement=tag=>new Element(tag);document.createTextNode=text=>({textContent:text});document.querySelectorAll=selector=>selector==='[data-control]'?touch:selector==='.enemy-row'?nodes['enemy-guide'].children:[];
  let frame,instance,stored=null;
  const window=new Element('window');window.localStorage={getItem(){if(brokenStorage)throw Error('blocked');return stored},setItem(key,value){if(brokenStorage)throw Error('blocked');stored=value}};
  class CapturedGame extends core.Game {constructor(){super(123);instance=this}}
  const synth={unlock(){},handle(){},melody(){},setMuted(value){this.muted=value},muted:false};
  class Renderer{constructor(){}handle(){}draw(){}}
  function Synth(){return synth}
  const context={document,window,ArcadeCore:{...core,Game:CapturedGame},ArcadeSprites:sprites,ArcadeRenderer:Renderer,ArcadeSynth:Synth,requestAnimationFrame(fn){frame=fn}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'),context);
  let timestamp=1000;
  function step(seconds=0.2){for(let t=0;t<seconds;t+=1/60){timestamp+=1000/60;frame(timestamp)}}
  const key=(code,type='keydown',target=nodes.game)=>document.emit(type,{code,target});
  return {nodes,touch,document,window,game:instance,step,key,stored:()=>stored};
}
test('actual app starts from menu, keyboard controls ship and pause resumes',()=>{
  const a=boot();assert.equal(a.game.state,'menu');a.nodes['start-button'].emit('click');a.step(1.6);assert.equal(a.game.state,'playing');assert.equal(a.nodes.menu.hidden,true);
  const x=a.game.player.x;a.key('KeyD');a.step(.2);a.key('KeyD','keyup');assert.ok(a.game.player.x>x);
  a.key('Space');a.step(.1);a.key('Space','keyup');assert.ok(a.game.shots.length>0);
  a.key('KeyP');assert.equal(a.game.state,'paused');const frozen=a.game.time;a.step(.3);assert.equal(a.game.time,frozen);assert.equal(a.nodes['pause-panel'].hidden,false);a.nodes['resume-button'].emit('click');assert.equal(a.game.state,'playing');
});
test('blur pauses and clears held keys so resuming never drifts',()=>{
  const a=boot();a.nodes['start-button'].emit('click');a.step(1.6);a.key('KeyD');a.window.emit('blur');assert.equal(a.game.state,'paused');a.nodes['resume-button'].emit('click');const x=a.game.player.x;a.step(.3);assert.equal(a.game.player.x,x);
});
test('pointer-accessible pause works without a keyboard and clears held input',()=>{
  const a=boot();a.nodes['start-button'].emit('click');a.step(1.6);a.key('KeyA');a.nodes['pause-button'].emit('click');assert.equal(a.game.state,'paused');a.nodes['resume-button'].emit('click');a.key('KeyD','keyup');const x=a.game.player.x;a.step(.2);assert.equal(a.game.player.x,x);
});
test('blur during transition freezes it and resume continues into the next stage',()=>{
  const a=boot();a.nodes['start-button'].emit('click');a.game.state='transition';a.game.stateTimer=.01;a.window.emit('blur');assert.equal(a.game.state,'paused');a.step(4);assert.equal(a.game.stageIndex,0);a.nodes['resume-button'].emit('click');a.step(2);assert.equal(a.game.stageIndex,1);assert.equal(a.game.state,'playing');
});
test('touch movement and pointer cancellation stop the ship',()=>{
  const a=boot();a.nodes['start-button'].emit('click');a.step(1.6);a.touch[0].emit('pointerdown',{pointerId:1});const x=a.game.player.x;a.step(.2);assert.ok(a.game.player.x<x);a.touch[0].emit('pointercancel');const stopped=a.game.player.x;a.step(.2);assert.equal(a.game.player.x,stopped);
});
for(const outcome of ['victory','defeat'])test(`${outcome} opens initials form, persists score once and returns to menu`,()=>{
  const a=boot();a.nodes['start-button'].emit('click');a.game.score=4200;a.game.state=outcome;a.step();assert.equal(a.nodes['outcome-panel'].hidden,false);assert.equal(a.document.activeElement,a.nodes.initials);
  a.nodes.initials.value='a!bc';a.nodes.initials.emit('input');assert.equal(a.nodes.initials.value,'ABC');a.nodes['score-form'].emit('submit');assert.equal(a.nodes['score-form'].hidden,true);assert.equal(a.nodes['score-saved'].hidden,false);assert.equal(JSON.parse(a.stored())[0].score,4200);a.nodes['score-form'].emit('submit');assert.equal(JSON.parse(a.stored()).length,1);
  a.nodes['outcome-menu-button'].emit('click');assert.equal(a.game.state,'menu');assert.equal(a.nodes.menu.hidden,false);assert.equal(a.nodes['outcome-panel'].hidden,true);
});
test('invalid initials cannot submit and blocked storage still displays saved score',()=>{
  const a=boot({brokenStorage:true});a.nodes['start-button'].emit('click');a.game.score=500;a.game.state='defeat';a.step();a.nodes.initials.value='AB';a.nodes['score-form'].emit('submit');assert.equal(a.nodes['score-form'].hidden,false);
  a.nodes.initials.value='AAA';a.nodes['score-form'].emit('submit');assert.equal(a.nodes['score-saved'].hidden,false);assert.equal(a.nodes.scoreboard.children[0].children[1].textContent,'AAA');
});
test('guide and score dialogs open and close and sound and CRT buttons toggle',()=>{
  const a=boot();a.nodes['guide-button'].emit('click');assert.equal(a.nodes['info-dialog'].open,true);a.nodes['close-dialog'].emit('click');assert.equal(a.nodes['info-dialog'].open,false);a.nodes['scores-button'].emit('click');assert.equal(a.nodes['info-dialog'].open,true);
  a.nodes['sound-button'].emit('click');assert.equal(a.nodes['sound-label'].textContent,'SOUND OFF');a.nodes['sound-button'].emit('click');assert.equal(a.nodes['sound-label'].textContent,'SOUND ON');a.nodes['crt-button'].emit('click');assert.equal(a.nodes.scanlines.hidden,true);
});
