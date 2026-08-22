(async()=>{
  try{
    const chunks=window.__LION_PC;
    if(!Array.isArray(chunks)||chunks.length<6||chunks.slice(0,6).some(x=>!x)) throw new Error('point cloud chunks missing');
    window.__LION_PC_B64=chunks.slice(0,6).join('');
    const b64=await fetch('/data/app.b64?v=4',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('runtime '+r.status);return r.text()});
    const bin=Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0));
    if(typeof DecompressionStream!=='function') throw new Error('DecompressionStream unavailable');
    const code=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    new Function(code)();
  }catch(err){
    console.error(err);
    const el=document.getElementById('loading');
    if(el) el.textContent='UNABLE TO INITIALIZE PARTICLE FIELD';
  }
})();
