import * as T from 'three';
import {project,nearestRoad} from './geo.js';
export function makeWorld(scene,map,city){
 const ground=new T.Mesh(new T.PlaneGeometry(2800,3000),new T.MeshLambertMaterial({color:0xa6b58c}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;scene.add(ground);
 const roadMaterial=new T.MeshLambertMaterial({color:0x596362}),curbMaterial=new T.MeshLambertMaterial({color:0xc9c6ac});
 const segment=(a,b,width,y,mat)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)return;const mesh=new T.Mesh(new T.BoxGeometry(width,.08,len+.2),mat);mesh.position.set((a[0]+b[0])/2,y,(a[1]+b[1])/2);mesh.rotation.y=Math.atan2(dx,dz);scene.add(mesh);};
 for(const r of map.roads)for(let i=1;i<r.points.length;i++)segment(r.points[i-1],r.points[i],r.width+3,0,curbMaterial);
 for(const r of map.roads)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];segment(a,b,r.width,.08,roadMaterial);if(r.width>10){const l=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=4;d<l-4;d+=12){const t=d/l,u=Math.min(1,(d+4)/l);segment([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],.22,.14,new T.MeshBasicMaterial({color:0xe7dfb2}));}}}
 // Rounded joins cover gaps at bends and intersections.
 const joins=map.roads.flatMap(r=>r.points.map(p=>({p,width:r.width})));
 for(const [extra,y,mat] of [[3,.035,curbMaterial],[0,.115,roadMaterial]]){const mesh=new T.InstancedMesh(new T.CylinderGeometry(1,1,.08,12),mat,joins.length),o=new T.Object3D();joins.forEach(({p,width},i)=>{o.position.set(p[0],y,p[1]);o.scale.set((width+extra)/2,1,(width+extra)/2);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});scene.add(mesh);}
 const obstacles=[];const colors=[0xe0c5a2,0xe9dbc1,0xb9c6ba,0xc4a58c,0xd4c5af,0xc9d2c1];
 for(const b of map.buildings){const shape=new T.Shape();b.points.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));const geo=new T.ExtrudeGeometry(shape,{depth:b.height,bevelEnabled:false});geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,new T.MeshLambertMaterial({color:colors[b.id%colors.length]}));mesh.position.y=.1;scene.add(mesh);const xs=b.points.map(p=>p[0]),zs=b.points.map(p=>p[1]);obstacles.push({...b,minX:Math.min(...xs)-1.2,maxX:Math.max(...xs)+1.2,minZ:Math.min(...zs)-1.2,maxZ:Math.max(...zs)+1.2});}

 // Original stylized Independence Monument, placed at its geographic center.
 const monument=new T.Group(),[mx,mz]=project(104.9281,11.5564,city.origin);monument.position.set(mx,0,mz);
 const stone=new T.MeshLambertMaterial({color:0xb56d45});
 for(let i=0;i<4;i++){const m=new T.Mesh(new T.CylinderGeometry(9-i*1.2,10-i*1.2,1,8),stone);m.position.y=.5+i;monument.add(m);}
 for(let i=0;i<5;i++){const m=new T.Mesh(new T.CylinderGeometry(4-i*.65,5-i*.65,3,4),stone);m.position.y=5.5+i*2.4;m.rotation.y=Math.PI/4;monument.add(m);}scene.add(monument);
 // Instanced trees keep the district inexpensive to render.
 const trunk=new T.InstancedMesh(new T.CylinderGeometry(.4,.55,5,5),new T.MeshLambertMaterial({color:0x7d7050}),160);
 const crown=new T.InstancedMesh(new T.IcosahedronGeometry(3.6,0),new T.MeshLambertMaterial({color:0x547d5a}),160);
 const dummy=new T.Object3D();let count=0;
 for(let i=0;i<900&&count<160;i++){const x=((i*137.51)%1500)-750,z=((i*249.17)%1800)-900;if(nearestRoad([x,z],map.roads).distance<18||obstacles.some(b=>x>b.minX-5&&x<b.maxX+5&&z>b.minZ-5&&z<b.maxZ+5)||Math.hypot(x-mx,z-mz)<25)continue;dummy.position.set(x,2.5,z);dummy.updateMatrix();trunk.setMatrixAt(count,dummy.matrix);dummy.position.y=6.5;dummy.updateMatrix();crown.setMatrixAt(count++,dummy.matrix);}
 trunk.count=crown.count=count;scene.add(trunk,crown);

 // Simple spatial hash keeps collision queries local even with thousands of footprints.
 const grid=new Map();for(const b of obstacles)for(let x=Math.floor(b.minX/40);x<=Math.floor(b.maxX/40);x++)for(let z=Math.floor(b.minZ/40);z<=Math.floor(b.maxZ/40);z++){const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);}
 function inside(x,z,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
 const [west,south,east,north]=city.bounds, min=project(west,north,city.origin),max=project(east,south,city.origin);
 return {collides(x,z){if(x<min[0]+3||x>max[0]-3||z<min[1]+3||z>max[1]-3)return true;return (grid.get(`${Math.floor(x/40)},${Math.floor(z/40)}`)||[]).some(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&(inside(x,z,b.points)||b.points.some((a,i)=>{const c=b.points[(i+1)%b.points.length],dx=c[0]-a[0],dz=c[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<1.5;})));}};
}
export function taxi(){const group=new T.Group();const box=(w,h,d,x,y,z,color)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshLambertMaterial({color}));m.position.set(x,y,z);group.add(m);};box(1.9,.7,4,0,.9,0,0xe6b84e);box(1.65,.75,2,0,1.6,-.2,0x285054);box(1.7,.1,2.05,0,2,-.2,0xe6b84e);box(.8,.22,.45,0,2.2,-.2,0xf8f2cb);for(const x of [-.97,.97])for(const z of [-1.25,1.25]){const w=new T.Mesh(new T.CylinderGeometry(.4,.4,.22,12),new T.MeshLambertMaterial({color:0x25312f}));w.rotation.z=Math.PI/2;w.position.set(x,.45,z);group.add(w);}for(const x of [-.65,.65]){box(.4,.23,.08,x,.95,2.03,0xffefb0);box(.4,.2,.08,x,.95,-2.03,0xd5533e);}return group;}
