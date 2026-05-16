#!/usr/bin/env node
"use strict";
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const WebSocket = require("ws");
const { appendFileSync } = require("fs");
const { join } = require("path");

const LOG = join(__dirname, "plugin.log");
function log(m) { try { appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`); } catch {} console.log(m); }

function parseArgs() {
  const a = process.argv.slice(2); let p, u, e;
  for (let i = 0; i < a.length; i++) { if (a[i] === "-port") p = a[i+1]; else if (a[i] === "-pluginUUID") u = a[i+1]; else if (a[i] === "-registerEvent") e = a[i+1]; }
  return { port: p, uuid: u, ev: e };
}
const { port, uuid, ev } = parseArgs();
log(`Start port=${port}`);

let ws = null;
function send(o) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); }

const W = 144, H = 144;
const DEF = { apiKey:"", city:"", units:"metric", style:"icon", showTemp:true, refreshInterval:3600 };
const instances = {};

const iconCache = {};
async function getIcon(code) {
  const m = {
    "01d":"sun","01n":"moon-stars","02d":"cloud-sun","02n":"cloud-moon",
    "03d":"cloud","03n":"cloud","04d":"cloud","04n":"cloud",
    "09d":"cloud-rain","09n":"cloud-rain","10d":"cloud-rain","10n":"cloud-rain",
    "11d":"cloud-lightning","11n":"cloud-lightning","13d":"cloud-snow","13n":"cloud-snow",
    "50d":"cloud-fog","50n":"cloud-fog",
  };
  const name = m[code] || "sun";
  if (iconCache[name]) return iconCache[name];
  try {
    const img = await loadImage(join(__dirname, "icons", `${name}.png`));
    iconCache[name] = img;
    return img;
  } catch { return null; }
}

// ---- NEUTRAL COLOR MAP ----
// [dayBgTop, dayBgBottom, dayText, nightBgTop, nightBgBottom, nightText]
const PAL = {
  "01":["#E8ECEF","#F0F4F6","#2C3E50", "#1A1E2E","#242838","#FFFFFF"],
  "02":["#E0E6EA","#EAEEF2","#34495E", "#1C2234","#262E40","#FFFFFF"],
  "03":["#DAE0E6","#E4E8EE","#3D4A5A", "#1E2436","#283046","#FFFFFF"],
  "04":["#D4DAE2","#DEE4EC","#3D4A5A", "#20263A","#2A344A","#FFFFFF"],
  "10":["#CCD4DC","#D8E0E8","#34495E", "#1A2236","#242E44","#FFFFFF"],
  "11":["#D8DCE4","#E2E6EE","#3D4A5A", "#181E32","#222840","#FFFFFF"],
  "13":["#EAF0F6","#F2F6FA","#3D4A5A", "#1C2438","#26304A","#FFFFFF"],
  "50":["#E6ECF0","#EEF2F6","#3D4A5A", "#1E2438","#282E44","#FFFFFF"],
};

function pal(code) {
  const day = code.endsWith("d"), p = PAL[code.slice(0,2)] || PAL["01"];
  return day ? { bg: [p[0], p[1]], fg: p[2] } : { bg: [p[3], p[4]], fg: p[5] };
}

// ---- CANVAS HELPERS ----
function bgGrad(ctx, colors) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function text(ctx, str, x, y, size, weight, color, baseline = "middle") {
  ctx.textAlign = "center"; ctx.textBaseline = baseline;
  ctx.font = `${weight} ${size}px "Segoe UI",sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Tint a white icon to a specific color using canvas compositing
function tintedIcon(ctx, icon, x, y, w, h, tintColor) {
  // Create offscreen canvas
  const tmp = createCanvas(w, h);
  const tc = tmp.getContext("2d");
  // Fill with tint color
  tc.fillStyle = tintColor;
  tc.fillRect(0, 0, w, h);
  // Mask with icon shape (destination-in keeps destination where source overlaps)
  tc.globalCompositeOperation = "destination-in";
  tc.drawImage(icon, 0, 0, w, h);
  // Draw onto main canvas
  ctx.drawImage(tmp, x, y);
}

// ---- RENDER ----
async function render(ctx, s, data) {
  try {
    const ic = data.weather?.[0]?.icon || "01d";
    const tmp = Math.round(data.main?.temp ?? 0);
    const u = s.units === "metric" ? "°C" : s.units === "imperial" ? "°F" : "K";
    const tstr = `${tmp}${u}`;
    const city = data.name || s.city || "";
    const colors = pal(ic);
    const isDay = ic.endsWith("d");

    const cv = createCanvas(W, H);
    const c = cv.getContext("2d");

    // Background (no shadows, no glows)
    bgGrad(c, colors.bg);

    if (s.style === "text") {
      // ---- BIG TEMP ----
      text(c, tstr, W/2, 64, 54, "900", colors.fg, "middle");
      // City - bigger
      text(c, city, W/2, 122, 18, "600", colors.fg === "#FFFFFF" ? "rgba(255,255,255,0.8)" : "rgba(44,62,80,0.7)", "middle");
    } else {
      const showT = s.showTemp !== false;
      const iconSize = showT ? 88 : 108;
      const iconCY = showT ? 48 : 72;  // dead center when no temp
      const iconImg = await getIcon(ic);

      if (iconImg) {
        if (isDay) {
          // Day: draw icon tinted dark for visibility on light bg
          tintedIcon(c, iconImg, W/2 - iconSize/2, iconCY - iconSize/2, iconSize, iconSize, colors.fg);
        } else {
          // Night: draw white icon directly
          c.drawImage(iconImg, W/2 - iconSize/2, iconCY - iconSize/2, iconSize, iconSize);
        }
      }

      if (showT) {
        // Temp bigger - 28px
        text(c, tstr, W/2, 92, 28, "900", colors.fg, "top");
      }
    }

    const png = cv.toBuffer("image/png");
    send({ event: "setImage", context: ctx, payload: { image: "data:image/png;base64," + png.toString("base64") } });
    log(`Rendered ${ic} ${tmp}° ${ctx}`);
  } catch (e) { log("RENDER ERR " + e.message); }
}

async function errImg(ctx, msg) {
  try {
    const cv = createCanvas(W, H); const c = cv.getContext("2d");
    bgGrad(c, PAL["01"].slice(3,5));
    text(c, "⚠", W/2, 50, 26, "bold", "#FFD54F", "middle");
    text(c, msg, W/2, 82, 12, "600", "#FFFFFF", "middle");
    text(c, "Tap", W/2, 110, 9, "400", "rgba(255,255,255,0.5)", "middle");
    const png = cv.toBuffer("image/png");
    send({ event: "setImage", context: ctx, payload: { image: "data:image/png;base64," + png.toString("base64") } });
  } catch (e) { log("ERR " + e.message); }
}

async function fetchAndRender(ctx, s) {
  if (!s.apiKey || !s.city) { errImg(ctx, "Set API key & city"); return; }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(s.city)}&appid=${s.apiKey}&units=${s.units}`;
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 10000);
    const r = await fetch(url, { signal: ac.signal }); clearTimeout(t);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    render(ctx, s, d);
  } catch (e) {
    const m = e.message.includes("401") ? "Bad key" : e.message.includes("404") ? "City?" : "Offline";
    errImg(ctx, m);
  }
}

function start(ctx, s) {
  const ms = Math.max(30, s.refreshInterval || 3600) * 1000;
  const t = setInterval(() => fetchAndRender(ctx, s), ms);
  instances[ctx] = { s, t }; log("Start " + ctx);
  fetchAndRender(ctx, s);
}
function stop(ctx) { if (instances[ctx]) { clearInterval(instances[ctx].t); delete instances[ctx]; } }

ws = new WebSocket("ws://127.0.0.1:" + port);
ws.on("open", () => { log("WS open"); send({ event: ev, uuid: uuid }); });
ws.on("message", (data) => {
  let m; try { m = JSON.parse(data.toString()); } catch { return; }
  log("EVT " + m.event);
  switch (m.event) {
    case "willAppear": start(m.context, Object.assign({}, DEF, m.payload?.settings || {})); break;
    case "willDisappear": stop(m.context); break;
    case "didReceiveSettings": const ns = Object.assign({}, DEF, m.payload?.settings || {}); stop(m.context); start(m.context, ns); break;
    case "keyDown": if (instances[m.context]) fetchAndRender(m.context, instances[m.context].s); break;
    case "propertyInspectorDidAppear": const i = instances[m.context]; send({ event: "sendToPropertyInspector", context: m.context, payload: i ? i.s : DEF }); break;
    case "sendToPlugin": if (m.payload && m.payload.event === "getSettings") { const ix = instances[m.context]; send({ event: "sendToPropertyInspector", context: m.context, payload: ix ? ix.s : DEF }); } break;
  }
});
ws.on("close", () => { log("WS closed"); setTimeout(() => process.exit(0), 1000); });
ws.on("error", e => { log("WS error " + e.message); });
