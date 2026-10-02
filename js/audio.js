(function(){
  'use strict';
  class Synth {
    constructor(){this.context=null;this.master=null;this.muted=false;this.available=true;this.lastFire=0;}
    async unlock(){
      if(!this.available)return;
      try{
        if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){this.available=false;return;}this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.15;this.master.connect(this.context.destination);}
        if(this.context.state==='suspended')await this.context.resume();
      }catch{this.available=false;}
    }
    setMuted(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.15,this.context.currentTime,.025);}
    tone(frequency,duration=.1,endFrequency=frequency,delay=0,shape='square',volume=.3){
      if(!this.context||this.context.state!=='running'||this.muted)return;
      const at=this.context.currentTime+delay,osc=this.context.createOscillator(),gain=this.context.createGain();
      osc.type=shape;osc.frequency.setValueAtTime(Math.max(20,frequency),at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),at+duration);
      gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
      osc.connect(gain);gain.connect(this.master);osc.start(at);osc.stop(at+duration+.01);
    }
    noise(duration=.14,volume=.5){
      if(!this.context||this.context.state!=='running'||this.muted)return;
      const count=Math.ceil(this.context.sampleRate*duration),buffer=this.context.createBuffer(1,count,this.context.sampleRate),samples=buffer.getChannelData(0);
      let seed=734;for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/2147483648-1)*(1-i/count);}
      const source=this.context.createBufferSource(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1800;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();
    }
    melody(notes,spacing=.12){notes.forEach((n,i)=>this.tone(n,spacing*1.6,n,i*spacing,'square',.22));}
    handle(events){for(const e of events){
      switch(e.type){
        case 'fire':this.tone(850,.09,120,0,'square',.16);break;
        case 'march':this.tone([82,73,65,55][e.note],.055,45,0,'triangle',.55);break;
        case 'kill':this.noise(.1,.35);this.tone(190,.08,45,0,'square',.12);break;
        case 'hit':case 'boss-hit':this.tone(150,.04,100,0,'triangle',.35);break;
        case 'damage':this.noise(.35,.7);this.tone(110,.3,25);break;
        case 'shield':this.tone(680,.18,240,0,'sine',.6);break;
        case 'dive':this.tone(380,.35,80,0,'sawtooth',.12);break;
        case 'status':this.melody(e.effect==='invert'?[440,220,440]:e.effect==='freeze'?[920,700,520]:[320,280,240],.07);break;
        case 'carrier':this.melody([370,490,370,490],.09);break;
        case 'carrier-hit':this.noise(.12,.4);this.melody([440,660,880],.07);break;
        case 'pickup':this.melody([523,659,784,1046],.07);break;
        case 'stage':this.melody([165,220,330,440],.10);break;
        case 'clear':this.melody([392,523,659,784],.11);break;
        case 'boss-cue':this.melody([110,110,110],.14);break;
        case 'boss-fire':this.tone(220,.12,60,0,'sawtooth',.15);break;
        case 'boss-open':this.melody([440,660],.1);break;
        case 'summon':this.tone(80,.4,400,0,'sawtooth',.15);break;
        case 'boss-death':this.noise(.65,.65);this.melody([110,165,220,440],.15);break;
        case 'victory':this.melody([523,659,784,1046,784,1046],.18);break;
        case 'defeat':this.melody([220,196,165,110,55],.2);break;
      }
    }}
  }
  window.ArcadeSynth=Synth;
})();
