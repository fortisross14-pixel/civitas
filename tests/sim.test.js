import test from 'node:test';import assert from 'node:assert/strict';import{makeCity,seedTown,advance,stats,addZone,terrain}from'../src/sim.js';
test('city grows and history persists',()=>{let c=seedTown(makeCity('Test','river',42));let before=stats(c).buildings;c=advance(c,25);assert.ok(stats(c).buildings>=before);assert.equal(c.year,1325);assert.ok(c.history.length>=2)});
test('zoning remains persistent',()=>{let c=makeCity('Test','plain',1);c=addZone(c,2,2,8,8,'res');assert.equal(c.zones[0].type,'res');assert.equal(terrain('plain',3,3),'land')});
test('completion stops at 2030',()=>{let c=makeCity();c.year=2020;c=advance(c,100);assert.equal(c.year,2030);assert.equal(c.finished,true)});
