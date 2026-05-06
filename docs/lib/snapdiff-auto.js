/*
* snapDiff
* v0.2.0
* Author: Juan Martin Muda
* License: MIT
*/
var snapDiffAuto=(()=>{var $=Object.defineProperty;var Z=Object.getOwnPropertyDescriptor;var tt=Object.getOwnPropertyNames;var et=Object.prototype.hasOwnProperty;var nt=(a,t)=>{for(var e in t)$(a,e,{get:t[e],enumerable:!0})},at=(a,t,e,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of tt(t))!et.call(a,s)&&s!==e&&$(a,s,{get:()=>t[s],enumerable:!(n=Z(t,s))||n.enumerable});return a};var st=a=>at($({},"__esModule",{value:!0}),a);var xt={};nt(xt,{bootstrap:()=>G});var ot="snapDiff";var D="baselines";function S(){return new Promise((a,t)=>{let e=indexedDB.open(ot,1);e.onupgradeneeded=()=>{let n=e.result;n.objectStoreNames.contains(D)||n.createObjectStore(D,{keyPath:"name"})},e.onsuccess=()=>a(e.result),e.onerror=()=>t(e.error)})}function A(a,t){return a.transaction(D,t).objectStore(D)}function E(a){return new Promise((t,e)=>{a.onsuccess=()=>t(a.result),a.onerror=()=>e(a.error)})}var R=class{constructor(t="default"){this.namespace=t}async _key(t){return`${this.namespace}::${t}`}async put(t,e,n={}){let s=await S(),o={name:await this._key(t),displayName:t,namespace:this.namespace,blob:e,width:n.width,height:n.height,createdAt:Date.now(),metadata:n.metadata??{}};return await E(A(s,"readwrite").put(o)),s.close(),o}async get(t){let e=await S(),n=await E(A(e,"readonly").get(await this._key(t)));return e.close(),n??null}async delete(t){let e=await S();await E(A(e,"readwrite").delete(await this._key(t))),e.close()}async list(){let t=await S(),e=await E(A(t,"readonly").getAll());return t.close(),e.filter(n=>n.namespace===this.namespace)}async clear(){let t=await this.list();for(let e of t)await this.delete(e.displayName)}async export(){let t=await this.list(),e=await Promise.all(t.map(async n=>({name:n.displayName,width:n.width,height:n.height,createdAt:n.createdAt,metadata:n.metadata,data:await rt(n.blob)})));return{namespace:this.namespace,items:e,exportedAt:Date.now()}}async import(t,{overwrite:e=!1}={}){if(!t?.items)throw new Error("Invalid bundle");let n=0,s=0;for(let o of t.items){if(!e&&await this.get(o.name)){s++;continue}let l=await it(o.data);await this.put(o.name,l,{width:o.width,height:o.height,metadata:o.metadata}),n++}return{added:n,skipped:s}}};async function j(a,t="image/png",e){return new Promise((n,s)=>{a.toBlob(o=>o?n(o):s(new Error("toBlob failed")),t,e)})}async function N(a){let t=URL.createObjectURL(a);try{let e=new Image;e.decoding="sync",e.src=t,await e.decode();let n=document.createElement("canvas");return n.width=e.naturalWidth,n.height=e.naturalHeight,n.getContext("2d").drawImage(e,0,0),n}finally{URL.revokeObjectURL(t)}}function rt(a){return new Promise((t,e)=>{let n=new FileReader;n.onload=()=>t(n.result),n.onerror=()=>e(n.error),n.readAsDataURL(a)})}async function it(a){return(await fetch(a)).blob()}function I(a,t,e){return a*.29889531+t*.58662247+e*.11448223}function O(a,t,e){return a*.59597799-t*.2741761-e*.32180189}function U(a,t,e){return a*.21147017-t*.52261711+e*.31114694}function H(a,t,e,n,s){let o=a[e],l=a[e+1],f=a[e+2],u=a[e+3],d=t[n],h=t[n+1],c=t[n+2],x=t[n+3];if(u===x&&o===d&&l===h&&f===c)return 0;u<255&&(u/=255,o=_(o,u),l=_(l,u),f=_(f,u)),x<255&&(x/=255,d=_(d,x),h=_(h,x),c=_(c,x));let g=I(o,l,f),y=I(d,h,c),v=g-y;if(s)return v;let r=O(o,l,f)-O(d,h,c),i=U(o,l,f)-U(d,h,c),p=.5053*v*v+.299*r*r+.1957*i*i;return g>y?-p:p}function _(a,t){return 255+(a-255)*t}function z(a,t,e,n,s,o){let l=Math.max(t-1,0),f=Math.max(e-1,0),u=Math.min(t+1,n-1),d=Math.min(e+1,s-1),h=(e*n+t)*4,c=t===l||t===u||e===f||e===d?1:0,x=0,g=0,y=0,v=0,r=0,i=0;for(let p=l;p<=u;p++)for(let b=f;b<=d;b++){if(p===t&&b===e)continue;let w=H(a,a,h,(b*n+p)*4,!0);if(w===0){if(++c>2)return!1}else w<x?(x=w,y=p,v=b):w>g&&(g=w,r=p,i=b)}return x===0||g===0?!1:M(a,y,v,n,s)&&M(o,y,v,n,s)||M(a,r,i,n,s)&&M(o,r,i,n,s)}function M(a,t,e,n,s){let o=Math.max(t-1,0),l=Math.max(e-1,0),f=Math.min(t+1,n-1),u=Math.min(e+1,s-1),d=(e*n+t)*4,h=t===o||t===f||e===l||e===u?1:0;for(let c=o;c<=f;c++)for(let x=l;x<=u;x++){if(c===t&&x===e)continue;let g=(x*n+c)*4;if(a[d]===a[g]&&a[d+1]===a[g+1]&&a[d+2]===a[g+2]&&a[d+3]===a[g+3]&&++h>2)return!0}return!1}function B(a,t,e,n,s){a[t]=e,a[t+1]=n,a[t+2]=s,a[t+3]=255}function F(a,t,e,n){let s=a[t],o=a[t+1],l=a[t+2],f=_(I(s,o,l),e*a[t+3]/255);B(n,t,f,f,f)}function dt(a,t,e,n,s,o={}){if(a.length!==t.length)throw new Error("Image data must have the same dimensions");let l=o.threshold??.1,f=!!o.includeAA,u=o.alpha??.1,d=o.aaColor??[255,255,0],h=o.diffColor??[255,0,0],c=!!o.diffMask,x=35215*l*l,g=n*s,y=0;if(a.length===t.length){let v=!0;for(let r=0;r<a.length;r++)if(a[r]!==t[r]){v=!1;break}if(v){if(e&&!c)for(let r=0;r<g*4;r+=4)F(a,r,u,e);return{diff:0,total:g,ratio:0}}}for(let v=0;v<s;v++)for(let r=0;r<n;r++){let i=(v*n+r)*4,p=H(a,t,i,i,!1);Math.abs(p)>x?!f&&(z(a,r,v,n,s,t)||z(t,r,v,n,s,a))?e&&!c&&B(e,i,d[0],d[1],d[2]):(e&&B(e,i,h[0],h[1],h[2]),y++):e&&!c&&F(a,i,u,e)}return{diff:y,total:g,ratio:y/g}}function X(a,t,e={}){let n=Math.max(a.width,t.width),s=Math.max(a.height,t.height),o=a.width===t.width&&a.height===t.height,l=P(a,n,s),f=P(t,n,s),u=document.createElement("canvas");u.width=n,u.height=s;let d=u.getContext("2d"),h=d.createImageData(n,s),c=dt(l,f,h.data,n,s,e);return d.putImageData(h,0,0),{...c,width:n,height:s,dimsMatch:o,canvas:u}}function P(a,t,e){if(a.width===t&&a.height===e)return a.getContext("2d").getImageData(0,0,t,e).data;let n=document.createElement("canvas");n.width=t,n.height=e;let s=n.getContext("2d");return s.drawImage(a,0,0),s.getImageData(0,0,t,e).data}function Y(a={}){let{snapdom:t,namespace:e="default",threshold:n=.1,failureRatio:s=0,includeAA:o=!1,snapdomOptions:l={}}=a;if(!t)throw new Error("createRunner requires { snapdom }");let f=a.store??new R(e),u=[];function d(r,i,p={}){if(u.find(b=>b.name===r))throw new Error(`Duplicate test name: ${r}`);u.push({name:r,fn:i,options:p})}async function h(r){let i=await r.fn();if(i instanceof HTMLCanvasElement)return i;if(i instanceof Element){let p={...l,...r.options.snapdom??{}};return await t(i,p).then(b=>b.toCanvas())}throw new Error(`Test "${r.name}" must return an Element or HTMLCanvasElement`)}async function c(r){let i=performance.now();try{let p=await h(r),b=await f.get(r.name);if(!b)return{name:r.name,status:"new",actual:p,duration:performance.now()-i};let w=await N(b.blob),C={threshold:r.options.threshold??n,includeAA:r.options.includeAA??o},k=X(w,p,C),W=r.options.failureRatio??s,K=!k.dimsMatch||k.ratio>W;return{name:r.name,status:K?"fail":"pass",diff:k.diff,ratio:k.ratio,dimsMatch:k.dimsMatch,baseline:w,actual:p,diffCanvas:k.canvas,duration:performance.now()-i}}catch(p){return{name:r.name,status:"error",error:p,duration:performance.now()-i}}}async function x({filter:r,onProgress:i}={}){let p=r?u.filter(w=>r(w.name)):u,b=[];for(let w=0;w<p.length;w++){let C=await c(p[w]);b.push(C),i&&i({index:w,total:p.length,result:C})}return b}async function g(r,i){if(i||(i=(await c(u.find(w=>w.name===r))).actual),!i)throw new Error(`No actual canvas to approve for "${r}"`);let p=await j(i);await f.put(r,p,{width:i.width,height:i.height})}async function y(r){let i=r.filter(p=>p.status==="new"||p.status==="fail");for(let p of i)await g(p.name,p.actual);return i.length}function v(r){return{total:r.length,pass:r.filter(i=>i.status==="pass").length,fail:r.filter(i=>i.status==="fail").length,new:r.filter(i=>i.status==="new").length,error:r.filter(i=>i.status==="error").length}}return{test:d,run:x,approve:g,approveAll:y,summary:v,store:f,tests:u}}var lt=`
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
`,q=!1;function ct(){if(q)return;let a=document.createElement("style");a.textContent=lt,document.head.appendChild(a),q=!0}var L=class{constructor(t,e={}){this.runner=t,this.results=[],this.selected=null,this.mode=e.mode??"split",this.root=null,this.onClose=e.onClose}mount(t=document.body){return ct(),this.root&&this.unmount(),this.root=document.createElement("div"),this.root.className="sv-root",t.appendChild(this.root),this._render(),this}unmount(){this.root?.remove(),this.root=null}setResults(t){if(this.results=t,!this.selected||!t.find(e=>e.name===this.selected)){let e=t.find(n=>n.status==="fail"||n.status==="new"||n.status==="error");this.selected=(e??t[0])?.name??null}this._render()}async _rerunSingle(t,e){await e();let n=await this.runner.run({filter:o=>o===t.name}),s=this.results.findIndex(o=>o.name===t.name);s>=0&&n[0]&&(this.results[s]=n[0]),this._render()}async runAndShow(t){this._renderEmpty("Running tests\u2026");let e=await this.runner.run({filter:t,onProgress:({index:n,total:s,result:o})=>{this._renderEmpty(`Running ${n+1}/${s} \u2014 ${o.name} (${o.status})`)}});return this.setResults(e),e}_renderEmpty(t){this.root&&(this.root.innerHTML=`
      <div class="sv-bar"><h1>snapDiff</h1><div class="sv-spacer"></div></div>
      <div class="sv-empty">${pt(t)}</div>`)}_render(){if(!this.root)return;let t=this.results,e=this.runner.summary(t);this.root.innerHTML="",this.root.appendChild(this._renderBar(e));let n=m("div","sv-body");n.appendChild(this._renderList()),n.appendChild(this._renderDetail()),this.root.appendChild(n)}_renderBar(t){let e=m("div","sv-bar"),n=m("h1");n.textContent="snapDiff",e.appendChild(n);let s=m("div","sv-stats");for(let d of["pass","fail","new","error"]){if(t[d]===0)continue;let h=m("span",`sv-pill ${d}`);h.textContent=`${t[d]} ${d}`,s.appendChild(h)}e.appendChild(s),e.appendChild(m("div","sv-spacer"));let o=m("button");o.textContent="Re-run all",o.onclick=()=>this.runAndShow(),e.appendChild(o);let l=m("button","sv-primary");l.textContent="Approve all changes",l.onclick=async()=>{await this.runner.approveAll(this.results)&&await this.runAndShow()},e.appendChild(l);let f=m("button");f.textContent="Export",f.onclick=async()=>{let d=await this.runner.store.export(),h=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),c=document.createElement("a");c.href=URL.createObjectURL(h),c.download=`snapdiff-${this.runner.store.namespace}.json`,c.click(),URL.revokeObjectURL(c.href)},e.appendChild(f);let u=m("button");if(u.textContent="Import",u.onclick=()=>{let d=document.createElement("input");d.type="file",d.accept="application/json,.json",d.onchange=async()=>{let h=d.files?.[0];if(h)try{let c=JSON.parse(await h.text()),{added:x,skipped:g}=await this.runner.store.import(c,{overwrite:!0});console.log(`[snapDiff] imported ${x} baseline(s), skipped ${g}`),await this.runAndShow()}catch(c){alert(`Import failed: ${c.message}`)}},d.click()},e.appendChild(u),this.onClose){let d=m("button");d.textContent="\u2715",d.onclick=()=>{this.unmount(),this.onClose()},e.appendChild(d)}return e}_renderList(){let t=m("div","sv-list");if(!this.results.length){let e=m("div","sv-empty");return e.textContent="No results yet.",t.appendChild(e),t}for(let e of this.results){let n=m("div","sv-item"+(e.name===this.selected?" sv-selected":""));n.appendChild(m("div",`sv-dot ${e.status}`));let s=m("div","sv-name");s.textContent=e.name,n.appendChild(s);let o=m("div","sv-ratio");e.status==="fail"||e.status==="pass"?o.textContent=J(e.ratio):e.status==="new"?o.textContent="new":e.status==="error"&&(o.textContent="err"),n.appendChild(o),n.onclick=()=>{this.selected=e.name,this._render()},t.appendChild(n)}return t}_renderDetail(){let t=m("div","sv-detail"),e=this.results.find(s=>s.name===this.selected);if(!e)return t.appendChild(m("div","sv-empty")).textContent="Select a test to view details.",t;t.appendChild(this._renderDetailBar(e));let n=m("div","sv-stage");if(e.status==="error"){let s=m("div","sv-error");s.textContent=e.error?.stack||String(e.error),n.appendChild(s)}else if(e.status==="new")n.appendChild(this._wrapCanvas(e.actual,"actual (no baseline)"));else if(this.mode==="split"){let s=m("div","sv-canvases");s.appendChild(this._wrapCanvas(e.baseline,"baseline")),s.appendChild(this._wrapCanvas(e.actual,"actual")),s.appendChild(this._wrapCanvas(e.diffCanvas,"diff")),n.appendChild(s)}else this.mode==="slider"?n.appendChild(this._renderSlider(e)):this.mode==="diff"&&n.appendChild(this._wrapCanvas(e.diffCanvas,"diff"));return t.appendChild(n),t.appendChild(this._renderMeta(e)),t}_renderDetailBar(t){let e=m("div","sv-detail-bar"),n=m("div","sv-mode");for(let s of["split","slider","diff"]){let o=m("button",this.mode===s?"sv-active":"");o.textContent=s,o.onclick=()=>{this.mode=s,this._render()},n.appendChild(o)}if(e.appendChild(n),e.appendChild(m("div","sv-spacer")),t.status==="fail"||t.status==="new"){let s=m("button","sv-primary");s.textContent=t.status==="new"?"Save baseline":"Approve as new baseline",s.onclick=()=>this._rerunSingle(t,()=>this.runner.approve(t.name,t.actual)),e.appendChild(s)}if(t.status!=="new"){let s=m("button","sv-danger");s.textContent="Delete baseline",s.onclick=()=>this._rerunSingle(t,()=>this.runner.store.delete(t.name)),e.appendChild(s)}return e}_wrapCanvas(t,e){let n=m("div","sv-canvas-wrap"),s=document.createElement("canvas");s.width=t.width,s.height=t.height,s.getContext("2d").drawImage(t,0,0),n.appendChild(s);let o=m("span");return o.textContent=e,n.appendChild(o),n}_renderSlider(t){let e=Math.max(t.baseline.width,t.actual.width),n=Math.max(t.baseline.height,t.actual.height),s=m("div","sv-slider");s.style.width=e+"px",s.style.height=n+"px";let o=Q(t.baseline);o.style.display="block",s.appendChild(o);let l=m("div","sv-layer");l.style.width="50%";let f=Q(t.actual);f.style.width=e+"px",f.style.height=n+"px",l.appendChild(f),s.appendChild(l);let u=m("div","sv-handle");u.style.left="50%",s.appendChild(u);let d=!1,h=c=>{if(!d&&c.type!=="click")return;let x=s.getBoundingClientRect(),y=Math.min(Math.max(0,(c.clientX??c.touches?.[0]?.clientX)-x.left),x.width)/x.width*100;l.style.width=y+"%",u.style.left=y+"%"};return u.addEventListener("mousedown",()=>d=!0),window.addEventListener("mouseup",()=>d=!1),window.addEventListener("mousemove",h),s.addEventListener("click",h),s}_renderMeta(t){let e=m("div","sv-meta"),n=[`status: ${t.status}`,`duration: ${t.duration.toFixed(0)}ms`];return t.ratio!=null&&n.push(`mismatch: ${J(t.ratio)} (${t.diff} px)`),t.dimsMatch===!1&&n.push("dims differ"),e.textContent=n.join("  \xB7  "),e}};function m(a,t){let e=document.createElement(a);return t&&(e.className=t),e}function pt(a){return String(a).replace(/[&<>]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[t])}function J(a){return a===0?"0%":a<1e-4?"<0.01%":(a*100).toFixed(2)+"%"}function Q(a){let t=new Image;return t.src=a.toDataURL(),t}var ut=`
.sd-fab {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483500;
  background: #161a21; color: #e6e8eb;
  font: 12px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
  padding: 10px 14px; border-radius: 999px;
  border: 1px solid #2c3445;
  box-shadow: 0 4px 14px rgba(0,0,0,.35);
  cursor: pointer; user-select: none;
  display: flex; align-items: center; gap: 8px;
}
.sd-fab:hover { background: #1c2230; }
.sd-fab .sd-dot { width: 8px; height: 8px; border-radius: 50%; background: #6cd4a3; }
.sd-fab.sd-has-fail .sd-dot { background: #ff6e7a; }
.sd-fab.sd-has-new .sd-dot { background: #f0c419; }
.sd-fab.sd-running .sd-dot { background: #2f6df6; animation: sd-pulse 1s ease-in-out infinite; }
@keyframes sd-pulse { 50% { opacity: .3; } }
`,V=!1;function ft(){if(V)return;let a=document.createElement("style");a.textContent=ut,document.head.appendChild(a),V=!0}function T(a,t){if(a==null||a==="")return t;let e=String(a).toLowerCase();return!(e==="false"||e==="0"||e==="no")}function ht(a){let t=a.dataset,e={};return t.namespace&&(e.namespace=t.namespace),t.selector&&(e.selector=t.selector),t.threshold!=null&&(e.threshold=parseFloat(t.threshold)),t.failureRatio!=null&&(e.failureRatio=parseFloat(t.failureRatio)),"includeAa"in t&&(e.includeAA=T(t.includeAa,!0)),t.snapdomUrl&&(e.snapdomUrl=t.snapdomUrl),"autoRun"in t&&(e.autoRun=T(t.autoRun,!0)),"autoShow"in t&&(e.autoShow=T(t.autoShow,!0)),e}async function mt(a){let t=await import(a);return t.snapdom??t.default?.snapdom??t.default}function gt(a,t){let e=new Set,n=document.querySelectorAll(t),s=0;for(let o of n){let l=o.getAttribute("data-snap")||o.id;if(l||(l=`${o.tagName.toLowerCase()}-${s}`),e.has(l)){console.warn(`[snapDiff] duplicate test name "${l}" \u2014 skipping element`,o);continue}e.add(l);let f=o;a.test(l,()=>f),s++}return s}async function G(a={}){let{namespace:t="snapdiff-auto",selector:e="[data-snap]",threshold:n=.1,failureRatio:s=0,includeAA:o=!1,snapdomUrl:l="https://esm.sh/@zumer/snapdom",snapdomOptions:f={dpr:1,scale:1,embedFonts:!0},autoRun:u=!0,autoShow:d=!1}=a,h=a.snapdom;if(!h)try{h=await mt(l)}catch(w){return console.error(`[snapDiff] failed to load snapdom from ${l}:`,w),null}if(typeof h!="function")return console.error("[snapDiff] snapdom is not a function \u2014 check the module exports at",l),null;let c=Y({snapdom:h,namespace:t,threshold:n,failureRatio:s,includeAA:o,snapdomOptions:f});if(gt(c,e)===0)return console.warn(`[snapDiff] no elements matched selector "${e}" \u2014 nothing to test`),{runner:c,fab:null,reporter:()=>null,refresh:async()=>{}};ft();let g=document.createElement("div");g.className="sd-fab";let y=document.createElement("span");y.className="sd-dot";let v=document.createElement("span");v.textContent="snapDiff",g.append(y,v),document.body.appendChild(g);let r=w=>{if(g.classList.remove("sd-running","sd-has-fail","sd-has-new"),!w){v.textContent="snapDiff";return}let C=c.summary(w);C.fail||C.error?(g.classList.add("sd-has-fail"),v.textContent=`snapDiff: ${C.fail+C.error} fail`):C.new?(g.classList.add("sd-has-new"),v.textContent=`snapDiff: ${C.new} recorded`):v.textContent=`snapDiff: ${C.pass}/${w.length} \u2713`},i=null,p=null,b=async()=>{i?.root||(i||(i=new L(c,{onClose:()=>{p=i.results,r(p),i.unmount()}})),i.mount(),p?i.setResults(p):(p=await i.runAndShow(),r(p)))};if(g.onclick=b,u){g.classList.add("sd-running"),v.textContent="snapDiff: running\u2026";try{let w=await c.run();for(let k of w)k.status==="new"&&await c.approve(k.name,k.actual);p=w,r(w),(w.some(k=>k.status==="fail"||k.status==="error")||d)&&await b()}catch(w){console.error("[snapDiff] auto-run failed:",w),g.classList.remove("sd-running"),v.textContent="snapDiff: error"}}return{runner:c,fab:g,reporter:()=>i,refresh:b}}function wt(){if(typeof document>"u")return null;if(document.currentScript?.dataset?.auto!=null)return document.currentScript;let a=document.querySelectorAll("script[data-auto]");return a[a.length-1]??null}function vt(){if(typeof window>"u"||window.__snapdiffAutoTriggered)return;let a=wt();if(!a)return;window.__snapdiffAutoTriggered=!0;let t=ht(a),e=()=>G(t);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e,{once:!0}):e()}vt();return st(xt);})();
