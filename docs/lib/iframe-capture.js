/*
* snapDiff
* v0.3.0
* Author: Juan Martin Muda
* License: MIT
*/

// src/capture.js
var defaults = { dpr: 1, scale: 1, embedFonts: true, invalidate: true };
async function captureCanvas(snapdom, element, options = {}) {
  const merged = { ...options };
  for (const [key, value] of Object.entries(defaults)) merged[key] ?? (merged[key] = value);
  const result = await snapdom(element, merged);
  return await result.toCanvas({ canvas: null });
}

// vitest/iframe-capture.js
async function captureFromIframe(iframe, url, opts = {}) {
  const {
    target = ["#target", "body"],
    wait = 0,
    snapdomUrl = "/dist/snapdom.mjs",
    snapdomOptions = {},
    setup
    // optional (win, doc) => Promise<void> – runs after load
  } = opts;
  await navigateIframe(iframe, "about:blank");
  await navigateIframe(iframe, url);
  const loadedURL = iframe.contentDocument?.URL || "";
  if (!sameUrl(loadedURL, url)) {
    throw new Error(`Iframe loaded "${loadedURL}" but expected "${url}". Aborting capture.`);
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (wait) await sleep(wait);
  if (setup) await setup(iframe.contentWindow, iframe.contentDocument);
  await injectSnapdom(iframe, snapdomUrl);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  const selectors = Array.isArray(target) ? target : [target];
  let el = null, matched = null;
  for (const sel of selectors) {
    el = doc.querySelector(sel);
    if (el) {
      matched = sel;
      break;
    }
  }
  if (!el) throw new Error(`No target found in ${url}. Tried: ${selectors.join(", ")}. Add an override in demoOptions["${baseName(url)}"].target.`);
  const canvas = await captureCanvas(win.__snapDiffSnapdom__, el, snapdomOptions);
  canvas.dataset && (canvas.dataset.target = matched);
  return canvas;
}
function baseName(url) {
  const m = String(url).match(/([^/\\]+?)(?:\.html?)?$/i);
  return m ? m[1] : String(url);
}
function sameUrl(a, b) {
  const norm = (u) => String(u).replace(/[?#].*$/, "").replace(/\.html?$/i, "").replace(/\/$/, "");
  const na = norm(a), nb = norm(b);
  return na.endsWith(nb) || nb.endsWith(na) || na.includes(nb) || nb.includes(na);
}
function navigateIframe(iframe, url) {
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load ${url}`));
    };
    function cleanup() {
      iframe.removeEventListener("load", onLoad);
      iframe.removeEventListener("error", onError);
    }
    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("error", onError);
    iframe.src = url;
  });
}
function injectSnapdom(iframe, snapdomUrl) {
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (win.__snapDiffSnapdom__) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`snapdom inject timeout (${snapdomUrl})`)), 8e3);
    const onReady = () => {
      clearTimeout(timer);
      win.removeEventListener("__snapDiffReady__", onReady);
      resolve();
    };
    win.addEventListener("__snapDiffReady__", onReady, { once: true });
    const script = doc.createElement("script");
    script.type = "module";
    script.textContent = `
      import { snapdom } from ${JSON.stringify(snapdomUrl)}
      window.__snapDiffSnapdom__ = snapdom
      window.dispatchEvent(new Event('__snapDiffReady__'))
    `;
    doc.head.appendChild(script);
  });
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
export {
  captureFromIframe
};
