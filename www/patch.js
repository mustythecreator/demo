(function(){
var cv=$('g'),ov=$('ov'),errs=[];
var ld=document.createElement('p');ld.style.cssText='font-size:11px;color:#9fb0c4';ld.textContent='Loading assets...';ov.insertBefore(ld,ov.querySelector('button'));
function bad(w,e){console.log(w,e);errs.push(w+': '+String(e&&e.message||e).slice(0,70));ld.style.color='#ffb347';ld.innerHTML=errs.join('<br>')}
function ok(){tiles.forEach(function(t){t.sg=''});paint()}

/* 1. stop sound when app leaves the screen */
var bgmWas=false;
function hush(on){try{
 if(on){if(bgmWas&&SD.bgm)SD.bgm.play().catch(function(){});bgmWas=false;if(AC&&AC.resume)AC.resume()}
 else{if(SD.bgm&&!SD.bgm.paused)bgmWas=true;if(SD.bgm)SD.bgm.pause();if(AC&&AC.suspend)AC.suspend();
  if(!paused&&!over){paused=true;var b=document.querySelector('[data-a=pause]');if(b)b.textContent='▶'}}
}catch(e){}}
document.addEventListener('visibilitychange',function(){hush(!document.hidden)});
addEventListener('pagehide',function(){hush(0)});addEventListener('blur',function(){hush(0)});addEventListener('focus',function(){hush(!document.hidden)});

/* 2. drag to pan, pinch to zoom, tap to select */
var Pt={},mv=0,pd=0,zm=1,vx=0,vz=0,CD=430;
function setCam(){zm=Math.max(.5,Math.min(1.6,zm));vx=Math.max(-150,Math.min(150,vx));vz=Math.max(-150,Math.min(150,vz));cam.position.set(vx,.8*CD*zm,vz+.6*CD*zm);cam.lookAt(vx,0,vz)}
function rs2(){var r=$('cw').getBoundingClientRect(),a=r.width/r.height;CD=a<1?480*Math.max(1,.95/a):430*Math.max(1,1.5/a);setCam()}
new ResizeObserver(rs2).observe($('cw'));rs2();
function pts(){return Object.keys(Pt).map(function(k){return Pt[k]})}
function tapAt(x,y){var r=cv.getBoundingClientRect();rc.setFromCamera({x:(x-r.left)/r.width*2-1,y:-(y-r.top)/r.height*2+1},cam);var h=rc.intersectObjects(meshes,false)[0];if(h)tap(h.object.userData.i)}
$('cw').addEventListener('pointerdown',function(e){if(e.target!==cv)return;e.stopPropagation();try{cv.setPointerCapture(e.pointerId)}catch(x){}
 Pt[e.pointerId]=[e.clientX,e.clientY];var a=pts();mv=a.length>1?99:0;if(a.length==2)pd=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])},true);
cv.addEventListener('pointermove',function(e){var p=Pt[e.pointerId];if(!p)return;var dx=e.clientX-p[0],dy=e.clientY-p[1];Pt[e.pointerId]=[e.clientX,e.clientY];
 if(pts().length==1){mv+=Math.abs(dx)+Math.abs(dy);if(mv>10){var k=.63*CD*zm/cv.clientHeight;vx-=dx*k;vz-=dy*k*1.25;setCam()}}
 else{var a=pts(),d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pd)zm*=pd/d;pd=d;mv=99;setCam()}});
function done(e){if(!Pt[e.pointerId])return;var t=pts().length==1&&mv<=10&&e.type=='pointerup';delete Pt[e.pointerId];pd=0;if(t)tapAt(e.clientX,e.clientY)}
cv.addEventListener('pointerup',done);cv.addEventListener('pointercancel',done);
cv.addEventListener('wheel',function(e){zm*=e.deltaY>0?1.1:.9;setCam()});

/* 3. asset loader: each part loads on its own, errors shown on start screen */
async function load(){
 await Promise.all(Object.keys(FILES).map(async function(k){try{var r=await fetch(FILES[k]);if(!r.ok)throw new Error(r.status);AB[k]=await r.arrayBuffer()}catch(e){bad(k,e)}}));
 try{['click','cash','bgm'].forEach(function(k){if(AB[k]){var a=new Audio(blob(k,'audio/mpeg'));a.preload='auto';SD[k]=a}});
  [0,1,2,3].forEach(function(i){if(AB['ic'+i])ICU[i]=blob('ic'+i,'image/png')});
  if(AB.grass){var im=new Image();im.onload=function(){var t=new THREE.Texture(im);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;mods.gt=1;tiles.forEach(function(x){x.mesh.material.map=t;x.mesh.material.needsUpdate=true});paint()};im.src=blob('grass','image/jpeg')}}catch(e){bad('audio/ui',e)}
 var gl;function P(k){return new Promise(function(a,b){if(!AB[k])return b(new Error('missing '+k));gl.parse(AB[k],'',a,b)})}
 try{gl=new THREE.GLTFLoader()}catch(e){bad('GLTFLoader',e);return}
 try{var s=await P('soldier');mods.sol=s;mods.solT=fit(s.scene,9);ok()}catch(e){bad('soldier',e)}
 try{var fb=new THREE.FBXLoader();mods.tank=[];
  for(var i=0;i<4;i++){var o=fb.parse(AB['tank'+i],'');o.traverse(function(x){if(x.isMesh){var arr=Array.isArray(x.material),l=(arr?x.material:[x.material]).map(function(m){var c=m.clone();if(c.color)c.color.lerp(new THREE.Color(F[i].c),.45);return c});x.material=arr?l:l[0]}});mods.tank[i]=fit(o,15)}
  ok()}catch(e){bad('tanks',e)}
 try{var hq=[];for(var j=0;j<4;j++)hq[j]=fit((await P('hq'+j)).scene,24);
  F.forEach(function(f,k){var h=hq[k].clone(true);h.position.y=2;f.t.mesh.add(h);f.t.pg.visible=false});ok()}catch(e){bad('capitals',e)}
 try{var city=fit((await P('city')).scene,13);
  tiles.forEach(function(t){var c=city.clone(true);c.position.set(0,-3.5,0);t.db.material=new THREE.MeshBasicMaterial({visible:false});t.db.add(c)});ok()}catch(e){bad('city',e)}
 if(!errs.length){ld.style.color='#22c55e';ld.textContent='Assets loaded ✓'}
}
load();
})();
