const {test}=require('node:test');const assert=require('node:assert/strict');const {generateSprite, FONT}=require('../js/sprites.js');
test('sprites are deterministic mirrored binary eight by eight grids',()=>{
  for(const kind of ['A','B','C','D','E','F','player','carrier']){
    const s=generateSprite(42,kind);assert.deepEqual(s,generateSprite(42,kind));assert.equal(s.length,8);
    for(const row of s){assert.equal(row.length,8);assert.deepEqual(row,[...row].reverse());assert.ok(row.every(p=>p===0||p===1));}
    assert.ok(s.flat().some(Boolean));
  }
});
test('different seeds and silhouettes create varied enemies',()=>{assert.notDeepEqual(generateSprite(1,'A'),generateSprite(2,'A'));assert.notDeepEqual(generateSprite(42,'A'),generateSprite(42,'C'));});
test('native bitmap font covers uppercase initials, numbers and HUD punctuation',()=>{for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-/+.')assert.ok(FONT[c],c);});
test('sprite colors use a limited subset of the standard Atari NTSC palette',()=>{
  const {PALETTE,TYPES}=require('../js/core.js');
  const ntsc=new Set(['#e39759','#b4e775','#e8cc63','#75cceb','#ec8ce0','#a980f0']);
  for(const enemy of Object.values(TYPES))assert.ok(ntsc.has(enemy.color));assert.equal(PALETTE.black,'#000000');assert.equal(PALETTE.white,'#ececec');
});
