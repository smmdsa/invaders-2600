const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,formationBounds}=require('../js/core.js');

function setup(type,withAnchor=true){
  const game=new Game(42);game.start();game.loadStage(6);game.state='playing';game.player.x=440;game.player.invulnerable=0;
  const diver=game.makeEnemy(type,96,100),anchor=game.makeEnemy('A',180,100);
  game.enemies=withAnchor?[diver,anchor]:[diver];game.initialCount=game.enemies.length;
  game.beginDive(diver);game.drainEvents();return {game,diver,anchor};
}
function exitBottom(game,diver){diver.x=16;diver.y=499;game.update(1/60);}
function finishReturn(game,diver){
  for(let i=0;i<180&&diver.mode!=='formation';i++)game.update(1/60);
  assert.equal(diver.mode,'formation');
}

for(const type of ['B','F']){
  test(`${type} survives a missed dive and re-enters from the top without kill rewards`,()=>{
    const {game,diver}=setup(type);const hp=diver.hp;exitBottom(game,diver);
    assert.equal(diver.mode,'returning');assert.equal(diver.y,-diver.h);assert.equal(diver.hp,hp);assert.ok(game.enemies.includes(diver));
    assert.equal(game.score,0);assert.equal(game.kills,0);assert.equal(game.supplyQueue,0);assert.equal(game.player.hp,3);
    assert.equal(game.state,'playing');assert.ok(!game.drainEvents().some(e=>e.type==='kill'||e.type==='explode'||e.type==='clear'));
  });
  test(`${type} rejoins its original slot relative to the moving formation`,()=>{
    const {game,diver,anchor}=setup(type);exitBottom(game,diver);
    game.moveFormation();game.moveFormation();finishReturn(game,diver);
    assert.equal(diver.x-anchor.x,-84);assert.equal(diver.y-anchor.y,0);assert.equal(diver.steps,0);
    assert.ok(diver.x>=8&&diver.x+diver.w<=472);
  });
  test(`${type} remains defeated when hit by the player rather than returning`,()=>{
    const {game,diver}=setup(type);game.killEnemy(diver);exitBottom(game,diver);
    assert.ok(!game.enemies.includes(diver));assert.equal(game.kills,1);assert.ok(game.score>0);
  });
  test(`${type} remains gone after colliding with the player`,()=>{
    const {game,diver}=setup(type);diver.x=game.player.x;diver.y=game.player.y;game.update(1/60);
    assert.ok(!game.enemies.includes(diver));assert.equal(diver.hp,0);
    if(type==='B')assert.equal(game.player.hp,2);else{assert.equal(game.player.hp,3);assert.ok(game.player.effects.invert>0);}
  });
  test(`a lone ${type} keeps the wave active and returns without other formation members`,()=>{
    const {game,diver}=setup(type,false);exitBottom(game,diver);assert.equal(game.state,'playing');finishReturn(game,diver);
    assert.equal(diver.x,96);assert.equal(diver.y,100);assert.equal(game.state,'playing');
  });
}
test('returning enemy follows boundary descent and invasion resets of its slot',()=>{
  const {game,diver,anchor}=setup('B');anchor.x=8;anchor.y=432;game.direction=-1;exitBottom(game,diver);game.moveFormation();
  finishReturn(game,diver);assert.equal(diver.x-anchor.x,88);assert.equal(diver.y,65);assert.ok(anchor.y<400);
});
test('returning edge enemy rejoins within borders after the remaining columns travel farther',()=>{
  const {game,diver,anchor}=setup('B');anchor.x=180;game.direction=-1;
  for(let i=0;i<15;i++)game.moveFormation();exitBottom(game,diver);
  assert.ok(diver.x>=8&&diver.x+diver.w<=472,'top re-entry must be visible inside the viewport');finishReturn(game,diver);
  const bounds=formationBounds(game.enemies);assert.ok(bounds.left>=8);assert.ok(bounds.right<=472);assert.equal(anchor.x-diver.x,84);
});
test('a returning enemy can be shot before it rejoins and never respawns',()=>{
  const {game,diver}=setup('B');exitBottom(game,diver);game.update(.05);game.update(.05);game.update(.05);
  game.shots.push({x:diver.x+4,y:diver.y+6,w:2,h:8,vx:0,vy:0});game.update(1/60);
  assert.equal(diver.hp,0);assert.ok(!game.enemies.includes(diver));assert.equal(game.kills,1);
});
test('pause freezes the return flight and returning enemies cannot launch another dive',()=>{
  const {game,diver}=setup('F');exitBottom(game,diver);const y=diver.y;game.pause();game.update(.05);assert.equal(diver.y,y);
  game.pause();diver.steps=7;game.moveFormation();assert.equal(diver.mode,'returning');assert.equal(diver.steps,7);
});
