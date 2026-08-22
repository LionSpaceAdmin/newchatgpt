(()=>{
  'use strict';

  // The main runtime owns the GPU programs and two reusable narrative buffers.
  // This companion only prewarms vector-derived particle geometry and handles
  // responsive cache invalidation. It never replaces the core runtime bindings.
  if(typeof makeTextPoints!=='function'||typeof textSlots==='undefined') return;

  const isMobileLayout=()=>innerWidth<650;
  let layoutMobile=isMobileLayout();

  addEventListener('resize',()=>{
    const next=isMobileLayout();
    if(next===layoutMobile) return;
    layoutMobile=next;
    for(const slot of textSlots) slot.id=-1;
    if(typeof skipSlot!=='undefined') skipSlot.id=-1;
  },{passive:true});

  // Prewarm phrase geometry during idle time. No new GPU objects are created;
  // app.js continues to upload into its fixed pair of text VBOs as needed.
  const ids=Array.from({length:13},(_,i)=>i);
  let i=0;
  const warm=deadline=>{
    while(i<ids.length && (!deadline||deadline.timeRemaining()>5)){
      makeTextPoints(ids[i++],layoutMobile);
    }
    if(i<ids.length){
      if('requestIdleCallback' in window) requestIdleCallback(warm,{timeout:900});
      else setTimeout(()=>warm(null),32);
    }
  };
  if('requestIdleCallback' in window) requestIdleCallback(warm,{timeout:900});
  else setTimeout(()=>warm(null),80);

  window.__LOZ_RUNTIME={
    version:'2026.08.23-finalize-2',
    particleTarget:120000,
    textBuffers:2,
    sourceImageAtRuntime:false
  };
})();
