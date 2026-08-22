const canvas=document.getElementById('gl');
const loading=document.getElementById('loading');
const fallback=document.getElementById('fallback');
const skipHit=document.getElementById('skipHit');
const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',desynchronized:true});
if(!gl){fallback.hidden=false;loading.classList.add('hidden');throw new Error('WebGL2 unavailable')}

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=n=>{let x=n|0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return (x>>>0)/4294967295};
const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader error');return s};
const makeProgram=(vs,fs)=>{const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'link error');return p};
const attr=(p,name,size,type,norm,stride,offset)=>{const l=gl.getAttribLocation(p,name);if(l<0)return;gl.vertexAttribPointer(l,size,type,norm,stride,offset);gl.enableVertexAttribArray(l)};

const lionVS=`#version 300 es
precision highp float;
in vec3 aHome;in float aColor565;in float aSI;in float aRegion;in float aFlowA;in float aBlastA;in float aDelay;in float aRnd;
uniform float uTime,uFormation,uRelocate,uExplode,uViewportAspect,uLionAspect,uDpr,uQuality;
uniform vec2 uPointer;
out vec3 vColor;out float vAlpha;out float vEnergy;
float sat(float x){return clamp(x,0.0,1.0);}float h(float n){return fract(sin(n*91.731+17.17)*43758.5453);}
void main(){
 float r5=floor(aColor565/2048.0),g6=floor(mod(aColor565,2048.0)/32.0),b5=mod(aColor565,32.0);vec3 col=vec3(r5/31.0,g6/63.0,b5/31.0);
 float sz=floor(aSI/16.0)/15.0,inten=mod(aSI,16.0)/15.0;
 float fa=aFlowA*6.28318530718-3.14159265359;vec2 flow=vec2(cos(fa),sin(fa));
 float ba=aBlastA*6.28318530718-3.14159265359;vec3 blast=normalize(vec3(cos(ba),sin(ba),.18+.28*h(aRnd+.27)));
 vec3 home=vec3(aHome.x*uLionAspect,aHome.y,aHome.z*.35);
 float f=smoothstep(aDelay,min(1.0,aDelay+.22),uFormation);
 vec2 jit=vec2(h(aRnd+.11)-.5,h(aRnd+.73)-.5);
 vec3 start=home+vec3(flow*mix(.16,.70,h(aRnd+.2))+jit*.20,(h(aRnd+.9)-.5)*.48);
 vec3 p=mix(start,home,f);
 float mane=step(aRegion,.5)+step(4.5,aRegion)*step(aRegion,6.5);
 float gust=sin(3.14159265*sat(uRelocate));
 p.xy+=vec2(.82,.55)*gust*(.10+.24*mane)*(.35+.65*h(aRnd+.4));
 p.z+=gust*(h(aRnd+.33)-.5)*.18;
 float zd=0.0;if(aRegion>3.5&&aRegion<4.5)zd=.17;else if(aRegion>2.5&&aRegion<3.5)zd=.12;else if(aRegion>1.5&&aRegion<2.5)zd=.09;else if(aRegion>.5)zd=.055;
 float ep=sat((uExplode-zd)/(1.0-zd)),ea=sin(3.14159265*ep);
 float estr=mix(.92,.50,step(.5,aRegion))*(.62+.58*h(aRnd+.8));
 p+=blast*ea*estr;
 p.xy+=vec2(sin((p.y+aRnd)*12.0+uTime*7.0),cos((p.x-aRnd)*10.0+uTime*6.0))*ea*.05;
 float breathe=sin(uTime*.95+aRnd*6.283)*.006*f*(1.0-gust);p.xy*=1.0+breathe;
 float rel=smoothstep(0.0,1.0,uRelocate),scale=mix(.60,.255,rel);vec2 center=mix(vec2(0.0,.04),vec2(0.0,.58),rel);float para=mix(1.0,.35,rel);
 p.xy+=uPointer*(p.z+.06)*.065*para*f;
 gl_Position=vec4(vec2(p.x*scale/uViewportAspect,p.y*scale)+center,0.0,1.0);
 float boost=(aRegion>3.5&&aRegion<4.5)?1.62:((aRegion>1.5&&aRegion<3.5)?1.22:1.0);
 gl_PointSize=mix(1.05,3.45,sz)*uDpr*boost*mix(1.0,.82,rel)*uQuality;
 vColor=col*(.50+1.18*inten)*boost;vEnergy=inten;vAlpha=f;
}`;
const lionFS=`#version 300 es
precision highp float;in vec3 vColor;in float vAlpha;in float vEnergy;uniform float uGlow;out vec4 outColor;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float core=1.0-smoothstep(.17,.50,d),halo=1.0-smoothstep(.02,.50,d);float a=mix(core,halo,uGlow)*vAlpha*mix(.42,.94,vEnergy)*mix(1.0,.24,uGlow);if(a<.01)discard;outColor=vec4(min(vec3(1.0),vColor*mix(1.0,1.28,uGlow)),a);}`;
const lionProg=makeProgram(lionVS,lionFS);

const lineVS=`#version 300 es
precision highp float;in vec3 aHome;in vec2 aFlow;in vec3 aBlast;in float aDelay;in float aRnd;in float aT;
uniform float uTime,uFormation,uRelocate,uExplode,uViewportAspect,uLionAspect;uniform vec2 uPointer;out float vA;
float h(float n){return fract(sin(n*91.731+17.17)*43758.5453);}void main(){vec3 home=vec3(aHome.x*uLionAspect,aHome.y,aHome.z*.35);home.xy+=aFlow*aT*mix(.012,.035,h(aRnd+.3));float f=smoothstep(aDelay,min(1.0,aDelay+.24),uFormation);vec3 p=mix(home+vec3(aFlow*.34,(h(aRnd)-.5)*.3),home,f);float gust=sin(3.14159265*clamp(uRelocate,0.0,1.0));p.xy+=vec2(.82,.55)*gust*.25*(.5+.5*h(aRnd+.5));float ep=clamp((uExplode-.02)/.98,0.0,1.0);p+=aBlast*sin(3.14159265*ep)*.72;float rel=smoothstep(0.0,1.0,uRelocate),scale=mix(.60,.255,rel);vec2 center=mix(vec2(0.0,.04),vec2(0.0,.58),rel);p.xy+=uPointer*(p.z+.04)*.045*mix(1.0,.35,rel);gl_Position=vec4(vec2(p.x*scale/uViewportAspect,p.y*scale)+center,0,1);vA=f*(1.0-gust*.28);}`;
const lineFS=`#version 300 es
precision highp float;in float vA;out vec4 outColor;void main(){outColor=vec4(1.0,.57,.14,.15*vA);}`;
const lineProg=makeProgram(lineVS,lineFS);

const textVS=`#version 300 es
precision highp float;in vec2 aPos;in float aOrder;in float aIntensity;in float aSize;uniform float uIn,uOut,uTime,uAspect,uViewportAspect,uScale,uDpr;uniform vec2 uCenter;out float vA;out float vI;
float h(float n){return fract(sin(n*71.17+4.31)*43758.54);}void main(){float vin=smoothstep(aOrder-.08,aOrder+.03,uIn),vout=1.0-smoothstep(aOrder-.04,aOrder+.10,uOut),a=vin*vout;vec2 p=vec2(aPos.x*uAspect,aPos.y);p+=vec2(.82,.48)*uOut*(.08+.24*h(aPos.x*17.0+aPos.y*31.0));p.y+=sin(aPos.x*17.0+uTime*5.0)*uOut*.025;gl_Position=vec4(vec2(p.x*uScale/uViewportAspect,p.y*uScale)+uCenter,0,1);gl_PointSize=mix(1.1,2.7,aSize)*uDpr;vA=a;vI=aIntensity;}`;
const textFS=`#version 300 es
precision highp float;in float vA;in float vI;out vec4 outColor;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=(1.0-smoothstep(.16,.5,d))*vA*mix(.62,1.0,vI);if(a<.01)discard;vec3 c=mix(vec3(.90,.74,.50),vec3(1.0,.95,.83),vI);outColor=vec4(c,a);}`;
const textProg=makeProgram(textVS,textFS);

function decodeSeed(){const parts=window.__LION_SEED;if(!Array.isArray(parts)||parts.length<1)throw new Error('lion seed missing');const s=parts.join('');const raw=Uint8Array.from(atob(s),c=>c.charCodeAt(0));const dv=new DataView(raw.buffer);if(new TextDecoder().decode(raw.slice(0,8))!=='LOZSEED1')throw new Error('bad lion seed');return{raw,dv,count:dv.getUint32(8,true),aspect:dv.getFloat32(12,true)}}
function makeLionData(seed){const N=seed.count*10,stride=14,out=new ArrayBuffer(N*stride),dv=new DataView(out),src=seed.dv;const base={0:.04,1:.36,2:.50,3:.57,4:.76,5:.08,6:.14,7:.42};let k=0;for(let i=0;i<seed.count;i++){const o=16+i*11;const sx=src.getInt16(o,true),sy=src.getInt16(o+2,true),sz=src.getInt16(o+4,true),c=src.getUint16(o+6,true),reg=src.getUint8(o+8),fa0=src.getUint8(o+9),inten=src.getUint8(o+10);for(let j=0;j<10;j++,k++){const q=k*stride,r=hash(i*101+j*977+31),r2=hash(i*211+j*419+7),r3=hash(i*313+j*659+17);const spread=reg===4?.0008:(reg===3?.0012:(reg===2?.0017:.0028));dv.setInt16(q,Math.max(-32767,Math.min(32767,Math.round(sx+(r-.5)*32767*spread))),true);dv.setInt16(q+2,Math.max(-32767,Math.min(32767,Math.round(sy+(r2-.5)*32767*spread))),true);dv.setInt16(q+4,Math.max(-32767,Math.min(32767,Math.round(sz+(r3-.5)*700))),true);dv.setUint16(q+6,c,true);const size=Math.max(3,Math.min(15,Math.round(5+inten/255*7+(reg===4?2:0)+r*2)));const ii=Math.max(2,Math.min(15,Math.round(inten/255*15)));dv.setUint8(q+8,(size<<4)|ii);dv.setUint8(q+9,reg);dv.setUint8(q+10,(fa0+Math.round((r-.5)*10)+256)%256);const x=sx/32767,y=sy/32767,rad=Math.atan2(y,x),ba=((rad+Math.PI)/(2*Math.PI)*255+28+(r2-.5)*20)&255;dv.setUint8(q+11,ba);dv.setUint8(q+12,Math.round(clamp(base[reg]+(sx/32767+1)*.055+r3*.075)*255));dv.setUint8(q+13,Math.floor(r2*255));}}return{buffer:out,count:N}}
function makeLionVAO(buf){const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);attr(lionProg,'aHome',3,gl.SHORT,true,14,0);attr(lionProg,'aColor565',1,gl.UNSIGNED_SHORT,false,14,6);attr(lionProg,'aSI',1,gl.UNSIGNED_BYTE,false,14,8);attr(lionProg,'aRegion',1,gl.UNSIGNED_BYTE,false,14,9);attr(lionProg,'aFlowA',1,gl.UNSIGNED_BYTE,true,14,10);attr(lionProg,'aBlastA',1,gl.UNSIGNED_BYTE,true,14,11);attr(lionProg,'aDelay',1,gl.UNSIGNED_BYTE,true,14,12);attr(lionProg,'aRnd',1,gl.UNSIGNED_BYTE,true,14,13);gl.bindVertexArray(null);return vao}
function buildLines(data,count){const dv=new DataView(data),floats=[];let picked=0;for(let i=0;i<count&&picked<3200;i+=13){const o=i*14,reg=dv.getUint8(o+9);if(!(reg===0||reg===5||reg===6))continue;const hx=dv.getInt16(o,true)/32767,hy=dv.getInt16(o+2,true)/32767,hz=dv.getInt16(o+4,true)/32767,fa=dv.getUint8(o+10)/255*6.28318530718-Math.PI,ba=dv.getUint8(o+11)/255*6.28318530718-Math.PI,fx=Math.cos(fa),fy=Math.sin(fa),bx=Math.cos(ba),by=Math.sin(ba),rnd=dv.getUint8(o+13)/255,bz=.18+.28*hash(i+77),delay=dv.getUint8(o+12)/255;for(const t of [0,1])floats.push(hx,hy,hz,fx,fy,bx,by,bz,delay,rnd,t);picked++}const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(floats),gl.STATIC_DRAW);const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);const st=11*4;let off=0;for(const [n,sz] of [['aHome',3],['aFlow',2],['aBlast',3],['aDelay',1],['aRnd',1],['aT',1]]){attr(lineProg,n,sz,gl.FLOAT,false,st,off);off+=sz*4}gl.bindVertexArray(null);return{vao,count:picked*2}}

const desktop=[
['On October 7, the war did not erupt','only along Israel’s borders.'],['It unfolded before the eyes','of the world.'],['Hamas terrorists documented and broadcast','their actions in real time.'],['But before the smoke had cleared,','another front was already open —'],['a battlefield of lies, propaganda,','and narratives spreading faster','than the facts.'],['Today’s wars are not fought only','with soldiers, aircraft, and missiles.'],['They are also fought with videos,','headlines, algorithms,'],['influencers, bots,','and public perception.'],['This is the battlefield','for truth.'],['And truth will not win','by itself.'],['It must be uncovered. Proven.','And seen by the world.'],['Join us.'],['Skip intro']];
const mobile=[
['On October 7, the war','did not erupt only along','Israel’s borders.'],['It unfolded before','the eyes of the world.'],['Hamas terrorists documented','and broadcast their actions','in real time.'],['But before the smoke had cleared,','another front was already','open —'],['a battlefield of lies, propaganda,','and narratives spreading faster','than the facts.'],['Today’s wars are not fought only','with soldiers, aircraft,','and missiles.'],['They are also fought with videos,','headlines, algorithms,'],['influencers, bots,','and public perception.'],['This is the battlefield','for truth.'],['And truth will not win','by itself.'],['It must be uncovered. Proven.','And seen by the world.'],['Join us.'],['Skip intro']];
const textSlots=[{buf:gl.createBuffer(),vao:null,id:-1,count:0},{buf:gl.createBuffer(),vao:null,id:-1,count:0}],skipSlot={buf:gl.createBuffer(),vao:null,id:-1,count:0};
function textVAO(buf){const v=gl.createVertexArray();gl.bindVertexArray(v);gl.bindBuffer(gl.ARRAY_BUFFER,buf);attr(textProg,'aPos',2,gl.FLOAT,false,20,0);attr(textProg,'aOrder',1,gl.FLOAT,false,20,8);attr(textProg,'aIntensity',1,gl.FLOAT,false,20,12);attr(textProg,'aSize',1,gl.FLOAT,false,20,16);gl.bindVertexArray(null);return v}for(const s of textSlots)s.vao=textVAO(s.buf);skipSlot.vao=textVAO(skipSlot.buf);
const oc=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1500,700):document.createElement('canvas'),ctx=oc.getContext('2d',{willReadFrequently:true});
function makeTextPoints(id,isMobile){const lines=(isMobile?mobile:desktop)[id],W=isMobile?850:1500,H=isMobile?700:500,fs=isMobile?58:78;oc.width=W;oc.height=H;ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`400 ${fs}px Georgia, 'Times New Roman', serif`;const lh=fs*1.12,y0=H/2-(lines.length-1)*lh/2;for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],W/2,y0+i*lh);const im=ctx.getImageData(0,0,W,H).data,candidates=[];for(let y=1;y<H-1;y+=2)for(let x=1;x<W-1;x+=2){const a=im[(y*W+x)*4+3];if(a>28)candidates.push([x,y,a])}const max=id<11?(isMobile?7500:9000):(id===11?3200:2400),step=Math.max(1,candidates.length/max),out=[];for(let i=0;i<candidates.length&&out.length/5<max;i+=step){const [x,y,a]=candidates[Math.floor(i)],nx=x/(W-1)*2-1,ny=-(y/(H-1)*2-1),edge=(a/255);out.push(nx,ny,x/(W-1),.62+.38*edge,.40+.60*edge)}return new Float32Array(out)}
function loadText(slot,id,isMobile){if(slot.id===id)return;const a=makeTextPoints(id,isMobile);gl.bindBuffer(gl.ARRAY_BUFFER,slot.buf);gl.bufferData(gl.ARRAY_BUFFER,a,gl.DYNAMIC_DRAW);slot.id=id;slot.count=a.length/5}

let vw=1,vh=1,dpr=1,viewportAspect=1,quality=2,drawCount=120000,lionAspect=1.487,lionVAO,lineVAO,lineCount=0;
function resize(){vw=innerWidth;vh=innerHeight;dpr=Math.min(devicePixelRatio||1,quality===0?1:quality===1?1.25:1.65);canvas.width=Math.max(1,Math.round(vw*dpr));canvas.height=Math.max(1,Math.round(vh*dpr));gl.viewport(0,0,canvas.width,canvas.height);viewportAspect=vw/vh}addEventListener('resize',resize,{passive:true});
const wordCounts=[12,8,10,12,12,11,8,5,6,7,10],starts=[],holds=[];let acc=8.5;for(const wc of wordCounts){starts.push(acc);const h=clamp(1.2+wc*.06,1.55,2.05);holds.push(h);acc+=.55+h+.55-.2}const FINAL=37.7,END=38.5;
let master=0,last=performance.now(),paused=false,explodeStart=-99,pointer=[0,0],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)master=FINAL+.1;
function skip(){master=FINAL+.1;paused=false;explodeStart=-99}skipHit.addEventListener('click',skip);addEventListener('keydown',e=>{if(e.key==='Escape'){skip();e.preventDefault()}else if(e.code==='Space'){paused=!paused;e.preventDefault()}else if(e.key==='ArrowRight'){const marks=[1,3.8,6.3,8.5,...starts.slice(1),FINAL],n=marks.find(v=>v>master+.03);master=n??FINAL;e.preventDefault()}});canvas.addEventListener('pointermove',e=>pointer=[(e.clientX/vw-.5)*2,-(e.clientY/vh-.5)*2],{passive:true});canvas.addEventListener('pointerleave',()=>pointer=[0,0],{passive:true});canvas.addEventListener('pointerdown',()=>explodeStart=master,{passive:true});document.addEventListener('visibilitychange',()=>{last=performance.now()});
function lionUniforms(p,f,r,e,t){gl.useProgram(p);const U=(n,v)=>{const l=gl.getUniformLocation(p,n);if(l===null)return;Array.isArray(v)?gl.uniform2f(l,v[0],v[1]):gl.uniform1f(l,v)};U('uTime',t);U('uFormation',f);U('uRelocate',r);U('uExplode',e);U('uViewportAspect',viewportAspect);U('uLionAspect',lionAspect);U('uPointer',pointer);if(p===lionProg){U('uDpr',dpr);U('uQuality',quality===0?.82:1)}}
function drawLion(t){const f=t<1?0:t<3.8?clamp((t-1)/2.8):1,r=t<6.3?0:t<8.5?clamp((t-6.3)/2.2):1,dt=t-explodeStart,e=dt>=0&&dt<=1.6?clamp(dt/1.6):0;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);lionUniforms(lionProg,f,r,e,t);gl.bindVertexArray(lionVAO);if(quality>0){gl.uniform1f(gl.getUniformLocation(lionProg,'uGlow'),1);gl.drawArrays(gl.POINTS,0,drawCount)}gl.uniform1f(gl.getUniformLocation(lionProg,'uGlow'),0);gl.drawArrays(gl.POINTS,0,drawCount);if(quality>0&&lineVAO){lionUniforms(lineProg,f,r,e,t);gl.bindVertexArray(lineVAO);gl.drawArrays(gl.LINES,0,lineCount)}gl.bindVertexArray(null)}
function activeSegments(t){const out=[];for(let i=0;i<11;i++){const s=starts[i],e=s+.55+holds[i]+.55;if(t>=s&&t<=e)out.push(i)}return out.slice(-2)}
function drawText(slot,id,t,center,scale,staticMode=false){const isM=vw<650;loadText(slot,id,isM);let inp=1,outp=0;if(!staticMode){const s=starts[id];inp=clamp((t-s)/.55);outp=clamp((t-(s+.55+holds[id]))/.55)}gl.useProgram(textProg);const U=(n,v)=>gl.uniform1f(gl.getUniformLocation(textProg,n),v),U2=(n,v)=>gl.uniform2f(gl.getUniformLocation(textProg,n),v[0],v[1]);U('uIn',inp);U('uOut',outp);U('uTime',t);U('uAspect',isM?850/700:3);U('uViewportAspect',viewportAspect);U('uScale',scale);U('uDpr',dpr);U2('uCenter',center);gl.bindVertexArray(slot.vao);gl.drawArrays(gl.POINTS,0,slot.count)}
function drawTexts(t){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);const m=vw<650,scale=m?.31:.255,center=m?[0,-.12]:[0,-.17];if(t>=8.5&&t<FINAL){activeSegments(t).forEach((id,k)=>drawText(textSlots[k],id,t,center,scale,false));drawText(skipSlot,12,t,m?[.72,.86]:[.79,.87],m?.10:.12,true)}else if(t>=FINAL)drawText(textSlots[0],11,t,m?[0,-.10]:[0,-.16],m?.34:.28,true)}
let samples=[];function adapt(dt){if(dt>3&&dt<80)samples.push(dt);if(samples.length>=120){const avg=samples.reduce((a,b)=>a+b,0)/samples.length;samples=[];if(avg>18.5&&quality>0){quality--;drawCount=quality===1?90000:64000;resize()}}}
function frame(now){const dt=Math.min(50,now-last);last=now;if(!paused&&!document.hidden&&!reduced)master=Math.min(END,master+dt/1000);adapt(dt);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);drawLion(master);drawTexts(master);requestAnimationFrame(frame)}
try{const seed=decodeSeed();lionAspect=seed.aspect;const lion=makeLionData(seed);drawCount=lion.count;const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(lion.buffer),gl.STATIC_DRAW);lionVAO=makeLionVAO(b);const lines=buildLines(lion.buffer,lion.count);lineVAO=lines.vao;lineCount=lines.count;resize();loading.classList.add('hidden');requestAnimationFrame(frame)}catch(err){console.error(err);fallback.hidden=false;loading.classList.add('hidden')}
