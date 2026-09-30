import {test} from 'node:test';
import assert from 'node:assert/strict';
import {K,nahe} from './hilfen.mjs';
test('kleine positive Zinsen bleiben numerisch stabil',()=>nahe(assert,K.barwertfaktor(.000000001,20),20,.000001));
test('Finanzierung: Restschuld zum Beginn ist das ganze Darlehen',()=>assert.equal(K.finTilgungsverlauf(100000,0,10,0,60).restNach(0),100000));
test('negative Sondertilgung erhöht die Schuld nicht',()=>nahe(assert,K.finTilgungsverlauf(100000,0,10,-1000,60).restNach(1),90000,.01));
