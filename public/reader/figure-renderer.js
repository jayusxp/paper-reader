// Render the PDF region itself; never enlarge a screenshot of the reading pane.
export function regionPlan(base, box, targetWidth) {
  const x=Math.max(0,box.x),y=Math.max(0,box.y);
  const w=Math.min(box.w,1-x)*base.width,h=Math.min(box.h,1-y)*base.height;
  if(!(w>0&&h>0))throw Error('原图区域无效');
  const scale=Math.min(targetWidth/w,6000/w,6000/h,Math.sqrt(16000000/(w*h)));
  return {scale,width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale)),offsetX:x*base.width*scale,offsetY:y*base.height*scale};
}
const caches=new WeakMap();
let queue=Promise.resolve();
export function renderFigure(pdf,pageNumber,box,targetWidth=1800){
  let cache=caches.get(pdf);if(!cache){cache=new Map();caches.set(pdf,cache);}
  const key=JSON.stringify([pageNumber,box.x,box.y,box.w,box.h,targetWidth]);
  if(cache.has(key))return cache.get(key);
  const job=queue.then(async()=>{
    const page=await pdf.getPage(pageNumber),plan=regionPlan(page.getViewport({scale:1}),box,targetWidth);
    const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
    try{await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale:plan.scale}),transform:[1,0,0,1,-plan.offsetX,-plan.offsetY],background:'rgb(255,255,255)'}).promise;
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('原图生成失败')),'image/png'));
      return {blob,width:plan.width,height:plan.height};
    }finally{canvas.width=canvas.height=1;}
  });
  queue=job.catch(()=>{});cache.set(key,job);job.catch(()=>cache.delete(key));
  // Cache compressed PNGs, not large decoded canvases.
  while(cache.size>8)cache.delete(cache.keys().next().value);
  return job;
}
