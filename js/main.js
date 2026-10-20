(function(){
"use strict";
var PHOTOS = ["assets/photos/photo-01.webp", "assets/photos/photo-02.webp", "assets/photos/photo-03.webp", "assets/photos/photo-04.webp", "assets/photos/photo-05.webp", "assets/photos/photo-06.webp", "assets/photos/photo-07.webp", "assets/photos/photo-08.webp", "assets/photos/photo-09.webp", "assets/photos/photo-10.webp", "assets/photos/photo-11.webp", "assets/photos/photo-12.webp", "assets/photos/photo-13.webp", "assets/photos/photo-14.webp", "assets/photos/photo-15.webp", "assets/photos/photo-16.webp", "assets/photos/photo-17.webp", "assets/photos/photo-18.webp", "assets/photos/photo-19.webp", "assets/photos/photo-20.webp", "assets/photos/photo-21.webp", "assets/photos/photo-22.webp", "assets/photos/photo-23.webp"];
var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- AOS: text reveals ---------- */
AOS.init({once:false, mirror:true, offset:0, easing:'ease-out-cubic', disable:REDUCED});

/* ---------- helpers ---------- */
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function seg(p,a,b){return clamp((p-a)/(b-a),0,1);}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function lerp(a,b,t){return a+(b-a)*t;}
function lin(hex){return new THREE.Color(hex).convertSRGBToLinear();}

/* ---------- renderer / scene ---------- */
var canvas=document.getElementById('stage');
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.setClearColor(0x000000,0);
var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(35,1,0.1,400);

scene.add(new THREE.HemisphereLight(0xfff7f2,0x4a3a30,0.8));
var sun=new THREE.DirectionalLight(0xffffff,0.95); sun.position.set(7,11,10); scene.add(sun);
var rim=new THREE.DirectionalLight(0xffe2ea,0.35); rim.position.set(-8,4,-6); scene.add(rim);

var bouquet=new THREE.Group(); scene.add(bouquet);

/* ---------- layout: 23 equal roses, packed in a circle, no overlap ---------- */
var N=PHOTOS.length, GOLD=Math.PI*(3-Math.sqrt(5));
var RO=1.0, GAP=0.05, DMIN=2*RO+GAP;            // every rose owns a circle of radius RO
var pts=[];
for(var i=0;i<N;i++){var r0=1.05*Math.sqrt(i+0.5);pts.push([r0*Math.cos(i*GOLD),r0*Math.sin(i*GOLD)]);}
for(var it=0;it<1500;it++){                     // relax: push apart, pull gently inwards
  for(var a=0;a<N;a++)for(var b=a+1;b<N;b++){
    var dx=pts[b][0]-pts[a][0],dz=pts[b][1]-pts[a][1],dd=Math.sqrt(dx*dx+dz*dz)||1e-6;
    if(dd<DMIN){var push=(DMIN-dd)/2/dd;pts[a][0]-=dx*push;pts[a][1]-=dz*push;pts[b][0]+=dx*push;pts[b][1]+=dz*push;}
  }
  if(it<1300){for(var c=0;c<N;c++){pts[c][0]*=0.996;pts[c][1]*=0.996;}}
}
var cx0=0,cz0=0;pts.forEach(function(p){cx0+=p[0]/N;cz0+=p[1]/N;});
var MAXR=0;pts.forEach(function(p){p[0]-=cx0;p[1]-=cz0;MAXR=Math.max(MAXR,Math.hypot(p[0],p[1]));});
var EDGE=MAXR+RO;                               // outer edge of the flowers
function domeY(r){return 3.6-0.035*r*r;}
var roses=[];
for(var i=0;i<N;i++){
  var x=pts[i][0], z=pts[i][1], r=Math.hypot(x,z), th=Math.atan2(z,x);
  var u=new THREE.Vector3(Math.cos(th),0,Math.sin(th));
  var axis=new THREE.Vector3(0,1,0).cross(u); if(axis.lengthSq()<1e-6) axis.set(1,0,0); axis.normalize();
  var q=new THREE.Quaternion().setFromAxisAngle(axis,0.06*r);
  var m=new THREE.Matrix4().compose(new THREE.Vector3(x,domeY(r),z),q,new THREE.Vector3(1,1,1));
  roses.push({m:m, red:(i%2===0), spin:i*2.399, r:r, x:x, z:z, y:domeY(r), u:u, tilt:0.06*r, q:q});
}

/* ---------- rose petal: wide, round-tipped, cupped, lip rolled outwards ---------- */
function petalGeo(w,h,cupK,curlK){
  var g=new THREE.PlaneGeometry(1,1,6,7); g.translate(0,0.5,0);
  var p=g.attributes.position, col=[];
  for(var k=0;k<p.count;k++){
    var s=p.getX(k)*2, t=p.getY(k);            // s in [-1,1], t in [0,1]
    var wf = t<0.55 ? 0.42+0.58*(t/0.55) : Math.sqrt(Math.max(0,1-Math.pow((t-0.55)/0.47,2)));
    var x=s*w/2*wf;
    var z=-cupK*w*(s*s)*(0.4+0.6*t)            // cupped across (edges lean outward)
          -curlK*h*Math.pow(t,2.6)             // lip rolls back
          +0.06*h*Math.sin(Math.PI*t);         // slight belly towards the centre
    p.setXYZ(k,x,t*h,z);
    var shade=0.4+0.6*Math.pow(t,0.55);
    col.push(shade,shade*0.97,shade*0.97);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.computeVertexNormals();
  return g;
}
/* base: radius at the photo's edge; open tilt is outward (negative), closed tilt inward */
var PHOTO_R=0.68;
var RINGS=[
  {n:5, base:0.64, w:0.66, h:0.34, cup:0.16, curl:0.10, closed:0.30, cb:0.30, ch:1.75, open:-0.22, y:0.02,  tone:1.10, off:0.0},
  {n:6, base:0.68, w:0.70, h:0.38, cup:0.16, curl:0.16, closed:0.20, cb:0.36, ch:1.60, open:-0.62, y:0.0,   tone:1.0,  off:0.5},
  {n:7, base:0.72, w:0.70, h:0.34, cup:0.14, curl:0.22, closed:0.06, cb:0.42, ch:1.70, open:-0.98, y:-0.03, tone:0.92, off:0.2},
  {n:8, base:0.74, w:0.66, h:0.30, cup:0.12, curl:0.26, closed:-0.22, cb:0.47, ch:1.75, open:-1.26, y:-0.06, tone:0.82, off:0.7}
];
var RED=lin('#C8102E'), PINK=lin('#F28CAE');
var petalMat=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
function roseCol(i,f){return new THREE.Color().copy(roses[i].red?RED:PINK).multiplyScalar(f);}
RINGS.forEach(function(R){
  R.mesh=new THREE.InstancedMesh(petalGeo(R.w,R.h,R.cup,R.curl),petalMat,N*R.n);
  R.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for(var i=0;i<N;i++) for(var j=0;j<R.n;j++) R.mesh.setColorAt(i*R.n+j,roseCol(i,R.tone*(0.94+0.06*((j*3)%4)/3)));
  bouquet.add(R.mesh);
});
// receptacle under every rose (no leaves showing through the bloom)
var recGeo=new THREE.CircleGeometry(0.8,20); recGeo.rotateX(-Math.PI/2);
var receptacle=new THREE.InstancedMesh(recGeo,new THREE.MeshLambertMaterial({side:THREE.DoubleSide}),N);
// rolled bud core, fills the centre while closed
var coreGeo=new THREE.SphereGeometry(0.11,8,6); coreGeo.scale(1,1.3,1); coreGeo.translate(0,0.42,0);
var core=new THREE.InstancedMesh(coreGeo,new THREE.MeshLambertMaterial(),N);
// sepals peeking under the outer petals
var sepShape=new THREE.Shape(); sepShape.moveTo(-0.09,0); sepShape.quadraticCurveTo(-0.07,0.25,0,0.42); sepShape.quadraticCurveTo(0.07,0.25,0.09,0);
var sepals=new THREE.InstancedMesh(new THREE.ShapeGeometry(sepShape,2),new THREE.MeshLambertMaterial({color:lin('#3C7A45'),side:THREE.DoubleSide}),N*5);
var dummy=new THREE.Object3D(), tmp=new THREE.Matrix4();
for(var i=0;i<N;i++){
  receptacle.setColorAt(i,roseCol(i,0.55)); core.setColorAt(i,roseCol(i,0.62));
  dummy.position.set(0,-0.08,0); dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1); dummy.updateMatrix();
  tmp.multiplyMatrices(roses[i].m,dummy.matrix); receptacle.setMatrixAt(i,tmp);
  for(var j=0;j<5;j++){
    var ph=roses[i].spin+j*Math.PI*2/5+0.31;
    dummy.position.set(0.62*Math.cos(ph),-0.1,0.62*Math.sin(ph));
    dummy.rotation.set(-1.32,Math.atan2(-Math.cos(ph),-Math.sin(ph)),0,'YXZ');
    dummy.updateMatrix(); tmp.multiplyMatrices(roses[i].m,dummy.matrix); sepals.setMatrixAt(i*5+j,tmp);
  }
}
bouquet.add(receptacle); bouquet.add(core); bouquet.add(sepals);
var SPIRAL=5;
var spiral=new THREE.InstancedMesh(petalGeo(0.62,0.42,0.22,0.06),petalMat,N*SPIRAL);
spiral.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
for(var i=0;i<N;i++) for(var k=0;k<SPIRAL;k++) spiral.setColorAt(i*SPIRAL+k,roseCol(i,0.62+0.07*k));
bouquet.add(spiral);

var lastOpen=-1;
function setOpen(o){
  if(Math.abs(o-lastOpen)<1e-4) return; lastOpen=o;
  RINGS.forEach(function(R,ri){
    var t=ease(clamp(o*1.35-(3-ri)*0.1,0,1));        // all roses together, outer ring leads a touch
    var tilt=lerp(R.closed,R.open,t);
    var br=lerp(R.cb,R.base,t);
    var hs=lerp(R.ch,1,t);
    var tone=lerp(0.86,1,t);
    for(var i=0;i<N;i++){
      for(var j=0;j<R.n;j++){
        var phi=roses[i].spin+R.off+j*(Math.PI*2/R.n);
        var bj=br+0.03*j*(1-t);            // petals overlap in a spiral while closed
        dummy.position.set(bj*Math.cos(phi),R.y,bj*Math.sin(phi));
        dummy.rotation.set(tilt,Math.atan2(-Math.cos(phi),-Math.sin(phi)),0,'YXZ');
        dummy.scale.set(1,hs,1);
        dummy.updateMatrix();
        tmp.multiplyMatrices(roses[i].m,dummy.matrix);
        R.mesh.setMatrixAt(i*R.n+j,tmp);
        R.mesh.setColorAt(i*R.n+j,roseCol(i,R.tone*tone*(0.94+0.06*((j*3)%4)/3)));
      }
    }
    R.mesh.instanceMatrix.needsUpdate=true; R.mesh.instanceColor.needsUpdate=true;
  });
  // spiral heart of the bud: rolled petals that unfurl and tuck away as the photo appears
  var su=ease(seg(o,0.12,0.6)), ss=Math.max(0.0001,1-su);
  for(var i=0;i<N;i++){
    for(var k=0;k<SPIRAL;k++){
      var ang=roses[i].spin+k*2.4, rk=0.04+0.05*k;
      dummy.position.set(rk*Math.cos(ang),0.12-0.012*k,rk*Math.sin(ang));
      dummy.rotation.set(lerp(0.62-0.05*k,-0.6,su),Math.atan2(-Math.cos(ang),-Math.sin(ang)),0,'YXZ');
      dummy.scale.set(ss*(0.7+0.06*k),ss*(0.95+0.07*k),ss);
      dummy.updateMatrix(); tmp.multiplyMatrices(roses[i].m,dummy.matrix); spiral.setMatrixAt(i*SPIRAL+k,tmp);
    }
  }
  spiral.instanceMatrix.needsUpdate=true;
  // sepals hug the bud, then fold down
  var st=ease(clamp(o*1.35,0,1));
  for(var i=0;i<N;i++){
    for(var j=0;j<5;j++){
      var ph=roses[i].spin+j*Math.PI*2/5+0.31, sr=lerp(0.5,0.62,st);
      dummy.position.set(sr*Math.cos(ph),-0.06,sr*Math.sin(ph));
      dummy.rotation.set(lerp(-0.85,-1.4,st),Math.atan2(-Math.cos(ph),-Math.sin(ph)),0,'YXZ');
      dummy.scale.setScalar(lerp(1.15,1,st));
      dummy.updateMatrix(); tmp.multiplyMatrices(roses[i].m,dummy.matrix); sepals.setMatrixAt(i*5+j,tmp);
    }
  }
  sepals.instanceMatrix.needsUpdate=true;
  var rs=lerp(0.72,1,st);
  for(var i=0;i<N;i++){dummy.position.set(0,lerp(0.04,-0.08,st),0);dummy.rotation.set(0,0,0);dummy.scale.set(rs,1,rs);dummy.updateMatrix();tmp.multiplyMatrices(roses[i].m,dummy.matrix);receptacle.setMatrixAt(i,tmp);}
  receptacle.instanceMatrix.needsUpdate=true;
  var cs=Math.max(0.0001,1-ease(seg(o,0.15,0.5)));
  var pe=ease(seg(o,0.3,1));
  for(var i=0;i<N;i++){
    dummy.position.set(0,0,0); dummy.rotation.set(0,0,0); dummy.scale.set(cs,cs,cs); dummy.updateMatrix();
    tmp.multiplyMatrices(roses[i].m,dummy.matrix); core.setMatrixAt(i,tmp);
  }
  core.instanceMatrix.needsUpdate=true;
  photos.forEach(function(p){ var s=lerp(0.3,1,pe); p.scale.set(s,1,s); p.position.y=lerp(0.0,0.07,pe); p.visible=pe>0.001; });
}

/* ---------- photo discs (2D, circular, set in the heart of each rose) ---------- */
var FINAL_AZ=0.32;
var discGeo=new THREE.CircleGeometry(PHOTO_R,48); discGeo.rotateX(-Math.PI/2); discGeo.rotateY(FINAL_AZ);
var ringGeo=new THREE.RingGeometry(PHOTO_R,PHOTO_R+0.035,48); ringGeo.rotateX(-Math.PI/2);
var ringMat=new THREE.MeshBasicMaterial({color:lin('#FFF3F6')});
var photos=[], loaded=0;
var loaderEl=document.getElementById('loader');
function doneOne(){ if(++loaded>=N){ loaderEl.classList.add('done'); } }
roses.forEach(function(rs,i){
  var holder=new THREE.Group(); holder.matrixAutoUpdate=false; holder.matrix.copy(rs.m); bouquet.add(holder);
  var tex=new THREE.Texture(); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=4;
  var img=new Image(); img.onload=function(){tex.image=img;tex.needsUpdate=true;doneOne();}; img.onerror=doneOne; img.src=PHOTOS[i];
  var g=new THREE.Group();
  g.add(new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({map:tex})));
  var rm=new THREE.Mesh(ringGeo,ringMat); rm.position.y=-0.004; g.add(rm);
  holder.add(g); photos.push(g);
});
setTimeout(function(){loaderEl.classList.add('done');},5000);

/* ---------- clearance: the lowest point of any rose above (x,z) ---------- */
var ROSE_DROP=0.16;
function clearY(x,z){
  var best=Infinity;
  for(var i=0;i<N;i++){
    var R0=roses[i], dx=x-R0.x, dz=z-R0.z, d=Math.hypot(dx,dz);
    if(d>RO+0.25) continue;
    var outward=Math.max(0,dx*R0.u.x+dz*R0.u.z);
    best=Math.min(best,R0.y-ROSE_DROP-outward*Math.sin(R0.tilt)-0.06);
  }
  return best;
}
var LOWEST=Infinity; roses.forEach(function(R0){LOWEST=Math.min(LOWEST,R0.y-ROSE_DROP-RO*Math.sin(R0.tilt));});

/* ---------- greenery: leaves only in the gaps, never through a rose ---------- */
var leafShape=new THREE.Shape(); leafShape.moveTo(0,0); leafShape.quadraticCurveTo(0.5,0.5,0,1.25); leafShape.quadraticCurveTo(-0.5,0.5,0,0);
var LEAF_LEN=1.25;
var leafGeo=new THREE.ShapeGeometry(leafShape,4);
(function(){var p=leafGeo.attributes.position; for(var k=0;k<p.count;k++){p.setZ(k,Math.abs(p.getX(k))*0.25);} leafGeo.computeVertexNormals();})();
var leafMat=new THREE.MeshLambertMaterial({side:THREE.DoubleSide});
var deep=lin('#244F31'), mid=lin('#356B43'), light=lin('#4C8C55');
var leafList=[];
// place one leaf (flat-ish, given yaw), dropping it until every sampled point clears the roses
function addLeaf(x,z,yaw,tilt,scale,col,floorY){
  var len=LEAF_LEN*scale, dirx=-Math.sin(yaw), dirz=-Math.cos(yaw);   // with Euler YXZ(tilt<0, yaw) the leaf points along -(sin yaw, cos yaw)
  var rise=len*Math.cos(-tilt)+0.25*0.5*scale;                        // highest point above its base
  var y=floorY;
  for(var k=0;k<=4;k++){ var f=k/4, px=x+dirx*len*f*Math.sin(-tilt), pz=z+dirz*len*f*Math.sin(-tilt);
    var c=clearY(px,pz); if(c<Infinity) y=Math.min(y,c-rise*f-0.04*(1-f)-0.03); }
  leafList.push({x:x,y:y,z:z,yaw:yaw,tilt:tilt,scale:scale,col:col});
}
// gap leaves: candidates on a fine spiral, keep those away from rose centres
for(var l=0;l<140;l++){
  var rr=0.25*Math.sqrt(l+0.5)*EDGE/Math.sqrt(140)*4, aa=l*GOLD+0.4;
  if(rr>EDGE-0.3) continue;
  var lx=rr*Math.cos(aa), lz=rr*Math.sin(aa), near=Infinity;
  for(var i=0;i<N;i++) near=Math.min(near,Math.hypot(lx-roses[i].x,lz-roses[i].z));
  if(near<RO*0.98) continue;
  addLeaf(lx,lz,aa*2.3,-1.42,0.8,l%2?deep:mid,domeY(rr)-0.25);
}
// collar: just outside the outer flowers, pointing outwards
var COLLAR=24;
for(var l=0;l<COLLAR;l++){
  var a2=l/COLLAR*Math.PI*2+0.13, rc=EDGE-0.05;
  addLeaf(rc*Math.cos(a2),rc*Math.sin(a2),Math.atan2(-Math.cos(a2),-Math.sin(a2)),-1.2,0.95+0.15*(l%3)/2,l%2?mid:light,domeY(rc)-0.2);
}
var leaves=new THREE.InstancedMesh(leafGeo,leafMat,leafList.length);
leafList.forEach(function(L,k){
  dummy.position.set(L.x,L.y,L.z); dummy.rotation.set(L.tilt,L.yaw,0,'YXZ'); dummy.scale.setScalar(L.scale); dummy.updateMatrix();
  leaves.setMatrixAt(k,dummy.matrix); leaves.setColorAt(k,L.col);
});
bouquet.add(leaves);
// dark filler deep below the flowers, level with the paper rim
var filler=new THREE.Mesh(new THREE.CylinderGeometry(EDGE+0.4,EDGE-0.6,0.5,28,1),new THREE.MeshLambertMaterial({color:lin('#1C3D27')}));
filler.position.y=1.15; bouquet.add(filler);

/* ---------- stems: one per rose, converging at the ribbon ---------- */
var stemGeo=new THREE.CylinderGeometry(0.055,0.065,1,6,1); stemGeo.translate(0,0.5,0);
var stemMat=new THREE.MeshLambertMaterial({color:lin('#4A7A3A')});
var TIE=new THREE.Vector3(0,-5.15,0), UP=new THREE.Vector3(0,1,0);
var stemsTop=new THREE.InstancedMesh(stemGeo,stemMat,N), stemsLow=new THREE.InstancedMesh(stemGeo,stemMat,N);
var cutGeo=new THREE.CircleGeometry(0.065,6); cutGeo.rotateX(Math.PI/2);
var cuts=new THREE.InstancedMesh(cutGeo,new THREE.MeshLambertMaterial({color:lin('#A9C47A'),side:THREE.DoubleSide}),N);
var stemLeafList=[];
function placeStem(mesh,k,from,to){
  var dir=new THREE.Vector3().subVectors(to,from), len=dir.length(); dir.normalize();
  var qq=new THREE.Quaternion().setFromUnitVectors(UP,dir);
  mesh.setMatrixAt(k,new THREE.Matrix4().compose(from,qq,new THREE.Vector3(1,len,1)));
}
roses.forEach(function(R0,i){
  var base=new THREE.Vector3(0,-0.12,0).applyMatrix4(R0.m);
  var tieP=TIE.clone().add(new THREE.Vector3(R0.x,0,R0.z).multiplyScalar(0.11));
  placeStem(stemsTop,i,tieP,base);
  var bot=new THREE.Vector3(R0.x*0.17,-9.6+0.06*((i*5)%3),R0.z*0.17);
  placeStem(stemsLow,i,bot,tieP);
  cuts.setMatrixAt(i,new THREE.Matrix4().makeTranslation(bot.x,bot.y,bot.z));
  if(R0.r>MAXR-0.6 && i%2===0){                       // a few leaves on outer stems, drooping outwards, below the flowers
    var at=base.clone().lerp(tieP,0.16);
    if(at.y<clearY(at.x,at.z)-0.1) stemLeafList.push({p:at,yaw:Math.atan2(-R0.u.x,-R0.u.z)});
  }
});
bouquet.add(stemsTop); bouquet.add(stemsLow); bouquet.add(cuts);
var stemLeaves=new THREE.InstancedMesh(leafGeo,leafMat,Math.max(1,stemLeafList.length));
stemLeafList.forEach(function(L,k){
  dummy.position.copy(L.p); dummy.rotation.set(-2.05,L.yaw,0,'YXZ'); dummy.scale.setScalar(0.6); dummy.updateMatrix();
  stemLeaves.setMatrixAt(k,dummy.matrix); stemLeaves.setColorAt(k,mid);
});
stemLeaves.count=stemLeafList.length; bouquet.add(stemLeaves);

/* ---------- kraft wrap: two papers, pleated, darker inside ---------- */
var RIM=EDGE+1.5, KS=RIM/7.15;
function kraftLathe(pts,rad,phiStart,phiLen,pleat,outCol,inCol){
  var g=new THREE.LatheGeometry(pts.map(function(p){return new THREE.Vector2(p[0]*rad,p[1]);}),36,phiStart,phiLen);
  var pos=g.attributes.position, topY=pts[pts.length-1][1], botY=pts[0][1];
  for(var k=0;k<pos.count;k++){
    var x=pos.getX(k),y=pos.getY(k),z=pos.getZ(k),a=Math.atan2(z,x),h=(y-botY)/(topY-botY);
    var tri=Math.abs(((a*11/Math.PI)%2+2)%2-1)*2-1;     // sharp pleats
    var f=1+pleat*tri*h*h;
    pos.setX(k,x*f); pos.setZ(k,z*f); pos.setY(k,y+0.45*Math.sin(a*7+1)*h*h*h);
  }
  g.computeVertexNormals();
  var grp=new THREE.Group();
  grp.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:lin(outCol),roughness:0.95,metalness:0,flatShading:true,side:THREE.FrontSide})));
  grp.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:lin(inCol),roughness:1,metalness:0,flatShading:true,side:THREE.BackSide})));
  return grp;
}
var WRAP=[[1.08,-5.3],[1.5,-4.4],[2.9,-2.7],[4.9,-0.9],[6.5,0.5],[7.15,1.35]].map(function(p,ix){return [ix<2?p[0]:p[0]*KS,p[1]];});
var paperA=kraftLathe(WRAP,1,0,Math.PI*2,0.06,'#C9A47A','#8E6A45');
bouquet.add(paperA);
var paperB=kraftLathe(WRAP.slice(0,5).concat([[6.55*KS,0.75]]),1.05,Math.PI*0.08,Math.PI*1.1,0.08,'#B4895B','#7E5C3B');
paperB.position.y=-0.05; bouquet.add(paperB);

/* ---------- pink ribbon + bow ---------- */
var ribbonMat=new THREE.MeshStandardMaterial({color:lin('#E85D8A'),roughness:0.45,metalness:0.05});
var band=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.2,8,28),ribbonMat); band.rotation.x=Math.PI/2; band.position.y=-5.15; band.scale.set(1,1,1.6); bouquet.add(band);
var bow=new THREE.Group(); bow.position.set(0,-5.1,1.25); bouquet.add(bow);
var loopGeo=new THREE.TorusGeometry(0.7,0.17,8,18);
[-1,1].forEach(function(sd){
  var lp=new THREE.Mesh(loopGeo,ribbonMat); lp.scale.set(1,0.55,0.45); lp.position.set(sd*0.72,0.12,0); lp.rotation.z=sd*-0.25; bow.add(lp);
  var tail=new THREE.Mesh(new THREE.BoxGeometry(0.34,1.9,0.06),ribbonMat); tail.position.set(sd*0.38,-0.95,0.05); tail.rotation.z=sd*0.32; bow.add(tail);
});
var knot=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8),ribbonMat); knot.scale.set(1,0.9,0.7); bow.add(knot);

/* ---------- camera choreography ---------- */
var W=1,H=1,D_NEAR=20,D_FAR=40,HALF_V=0;
var SIDE_TARGET_Y=-2.6, TOP_TARGET_Y=3.8, FIT_R=EDGE+0.05;
function resize(){
  W=window.innerWidth; H=window.innerHeight;
  renderer.setSize(W,H,false);
  camera.aspect=W/H; camera.updateProjectionMatrix();
  var tv=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)), th=tv*camera.aspect;
  var portrait=W<H;
  D_NEAR=FIT_R/Math.min(tv*(portrait?0.92:0.8),th)+ (portrait?0:2);
  D_FAR=Math.max(D_NEAR*2.0, 8.6/Math.min(tv,th));
  HALF_V=tv;
}
window.addEventListener('resize',resize); resize();

var target=0, prog=0, hint=document.getElementById('hint'), bg=document.getElementById('bg');
function readScroll(){
  var max=document.documentElement.scrollHeight-window.innerHeight;
  target=max>0?clamp(window.scrollY/max,0,1):0;
}
window.addEventListener('scroll',readScroll,{passive:true}); readScroll(); prog=target;

var look=new THREE.Vector3(), lastT=0;
function frame(time){
  var dt=Math.min(0.1,(time-(lastT||time))/1000); lastT=time;
  prog+= (target-prog)*(REDUCED?1:(1-Math.exp(-dt*7)));
  if(Math.abs(target-prog)<1e-4) prog=target;
  var p=prog, t=time*0.001;

  bg.style.backgroundPosition=(p*100).toFixed(2)+'% 50%';
  hint.style.opacity=String(1-seg(p,0.02,0.08));

  // stage 2: rise from below (0.10–0.40)
  var rise=ease(seg(p,0.10,0.40));
  var visHalf=D_FAR*HALF_V;
  bouquet.position.y=lerp(-(visHalf+8.0),0,rise);
  // stage 3: pan side → top-down (0.40–0.60)
  var pan=ease(seg(p,0.40,0.60));
  var elev=lerp(0.02,Math.PI/2-0.0015,pan);
  var az=FINAL_AZ*pan;
  // stage 4: dolly in (0.60–0.80)
  var dolly=ease(seg(p,0.60,0.80));
  var dist=lerp(D_FAR,D_NEAR,dolly);
  // stage 5: bloom (0.80–0.95)
  setOpen(seg(p,0.80,0.95));

  var ty=lerp(SIDE_TARGET_Y,TOP_TARGET_Y,pan);
  look.set(0,ty,0);
  camera.position.set(look.x+dist*Math.cos(elev)*Math.sin(az), look.y+dist*Math.sin(elev), look.z+dist*Math.cos(elev)*Math.cos(az));
  camera.lookAt(look);

  // leave room for the wish card on portrait screens
  var lift=ease(seg(p,0.88,0.97));
  if(lift>0){
    if(W<H) camera.setViewOffset(W,H,0,H*0.13*lift,W,H);
    else if(W>=900) camera.setViewOffset(W,H,W*0.17*lift,0,W,H);
    else camera.clearViewOffset();
  } else camera.clearViewOffset();

  // gentle sway while side-on
  var sway=REDUCED?0:(1-pan);
  bouquet.rotation.z=Math.sin(t*0.9)*0.025*sway;
  bouquet.rotation.y=Math.sin(t*0.45)*0.08*sway;

  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
