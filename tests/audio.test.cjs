const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function audio(){
  const created={oscillators:[],buffers:[],sources:[]};
  const param=()=>({value:0,setValueAtTime(v,t){this.value=v;this.at=t},exponentialRampToValueAtTime(v,t){this.end=v;this.endAt=t},setTargetAtTime(v){this.value=v}});
  const node=()=>({connect(target){this.connected=target},start(t=0){this.started=t},stop(t){this.stopped=t}});
  class Context{
    constructor(){this.currentTime=0;this.sampleRate=48000;this.destination={};this.state='suspended'}async resume(){this.state='running'}
    createGain(){return {...node(),gain:param()}}createOscillator(){const osc={...node(),frequency:param()};created.oscillators.push(osc);return osc}
    createBiquadFilter(){return {...node(),frequency:param()}}createBuffer(channels,count,rate){const samples=new Float32Array(count);const b={channels,count,rate,getChannelData(){return samples}};created.buffers.push(b);return b}
    createBufferSource(){const s=node();created.sources.push(s);return s}
  }
  const window={AudioContext:Context};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/audio.js'),'utf8'),{window});return {synth:new window.ArcadeSynth(),created};
}
test('audio waits for a gesture and unlock starts a native context',async()=>{const {synth,created}=audio();synth.handle([{type:'fire'}]);assert.equal(synth.context,null);assert.equal(created.oscillators.length,0);await synth.unlock();assert.equal(synth.context.state,'running');synth.handle([{type:'fire'}]);assert.equal(created.oscillators.length,1);assert.ok(created.oscillators[0].frequency.end<created.oscillators[0].frequency.value);});
test('mute prevents new sounds and adjusts master gain',async()=>{const {synth,created}=audio();await synth.unlock();synth.setMuted(true);synth.handle([{type:'fire'},{type:'damage'}]);assert.equal(created.oscillators.length,0);assert.equal(created.buffers.length,0);assert.equal(synth.master.gain.value,0);synth.setMuted(false);synth.handle([{type:'fire'}]);assert.equal(created.oscillators.length,1);});
test('explosions synthesize deterministic decaying noise and stop tones',async()=>{const {synth,created}=audio();await synth.unlock();synth.handle([{type:'damage'}]);assert.equal(created.buffers.length,1);const b=created.buffers[0];const samples=b.getChannelData(0);assert.ok(samples.some(v=>v!==0));assert.ok(Math.abs(samples.at(-1))<.001);assert.ok(created.oscillators.every(o=>o.stopped>o.started));});
test('all gameplay sound events produce cues without external assets',async()=>{const {synth,created}=audio();await synth.unlock();for(const type of ['fire','march','kill','hit','boss-hit','damage','shield','dive','status','carrier','carrier-hit','pickup','stage','clear','boss-cue','boss-fire','boss-open','summon','boss-death','victory','defeat']){const before=created.oscillators.length+created.buffers.length;synth.handle([{type,note:0,effect:'freeze'}]);assert.ok(created.oscillators.length+created.buffers.length>before,type);}});
