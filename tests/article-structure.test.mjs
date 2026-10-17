import {strict as a} from 'node:assert';
import {articleStructure} from '../public/reader/model.js';
const blocks=[{id:'title',kind:'heading',text:'A Survey',rects:[{x:.1,y:.1,w:.7,h:.03}]},{id:'abstract',kind:'paragraph',text:'Abstract',rects:[{x:.15,y:.2,w:.1,h:.015}]},{id:'body',kind:'paragraph',text:'Full original paragraph.',rects:[{x:.15,y:.3,w:.7,h:.015}]},{id:'section',kind:'paragraph',text:'2.1 Methods',rects:[{x:.1,y:.5,w:.3,h:.015}]},{id:'page',kind:'paragraph',text:'1',rects:[{x:.5,y:.94,w:.02,h:.015}]}];
const before=JSON.stringify(blocks),structure=articleStructure(blocks);
a.equal(JSON.stringify(blocks),before);a.deepEqual(structure.map(b=>b.id),blocks.map(b=>b.id));a.equal(structure[0].level,1);a.equal(structure[1].kind,'heading');a.equal(structure[3].level,3);a.equal(structure[4].kind,'page-number');a.ok(structure[2].inset>0);console.log('Article structure checks passed; IDs, text and order unchanged.');
