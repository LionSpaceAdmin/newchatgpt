import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'dist');
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(path.join(OUT,'data'),{recursive:true});

function readChunk(i){
  const s=fs.readFileSync(path.join(ROOT,'data',`lion.${String(i).padStart(2,'0')}.js`),'utf8');
  const m=s.match(/='([^']+)'/);
  if(!m) throw new Error(`bad point-cloud chunk ${i}`);
  return m[1];
}
const sourceB64=Array.from({length:6},(_,i)=>readChunk(i)).join('');
const compact=zlib.gunzipSync(Buffer.from(sourceB64,'base64'));
if(compact.subarray(0,8).toString('binary')!=='LIONPC3\0') throw new Error('bad source cloud');
const count=compact.readUInt32LE(8), stride=compact.readUInt16LE(12);
if(count!==6000 || stride!==10) throw new Error(`unexpected source cloud ${count}/${stride}`);

const TARGET=110000;
const out=Buffer.allocUnsafe(16+TARGET*10);
out.write('LIONPC3\0',0,'binary');
out.writeUInt32LE(TARGET,8); out.writeUInt16LE(10,12); out.writeUInt16LE(3,14);
function splitmix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function noise(seed){return splitmix32(seed)/4294967296;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function getBits(buf,off){let v=0n;for(let k=0;k<10;k++)v|=BigInt(buf[off+k])<<(8n*BigInt(k));return v;}
function setBits(buf,off,v){for(let k=0;k<10;k++)buf[off+k]=Number((v>>(8n*BigInt(k)))&255n);}
function mask(n){return (1n<<BigInt(n))-1n;}
function field(v,shift,n){return Number((v>>BigInt(shift))&mask(n));}
function put(v,shift,n,x){const m=mask(n)<<BigInt(shift);return (v&~m)|(BigInt(x)&mask(n))<<BigInt(shift);}
for(let j=0;j<TARGET;j++){
  const i=j%count, copy=Math.floor(j/count), srcOff=16+i*10;
  let v=getBits(compact,srcOff);
  let qx=field(v,0,10), qy=field(v,10,10), qz=field(v,20,8);
  const zone=field(v,52,3), qflow=field(v,55,6), seed=(i*2654435761 ^ copy*2246822519)>>>0;
  const a=qflow/63*Math.PI*2-Math.PI, fx=Math.cos(a), fy=Math.sin(a), px=-fy, py=fx;
  const r1=noise(seed)-.5, r2=noise(seed^0x85ebca6b)-.5, r3=noise(seed^0xc2b2ae35)-.5;
  const facial=zone===1||zone===2||zone===3||zone===4, silhouette=zone===5||zone===7;
  const along=facial?.7:(silhouette?1.4:2.8), across=facial?.55:(silhouette?.9:1.5), dz=facial?.5:1.3;
  qx=clamp(Math.round(qx+fx*r1*along+px*r2*across),0,1023);
  qy=clamp(Math.round(qy-fy*r1*along-py*r2*across),0,1023);
  qz=clamp(Math.round(qz+r3*dz),0,255);
  v=put(v,0,10,qx); v=put(v,10,10,qy); v=put(v,20,8,qz);
  if(!facial&&copy>0)v=put(v,55,6,clamp(qflow+Math.round((noise(seed^0x27d4eb2d)-.5)*2),0,63));
  setBits(out,16+j*10,v);
}
const gz=zlib.gzipSync(out,{level:9});
fs.writeFileSync(path.join(OUT,'data','lion.pcbin.gz'),gz);

const appGz=Buffer.from(fs.readFileSync(path.join(ROOT,'data','app.b64'),'utf8').trim(),'base64');
let app=zlib.gunzipSync(appGz).toString('utf8');
const loader=/async function loadLion\(\)\{[\s\S]*?const bytes=/;
const replacement="async function loadLion(){\n  const r=await fetch('/data/lion.pcbin.gz',{cache:'force-cache'}); if(!r.ok) throw new Error('point cloud '+r.status); if(typeof DecompressionStream!=='function') throw new Error('DecompressionStream unavailable'); const cloud=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();\n  const bytes=";
if(!loader.test(app)) throw new Error('runtime loadLion patch target not found');
app=app.replace(loader,replacement);
fs.writeFileSync(path.join(OUT,'app.js'),app);

let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
html=html.replace(/\s*<script src="\/data\/lion\.00\.js"><\/script>[\s\S]*?<script src="\/boot\.js\?v=3"><\/script>/,'\n  <script src="/app.js?v=110k"></script>');
fs.writeFileSync(path.join(OUT,'index.html'),html);
fs.copyFileSync(path.join(ROOT,'styles.css'),path.join(OUT,'styles.css'));
console.log(`Baked ${TARGET.toLocaleString()} GPU particles; ${(gz.length/1024).toFixed(1)} KB compressed; no lion image ships at runtime.`);
