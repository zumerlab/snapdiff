/*
* snapDiff
* v0.3.1
* Author: Juan Martin Muda
* License: MIT
*/
function z(a,t,e){return a*.29889531+t*.58662247+e*.11448223}function U(a,t,e){return a*.59597799-t*.2741761-e*.32180189}function F(a,t,e){return a*.21147017-t*.52261711+e*.31114694}function Q(a,t,e,n,r){let s=a[e],l=a[e+1],u=a[e+2],c=a[e+3],i=t[n],m=t[n+1],p=t[n+2],g=t[n+3];if(c===g&&s===i&&l===m&&u===p)return 0;c<255&&(c/=255,s=C(s,c),l=C(l,c),u=C(u,c)),g<255&&(g/=255,i=C(i,g),m=C(m,g),p=C(p,g));let x=z(s,l,u),w=z(i,m,p),b=x-w;if(r)return b;let o=U(s,l,u)-U(i,m,p),d=F(s,l,u)-F(i,m,p),h=.5053*b*b+.299*o*o+.1957*d*d;return x>w?-h:h}function C(a,t){return 255+(a-255)*t}function X(a,t,e,n,r,s){let l=Math.max(t-1,0),u=Math.max(e-1,0),c=Math.min(t+1,n-1),i=Math.min(e+1,r-1),m=(e*n+t)*4,p=t===l||t===c||e===u||e===i?1:0,g=0,x=0,w=0,b=0,o=0,d=0;for(let h=l;h<=c;h++)for(let y=u;y<=i;y++){if(h===t&&y===e)continue;let v=Q(a,a,m,(y*n+h)*4,!0);if(v===0){if(++p>2)return!1}else v<g?(g=v,w=h,b=y):v>x&&(x=v,o=h,d=y)}return g===0||x===0?!1:L(a,w,b,n,r)&&L(s,w,b,n,r)||L(a,o,d,n,r)&&L(s,o,d,n,r)}function L(a,t,e,n,r){let s=Math.max(t-1,0),l=Math.max(e-1,0),u=Math.min(t+1,n-1),c=Math.min(e+1,r-1),i=(e*n+t)*4,m=t===s||t===u||e===l||e===c?1:0;for(let p=s;p<=u;p++)for(let g=l;g<=c;g++){if(p===t&&g===e)continue;let x=(g*n+p)*4;if(a[i]===a[x]&&a[i+1]===a[x+1]&&a[i+2]===a[x+2]&&a[i+3]===a[x+3]&&++m>2)return!0}return!1}function T(a,t,e,n,r){a[t]=e,a[t+1]=n,a[t+2]=r,a[t+3]=255}function H(a,t,e,n){let r=a[t],s=a[t+1],l=a[t+2],u=C(z(r,s,l),e*a[t+3]/255);T(n,t,u,u,u)}function W(a,t,e,n,r,s={}){if(a.length!==t.length)throw new Error("Image data must have the same dimensions");let l=s.threshold??.1,u=!!s.includeAA,c=s.alpha??.1,i=s.aaColor??[255,255,0],m=s.diffColor??[255,0,0],p=!!s.diffMask,g=35215*l*l,x=n*r,w=0;if(a.length===t.length){let b=!0;for(let o=0;o<a.length;o++)if(a[o]!==t[o]){b=!1;break}if(b){if(e&&!p)for(let o=0;o<x*4;o+=4)H(a,o,c,e);return{diff:0,total:x,ratio:0}}}for(let b=0;b<r;b++)for(let o=0;o<n;o++){let d=(b*n+o)*4,h=Q(a,t,d,d,!1);Math.abs(h)>g?!u&&(X(a,o,b,n,r,t)||X(t,o,b,n,r,a))?e&&!p&&T(e,d,i[0],i[1],i[2]):(e&&T(e,d,m[0],m[1],m[2]),w++):e&&!p&&H(a,d,c,e)}return{diff:w,total:x,ratio:w/x}}function j(a,t,e={}){let n=Math.max(a.width,t.width),r=Math.max(a.height,t.height),s=a.width===t.width&&a.height===t.height,l=Y(a,n,r),u=Y(t,n,r),c=document.createElement("canvas");c.width=n,c.height=r;let i=c.getContext("2d"),m=i.createImageData(n,r),p=W(l,u,m.data,n,r,e);return i.putImageData(m,0,0),{...p,width:n,height:r,dimsMatch:s,canvas:c}}function Y(a,t,e){if(a.width===t&&a.height===e)return a.getContext("2d").getImageData(0,0,t,e).data;let n=document.createElement("canvas");n.width=t,n.height=e;let r=n.getContext("2d");return r.drawImage(a,0,0),r.getImageData(0,0,t,e).data}var at="snapDiff";var D="baselines";function R(){return new Promise((a,t)=>{let e=indexedDB.open(at,1);e.onupgradeneeded=()=>{let n=e.result;n.objectStoreNames.contains(D)||n.createObjectStore(D,{keyPath:"name"})},e.onsuccess=()=>a(e.result),e.onerror=()=>t(e.error)})}function A(a,t){return a.transaction(D,t).objectStore(D)}function M(a){return new Promise((t,e)=>{a.onsuccess=()=>t(a.result),a.onerror=()=>e(a.error)})}var S=class{constructor(t="default"){this.namespace=t}async _key(t){return`${this.namespace}::${t}`}async put(t,e,n={}){let r=await R(),s={name:await this._key(t),displayName:t,namespace:this.namespace,blob:e,width:n.width,height:n.height,createdAt:Date.now(),metadata:n.metadata??{}};return await M(A(r,"readwrite").put(s)),r.close(),s}async get(t){let e=await R(),n=await M(A(e,"readonly").get(await this._key(t)));return e.close(),n??null}async delete(t){let e=await R();await M(A(e,"readwrite").delete(await this._key(t))),e.close()}async list(){let t=await R(),e=await M(A(t,"readonly").getAll());return t.close(),e.filter(n=>n.namespace===this.namespace)}async clear(){let t=await this.list();for(let e of t)await this.delete(e.displayName)}async export(){let t=await this.list(),e=await Promise.all(t.map(async n=>({name:n.displayName,width:n.width,height:n.height,createdAt:n.createdAt,metadata:n.metadata,data:await nt(n.blob)})));return{namespace:this.namespace,items:e,exportedAt:Date.now()}}async import(t,{overwrite:e=!1}={}){if(!t?.items)throw new Error("Invalid bundle");let n=0,r=0;for(let s of t.items){if(!e&&await this.get(s.name)){r++;continue}let l=await rt(s.data);await this.put(s.name,l,{width:s.width,height:s.height,metadata:s.metadata}),n++}return{added:n,skipped:r}}};async function q(a,t="image/png",e){return new Promise((n,r)=>{a.toBlob(s=>s?n(s):r(new Error("toBlob failed")),t,e)})}async function N(a){let t=URL.createObjectURL(a);try{let e=new Image;e.decoding="sync",e.src=t,await e.decode();let n=document.createElement("canvas");return n.width=e.naturalWidth,n.height=e.naturalHeight,n.getContext("2d").drawImage(e,0,0),n}finally{URL.revokeObjectURL(t)}}function nt(a){return new Promise((t,e)=>{let n=new FileReader;n.onload=()=>t(n.result),n.onerror=()=>e(n.error),n.readAsDataURL(a)})}async function rt(a){return(await fetch(a)).blob()}var st={dpr:1,scale:1,embedFonts:!0,invalidate:!0};async function J(a,t,e={}){let n={...e};for(let[s,l]of Object.entries(st))n[s]??=l;return await(await a(t,n)).toCanvas({canvas:null})}function I(a={}){let{snapdom:t,namespace:e="default",threshold:n=.1,failureRatio:r=0,includeAA:s=!1,snapdomOptions:l={}}=a;if(!t)throw new Error("createRunner requires { snapdom }");let u=a.store??new S(e),c=[];function i(o,d,h={}){if(c.find(y=>y.name===o))throw new Error(`Duplicate test name: ${o}`);c.push({name:o,fn:d,options:h})}async function m(o){let d=await o.fn();if(d instanceof HTMLCanvasElement)return d;if(d instanceof Element){let h={...l,...o.options.snapdom??{}};return await J(t,d,h)}throw new Error(`Test "${o.name}" must return an Element or HTMLCanvasElement`)}async function p(o){let d=performance.now();try{let h=await m(o),y=await u.get(o.name);if(!y)return{name:o.name,status:"new",actual:h,duration:performance.now()-d};let v=await N(y.blob),_={threshold:o.options.threshold??n,includeAA:o.options.includeAA??s},k=j(v,h,_),tt=o.options.failureRatio??r,et=!k.dimsMatch||k.ratio>tt;return{name:o.name,status:et?"fail":"pass",diff:k.diff,ratio:k.ratio,dimsMatch:k.dimsMatch,baseline:v,actual:h,diffCanvas:k.canvas,duration:performance.now()-d}}catch(h){return{name:o.name,status:"error",error:h,duration:performance.now()-d}}}async function g({filter:o,onProgress:d}={}){let h=o?c.filter(v=>o(v.name)):c,y=[];for(let v=0;v<h.length;v++){let _=await p(h[v]);y.push(_),d&&d({index:v,total:h.length,result:_})}return y}async function x(o,d){if(d||(d=(await p(c.find(v=>v.name===o))).actual),!d)throw new Error(`No actual canvas to approve for "${o}"`);let h=await q(d);await u.put(o,h,{width:d.width,height:d.height})}async function w(o){let d=o.filter(h=>h.status==="new"||h.status==="fail");for(let h of d)await x(h.name,h.actual);return d.length}function b(o){return{total:o.length,pass:o.filter(d=>d.status==="pass").length,fail:o.filter(d=>d.status==="fail").length,new:o.filter(d=>d.status==="new").length,error:o.filter(d=>d.status==="error").length}}return{test:i,run:g,approve:x,approveAll:w,summary:b,store:u,tests:c}}var ot=`
.sv-root, .sv-root * { box-sizing: border-box; }
.sv-root {
  position: fixed; inset: 0; z-index: 2147483600;
  background: #0e1116; color: #e6e8eb;
  font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  display: grid; grid-template-rows: auto 1fr; overflow: hidden;
}
.sv-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; background: #161a21;
  border-bottom: 1px solid #232832;
}
.sv-bar h1 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: .02em; }
.sv-bar .sv-spacer { flex: 1; }
.sv-bar button {
  background: #1c2230; color: #e6e8eb; border: 1px solid #2c3445;
  padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
}
.sv-bar button:hover { background: #232b3d; }
.sv-bar button.sv-primary { background: #2f6df6; border-color: #2f6df6; color: white; }
.sv-bar button.sv-primary:hover { background: #4a82f8; }
.sv-bar button.sv-danger { color: #ff6e7a; border-color: #4a2730; }

.sv-stats { display: flex; gap: 8px; font-size: 12px; }
.sv-pill {
  padding: 2px 8px; border-radius: 999px; font-weight: 600;
  background: #1c2230; border: 1px solid #2c3445;
}
.sv-pill.pass { color: #6cd4a3; border-color: #244437; }
.sv-pill.fail { color: #ff6e7a; border-color: #4a2730; }
.sv-pill.new  { color: #f0c419; border-color: #4a4225; }
.sv-pill.error{ color: #ff8a3d; border-color: #4a3122; }

.sv-body { display: grid; grid-template-columns: 280px 1fr; overflow: hidden; }
.sv-list { overflow-y: auto; border-right: 1px solid #232832; background: #0b0e13; }
.sv-item {
  padding: 10px 14px; border-bottom: 1px solid #161a21; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
}
.sv-item:hover { background: #131822; }
.sv-item.sv-selected { background: #19233a; }
.sv-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.sv-dot.pass { background: #6cd4a3; }
.sv-dot.fail { background: #ff6e7a; }
.sv-dot.new  { background: #f0c419; }
.sv-dot.error{ background: #ff8a3d; }
.sv-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-ratio { font-variant-numeric: tabular-nums; opacity: .65; font-size: 11px; }

.sv-detail { display: flex; flex-direction: column; overflow: hidden; }
.sv-detail-bar {
  display: flex; gap: 6px; padding: 10px 14px;
  background: #11151c; border-bottom: 1px solid #232832; align-items: center;
}
.sv-mode { display: flex; background: #0b0e13; border: 1px solid #2c3445; border-radius: 6px; overflow: hidden; }
.sv-mode button { background: transparent; border: 0; border-radius: 0; padding: 6px 10px; }
.sv-mode button.sv-active { background: #2f6df6; color: white; }
.sv-detail-bar .sv-spacer { flex: 1; }

.sv-stage {
  flex: 1; overflow: auto; padding: 18px;
  background:
    linear-gradient(45deg, #161a21 25%, transparent 25%) 0 0/16px 16px,
    linear-gradient(-45deg, #161a21 25%, transparent 25%) 0 8px/16px 16px,
    linear-gradient(45deg, transparent 75%, #161a21 75%) 8px -8px/16px 16px,
    linear-gradient(-45deg, transparent 75%, #161a21 75%) -8px 0/16px 16px,
    #0e1116;
  display: flex; align-items: flex-start; justify-content: center;
}
.sv-canvases { display: flex; gap: 12px; align-items: flex-start; }
.sv-canvas-wrap { display: flex; flex-direction: column; gap: 6px; }
.sv-canvas-wrap span { font-size: 11px; opacity: .7; text-align: center; }
.sv-canvas-wrap canvas, .sv-canvas-wrap img {
  display: block; max-width: 100%; box-shadow: 0 6px 20px rgba(0,0,0,.4);
  background: white;
}
.sv-slider {
  position: relative; display: inline-block; user-select: none;
  box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white;
}
.sv-slider .sv-layer {
  position: absolute; top: 0; left: 0; height: 100%;
  overflow: hidden;
}
.sv-slider .sv-handle {
  position: absolute; top: 0; bottom: 0; width: 2px; background: #2f6df6;
  cursor: ew-resize;
}
.sv-slider .sv-handle::after {
  content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 24px; height: 24px; background: #2f6df6; border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
}
.sv-empty { padding: 24px; opacity: .6; }
.sv-error { padding: 16px; background: #2a1418; color: #ffb1b8; border-radius: 8px; white-space: pre-wrap; }

.sv-meta { font-size: 11px; opacity: .65; padding: 8px 14px; border-top: 1px solid #232832; }
`,V=!1;function it(){if(V)return;let a=document.createElement("style");a.textContent=ot,document.head.appendChild(a),V=!0}var $=class{constructor(t,e={}){this.runner=t,this.results=[],this.selected=null,this.mode=e.mode??"split",this.root=null,this.onClose=e.onClose}mount(t=document.body){return it(),this.root&&this.unmount(),this.root=document.createElement("div"),this.root.className="sv-root",t.appendChild(this.root),this._render(),this}unmount(){this.root?.remove(),this.root=null}setResults(t){if(this.results=t,!this.selected||!t.find(e=>e.name===this.selected)){let e=t.find(n=>n.status==="fail"||n.status==="new"||n.status==="error");this.selected=(e??t[0])?.name??null}this._render()}async _rerunSingle(t,e){await e();let n=await this.runner.run({filter:s=>s===t.name}),r=this.results.findIndex(s=>s.name===t.name);r>=0&&n[0]&&(this.results[r]=n[0]),this._render()}async runAndShow(t){this._renderEmpty("Running tests\u2026");let e=await this.runner.run({filter:t,onProgress:({index:n,total:r,result:s})=>{this._renderEmpty(`Running ${n+1}/${r} \u2014 ${s.name} (${s.status})`)}});return this.setResults(e),e}_renderEmpty(t){this.root&&(this.root.innerHTML=`
      <div class="sv-bar"><h1>snapDiff</h1><div class="sv-spacer"></div></div>
      <div class="sv-empty">${dt(t)}</div>`)}_render(){if(!this.root)return;let t=this.results,e=this.runner.summary(t);this.root.innerHTML="",this.root.appendChild(this._renderBar(e));let n=f("div","sv-body");n.appendChild(this._renderList()),n.appendChild(this._renderDetail()),this.root.appendChild(n)}_renderBar(t){let e=f("div","sv-bar"),n=f("h1");n.textContent="snapDiff",e.appendChild(n);let r=f("div","sv-stats");for(let i of["pass","fail","new","error"]){if(t[i]===0)continue;let m=f("span",`sv-pill ${i}`);m.textContent=`${t[i]} ${i}`,r.appendChild(m)}e.appendChild(r),e.appendChild(f("div","sv-spacer"));let s=f("button");s.textContent="Re-run all",s.onclick=()=>this.runAndShow(),e.appendChild(s);let l=f("button","sv-primary");l.textContent="Approve all changes",l.onclick=async()=>{await this.runner.approveAll(this.results)&&await this.runAndShow()},e.appendChild(l);let u=f("button");u.textContent="Export",u.onclick=async()=>{let i=await this.runner.store.export(),m=new Blob([JSON.stringify(i,null,2)],{type:"application/json"}),p=document.createElement("a");p.href=URL.createObjectURL(m),p.download=`snapdiff-${this.runner.store.namespace}.json`,p.click(),URL.revokeObjectURL(p.href)},e.appendChild(u);let c=f("button");if(c.textContent="Import",c.onclick=()=>{let i=document.createElement("input");i.type="file",i.accept="application/json,.json",i.onchange=async()=>{let m=i.files?.[0];if(m)try{let p=JSON.parse(await m.text()),{added:g,skipped:x}=await this.runner.store.import(p,{overwrite:!0});console.log(`[snapDiff] imported ${g} baseline(s), skipped ${x}`),await this.runAndShow()}catch(p){alert(`Import failed: ${p.message}`)}},i.click()},e.appendChild(c),this.onClose){let i=f("button");i.textContent="\u2715",i.onclick=()=>{this.unmount(),this.onClose()},e.appendChild(i)}return e}_renderList(){let t=f("div","sv-list");if(!this.results.length){let e=f("div","sv-empty");return e.textContent="No results yet.",t.appendChild(e),t}for(let e of this.results){let n=f("div","sv-item"+(e.name===this.selected?" sv-selected":""));n.appendChild(f("div",`sv-dot ${e.status}`));let r=f("div","sv-name");r.textContent=e.name,n.appendChild(r);let s=f("div","sv-ratio");e.status==="fail"||e.status==="pass"?s.textContent=G(e.ratio):e.status==="new"?s.textContent="new":e.status==="error"&&(s.textContent="err"),n.appendChild(s),n.onclick=()=>{this.selected=e.name,this._render()},t.appendChild(n)}return t}_renderDetail(){let t=f("div","sv-detail"),e=this.results.find(r=>r.name===this.selected);if(!e)return t.appendChild(f("div","sv-empty")).textContent="Select a test to view details.",t;t.appendChild(this._renderDetailBar(e));let n=f("div","sv-stage");if(e.status==="error"){let r=f("div","sv-error");r.textContent=e.error?.stack||String(e.error),n.appendChild(r)}else if(e.status==="new")n.appendChild(this._wrapCanvas(e.actual,"actual (no baseline)"));else if(this.mode==="split"){let r=f("div","sv-canvases");r.appendChild(this._wrapCanvas(e.baseline,"baseline")),r.appendChild(this._wrapCanvas(e.actual,"actual")),r.appendChild(this._wrapCanvas(e.diffCanvas,"diff")),n.appendChild(r)}else this.mode==="slider"?n.appendChild(this._renderSlider(e)):this.mode==="diff"&&n.appendChild(this._wrapCanvas(e.diffCanvas,"diff"));return t.appendChild(n),t.appendChild(this._renderMeta(e)),t}_renderDetailBar(t){let e=f("div","sv-detail-bar"),n=f("div","sv-mode");for(let r of["split","slider","diff"]){let s=f("button",this.mode===r?"sv-active":"");s.textContent=r,s.onclick=()=>{this.mode=r,this._render()},n.appendChild(s)}if(e.appendChild(n),e.appendChild(f("div","sv-spacer")),t.status==="fail"||t.status==="new"){let r=f("button","sv-primary");r.textContent=t.status==="new"?"Save baseline":"Approve as new baseline",r.onclick=()=>this._rerunSingle(t,()=>this.runner.approve(t.name,t.actual)),e.appendChild(r)}if(t.status!=="new"){let r=f("button","sv-danger");r.textContent="Delete baseline",r.onclick=()=>this._rerunSingle(t,()=>this.runner.store.delete(t.name)),e.appendChild(r)}return e}_wrapCanvas(t,e){let n=f("div","sv-canvas-wrap"),r=document.createElement("canvas");r.width=t.width,r.height=t.height,r.getContext("2d").drawImage(t,0,0),n.appendChild(r);let s=f("span");return s.textContent=e,n.appendChild(s),n}_renderSlider(t){let e=Math.max(t.baseline.width,t.actual.width),n=Math.max(t.baseline.height,t.actual.height),r=f("div","sv-slider");r.style.width=e+"px",r.style.height=n+"px";let s=K(t.baseline);s.style.display="block",r.appendChild(s);let l=f("div","sv-layer");l.style.width="50%";let u=K(t.actual);u.style.width=e+"px",u.style.height=n+"px",l.appendChild(u),r.appendChild(l);let c=f("div","sv-handle");c.style.left="50%",r.appendChild(c);let i=!1,m=p=>{if(!i&&p.type!=="click")return;let g=r.getBoundingClientRect(),w=Math.min(Math.max(0,(p.clientX??p.touches?.[0]?.clientX)-g.left),g.width)/g.width*100;l.style.width=w+"%",c.style.left=w+"%"};return c.addEventListener("mousedown",()=>i=!0),window.addEventListener("mouseup",()=>i=!1),window.addEventListener("mousemove",m),r.addEventListener("click",m),r}_renderMeta(t){let e=f("div","sv-meta"),n=[`status: ${t.status}`,`duration: ${t.duration.toFixed(0)}ms`];return t.ratio!=null&&n.push(`mismatch: ${G(t.ratio)} (${t.diff} px)`),t.dimsMatch===!1&&n.push("dims differ"),e.textContent=n.join("  \xB7  "),e}};function f(a,t){let e=document.createElement(a);return t&&(e.className=t),e}function dt(a){return String(a).replace(/[&<>]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[t])}function G(a){return a===0?"0%":a<1e-4?"<0.01%":(a*100).toFixed(2)+"%"}function K(a){let t=new Image;return t.src=a.toDataURL(),t}var lt=`
  :root { color-scheme: dark; }
  body { margin: 0; background: #0e1116; color: #e6e8eb; font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  header { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid #232832; background: #161a21; position: sticky; top: 0; z-index: 10; }
  header h1 { margin: 0; font-size: 14px; letter-spacing: .02em; }
  header .meta { opacity: .6; font-size: 11px; }
  header .spacer { flex: 1; }
  header input[type="search"] { background: #0b0e13; border: 1px solid #2c3445; color: #e6e8eb; padding: 6px 10px; border-radius: 6px; min-width: 220px; }
  .pill { padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; background: #1c2230; border: 1px solid #2c3445; }
  .pill.pass { color: #6cd4a3; border-color: #244437; }
  .pill.fail { color: #ff6e7a; border-color: #4a2730; }
  .pill.new  { color: #f0c419; border-color: #4a4225; }
  .pill.error{ color: #ff8a3d; border-color: #4a3122; }
  .filter button { background: transparent; border: 1px solid #2c3445; color: inherit; padding: 4px 10px; border-radius: 6px; font: inherit; cursor: pointer; }
  .filter button.active { background: #2f6df6; border-color: #2f6df6; color: white; }
  main { padding: 18px; display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); max-width: 1400px; margin: 0 auto; }
  .card { background: #161a21; border: 1px solid #232832; border-radius: 10px; overflow: hidden; }
  .card.hidden { display: none; }
  .card header { background: transparent; border: 0; padding: 14px 18px; cursor: pointer; }
  .card header h2 { font-size: 14px; margin: 0; flex: 1; }
  .card .body { display: none; padding: 0 18px 18px; }
  .card.open .body { display: block; }
  .card .meta { font-size: 11px; opacity: .65; }
  .modes { display: flex; gap: 4px; margin-bottom: 12px; }
  .modes button { background: #0b0e13; border: 1px solid #2c3445; color: inherit; padding: 4px 10px; border-radius: 6px; font: inherit; cursor: pointer; }
  .modes button.active { background: #2f6df6; border-color: #2f6df6; color: white; }
  .stage { background:
    linear-gradient(45deg, #161a21 25%, transparent 25%) 0 0/16px 16px,
    linear-gradient(-45deg, #161a21 25%, transparent 25%) 0 8px/16px 16px,
    linear-gradient(45deg, transparent 75%, #161a21 75%) 8px -8px/16px 16px,
    linear-gradient(-45deg, transparent 75%, #161a21 75%) -8px 0/16px 16px,
    #0b0e13;
    padding: 16px; border-radius: 8px; overflow: auto; }
  .row { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .row > figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .row figcaption { font-size: 11px; opacity: .65; text-align: center; }
  .row img { display: block; max-width: 100%; box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white; }
  .slider { position: relative; display: inline-block; user-select: none; box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white; }
  .slider .layer { position: absolute; top: 0; left: 0; height: 100%; overflow: hidden; }
  .slider .handle { position: absolute; top: 0; bottom: 0; width: 2px; background: #2f6df6; cursor: ew-resize; }
  .slider .handle::after { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background: #2f6df6; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
  pre.error { background: #2a1418; color: #ffb1b8; padding: 12px; border-radius: 8px; white-space: pre-wrap; font-size: 12px; }
`,ct=`
  document.querySelectorAll('.card').forEach(card => {
    const head = card.querySelector('header')
    head.addEventListener('click', () => card.classList.toggle('open'))
    card.querySelectorAll('.modes button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const mode = btn.dataset.mode
        card.querySelectorAll('.modes button').forEach(b => b.classList.toggle('active', b === btn))
        card.querySelectorAll('[data-view]').forEach(v => v.style.display = v.dataset.view === mode ? '' : 'none')
        if (mode === 'slider') initSlider(card)
      })
    })
  })

  function initSlider(card) {
    const slider = card.querySelector('.slider')
    if (!slider || slider.dataset.init) return
    slider.dataset.init = '1'
    const layer = slider.querySelector('.layer')
    const handle = slider.querySelector('.handle')
    let dragging = false
    const move = e => {
      if (!dragging && e.type !== 'click') return
      const rect = slider.getBoundingClientRect()
      const x = Math.min(Math.max(0, (e.clientX ?? e.touches?.[0]?.clientX) - rect.left), rect.width)
      const pct = (x / rect.width) * 100
      layer.style.width = pct + '%'
      handle.style.left = pct + '%'
    }
    handle.addEventListener('mousedown', () => dragging = true)
    window.addEventListener('mouseup', () => dragging = false)
    window.addEventListener('mousemove', move)
    slider.addEventListener('click', move)
  }

  const search = document.getElementById('search')
  const buttons = document.querySelectorAll('.filter button')
  let activeStatus = 'all'
  function applyFilter() {
    const q = search.value.toLowerCase()
    document.querySelectorAll('.card').forEach(c => {
      const matchStatus = activeStatus === 'all' || c.dataset.status === activeStatus
      const matchQuery = !q || c.dataset.name.toLowerCase().includes(q)
      c.classList.toggle('hidden', !(matchStatus && matchQuery))
    })
  }
  search.addEventListener('input', applyFilter)
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.classList.toggle('active', x === b))
    activeStatus = b.dataset.status
    applyFilter()
  }))

  document.querySelectorAll('.card[data-status="fail"], .card[data-status="error"]').forEach(c => c.classList.add('open'))
`;function pt({title:a="snapDiff report",results:t=[],generatedAt:e=Date.now(),baseDir:n="."}={}){let r=ut(t),s=t.map(u=>ft(u,n)).join(`
`),l=new Date(e).toISOString().replace("T"," ").slice(0,19);return`<!doctype html>
<html><head><meta charset="utf-8" /><title>${E(a)}</title>
<style>${lt}</style></head>
<body>
<header>
  <h1>${E(a)}</h1>
  <span class="meta">${l} \xB7 ${t.length} tests</span>
  <span class="spacer"></span>
  ${B("pass",r.pass)}
  ${B("fail",r.fail)}
  ${B("new",r.new)}
  ${B("error",r.error)}
  <span class="filter" style="display:flex;gap:4px">
    <button data-status="all" class="active">all</button>
    <button data-status="fail">fail</button>
    <button data-status="new">new</button>
    <button data-status="pass">pass</button>
  </span>
  <input id="search" type="search" placeholder="Filter by name\u2026" />
</header>
<main>${s||'<p style="opacity:.6;padding:32px">No results.</p>'}</main>
<script>${ct}<\/script>
</body></html>`}function ut(a){return{pass:a.filter(t=>t.status==="pass").length,fail:a.filter(t=>t.status==="fail").length,new:a.filter(t=>t.status==="new").length,error:a.filter(t=>t.status==="error").length}}function B(a,t){return t?`<span class="pill ${a}">${t} ${a}</span>`:""}function ft(a,t){let e=a.ratio!=null?`${(a.ratio*100).toFixed(2)}% (${a.diff} px)`:"",n=a.paths?.baseline?P(a.paths.baseline,t):"",r=a.paths?.actual?P(a.paths.actual,t):"",s=a.paths?.diff?P(a.paths.diff,t):"",l=a.dimsMatch===!1?" \xB7 <strong>dimensions differ</strong>":"";return`
<section class="card" data-status="${a.status}" data-name="${E(a.name)}">
  <header>
    <span class="pill ${a.status}">${a.status}</span>
    <h2>${E(a.name)}</h2>
    <span class="meta">${e}${l}</span>
  </header>
  <div class="body">
    ${a.error?`<pre class="error">${E(a.error)}</pre>`:""}
    <div class="modes">
      <button data-mode="split" class="active">split</button>
      ${n&&r?'<button data-mode="slider">slider</button>':""}
      ${s?'<button data-mode="diff">diff only</button>':""}
    </div>
    <div class="stage">
      <div class="row" data-view="split">
        ${n?O("baseline",n):""}
        ${r?O("actual",r):""}
        ${s?O("diff",s):""}
      </div>
      ${n&&r?`<div data-view="slider" style="display:none">
        ${ht(n,r)}
      </div>`:""}
      ${s?`<div data-view="diff" style="display:none"><img src="${s}" alt="diff" /></div>`:""}
    </div>
  </div>
</section>`}function O(a,t){return`<figure><img src="${t}" alt="${a}" /><figcaption>${a}</figcaption></figure>`}function ht(a,t){return`<div class="slider">
    <img src="${a}" alt="baseline" />
    <div class="layer" style="width:50%"><img src="${t}" alt="actual" /></div>
    <div class="handle" style="left:50%"></div>
  </div>`}function P(a,t){let e=String(a).replace(/\\/g,"/"),n=String(t).replace(/\\/g,"/").replace(/\/$/,"");return n&&e.startsWith(n+"/")?e.slice(n.length+1):e}function E(a){return String(a??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}async function Z(a){let t=I(a);a.tests({test:t.test});let e=a.report!==!1?new $(t):null;if(e&&e.mount(),a.autoRun!==!1)if(e)await e.runAndShow();else return await t.run();return{runner:t,reporter:e}}Z.createRunner=I;Z.Reporter=$;export{S as BaselineStore,$ as Reporter,N as blobToCanvas,q as canvasToBlob,I as createRunner,j as diffCanvas,W as diffPixels,pt as generateStaticReport,Z as snapDiff};
