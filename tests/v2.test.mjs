import {strict as a} from 'node:assert';
import {batchBlocks,validateTranslations,makeBlock,validateSnapshot,escapeHTML} from '../public/reader/model.js';
import {publicUrl,publicIP,checkDNS,limitedBody} from '../lib/network.mjs';
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
test('Private URLs and credentials rejected',()=>{for(const url of ['http://arxiv.org','https://localhost/a','https://127.0.0.1','https://2130706433','https://[::1]','https://metadata.google.internal','https://x.internal/a','https://user:password@arxiv.org/a','https://arxiv.org:8443'])a.throws(()=>publicUrl(url));a.equal(publicUrl('https://arxiv.org/abs/2507.21046').hostname,'arxiv.org');});
test('Nonpublic IPs rejected',()=>{for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.1.1','192.168.1.1','100.64.1.1','::1','fd00::1','fe80::1','::ffff:127.0.0.1'])a.equal(publicIP(ip),false,ip);a.equal(publicIP('8.8.8.8'),true);});
test('Batches retain every block and respect limits',()=>{const blocks=Array.from({length:23},(_,i)=>makeBlock('a'.repeat(1200),1,i));const batches=batchBlocks(blocks);a.equal(batches.flat().length,23);a.ok(batches.every(b=>b.length<=6));a.deepEqual(batches.flat().map(b=>b.id),blocks.map(b=>b.id));});
test('Missing and duplicate translations rejected',()=>{const input=[{id:'a'},{id:'b'}];a.throws(()=>validateTranslations(input,[{id:'a',text:'1'},{id:'a',text:'2'}]));a.throws(()=>validateTranslations(input,[{id:'a',text:'1'}]));a.throws(()=>validateTranslations(input,[{id:'a',text:'1'},{id:'b',text:''}]));a.equal(validateTranslations(input,[{id:'b',text:'2'},{id:'a',text:'1'}]).length,2);});
test('Backup validation rejects malformed data',()=>{a.throws(()=>validateSnapshot({version:2,document:{}}));const d={id:'doc1',name:'测试',format:'txt',blocks:[makeBlock('Test',1,0)],notes:[],bookmarks:[],numPages:1};a.equal(validateSnapshot({version:2,document:d}).document.name,'测试');a.throws(()=>validateSnapshot({version:2,document:{...d,blocks:[d.blocks[0],d.blocks[0]]}}));});
test('Export escapes untrusted markup',()=>a.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;'));
await a.rejects(checkDNS(new URL('https://arxiv.org'),async()=>Response.json({Answer:[{type:1,data:'10.0.0.1'}]})));count++;
await a.rejects(limitedBody(new Response('abcdefghij'),5));a.equal(new TextDecoder().decode(await limitedBody(new Response('abc'),10)),'abc');count++;
console.log(`${count} contract checks passed`);
