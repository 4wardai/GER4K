
const state = {
  searched:false,
  disrupted:false,
  preference:"balanced",
  selectedRoute:"normal-main",
  points:25,
  saved:false,
};

const routes = {
  "normal-main":{
    title:"Putrajaya Sentral → KLCC",
    meta:"28 min · RM4.20 · 1 change",
    kind:"normal",
    path:"M555 630 C540 570 530 520 518 470 C510 430 515 370 525 320 C535 270 550 235 570 205",
    stations:[
      [555,630,"Putrajaya Sentral"],[515,390,"TRX"],[535,275,"Ampang Park"],[570,205,"KLCC"]
    ]
  },
  "normal-cheap":{
    title:"Feeder + LRT connection",
    meta:"35 min · RM3.70 · 320 m walk",
    kind:"secondary",
    path:"M555 630 C500 570 455 535 445 490 C435 440 470 380 520 330 C555 290 565 245 570 205",
    stations:[[555,630,"Putrajaya"],[445,490,"Feeder"],[520,330,"LRT"],[570,205,"KLCC"]]
  },
  "pasar":{
    title:"via TRX + Pasar Seni",
    meta:"34 min · RM4.40 · fastest recovery",
    kind:"recovery",
    path:"M555 630 C540 570 530 520 518 470 C510 430 510 400 510 390 C470 370 430 340 390 310 C445 275 510 235 570 205",
    stations:[[555,630,"Putrajaya Sentral"],[510,390,"TRX"],[390,310,"Pasar Seni"],[570,205,"KLCC"]],
    pulse:[[510,390,"packed"],[390,310,"normal"]]
  },
  "chan":{
    title:"via Chan Sow Lin + Masjid Jamek",
    meta:"41 min · RM4.20 · less walking",
    kind:"secondary",
    path:"M555 630 C525 560 505 505 485 450 C450 420 420 395 400 365 C420 320 470 265 570 205",
    stations:[[555,630,"Putrajaya Sentral"],[485,450,"Chan Sow Lin"],[400,365,"Masjid Jamek"],[570,205,"KLCC"]],
    pulse:[[485,450,"busy"]]
  },
  "bus":{
    title:"rail + feeder recovery",
    meta:"44 min · RM5.10 · avoids TRX",
    kind:"secondary",
    path:"M555 630 C510 570 465 530 440 485 C420 450 450 410 485 380 C520 350 550 300 570 205",
    stations:[[555,630,"Putrajaya Sentral"],[440,485,"Feeder T508"],[485,380,"LRT connection"],[570,205,"KLCC"]]
  },
  "ride":{
    title:"ride-hailing fallback",
    meta:"27–35 min · RM24–31 · demo estimate",
    kind:"ride",
    path:"M555 630 C510 550 530 450 560 380 C585 320 590 250 570 205",
    stations:[[555,630,"Putrajaya Sentral"],[570,205,"KLCC"]]
  }
};

const recoverySets = {
  balanced:["pasar","chan","bus","ride"],
  fastest:["pasar","ride","chan","bus"],
  cheapest:["chan","pasar","bus","ride"],
  walking:["chan","pasar","bus","ride"],
  crowding:["bus","chan","pasar","ride"]
};

const recoveryMeta = {
  pasar:{strategy:"BEST OVERALL", title:"via TRX + Pasar Seni", time:"34 min", cost:"RM4.40", walk:"520 m", transfers:"2 changes", crowd:"TRX · Packed", confidence:"Medium confidence", desc:"Fastest public-transport recovery"},
  chan:{strategy:"LESS WALKING", title:"via Chan Sow Lin", time:"41 min", cost:"RM4.20", walk:"260 m", transfers:"2 changes", crowd:"Chan Sow Lin · Busy", confidence:"Medium confidence", desc:"Easier walk, avoids TRX congestion"},
  bus:{strategy:"AVOID CROWDING", title:"Rail + feeder T508", time:"44 min", cost:"RM5.10", walk:"120 m", transfers:"2 changes", crowd:"Avoids packed TRX", confidence:"Medium confidence", desc:"Bus-supported recovery option"},
  ride:{strategy:"FASTEST OVERALL", title:"Ride-hailing fallback", time:"27–35 min", cost:"RM24–31", walk:"Door-to-door", transfers:"0 changes", crowd:"Road conditions vary", confidence:"Estimate", desc:"Demo price estimate"}
};

const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];

function switchView(view){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $$(".nav-tab,.mobile-nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
$$(".nav-tab,.mobile-nav").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
$$("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.jump)));

function renderRoute(routeId){
  state.selectedRoute=routeId;
  const r=routes[routeId];
  $("#routeLayer").innerHTML = `
    <path class="route-path ${r.kind==="ride"?"route-ride":r.kind==="secondary"?"route-secondary":"route-primary"}" d="${r.path}"/>
    ${state.disrupted ? `<path class="route-path route-disrupted" d="M510 390 C515 360 520 335 525 320"/>` : ""}
  `;
  $("#stationLayer").innerHTML = r.stations.map((s,i)=>`
    <circle class="station-node ${i===0||i===r.stations.length-1?"selected":""}" cx="${s[0]}" cy="${s[1]}" r="${i===0||i===r.stations.length-1?9:7}"/>
    <text class="station-label" x="${s[0]+13}" y="${s[1]-10}">${s[2]}</text>
  `).join("") + (r.pulse||[]).map(p=>`
    <circle class="pulse-node ${p[2]}" cx="${p[0]-15}" cy="${p[1]-15}" r="8"/>
  `).join("");
  $("#floatingTitle").textContent=r.title;
  $("#floatingMeta").textContent=r.meta;
  $("#mapStatusText").textContent=state.disrupted ? "Recovery route selected" : "Journey route selected";
}

function planJourney(){
  state.searched=true;
  $("#homeBeforeSearch").classList.add("hidden");
  $("#journeyResults").classList.remove("hidden");
  renderRoute("normal-main");
  $("#normalRouteOptions").classList.remove("hidden");
  $("#disruptionExperience").classList.add("hidden");
  setTimeout(()=>$("#journeyResults").scrollIntoView({behavior:"smooth",block:"start"}),50);
}
$("#findRoutesBtn").addEventListener("click",planJourney);
$("#savedTripBtn").addEventListener("click",planJourney);

$$(".route-card").forEach(btn=>btn.addEventListener("click",()=>{
  $$(".route-card").forEach(x=>x.classList.remove("selected"));
  btn.classList.add("selected");
  renderRoute(btn.dataset.route);
}));

function recoveryCard(id, idx){
  const m=recoveryMeta[id];
  const recommended=idx===0;
  return `
    <article class="recovery-card ${recommended?"recommended":""}" data-recovery="${id}">
      <div class="recovery-card-head">
        <div>
          <div class="strategy">${recommended?"GER4K RECOMMENDS · ":""}${m.strategy}</div>
          <strong>${m.title}</strong>
          <div class="route-sub">${m.desc}</div>
        </div>
        <div class="recovery-cost">
          <strong>${m.time}</strong>
          <span>${m.cost}</span>
        </div>
      </div>
      <div class="recovery-meta">
        <span>↔ ${m.transfers}</span>
        <span>🚶 ${m.walk}</span>
        <span>● ${m.confidence}</span>
      </div>
      <div class="recovery-route">${routeText(id)}</div>
      ${id!=="ride"?`<div class="pulse-inline"><strong>${m.crowd}</strong><span>Station Pulse →</span></div>`:""}
      <div class="confidence-line"><span class="confidence-dot"></span><span>${m.confidence} · <button class="text-btn why-confidence" data-id="${id}">Why?</button></span></div>
      <div class="recovery-actions">
        <button class="use-route" data-use="${id}">${recommended?"Use this route":"Select route"}</button>
        <button class="why-route" data-why="${id}">Why this?</button>
      </div>
    </article>
  `;
}
function routeText(id){
  const map={
    pasar:"Putrajaya Sentral → TRX → Pasar Seni → KLCC",
    chan:"Putrajaya Sentral → Chan Sow Lin → Masjid Jamek → KLCC",
    bus:"Putrajaya Sentral → feeder T508 → LRT connection → KLCC",
    ride:"Putrajaya Sentral → KLCC · demo road estimate"
  };
  return map[id];
}
function renderRecovery(){
  const ids=recoverySets[state.preference];
  $("#recoveryCards").innerHTML=ids.map(recoveryCard).join("");
  bindRecoveryActions();
  renderRoute(ids[0]);
}
function bindRecoveryActions(){
  $$("[data-use]").forEach(b=>b.addEventListener("click",()=>renderRoute(b.dataset.use)));
  $$("[data-why],.why-confidence").forEach(b=>b.addEventListener("click",(e)=>{
    const id=b.dataset.why||b.dataset.id;
    openAsk(id);
  }));
  $$(".pulse-inline").forEach(p=>p.addEventListener("click",()=>openStation("TRX")));
}
$$(".pref").forEach(btn=>btn.addEventListener("click",()=>{
  $$(".pref").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  state.preference=btn.dataset.pref;
  renderRecovery();
}));

function triggerDisruption(){
  if(!state.searched) planJourney();
  state.disrupted=true;
  $("#normalSummary").classList.add("hidden");
  $("#normalRouteOptions").classList.add("hidden");
  $("#disruptionExperience").classList.remove("hidden");
  $("#presenterState").textContent="Demo disruption active";
  $("#triggerDisruptionBtn").textContent="Disruption active";
  $("#mapStatusText").textContent="TRX–Conlay disruption";
  renderRecovery();
  setTimeout(()=>$("#disruptionExperience").scrollIntoView({behavior:"smooth",block:"start"}),80);
}
$("#triggerDisruptionBtn").addEventListener("click",triggerDisruption);

function resetDemo(){
  state.disrupted=false;state.preference="balanced";
  $("#presenterState").textContent="Normal journey";
  $("#triggerDisruptionBtn").textContent="Trigger disruption";
  $("#normalSummary").classList.remove("hidden");
  $("#normalRouteOptions").classList.remove("hidden");
  $("#disruptionExperience").classList.add("hidden");
  $$(".pref").forEach(x=>x.classList.toggle("active",x.dataset.pref==="balanced"));
  if(state.searched) renderRoute("normal-main"); else clearMap();
  switchView("home");
}
$("#resetDemoBtn").addEventListener("click",resetDemo);

function clearMap(){
  $("#routeLayer").innerHTML="";
  $("#stationLayer").innerHTML="";
  $("#floatingTitle").textContent="Klang Valley";
  $("#floatingMeta").textContent="Search a journey to compare routes";
  $("#mapStatusText").textContent="Network overview";
}
clearMap();

const stationData={
  "TRX":{condition:"PACKED",class:"severe",desc:"Crowding is high right now.",reports:"12",fresh:"2 min"},
  "Chan Sow Lin":{condition:"BUSY",class:"busy",desc:"Moderate crowding.",reports:"5",fresh:"4 min"},
  "Pasar Seni":{condition:"NORMAL",class:"normal",desc:"Moving normally.",reports:"8",fresh:"3 min"}
};
function openStation(name){
  const d=stationData[name]||stationData["TRX"];
  $("#stationModalTitle").textContent=name;
  $("#stationModalCondition").textContent=d.condition;
  $("#stationModalCondition").className=`condition ${d.class}`;
  $("#stationModalDesc").textContent=d.desc;
  $("#stationReports").textContent=d.reports;
  $("#stationFreshness").textContent=d.fresh;
  $("#stationModal").classList.remove("hidden");
}
$$(".pulse-card").forEach(btn=>btn.addEventListener("click",()=>openStation(btn.dataset.station)));

$("#reportConditionBtn").addEventListener("click",()=>{
  $("#stationModal").classList.add("hidden");
  $("#reportModal").classList.remove("hidden");
});
$$("[data-report]").forEach(btn=>btn.addEventListener("click",()=>{
  $("#reportModal").classList.add("hidden");
  state.points+=5;
  $("#pointsValue").textContent=state.points;
  $("#profilePoints").textContent=state.points;
  showToast("Report submitted",`+5 GER4K Points · ${btn.dataset.report} marked Unverified`);
}));

function showToast(title,text){
  $("#toastTitle").textContent=title;$("#toastText").textContent=text;
  $("#toast").classList.remove("hidden");
  setTimeout(()=>$("#toast").classList.add("hidden"),2800);
}
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.close).classList.add("hidden")));
$$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")}));

function openAsk(id="pasar"){
  const m=recoveryMeta[id];
  $("#askTitle").textContent="Why this route?";
  $("#assistantAnswer").innerHTML=`
    <strong>${m.title}</strong> is recommended because it best matches your current preference.
    <div class="answer-route">
      <div><strong>${m.time}</strong><span>journey</span></div>
      <div><strong>${m.walk}</strong><span>walking</span></div>
      <div><strong>${m.cost}</strong><span>estimated cost</span></div>
    </div>
    ${id==="pasar" ? "TRX is crowded, but this route still gets you to KLCC around 7 minutes sooner than the Chan Sow Lin alternative." :
      id==="chan" ? "This option cuts walking to around 260 m and avoids the packed TRX transfer." :
      id==="bus" ? "This option avoids packed TRX by using a feeder-supported connection." :
      "This is a demo ride-hailing estimate shown only as a decision fallback."}
  `;
  $("#askModal").classList.remove("hidden");
}
$$("[data-ask-pref]").forEach(btn=>btn.addEventListener("click",()=>{
  const pref=btn.dataset.askPref;
  state.preference=pref;
  $$(".pref").forEach(x=>x.classList.toggle("active",x.dataset.pref===pref));
  renderRecovery();
  const first=recoverySets[pref][0], m=recoveryMeta[first];
  $("#assistantAnswer").innerHTML=`
    <strong>Got it.</strong> I've changed the recommendation to <b>${m.title}</b>.
    <div class="answer-route">
      <div><strong>${m.time}</strong><span>journey</span></div>
      <div><strong>${m.walk}</strong><span>walking</span></div>
      <div><strong>${m.cost}</strong><span>estimated cost</span></div>
    </div>
    Close this sheet to see the re-ranked routes.
  `;
}));
$("#askSendBtn").addEventListener("click",()=>{
  const q=$("#askInput").value.trim().toLowerCase();
  if(!q)return;
  let pref="balanced";
  if(q.includes("walk")||q.includes("grandmother")||q.includes("elder"))pref="walking";
  if(q.includes("crowd")||q.includes("trx"))pref="crowding";
  if(q.includes("cheap")||q.includes("cost")||q.includes("budget"))pref="cheapest";
  state.preference=pref;
  $$(".pref").forEach(x=>x.classList.toggle("active",x.dataset.pref===pref));
  renderRecovery();
  const first=recoverySets[pref][0],m=recoveryMeta[first];
  $("#assistantAnswer").innerHTML=`For that request, I'd switch you to <b>${m.title}</b>.<div class="answer-route"><div><strong>${m.time}</strong><span>journey</span></div><div><strong>${m.walk}</strong><span>walking</span></div><div><strong>${m.cost}</strong><span>estimated cost</span></div></div>`;
  $("#askInput").value="";
});

$("#saveCurrentBtn").addEventListener("click",()=>{
  state.saved=!state.saved;
  $("#saveCurrentBtn").textContent=state.saved?"♥":"♡";
  showToast(state.saved?"Journey saved":"Journey removed",state.saved?"GER4K can prepare recovery for this commute.":"Removed from saved journeys.");
});

$("#alertsBtn").addEventListener("click",()=>switchView("service"));
$("#recenterBtn").addEventListener("click",()=>{ if(state.selectedRoute)renderRoute(state.selectedRoute); });
$("#closeFloating").addEventListener("click",()=>$("#mapFloatingCard").classList.add("hidden"));



// Full-vision v2: route mode filters
document.querySelectorAll(".mode-filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".mode-filter").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    const mode=btn.dataset.modefilter;
    document.querySelectorAll("#normalRouteOptions .route-card").forEach(card=>{
      const isBus=card.dataset.route==="normal-cheap";
      card.style.display = mode==="all" || (mode==="bus" && isBus) || (mode==="rail" && !isBus) ? "" : "none";
    });
  });
});

// Station-specific pedestrian prototype context
const pedestrianInfo = {
  "TRX":{
    title:"Pedestrian connection available",
    text:"Prototype guidance: signed interchange walking is available within the station complex. Allow roughly 4–6 min between lines."
  },
  "Chan Sow Lin":{
    title:"Short interchange walk",
    text:"Prototype guidance: allow roughly 3–5 min for the interchange and platform change."
  },
  "Pasar Seni":{
    title:"Covered interchange connection",
    text:"Prototype guidance: a pedestrian connection links the MRT/LRT interchange. Allow roughly 5–7 min in busy conditions."
  }
};
const _openStationV1 = openStation;
openStation = function(name){
  _openStationV1(name);
  const p = pedestrianInfo[name] || pedestrianInfo.TRX;
  const title = document.querySelector("#pedestrianTitle");
  const text = document.querySelector("#pedestrianText");
  if(title) title.textContent=p.title;
  if(text) text.textContent=p.text;
};

// Movable GER4K robot / mobility co-pilot
const bot = document.querySelector("#g4bot");
const botAvatar = document.querySelector("#botAvatar");
const botBubble = document.querySelector("#botBubble");
const botClose = document.querySelector("#botClose");
const botAnswer = document.querySelector("#botAnswer");
const botForm = document.querySelector("#botForm");
const botInput = document.querySelector("#botInput");
let botOpen = false;
let dragging = false;
let dragStart = null;
let botStart = null;

function setBotOpen(open){
  botOpen=open;
  botBubble.classList.toggle("hidden",!open);
  botAvatar.setAttribute("aria-expanded",String(open));
  if(open) setTimeout(()=>botInput.focus(),60);
}
botAvatar.addEventListener("click",()=>{ if(!dragging) setBotOpen(!botOpen); });
botClose.addEventListener("click",()=>setBotOpen(false));

function botResponse(kind, raw=""){
  const q = raw.toLowerCase();
  if(kind==="bus" || q.includes("bus") || q.includes("feeder")){
    return `<span class="bot-highlight">🚌 Yes — there is a feeder option in this demo.</span>
      MRT Feeder <b>T508</b> is shown arriving in about <b>6 min</b> (simulated live data). It can connect you toward the LRT route and is also available as a disruption-recovery strategy.
      <div class="bot-mini-grid"><div><b>~6 min</b><span>bus arrival</span></div><div><b>35–44 min</b><span>journey</span></div><div><b>RM3.70+</b><span>demo fare</span></div></div>`;
  }
  if(kind==="walk" || q.includes("walk") || q.includes("pedestrian") || q.includes("foot") || q.includes("stairs")){
    return `<span class="bot-highlight">🚶 Walking depends on the selected recovery.</span>
      The <b>Chan Sow Lin</b> option is the lower-walking recovery at about <b>260 m</b>. The feeder-supported option is around <b>120 m</b>. Tap a station in Pulse for prototype interchange-walking guidance.
      <div class="bot-mini-grid"><div><b>260 m</b><span>low-walk rail</span></div><div><b>120 m</b><span>feeder option</span></div><div><b>4–7 min</b><span>interchange walk</span></div></div>`;
  }
  if(kind==="crowd" || q.includes("crowd") || q.includes("packed") || q.includes("busy") || q.includes("trx")){
    return `<span class="bot-highlight">👥 TRX is currently marked Packed in the demo.</span>
      Station Pulse shows <b>12 recent reports</b>. If you want to avoid TRX, GER4K can prioritize the <b>feeder-supported</b> or <b>Chan Sow Lin</b> recovery instead.`;
  }
  if(kind==="fare" || q.includes("fare") || q.includes("cost") || q.includes("cheap") || q.includes("price")){
    return `<span class="bot-highlight">RM Cheapest shown: RM3.70</span>
      The feeder + LRT normal-day option is the cheapest route in this prototype. During disruption, the Chan Sow Lin recovery is about <b>RM4.20</b>. These are <b>demo fare estimates</b>.`;
  }
  if(q.includes("station") || q.includes("service") || q.includes("line") || q.includes("status")){
    return `<span class="bot-highlight">🚆 I can explain line and station status.</span>
      Putrajaya, Kajang and Kelana Jaya lines are shown normal in the base demo. Presenter mode can trigger the simulated <b>TRX–Conlay</b> disruption. Pulse adds community conditions on top.`;
  }
  if(q.includes("recommend") || q.includes("best") || q.includes("fast")){
    return `<span class="bot-highlight">✦ Best overall recovery: via TRX + Pasar Seni.</span>
      It is about <b>34 min</b> in the demo. If you care more about walking or crowding, I would switch you to another route rather than blindly keep the fastest option.`;
  }
  if(q.includes("wheel") || q.includes("elder") || q.includes("grandmother") || q.includes("accessible")){
    return `<span class="bot-highlight">♿ I would prioritize easier movement.</span>
      Based on the current prototype attributes, I would surface the <b>feeder-supported</b> or <b>Chan Sow Lin</b> option because they reduce walking. I won't claim lift/stair accessibility unless verified data is available.`;
  }
  return `<span class="bot-highlight">Ask me about this mobility journey.</span>
    I currently understand questions about <b>buses/feeders, station conditions, pedestrian walking, fares, crowding, service status, accessibility, and route recommendations</b>.`;
}
document.querySelectorAll("[data-botq]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    botAnswer.innerHTML=botResponse(btn.dataset.botq);
  });
});
botForm.addEventListener("submit",e=>{
  e.preventDefault();
  const q=botInput.value.trim();
  if(!q)return;
  botAnswer.innerHTML=botResponse("",q);
  botInput.value="";
});

// Accessible docking alternatives
function dockBot(side){
  bot.style.top="";
  bot.style.bottom=window.innerWidth<=900?"145px":"88px";
  if(side==="left"){bot.style.left="22px";bot.style.right="";}
  else {bot.style.right=window.innerWidth<=900?"12px":"22px";bot.style.left="";}
}
document.querySelector("#botDockLeft").addEventListener("click",()=>dockBot("left"));
document.querySelector("#botDockRight").addEventListener("click",()=>dockBot("right"));

// Pointer drag. Only starts on robot avatar, not the answer bubble.
botAvatar.addEventListener("pointerdown",e=>{
  if(e.button!==undefined && e.button!==0)return;
  dragging=false;
  dragStart={x:e.clientX,y:e.clientY};
  const rect=bot.getBoundingClientRect();
  botStart={left:rect.left,top:rect.top};
  botAvatar.setPointerCapture?.(e.pointerId);
});
botAvatar.addEventListener("pointermove",e=>{
  if(!dragStart || !botStart)return;
  const dx=e.clientX-dragStart.x, dy=e.clientY-dragStart.y;
  if(Math.abs(dx)+Math.abs(dy)<7)return;
  dragging=true;
  bot.classList.add("dragging");
  const width=bot.offsetWidth, height=bot.offsetHeight;
  const left=Math.max(6,Math.min(window.innerWidth-width-6,botStart.left+dx));
  const top=Math.max(72,Math.min(window.innerHeight-height-8,botStart.top+dy));
  bot.style.left=left+"px";
  bot.style.top=top+"px";
  bot.style.right="";
  bot.style.bottom="";
});
function endBotDrag(){
  if(dragStart){
    setTimeout(()=>{dragging=false;bot.classList.remove("dragging")},0);
  }
  dragStart=null;botStart=null;
}
botAvatar.addEventListener("pointerup",endBotDrag);
botAvatar.addEventListener("pointercancel",endBotDrag);
