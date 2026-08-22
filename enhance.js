(()=>{
  'use strict';

  // Reuse baked particle-text geometry after the first generation so timeline
  // transitions and keyboard seeking never trigger avoidable raster work.
  if(typeof makeTextPoints!=='function'||typeof loadText!=='function') return;

  const originalMakeTextPoints=makeTextPoints;
  const textCache=new Map();

  makeTextPoints=(id,isMobile)=>{
    const key=(isMobile?'m:':'d:')+id;
    let points=textCache.get(key);
    if(!points){
      points=originalMakeTextPoints(id,isMobile);
      textCache.set(key,points);
    }
    return points;
  };

  // The original loader keyed only by phrase id. Include layout in the cache
  // key so a phone rotation / responsive breakpoint cannot reuse desktop
  // geometry in the mobile layout (or vice versa).
  loadText=(slot,id,isMobile)=>{
    const key=(isMobile?100:0)+id;
    if(slot.__layoutKey===key) return;
    const a=makeTextPoints(id,isMobile);
    gl.bindBuffer(gl.ARRAY_BUFFER,slot.buf);
    gl.bufferData(gl.ARRAY_BUFFER,a,gl.DYNAMIC_DRAW);
    slot.id=id;
    slot.__layoutKey=key;
    slot.count=a.length/5;
  };

  // Pre-warm current-layout narrative shapes during idle time. This keeps the
  // 8.5s text handoff smooth without allocating new GPU objects per phrase.
  const warmIds=Array.from({length:13},(_,i)=>i);
  let warmIndex=0;
  const warmStep=deadline=>{
    const isMobile=innerWidth<650;
    while(warmIndex<warmIds.length && (!deadline || deadline.timeRemaining()>4)){
      makeTextPoints(warmIds[warmIndex++],isMobile);
    }
    if(warmIndex<warmIds.length){
      if('requestIdleCallback' in window) requestIdleCallback(warmStep,{timeout:800});
      else setTimeout(()=>warmStep(null),32);
    }
  };
  if('requestIdleCallback' in window) requestIdleCallback(warmStep,{timeout:900});
  else setTimeout(()=>warmStep(null),60);

  window.__LOZ_RUNTIME={
    version:'2026.08.23-finalize-1',
    particleTarget:120000,
    textBuffers:2,
    sourceImageAtRuntime:false
  };
})();
