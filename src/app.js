(function(){
  "use strict";
  /* ======================================================================
     CONFIG. Nothing here is a real credential. Fill it in at deploy time,
     either here or by setting window.NOETIS_CONFIG = {...} in an inline script
     that runs before this one. See BACKEND_SETUP.md.
     ====================================================================== */
  var CFG = {
    SIGNUP_ENDPOINT: "https://bvrqomgxijnjblieddrz.supabase.co/rest/v1/first_list", // e.g. https://formspree.io/f/xxxx or https://<project>.supabase.co/rest/v1/first_list
    SIGNUP_MODE: "supabase",  // "json" | "formspree" | "supabase"
    ANSWERS_ENDPOINT: "https://bvrqomgxijnjblieddrz.supabase.co/rest/v1/first_list_answers", // optional: where step 2 answers go (defaults to SIGNUP_ENDPOINT, except supabase)
    SUPABASE_ANON_KEY: "sb_publishable_ZxobYACLK3qDxJ8FkMRo8A_OyTc4hwB", // public anon key only, never a service key
    SITE_URL: "",             // e.g. https://noetis.example, used for canonical + share links
    CONTROLLER_NAME: "",      // legal name responsible for the data
    CONTACT_EMAIL: "",        // privacy contact
    TIMEOUT_MS: 12000
  };
  var over = window.NOETIS_CONFIG || {};
  for(var ck in over) if(Object.prototype.hasOwnProperty.call(over, ck)) CFG[ck] = over[ck];

  var doc = document.documentElement;
  doc.classList.add("js");
  var $ = function(id){ return document.getElementById(id); };
  function store(kind){ try{ return window[kind]; }catch(e){ return null; } }
  var LS = store("localStorage"), SS = store("sessionStorage");
  function lsGet(k){ try{ return LS ? LS.getItem(k) : null; }catch(e){ return null; } }
  function lsSet(k,v){ try{ if(LS) LS.setItem(k,v); }catch(e){} }
  function ssGet(k){ try{ return SS ? SS.getItem(k) : null; }catch(e){ return null; } }
  function ssSet(k,v){ try{ if(SS) SS.setItem(k,v); }catch(e){} }

  /* ---------- Motion preference: system setting, overridable on the page ---------- */
  var sysReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionPref = lsGet("noetis-motion");              // "off" | "on" | null
  var calm = motionPref === "off" || (sysReduce && motionPref !== "on");
  if(calm) doc.classList.add("calm");
  var mt = $("motionToggle");
  mt.setAttribute("aria-pressed", String(calm));
  mt.textContent = calm ? "Turn motion on" : "Reduce motion";
  mt.addEventListener("click", function(){ lsSet("noetis-motion", calm ? "on" : "off"); location.reload(); });

  var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  function sm(a,b,x){ x = Math.min(1,Math.max(0,(x-a)/(b-a))); return x*x*(3-2*x); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function now(){ return performance.now(); }

  /* ======================================================================
     EYES. One engine, one rAF loop that sleeps when nothing is moving.
     Rendered openness = base (owner) × mood squint × blink.
     ====================================================================== */
  var eyeSeq = 0, eyes = [];
  function makeEye(host, o){
    o = o || {}; var id = "ey" + (++eyeSeq), sw = o.stroke || 5.5, r = 50 - sw/2 - .4;
    host.innerHTML =
      '<svg viewBox="0 0 100 100" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+
      '<defs><clipPath id="'+id+'c"><path class="clip"/></clipPath></defs>'+
      '<g clip-path="url(#'+id+'c)"><rect width="100" height="100" fill="#fffaee"/>'+
      '<g class="iris"><g class="iris-in"><circle r="15.5" fill="#050505"/><circle cx="5" cy="-5.5" r="4.6" fill="#fffaee"/><circle cx="-5.2" cy="5.2" r="1.9" fill="#fffaee"/></g></g></g>'+
      '<circle cx="50" cy="50" r="'+r+'" stroke="currentColor" stroke-width="'+sw+'"/>'+
      '<path class="lid-top" stroke="currentColor" stroke-width="'+sw+'"/>'+
      '<path class="lid-bot" stroke="currentColor" stroke-width="'+sw+'"/>'+
      '<path class="lash" stroke="currentColor" stroke-width="'+sw+'" d="M38 56.5 L36.6 63.5 M50 59.5 L50 66.5 M62 56.5 L63.4 63.5"/>'+
      '</svg>';
    var svg = host.firstChild;
    var e = {host:host, base:o.open?1:0, mul:1, mulT:1, dil:1, dilT:1, lx:0, ly:0, tx:0, ty:0,
      track:o.track!==false, blinks:!!o.blink, vis:false, tw:null, bl:null, look:null, drawn:"",
      clip:svg.querySelector(".clip"), top:svg.querySelector(".lid-top"), bot:svg.querySelector(".lid-bot"),
      iris:svg.querySelector(".iris"), irisIn:svg.querySelector(".iris-in"), lash:svg.querySelector(".lash")};
    eyes.push(e); draw(e, true);
    if(eyeIO) eyeIO.observe(host); else e.vis = true;
    return e;
  }
  function draw(e, force){
    var t = e.base * e.mul;
    if(e.bl){ var bp = (now()-e.bl.s)/e.bl.ms; if(bp >= 1){ e.bl = null; } else { var c = bp < .35 ? bp/.35 : 1-(bp-.35)/.65; t *= 1 - (c*c*(3-2*c)); } }
    t = Math.max(0, Math.min(1, t));
    var key = t.toFixed(3)+"|"+e.lx.toFixed(2)+"|"+e.ly.toFixed(2)+"|"+e.dil.toFixed(3);
    if(!force && key === e.drawn) return;
    e.drawn = key;
    var x0=lerp(26,15,t), x1=lerp(74,85,t), y=lerp(45,50,t), qt=lerp(64,15,t), qb=lerp(64,83,t);
    var top="M"+x0.toFixed(2)+" "+y.toFixed(2)+" Q50 "+qt.toFixed(2)+" "+x1.toFixed(2)+" "+y.toFixed(2);
    e.top.setAttribute("d", top);
    e.bot.setAttribute("d", "M"+x0.toFixed(2)+" "+y.toFixed(2)+" Q50 "+qb.toFixed(2)+" "+x1.toFixed(2)+" "+y.toFixed(2));
    e.clip.setAttribute("d", top+" Q50 "+qb.toFixed(2)+" "+x0.toFixed(2)+" "+y.toFixed(2)+" Z");
    e.lash.style.opacity = String(Math.max(0, 1-t*3).toFixed(2));
    e.iris.setAttribute("transform", "translate("+(50+e.lx).toFixed(2)+" "+(50+e.ly).toFixed(2)+")");
    e.irisIn.setAttribute("transform", "scale("+e.dil.toFixed(3)+")");
  }
  function setEye(e, t){ e.tw = null; e.base = t; draw(e, true); }
  function animateEye(e, from, to, ms, done){
    if(calm){ e.base = to; draw(e, true); if(done) done(); return; }
    e.tw = {from:from, to:to, s:now(), ms:ms, done:done}; kickEyes();
  }
  function blink(e, ms){ if(calm || !e.vis) return; e.bl = {s:now(), ms:ms||380}; kickEyes(); }
  var eyeIO = ("IntersectionObserver" in window) ? new IntersectionObserver(function(ents){
    ents.forEach(function(en){ eyes.forEach(function(e){ if(e.host === en.target){ e.vis = en.isIntersecting; if(e.vis){ kickEyes(); scheduleBlink(e); } } }); });
  }) : null;
  if(!eyeIO) eyes.forEach(function(e){ e.vis = true; });

  // Mood state.
  var mood = "neutral", ptr = null, ptrAt = 0, interestEl = null, curiousEl = null, overUntil = 0, drowsy = false, recog = null;
  function scheduleBlink(e){
    if(calm || !e.blinks || e.blinkT) return;
    e.blinkT = setTimeout(function(){
      e.blinkT = null;
      if(document.hidden || !e.vis) return;                // resumes when it becomes visible again
      if(!drowsy && e.base > .97 && !e.tw) blink(e, 360);
      scheduleBlink(e);
    }, 4200 + Math.random()*5200);
  }
  var eyeRun = false;
  function kickEyes(){ if(calm || eyeRun || document.hidden) return; eyeRun = true; requestAnimationFrame(eyeFrame); }
  function eyeFrame(ts){
    var t = now(), busy = false;
    mood = t < overUntil ? "overwhelmed" : interestEl ? "interested" : curiousEl ? "curious" : drowsy ? "drowsy" : "neutral";
    var mulT = mood === "overwhelmed" ? .55 : mood === "drowsy" ? .42 : 1;
    var dilT = mood === "interested" ? 1.3 : mood === "curious" ? 1.12 : mood === "drowsy" ? .9 : 1;
    var lookAt = interestEl || curiousEl;
    var lr = lookAt ? lookAt.getBoundingClientRect() : null;
    var recent = ptr && t - ptrAt < 3000;
    for(var i=0;i<eyes.length;i++){
      var e = eyes[i];
      if(e.tw){
        var p = Math.min(1,(t-e.tw.s)/e.tw.ms), k = p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        e.base = e.tw.from + (e.tw.to-e.tw.from)*k;
        if(p >= 1){ var d = e.tw.done; e.tw = null; if(d) d(); }
        busy = true;
      }
      if(!e.vis){ continue; }
      if(e.bl) busy = true;
      if(e.track){
        e.mulT = mulT; e.dilT = dilT;
        var r = e.host.getBoundingClientRect();
        if(e.look){ e.tx = e.look.x; e.ty = e.look.y; if(t > e.look.until) e.look = null; }
        else if(lr || recent){
          var px = lr ? lr.left+lr.width/2 : ptr.x, py = lr ? lr.top+lr.height/2 : ptr.y;
          var dx = px-(r.left+r.width/2), dy = py-(r.top+r.height/2), dd = Math.hypot(dx,dy)||1, kk = Math.min(1,dd/350);
          e.tx = dx/dd*9*kk; e.ty = dy/dd*5*kk;
        } else { e.tx = 0; e.ty = 0; }
      }
      e.mul += (e.mulT-e.mul)*.08; e.dil += (e.dilT-e.dil)*.08;
      e.lx += (e.tx-e.lx)*.06; e.ly += (e.ty-e.ly)*.06;
      if(Math.abs(e.mulT-e.mul) > .002 || Math.abs(e.dilT-e.dil) > .002 || Math.abs(e.tx-e.lx) > .05 || Math.abs(e.ty-e.ly) > .05) busy = true;
      else { e.mul = e.mulT; e.dil = e.dilT; }
      draw(e);
    }
    if(t < overUntil) busy = true;
    if(busy && !document.hidden) requestAnimationFrame(eyeFrame); else eyeRun = false;
  }

  // Inputs that drive moods.
  var interactiveSel = "a[href],button,input,textarea,label.chip,#fieldWrap";
  var ctaSel = ".js-join,.submit,#saveTicket";
  var lastCurious = 0;
  window.addEventListener("pointermove", function(ev){
    ptr = {x:ev.clientX, y:ev.clientY}; ptrAt = now(); wake();
    var tgt = ev.target && ev.target.closest ? ev.target : null;
    interestEl = tgt ? tgt.closest(ctaSel) : null;
    if(ptrAt - lastCurious > 120){
      lastCurious = ptrAt; curiousEl = null;
      if(!interestEl){
        var best = 140, list = document.querySelectorAll(interactiveSel);
        for(var i=0;i<list.length;i++){
          var b = list[i].getBoundingClientRect(); if(!b.width || b.bottom < 0 || b.top > innerHeight) continue;
          var dx = Math.max(b.left-ptr.x, 0, ptr.x-b.right), dy = Math.max(b.top-ptr.y, 0, ptr.y-b.bottom), d = Math.hypot(dx,dy);
          if(d < best){ best = d; curiousEl = list[i]; }
        }
      }
    }
    kickEyes();
  }, {passive:true});
  document.addEventListener("pointerdown", function(ev){
    if(ev.pointerType === "mouse") return;
    // Touch has no hover: eyes look at the tap, and tapping a call to action reads as interest.
    ptr = {x:ev.clientX, y:ev.clientY}; ptrAt = now(); wake();
    var c = ev.target.closest && ev.target.closest(ctaSel);
    if(c){ interestEl = c; setTimeout(function(){ if(interestEl === c) interestEl = null; kickEyes(); }, 900); }
    kickEyes();
  }, {passive:true});
  document.addEventListener("focusin", function(ev){ var c = ev.target.closest && ev.target.closest(ctaSel); if(c){ interestEl = c; kickEyes(); } });
  document.addEventListener("focusout", function(){ interestEl = null; kickEyes(); });
  document.addEventListener("pointerleave", function(){ interestEl = null; curiousEl = null; kickEyes(); });

  // Drowsy after 20 s without input; the clock stops while the tab is hidden.
  var idleT = null, IDLE = 20000;
  function wake(){
    clearTimeout(idleT); idleT = document.hidden ? null : setTimeout(function(){ drowsy = true; kickEyes(); }, IDLE);
    if(drowsy){ drowsy = false; kickEyes(); }
  }
  ["keydown","wheel","touchstart"].forEach(function(n){ window.addEventListener(n, wake, {passive:true}); });
  document.addEventListener("visibilitychange", function(){
    if(document.hidden){ clearTimeout(idleT); idleT = null; }
    else { wake(); eyes.forEach(scheduleBlink); kickEyes(); }
  });
  wake();

  /* ======================================================================
     Scroll: header state, progress bar, scroll speed (one listener)
     ====================================================================== */
  var header = $("top"), prog = $("progress"), lastY = scrollY, lastT = now(), programmatic = false, scrollQueued = false;
  function onScroll(){
    if(scrollQueued) return; scrollQueued = true;
    requestAnimationFrame(function(){
      scrollQueued = false;
      var t = now(), y = scrollY, v = Math.abs(y-lastY)/Math.max(16, t-lastT);
      lastY = y; lastT = t;
      if(!programmatic && v > 2.2 && !calm){ overUntil = t + 650; kickEyes(); }
      header.classList.toggle("scrolled", y > 40);
      var h = doc.scrollHeight - innerHeight;
      prog.style.transform = "scaleX("+(h>0?Math.min(1,y/h):0).toFixed(4)+")";
    });
  }
  window.addEventListener("scroll", function(){ onScroll(); if(dreamKick) dreamKick(); wake(); }, {passive:true});
  onScroll();

  /* ======================================================================
     Return visits (device memory only, never proof of registration)
     ====================================================================== */
  var TICKET_KEY = "noetis-ticket", DAY = 864e5;
  function readTicket(){
    var t = null; try{ t = JSON.parse(lsGet(TICKET_KEY) || "null"); }catch(e){}
    if(!t || !t.ref || !t.exp || t.exp < Date.now()){ return null; }
    return t;
  }
  var ticket = readTicket();
  var seenBefore = lsGet("noetis-seen") === "1";
  lsSet("noetis-seen", "1");
  if(ticket) $("kickerText").textContent = "You’re already on the First List.";
  else if(seenBefore) $("kickerText").textContent = "Welcome back. You noticed before.";

  /* ======================================================================
     Sound: off by default. A scored opening, then silence.
     ====================================================================== */
  var soundBtn = $("sound"), invite = $("soundInvite"), ctx = null, master = null, bus = null, verb = null, noiseG = null, noiseF = null, soundOn = false;
  var scored = {low:false, bell:false};
  function mtof(m){ return 440*Math.pow(2,(m-69)/12); }
  function initAudio(){
    var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp);
    verb = ctx.createConvolver();
    var len = ctx.sampleRate*4, imp = ctx.createBuffer(2,len,ctx.sampleRate);
    for(var c=0;c<2;c++){ var d = imp.getChannelData(c); for(var i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,3); }
    verb.buffer = imp;
    var wet = ctx.createGain(); wet.gain.value = .6; verb.connect(wet); wet.connect(master);
    bus = ctx.createGain(); bus.gain.value = .6; bus.connect(master); bus.connect(verb);
    // The feed's hiss: loud while the noise is dense, thinning to nothing as it organises.
    var nb = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate), nd = nb.getChannelData(0);
    for(var j=0;j<nd.length;j++) nd[j] = Math.random()*2-1;
    var ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    noiseF = ctx.createBiquadFilter(); noiseF.type = "bandpass"; noiseF.frequency.value = 2400; noiseF.Q.value = .7;
    noiseG = ctx.createGain(); noiseG.gain.value = 0;
    ns.connect(noiseF); noiseF.connect(noiseG); noiseG.connect(master); ns.start();
    return true;
  }
  function bell(f, t, vol, len){
    var g = ctx.createGain(), g2 = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator(); len = len || 4;
    o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f*2.76;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+len);
    g2.gain.setValueAtTime(0,t); g2.gain.linearRampToValueAtTime(vol*.25,t+.005); g2.gain.exponentialRampToValueAtTime(.0001,t+len*.3);
    o.connect(g); o2.connect(g2); g.connect(bus); g2.connect(bus);
    o.start(t); o2.start(t); o.stop(t+len+.1); o2.stop(t+len*.3+.1);
  }
  function blip(){ // one notification-like tick from the feed
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = [1568,1760,2093,2349,1175][Math.floor(Math.random()*5)];
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.025,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+.12);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t+.14);
  }
  function lowShift(){
    var t = ctx.currentTime;
    [[38,.09],[45,.05]].forEach(function(v){
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = mtof(v[0]);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v[1],t+1.6); g.gain.linearRampToValueAtTime(0,t+5.5);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+5.6);
    });
  }
  // Called by the opening with its progress. Silence everywhere else.
  function score(p){
    if(!soundOn || !ctx) return;
    var dens = 1 - sm(.1,.34,p), t = ctx.currentTime;
    noiseG.gain.setTargetAtTime(.045*dens, t, .25);
    noiseF.frequency.setTargetAtTime(lerp(700, 2600, dens), t, .3);
    if(Math.random() < dens*dens*.18) blip();
    if(p > .36 && !scored.low){ scored.low = true; lowShift(); }
    if(p < .3) scored.low = false;
  }
  function climaxBell(){
    if(!soundOn || !ctx || scored.bell) return; scored.bell = true;
    var t = ctx.currentTime + .05; bell(mtof(74), t, .09, 5); bell(mtof(81), t+.5, .05, 5);
    noiseG.gain.setTargetAtTime(0, t, .4);
  }
  function chime(i){
    if(!soundOn || !ctx) return;
    var notes = [74,76,78,81,83,86]; bell(mtof(notes[i % notes.length]), ctx.currentTime+.01, .07, 2.5);
  }
  function setSound(on){
    if(on && !ctx && !initAudio()) return;
    soundOn = on;
    if(ctx){
      if(on && ctx.state === "suspended") ctx.resume();
      var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(on ? .9 : 0, t + (on ? 1.2 : .6));
      if(!on) noiseG.gain.setTargetAtTime(0, t, .2);
    }
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.querySelector(".label").textContent = on ? "Sound on" : "Sound off";
    invite.textContent = on ? "Turn sound off" : "Turn sound on for the opening";
  }
  soundBtn.addEventListener("click", function(){ setSound(!soundOn); });
  invite.addEventListener("click", function(){ setSound(!soundOn); });
  document.addEventListener("visibilitychange", function(){ if(!ctx) return; if(document.hidden) ctx.suspend(); else if(soundOn) ctx.resume(); });

  /* ======================================================================
     Eyelids: a short blink between places (never blocks scrolling)
     ====================================================================== */
  var lids = $("lids");
  function lidBlink(closeMs, openMs, mid){
    if(calm){ if(mid) mid(); return; }
    lids.style.setProperty("--ld", (closeMs/1000)+"s");
    lids.classList.add("go");
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ lids.classList.add("shut"); }); });
    setTimeout(function(){
      if(mid) mid();
      lids.style.setProperty("--ld", (openMs/1000)+"s");
      requestAnimationFrame(function(){ lids.classList.remove("shut"); setTimeout(function(){ lids.classList.remove("go"); }, openMs + 30); });
    }, closeMs + 20);
  }

  /* ======================================================================
     OPENING: noise → noise organises → an eye → the eye becomes the O
     ====================================================================== */
  var heroEye = makeEye($("heroEye"), {stroke:8.2});
  var dream = $("hero"), stage = $("dreamStage"), dreamHero = $("dreamHero"), markWrap = $("markWrap"), markImg = $("markImg");
  var kicker = $("heroKicker"), dreamKick = null, collapsed = true, climaxed = false;
  function finalHero(){ setEye(heroEye, 1); heroEye.blinks = true; scheduleBlink(heroEye); }
  function recognise(){
    // A returning member: the eye glances toward them, then one slow blink.
    if(!ticket || calm || recog) return; recog = true;
    setTimeout(function(){ heroEye.look = {x:-7, y:2, until:now()+900}; kickEyes(); setTimeout(function(){ blink(heroEye, 900); }, 1000); }, 600);
  }
  function collapse(){
    if(collapsed) return; collapsed = true;
    ssSet("noetis-dream", "1");
    var before = dream.offsetHeight;
    dream.classList.remove("run", "climax");
    [heroEye.host, markImg, kicker].forEach(function(el){ el.style.opacity = ""; el.style.transform = ""; });
    stage.style.removeProperty("--dbg"); stage.style.removeProperty("--dfg"); header.classList.remove("on-red");
    heroEye.tw = null; finalHero();
    var removed = before - dream.offsetHeight;
    if(removed > 0 && scrollY > 0) window.scrollTo(0, Math.max(0, scrollY - removed));
    recognise();
  }
  window.noetisCollapse = collapse;

  (function(){
    var run = !calm && ssGet("noetis-dream") !== "1";
    if(!run){ finalHero(); recognise(); return; }
    collapsed = false; dream.classList.add("run");
    var drift = $("drift"), hint = $("dreamHint"), meter = $("dreamMeter"), meterWrap = $("meterWrap"), skipBtn = $("dreamSkip");
    var dls = Array.prototype.slice.call(document.querySelectorAll(".dl"));
    var TOK = ["Sponsored","♥ 1,204","For you","Swipe up","LIKE","Scroll","SKIP","Breaking:","3 new notifications","You won’t believe","TRENDING","Limited time","Tap to see more","Seen 2h ago","Watch till the end","70% OFF","FOLLOW","+99","Recommended","Don’t miss this","Autoplay","NEXT","Viral","12:47 AM","Unread (38)","Hot take","Just for you","SHOP NOW","Look","Wait for it","Swipe →","10M views","Reply","Share","BUY","Up next","Ad","REFRESH","Stories","LIVE","More like this","Keep watching","…","Notifications on?","Seen","Like"];
    var TRAVEL = 3600, F = 640, flyers = [], n = TOK.length;
    TOK.forEach(function(w,i){
      var el = document.createElement("span"); el.className = "dw "+["s","c","m"][i%3]; el.textContent = w; drift.appendChild(el);
      var a = i*2.39996 + Math.random()*.4, R = 330 + Math.random()*620, u = (i/n)*Math.PI*2;
      flyers.push({el:el, X:Math.cos(a)*R*1.3, Y:Math.sin(a)*R*.72, z:220 + (i/n)*TRAVEL*1.1 + Math.random()*140, ph:Math.random()*6.28,
        gx:Math.cos(u), gy:Math.sin(u)*Math.abs(Math.sin(u)), on:false, last:""});
    });
    var cur = 0, running = false, lastMeter = -1, climaxAt = 0;
    var W2 = 0, H2 = 0, k3 = 1;
    function measure(){ W2 = innerWidth/2; H2 = innerHeight/2; k3 = Math.max(.42, Math.min(1.1, innerWidth/1250)); }
    measure(); window.addEventListener("resize", function(){ measure(); dreamKick(); });

    skipBtn.addEventListener("click", function(){ collapse(); window.scrollTo(0,0); $("dreamHero").querySelector(".js-join").focus({preventScroll:true}); });
    // Keyboard users who tab into the hero get the final state immediately.
    dreamHero.addEventListener("focusin", function(){ if(!collapsed){ collapse(); window.scrollTo(0,0); } });

    function startClimax(){
      if(climaxed) return; climaxed = true; climaxAt = now();
      // Settle, one blink, then the headline word by word, then the call to action.
      setTimeout(function(){ if(!collapsed && climaxed) blink(heroEye, 420); }, 700);
      setTimeout(function(){ if(!collapsed && climaxed){ dream.classList.add("climax"); climaxBell(); } }, 1050);
    }
    var hws = dreamHero.querySelectorAll(".hw");
    for(var hi=0; hi<hws.length; hi++) hws[hi].style.transitionDelay = (hi*.16)+"s";
    dreamHero.querySelector(".hero-cta").style.transitionDelay = (hws.length*.16+.25)+"s";

    function frame(){
      if(collapsed){ running = false; return; }
      var r = dream.getBoundingClientRect(), tot = r.height - innerHeight;
      var target = tot>0 ? Math.min(1,Math.max(0,-r.top/tot)) : 1;
      if(r.bottom < innerHeight - 40 && cur > .97){ running = false; collapse(); return; }
      cur += (target-cur)*.12;
      if(Math.abs(target-cur) < .0004) cur = target;
      var p = cur;
      score(p);

      // Phase 1–2: the feed drifts past, then gathers onto the outline of an eye.
      var g = sm(.15,.34,p), gone = sm(.36,.44,p), cam = Math.min(1,p/.34)*TRAVEL;
      drift.style.opacity = (1-gone).toFixed(3);
      if(gone < .999){
        var A = Math.min(innerWidth*.42, innerHeight*.62, 470)*(1-.25*gone), B = A*.42;
        for(var i=0;i<flyers.length;i++){
          var f = flyers[i], d = f.z - cam, o3 = d > 40 ? sm(2400,1300,d)*sm(50,240,d) : 0;
          var s = d > 40 ? F/d : F/40;
          var sx = W2 + f.X*k3*s, sy = H2 + f.Y*k3*s;
          var gx = W2 + f.gx*A, gy = H2 + f.gy*B;
          var x = lerp(sx, gx, g), y = lerp(sy, gy, g), sc = lerp(Math.min(s,2.4), .46, g), o = lerp(o3*.85, .9, g);
          if(o < .01){ if(f.on){ f.on = false; f.el.style.visibility = "hidden"; } continue; }
          if(!f.on){ f.on = true; f.el.style.visibility = "visible"; }
          var tr = "translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0) translate(-50%,-50%) scale("+sc.toFixed(3)+")";
          if(tr !== f.last){ f.last = tr; f.el.style.transform = tr; }
          f.el.style.opacity = o.toFixed(2);
        }
      }
      dls.forEach(function(el){
        var a = +el.dataset.a, b = +el.dataset.b, v = Math.min(sm(a,a+.07,p), 1-sm(b-.07,b,p)), local = (p-a)/(b-a);
        el.style.opacity = v.toFixed(3);
        el.style.transform = "scale("+(.95+local*.08).toFixed(4)+")";
      });

      // Phase 3: the eye is recognisable, opens slowly. Phase 4: it travels into the O and NOETIS appears.
      var ev = sm(.34,.4,p), eo = sm(.38,.54,p), em = sm(.55,.68,p), mk = sm(.57,.69,p);
      if(!heroEye.tw && !heroEye.bl){ heroEye.base += (eo*eo*(3-2*eo) - heroEye.base)*.08; draw(heroEye); }
      heroEye.host.style.opacity = ev.toFixed(3);
      var wr2 = markWrap.getBoundingClientRect(), ew = wr2.width*.142, ecx = wr2.left + wr2.width*(.2114+.071), ecy = wr2.top + ew/2;
      var K = Math.min(innerWidth*.62, innerHeight*.42, 340)/ew, q = 1-em;
      heroEye.host.style.transform = "translate("+((W2-ecx)*q).toFixed(1)+"px,"+((H2-ecy)*q).toFixed(1)+"px) scale("+(1+(K-1)*q).toFixed(4)+")";
      markImg.style.opacity = mk.toFixed(3);
      markImg.style.transform = "scale("+(.35+.65*mk).toFixed(4)+")";
      var kv = sm(+kicker.dataset.in, +kicker.dataset.in+.05, p);
      kicker.style.opacity = kv.toFixed(3); kicker.style.transform = "translateY("+((1-kv)*14).toFixed(1)+"px)";

      // Climax (time based, not scroll based) once the eye has landed in the O.
      if(em > .995 && p > .69) startClimax();
      if(p < .6 && climaxed){ climaxed = false; dream.classList.remove("climax"); scored.bell = false; }

      // Brick red washes in with the noise and drains away before the eye.
      var red = sm(.03,.12,p)*(1-sm(.3,.37,p)), c3 = function(a,b){ return Math.round(a+(b-a)*red); };
      stage.style.setProperty("--dbg","rgb("+c3(246,163)+","+c3(231,58)+","+c3(193,42)+")");
      stage.style.setProperty("--dfg","rgb("+c3(5,246)+","+c3(5,231)+","+c3(5,193)+")");
      header.classList.toggle("on-red", red > .5);

      meter.style.transform = "scaleY("+Math.min(1,p/.75).toFixed(3)+")";
      var mv = Math.round(Math.min(1,p/.75)*100);
      if(mv !== lastMeter){ lastMeter = mv; meterWrap.setAttribute("aria-valuenow", String(mv)); meterWrap.classList.toggle("on", mv > 0); }
      hint.style.opacity = (1 - sm(.12,.2,p)).toFixed(3);
      var uiOff = p > .62;
      skipBtn.parentNode.style.opacity = uiOff ? "0" : ""; skipBtn.parentNode.style.visibility = uiOff ? "hidden" : "";
      invite.parentNode.style.opacity = uiOff ? "0" : ""; invite.parentNode.style.visibility = uiOff ? "hidden" : "";
      meterWrap.style.visibility = p > .74 ? "hidden" : "";

      var settled = cur === target && Math.abs(heroEye.base - eo*eo*(3-2*eo)) < .002;
      if(settled){ running = false; return; }
      requestAnimationFrame(frame);
    }
    dreamKick = function(){ if(!running && !collapsed){ running = true; requestAnimationFrame(frame); } };
    dreamKick();

    // Wheel glide only while inside the opening. Trackpads and touch keep their own feel.
    if(finePointer){
      var gCur = 0, gTarget = 0, gliding = false;
      window.addEventListener("wheel", function(e){
        if(collapsed || e.ctrlKey || e.defaultPrevented) return;
        if(scrollY > dream.offsetHeight - innerHeight) return;
        if(Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if(e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && !gliding) return;
        e.preventDefault();
        if(!gliding){ gCur = scrollY; gTarget = scrollY; }
        var dlt = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
        gTarget = Math.max(0, Math.min(doc.scrollHeight - innerHeight, gTarget + dlt));
        if(!gliding){ gliding = true; requestAnimationFrame(glide); }
      }, {passive:false});
      var glide = function(){
        if(Math.abs(scrollY - Math.round(gCur)) > 4 || collapsed){ gliding = false; return; }
        gCur += (gTarget-gCur)*.14;
        if(Math.abs(gTarget-gCur) < .5){ gCur = gTarget; window.scrollTo(0, gCur); gliding = false; return; }
        window.scrollTo(0, gCur); requestAnimationFrame(glide);
      };
    }
  })();

  /* ======================================================================
     Navigation to a place: collapse first, wait for layout, measure, blink, focus.
     ====================================================================== */
  function headH(){ return header.getBoundingClientRect().bottom; }
  function goTo(target, focusEl, offset){
    programmatic = true;
    lidBlink(150, 190, function(){
      collapse();
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        var y = target.getBoundingClientRect().top + scrollY - headH() - (offset == null ? 16 : offset);
        window.scrollTo({top:Math.max(0,y), behavior:"instant"});
        if(focusEl) focusEl.focus({preventScroll:true});
        setTimeout(function(){ programmatic = false; lastY = scrollY; }, 200);
      }); });
    });
  }
  document.addEventListener("click", function(ev){
    var a = ev.target.closest && ev.target.closest('a[href^="#"]'); if(!a) return;
    var id = a.getAttribute("href").slice(1);
    if(id === "first-list"){
      ev.preventDefault();
      var panel = $("panel"), joined = !$("done").hidden, pend = !$("pending").hidden, s2 = !$("step2").hidden;
      var focusEl = joined ? $("doneTitle") : pend ? $("pendTitle") : s2 ? $("step2Title") : $("email");
      var tgt = window.matchMedia("(max-width:820px)").matches ? panel : $("first-list").querySelector(".list-grid");
      goTo(tgt, focusEl, 16);
      if(history.replaceState) history.replaceState(null, "", "#first-list");
    } else if(id === "hero"){
      ev.preventDefault(); collapse(); window.scrollTo({top:0, behavior:calm?"instant":"smooth"});
    } else if(id === "experiment"){
      ev.preventDefault(); goTo($("experiment"), $("experiment"), 0);
    }
  });

  /* ======================================================================
     Short reveals; one eyelid blink entering the experiment
     ====================================================================== */
  var riseIO = ("IntersectionObserver" in window && !calm) ? new IntersectionObserver(function(ents){
    ents.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); riseIO.unobserve(en.target); } });
  }, {rootMargin:"0px 0px -8% 0px"}) : null;
  document.querySelectorAll(".rise").forEach(function(el){ if(riseIO) riseIO.observe(el); else el.classList.add("in"); });
  if(!calm && "IntersectionObserver" in window){
    var lidDone = false;
    var lidIO = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting && !lidDone && !programmatic && en.boundingClientRect.top > 0){ lidDone = true; lidBlink(200, 260); lidIO.disconnect(); }
      });
    }, {rootMargin:"0px 0px -55% 0px"});
    lidIO.observe($("experiment"));
  }

  /* ======================================================================
     01 The Noticing Experiment
     ====================================================================== */
  (function(){
    var pairs = {LOOK:"SEE",LIKE:"LOVE",SCAN:"STUDY",FEED:"FUEL",SAVE:"KEEP",SCROLL:"STOP",SWIPE:"STAY",TAP:"TOUCH",VIEW:"VISION",
                 SEEN:"FELT",SKIP:"PAUSE",GLANCE:"GAZE",NEXT:"NOW",PASS:"NOTICE"};
    var colA = ["LOOK","LIKE","SCAN","FEED","SAVE","SCROLL","SWIPE","TAP","VIEW"];
    var colB = ["TAP","VIEW","SEEN","SKIP","GLANCE","NEXT","PASS","LOOK","LIKE"];
    var field = $("field"), cells = "";
    for(var r=0;r<9;r++){ for(var c=0;c<6;c++){
      var w = c%2?colB[r]:colA[r];
      cells += '<span class="wd'+(c>2?" c-hide":"")+'"><span class="s">'+w+'</span><span class="d">'+pairs[w]+'</span></span>';
    }}
    field.innerHTML = cells;
    var wordEls = Array.prototype.slice.call(field.querySelectorAll(".wd"));
    var letters = [
      {ch:"N", g:1, r:1, gm:1, rm:0}, {ch:"O", g:4, r:2, gm:2, rm:2}, {ch:"E", g:3, r:5, gm:1, rm:4},
      {ch:"T", g:2, r:7, gm:2, rm:6}, {ch:"I", g:5, r:6, gm:1, rm:8}, {ch:"S", g:2, r:3, gm:2, rm:5}
    ];
    var slots = $("slots"), countEl = $("count"), live = $("lensLive"), hintBtn = $("hintBtn"), showBtn = $("showMe");
    slots.innerHTML = letters.map(function(l){ return "<span>"+l.ch+"</span>"; }).join("");
    var slotEls = slots.children, wrapEl = $("fieldWrap"), ring = $("ring");
    letters.forEach(function(l){ var el = document.createElement("span"); el.className = "hidden-letter"; el.setAttribute("aria-hidden","true"); el.textContent = l.ch; wrapEl.appendChild(el); l.el = el; l.found = false; l.op = -1; });
    var mq = window.matchMedia("(max-width:560px)"), coarse = window.matchMedia("(pointer:coarse)").matches;
    if(coarse) $("touchHelp").hidden = false;
    var W=0, H=0, R=110, wordPos=[];
    function measure(){
      W = wrapEl.clientWidth; H = wrapEl.clientHeight; R = Math.max(70, Math.min(125, W*.095));
      ring.style.setProperty("--d", (R*2)+"px");
      var wr = wrapEl.getBoundingClientRect();
      wordPos = wordEls.map(function(el){ var b = el.getBoundingClientRect(); return {x:b.left-wr.left+b.width/2, y:b.top-wr.top+b.height/2, hidden:!b.width, on:false, near:false}; });
      var narrow = mq.matches, cols = narrow?3:6;
      letters.forEach(function(l){ var g = narrow?l.gm:l.g, rr = narrow?l.rm:l.r; l.x = g/cols*W; l.y = (rr+.5)/9*H; l.el.style.left = l.x+"px"; l.el.style.top = l.y+"px"; });
    }
    var pos = {x:0,y:0}, cur = {x:0,y:0}, touched = false, found = 0, done = false, byButton = false, running = false, vis = false, lastHeat = -1, lastBucket = "";
    function setCount(){ countEl.textContent = found + " / 6 noticed"; }
    function kick(){ if(!running && vis && !done){ running = true; requestAnimationFrame(frame); } }
    function markFound(l, i){
      l.found = true; found++; setCount(); chime(found-1);
      live.textContent = "Found "+l.ch+". "+found+" of 6 noticed.";
      l.el.classList.add("found");
      var from = l.el.getBoundingClientRect(), to = slotEls[i].getBoundingClientRect();
      var land = function(){ slotEls[i].classList.add("on"); if(found === letters.length) complete(false); };
      if(calm || !document.body.animate){ land(); return; }
      var fly = document.createElement("span"); fly.className = "flyer"; fly.textContent = l.ch; fly.setAttribute("aria-hidden","true");
      fly.style.fontSize = getComputedStyle(l.el).fontSize; fly.style.left = (from.left+from.width/2)+"px"; fly.style.top = (from.top+from.height/2)+"px";
      document.body.appendChild(fly);
      var dx = to.left+to.width/2-(from.left+from.width/2), dy = to.top+to.height/2-(from.top+from.height/2);
      fly.animate([
        {transform:"translate(-50%,-50%) scale(1.4)"},
        {transform:"translate(calc(-50% + "+dx*.5+"px), calc(-50% + "+(dy*.5-70)+"px)) scale(1.1)", offset:.5},
        {transform:"translate(calc(-50% + "+dx+"px), calc(-50% + "+dy+"px)) scale(.45)"}
      ], {duration:800, easing:"cubic-bezier(.5,0,.3,1)"}).onfinish = function(){ fly.remove(); land(); };
    }
    var ldEye = makeEye($("ldEye"), {stroke:7, track:false});
    function complete(viaButton){
      done = true; byButton = viaButton; wrapEl.classList.add("all");
      letters.forEach(function(l,i){ l.found = true; slotEls[i].classList.add("on"); });
      found = 6; setCount();
      hintBtn.hidden = true; showBtn.textContent = "Play again";
      wordEls.forEach(function(el,i){ el.classList.add("on"); wordPos[i].on = true; el.classList.remove("near"); });
      $("ldLine").textContent = viaButton ? "It was there the whole time." : "You were paying attention.";
      var spans = $("ldWord").children, wr = wrapEl.getBoundingClientRect();
      // The six letters fly from where they were hiding into the word; the O becomes an eye and opens once.
      setEye(ldEye, 0);
      for(var i=0;i<spans.length;i++){
        var sp = spans[i]; sp.classList.add("in");
        if(calm || !sp.animate) continue;
        var b = sp.getBoundingClientRect(), l = letters[i];
        var dx = (wr.left + l.x) - (b.left + b.width/2), dy = (wr.top + l.y) - (b.top + b.height/2);
        sp.animate([{transform:"translate("+dx+"px,"+dy+"px) scale(.4)", opacity:0},{transform:"none", opacity:1}],
          {duration:900, delay:i*90, easing:"cubic-bezier(.2,.8,.2,1)", fill:"backwards"});
      }
      var ln = $("ldLine");
      setTimeout(function(){ animateEye(ldEye, 0, 1, 900, function(){ ln.classList.add("in"); }); if(calm) ln.classList.add("in"); }, calm ? 0 : 1450);
      live.textContent = "All six found: N O E T I S. " + $("ldLine").textContent;
      running = false;
    }
    function reset(){
      done = false; byButton = false; found = 0; setCount(); wrapEl.classList.remove("all");
      wordEls.forEach(function(el,i){ el.classList.remove("on","near"); if(wordPos[i]) { wordPos[i].on = false; wordPos[i].near = false; } });
      letters.forEach(function(l,i){ l.found = false; l.op = -1; slotEls[i].classList.remove("on"); l.el.classList.remove("found"); l.el.style.opacity = ""; });
      var spans = $("ldWord").children; for(var i=0;i<spans.length;i++) spans[i].classList.remove("in");
      $("ldLine").classList.remove("in"); setEye(ldEye, 0);
      hintBtn.hidden = false; showBtn.textContent = "Reveal all"; live.textContent = "Reset. 0 of 6 noticed.";
      kick();
    }
    showBtn.addEventListener("click", function(){ if(done) reset(); else complete(true); });
    hintBtn.addEventListener("click", function(){
      // Moves the lens close to the nearest hidden letter, leaving the last step to you.
      var best = null, bd = 1e9;
      letters.forEach(function(l){ if(l.found) return; var d = Math.hypot(l.x-cur.x, l.y-cur.y); if(d < bd){ bd = d; best = l; } });
      if(!best) return;
      var ang = Math.atan2(cur.y-best.y, cur.x-best.x); if(!isFinite(ang)) ang = 0;
      pos.x = Math.min(W, Math.max(0, best.x + Math.cos(ang)*R*.95)); pos.y = Math.min(H, Math.max(0, best.y + Math.sin(ang)*R*.95));
      touched = true; live.textContent = "Warm. A letter is just outside the lens."; kick();
    });
    var grab = false, grabT = null;
    function setGrab(on){ grab = on; wrapEl.classList.toggle("grab", on); clearTimeout(grabT); if(on) grabT = setTimeout(function(){ setGrab(false); }, 6000); }
    function setFrom(e){
      var rect = wrapEl.getBoundingClientRect();
      pos.x = Math.min(W,Math.max(0,e.clientX-rect.left)); pos.y = Math.min(H,Math.max(0,e.clientY-rect.top));
      if(!touched){ cur.x = pos.x; cur.y = pos.y; } touched = true; kick();
    }
    wrapEl.addEventListener("pointermove", function(e){
      if(done) return;
      if(e.pointerType === "mouse" || grab) setFrom(e);
      if(grab) setGrab(true);
    });
    wrapEl.addEventListener("pointerdown", function(e){
      if(done) return;
      setFrom(e);
      if(e.pointerType !== "mouse") setGrab(true);   // first tap moves the lens and grabs it; drag from there
      ring.classList.add("blink"); setTimeout(function(){ ring.classList.remove("blink"); }, 140);
    });
    document.addEventListener("pointerdown", function(e){ if(grab && !wrapEl.contains(e.target)) setGrab(false); });
    wrapEl.addEventListener("keydown", function(e){
      if(done) return;
      var st = Math.max(14, W*.035), k = e.key;
      if(k==="ArrowLeft") pos.x -= st; else if(k==="ArrowRight") pos.x += st;
      else if(k==="ArrowUp") pos.y -= st; else if(k==="ArrowDown") pos.y += st;
      else if(k==="Enter" || k===" "){ e.preventDefault(); ring.classList.add("blink"); setTimeout(function(){ ring.classList.remove("blink"); }, 140); return; }
      else return;
      e.preventDefault(); pos.x = Math.min(W,Math.max(0,pos.x)); pos.y = Math.min(H,Math.max(0,pos.y)); touched = true; kick();
    });
    measure(); pos.x = cur.x = W*.5; pos.y = cur.y = H*.42;
    window.addEventListener("resize", function(){ measure(); kick(); });
    if("IntersectionObserver" in window) new IntersectionObserver(function(ents){ vis = ents[0].isIntersecting; if(vis) kick(); }).observe(wrapEl); else vis = true;
    function frame(){
      if(done || !vis){ running = false; return; }
      cur.x += (pos.x-cur.x)*.18; cur.y += (pos.y-cur.y)*.18;
      if(Math.abs(pos.x-cur.x) < .3 && Math.abs(pos.y-cur.y) < .3){ cur.x = pos.x; cur.y = pos.y; }
      ring.style.transform = "translate("+cur.x.toFixed(1)+"px,"+cur.y.toFixed(1)+"px)";
      for(var i=0;i<wordEls.length;i++){
        var p = wordPos[i]; if(!p || p.hidden) continue;
        var d = Math.hypot(p.x-cur.x, p.y-cur.y), on = d < R*.82, near = d < R*1.7;
        if(on !== p.on){ p.on = on; wordEls[i].classList.toggle("on", on); }
        if(near !== p.near){ p.near = near; wordEls[i].classList.toggle("near", near); }
      }
      var nearest = 1e9, findR = R*(coarse ? .7 : .55);
      letters.forEach(function(l,i){
        if(l.found) return;
        var d = Math.hypot(l.x-cur.x, l.y-cur.y); nearest = Math.min(nearest, d);
        var op = Math.round(sm(R*1.15, R*.35, d)*90)/100;
        if(op !== l.op){ l.op = op; l.el.style.opacity = String(op); }
        if(touched && d < findR) markFound(l, i);
      });
      // Warmer / colder: the ring gains a brick edge as a letter gets close.
      var heat = touched ? Math.round(sm(R*3.4, R*.7, nearest)*20)/20 : 0;
      if(heat !== lastHeat){ lastHeat = heat; ring.style.setProperty("--heat", String(heat)); }
      var bucket = heat > .8 ? "Hot." : heat > .45 ? "Warmer." : heat > .1 ? "Warm." : "Cold.";
      if(touched && bucket !== lastBucket && document.activeElement === wrapEl){ lastBucket = bucket; live.textContent = bucket; }
      if(cur.x === pos.x && cur.y === pos.y){ running = false; return; }
      requestAnimationFrame(frame);
    }
    setCount();
  })();

  /* ======================================================================
     02 Manifesto: a timed reveal, about 180 ms a word
     ====================================================================== */
  (function(){
    var man = $("manifesto"), perspEye = makeEye($("perspEye"), {stroke:6, blink:true});
    if(calm || !("IntersectionObserver" in window)){ setEye(perspEye, 1); return; }
    // Wrap each word (keeping the italic spans) for the reveal.
    function wrapWords(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(ch){
        if(ch.nodeType === 3){
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function(part){
            if(!part) return;
            if(/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, ch);
        } else if(ch.nodeType === 1) wrapWords(ch);
      });
    }
    wrapWords(man); man.classList.add("armed");
    var ws = man.querySelectorAll(".w");
    var io = new IntersectionObserver(function(ents){
      if(!ents[0].isIntersecting) return; io.disconnect();
      var t = 0;
      for(var i=0;i<ws.length;i++){
        (function(el, at){ setTimeout(function(){ el.classList.add("on"); }, at); })(ws[i], t);
        t += 180; if(/eyes\.$/.test(ws[i].textContent)) t += 520;
      }
      animateEye(perspEye, 0, 1, Math.min(2400, t));
      setTimeout(function(){ perspEye.blinks = true; scheduleBlink(perspEye); }, t + 400);
    }, {threshold:.45});
    io.observe(man);
  })();

  /* ======================================================================
     03 Belief rows: a tiny eye each, one gesture when it arrives
     ====================================================================== */
  (function(){
    var rows = document.querySelectorAll(".beliefs li");
    var G = {
      focus: function(e){ e.dilT = 1.35; e.dil = 1; animateEye(e,0,1,700,function(){ setTimeout(function(){ e.dil = 1.35; kickEyes(); },10); }); },
      slow: function(e){ animateEye(e,0,1,700,function(){ setTimeout(function(){ blink(e, 1100); }, 300); }); },
      glance: function(e){ animateEye(e,0,1,600,function(){ e.look = {x:-8,y:0,until:now()+700}; kickEyes(); setTimeout(function(){ e.look = {x:8,y:0,until:now()+700}; kickEyes(); }, 750); }); },
      rest: function(e){ animateEye(e,0,.55,900,function(){ setTimeout(function(){ animateEye(e,.55,1,700); }, 500); }); },
      double: function(e){ animateEye(e,0,1,600,function(){ blink(e,300); setTimeout(function(){ blink(e,300); }, 380); }); }
    };
    rows.forEach(function(li){
      var e = makeEye(li.querySelector(".b-eye"), {stroke:7});
      e.track = false;
      if(calm || !("IntersectionObserver" in window)){ setEye(e, 1); return; }
      var played = false, gesture = G[li.dataset.g] || G.slow;
      var io = new IntersectionObserver(function(ents){ if(ents[0].isIntersecting && !played){ played = true; io.disconnect(); setTimeout(function(){ gesture(e); }, 250); } }, {threshold:.8});
      io.observe(li);
      li.addEventListener("pointerenter", function(){ if(played && !e.tw && !e.bl && e.base > .98) blink(e, 420); });
    });
  })();

  /* ======================================================================
     04 The First List: real submission or an honest failure
     ====================================================================== */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fnv(s){ var h = 2166136261; for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0).toString(36).toUpperCase(); }
  function submitSignup(payload, endpoint){
    var url = endpoint || CFG.SIGNUP_ENDPOINT, mode = CFG.SIGNUP_MODE;
    if(!url || (mode === "supabase" && !CFG.SUPABASE_ANON_KEY)) return Promise.resolve({state:"unconfigured"});
    if(!window.fetch) return Promise.resolve({state:"network"});
    var ac = window.AbortController ? new AbortController() : null, timedOut = false;
    var timer = setTimeout(function(){ timedOut = true; if(ac) ac.abort(); }, CFG.TIMEOUT_MS);
    var headers = {"Content-Type":"application/json", "Accept":"application/json"};
    if(mode === "supabase"){ headers.apikey = CFG.SUPABASE_ANON_KEY; if(/^eyJ/.test(CFG.SUPABASE_ANON_KEY)) headers.Authorization = "Bearer "+CFG.SUPABASE_ANON_KEY; headers.Prefer = "return=minimal"; }
    var p = fetch(url, {method:"POST", headers:headers, body:JSON.stringify(payload), signal:ac ? ac.signal : undefined, credentials:"omit", mode:"cors"})
      .then(function(res){
        return res.text().then(function(txt){
          var body = null; try{ body = txt ? JSON.parse(txt) : null; }catch(e){}
          var code = body && (body.code || (body.error && body.error.code));
          if(res.status === 409 || code === "23505" || (body && (body.status === "duplicate" || body.duplicate === true))) return {state:"duplicate"};
          if(res.ok){
            if(body && body.status === "pending_confirmation") return {state:"pending_confirmation"};
            if(body && (body.ok === false || body.error)) return {state:"server"};
            var num = body && (body.number || body.position_number);
            return {state:"ok", number: (typeof num === "number" && num > 0) ? num : null};
          }
          if(res.status === 400 || res.status === 422) return {state:"invalid"};
          return {state:"server"};
        });
      }, function(){ return {state: timedOut ? "timeout" : "network"}; });
    return Promise.race([p, new Promise(function(res){ setTimeout(function(){ res({state:"timeout"}); }, CFG.TIMEOUT_MS + 500); })])
      .then(function(r){ clearTimeout(timer); return r; });
  }
  var MSG = {
    missing: "Enter your email address.",
    noName: "Tell us your name.",
    noRole: "Pick the one that fits best. “Other” works too.",
    invalid: "That email doesn’t look quite right. Check it for typos.",
    duplicate: "This email is already on the First List. We’ll write to you first.",
    network: "We couldn’t reach the list. Check your connection and try again. Nothing was saved.",
    server: "Something went wrong on our side. Please try again in a minute. Nothing was saved.",
    timeout: "That took too long, so we stopped waiting. Please try again. Nothing was saved yet.",
    unconfigured: "The First List isn’t taking sign-ups on this preview yet. Nothing was sent."
  };
  var form1 = $("form1"), form2 = $("form2"), email = $("email"), fname = $("fname"), errEmail = $("err-email"), status1 = $("status1"), status2 = $("status2");
  var submit1 = $("submit1"), submit2 = $("submit2"), entry = null, inFlight = false, accepted = {};
  function setStatus(el, msg, kind){ el.textContent = msg || ""; el.className = "form-status" + (kind ? " "+kind : ""); }
  function fieldError(msg){
    errEmail.textContent = msg || "";
    if(msg){ email.setAttribute("aria-invalid","true"); } else email.removeAttribute("aria-invalid");
  }
  email.addEventListener("input", function(){ if(email.getAttribute("aria-invalid")) fieldError(""); });
  var errName = $("err-name"), errRole = $("err-role"), roleSet = $("roleSet");
  function nameError(msg){ errName.textContent = msg || ""; if(msg) fname.setAttribute("aria-invalid","true"); else fname.removeAttribute("aria-invalid"); }
  function roleError(msg){ errRole.textContent = msg || ""; if(msg) roleSet.setAttribute("aria-invalid","true"); else roleSet.removeAttribute("aria-invalid"); }
  fname.addEventListener("input", function(){ if(fname.getAttribute("aria-invalid")) nameError(""); });
  form1.addEventListener("change", function(e){ if(e.target.name === "role") roleError(""); });
  function cleanIg(v){ v = v.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i,"").replace(/[\/?#].*$/,"").replace(/^@+/,""); return v ? "@" + v : ""; }
  function cleanLi(v){ v = v.trim(); if(v && !/^https?:\/\//i.test(v)) v = "https://" + v; return v; }
  function busy(btn, on, label){ btn.disabled = on; btn.setAttribute("aria-busy", String(on)); if(label) btn.querySelector(".lbl").textContent = label; }
  form1.addEventListener("submit", function(ev){
    ev.preventDefault(); if(inFlight) return;
    setStatus(status1, "");
    var em = email.value.trim(), nm = fname.value.trim().replace(/\s+/g," ").slice(0,80), roleIn = form1.querySelector("input[name=role]:checked");
    var bad = [];
    nameError(nm ? "" : MSG.noName); if(!nm) bad.push(fname);
    var emMsg = !em ? MSG.missing : !EMAIL_RE.test(em) ? MSG.invalid : "";
    fieldError(emMsg); if(emMsg) bad.push(email);
    roleError(roleIn ? "" : MSG.noRole); if(!roleIn) bad.push(form1.querySelector("input[name=role]"));
    if(bad.length){ bad[0].focus(); return; }
    var ig = cleanIg($("insta").value), li = cleanLi($("linkedin").value);
    var key = em.toLowerCase();
    if(accepted[key]){ setStatus(status1, MSG.duplicate, "info"); return; }
    inFlight = true; busy(submit1, true, "Joining…");
    var payload = {email:em.toLowerCase(), name:nm, role:roleIn.value, instagram:ig || null, linkedin:li || null, field_notes:$("news").checked, source:"prelaunch", consent_at:new Date().toISOString()};
    submitSignup(payload).then(function(res){
      inFlight = false; busy(submit1, false, "Join the First List");
      if(res.state === "ok"){
        accepted[key] = true;
        entry = {email:key, name:nm, number:res.number, ref:fnv(key + "|" + Date.now()).slice(0,6)};
        $("step1").hidden = true; $("step2").hidden = false; $("step2Title").focus({preventScroll:true});
      } else if(res.state === "pending_confirmation"){
        accepted[key] = true;
        $("step1").hidden = true; $("pending").hidden = false; $("pendEmail").textContent = em;
        var pe = makeEye($("pendEye"), {stroke:6, blink:true}); animateEye(pe, 0, 1, 900);
        $("pendTitle").focus({preventScroll:true});
      } else if(res.state === "invalid"){ fieldError(MSG.invalid); email.focus(); }
      else if(res.state === "duplicate"){ accepted[key] = true; setStatus(status1, MSG.duplicate, "info"); }
      else { setStatus(status1, MSG[res.state] || MSG.server, "bad"); if(res.state === "unconfigured" && window.console) console.warn("NOETIS: set SIGNUP_ENDPOINT in NOETIS_CONFIG to collect sign-ups."); }
    });
  });
  function finishFlow(){ showTicket(entry, true); }
  form2.addEventListener("submit", function(ev){
    ev.preventDefault(); if(inFlight) return;
    var city = $("city").value.trim(), hope = $("hope").value.trim();
    if(!city && !hope){ finishFlow(); return; }
    var ep = CFG.ANSWERS_ENDPOINT || (CFG.SIGNUP_MODE === "supabase" ? "" : CFG.SIGNUP_ENDPOINT);
    if(!ep){ finishFlow(); return; }
    inFlight = true; busy(submit2, true, "Saving…");
    submitSignup({email:entry.email, step:2, city:city || null, noticed:hope || null}, ep).then(function(res){
      inFlight = false; busy(submit2, false, "Finish");
      if(res.state === "ok" || res.state === "duplicate" || res.state === "pending_confirmation") finishFlow();
      else setStatus(status2, (res.state === "network" || res.state === "timeout" ? "We couldn’t save those answers. " : "Those answers didn’t save. ") + "You’re still on the list. Try again, or skip this step.", "bad");
    });
  });
  $("skip2").addEventListener("click", finishFlow);

  /* ---------- Ticket ---------- */
  var doneEye = makeEye($("doneEye"), {stroke:6, blink:true});
  function fmtDate(d){ return d.toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"}); }
  function refText(t){ return t.number ? "NO. " + String(t.number).padStart(4,"0") : "REF · " + t.ref; }
  function showTicket(t, fresh){
    var tk = {ref:t.ref, number:t.number || null, date:t.date || fmtDate(new Date()), name:t.name || "", exp: t.exp || Date.now() + 180*DAY};
    if(fresh) lsSet(TICKET_KEY, JSON.stringify(tk));      // no email address is ever stored on the device
    ticket = tk;
    $("step1").hidden = true; $("step2").hidden = true; $("pending").hidden = true; $("done").hidden = false;
    $("tName").textContent = tk.name; $("tDate").textContent = tk.date; $("tRef").textContent = refText(tk);
    $("ticketLabel").textContent = "Your NOETIS First List ticket. You noticed. Issued " + tk.date + ". " + refText(tk) + ".";
    $("nameOptRow").hidden = !tk.name;
    $("doneTitle").textContent = fresh ? "You’re on the First List." : "You’re already on the First List.";
    var el = $("ticket");
    el.classList.remove("enter","static");
    if(fresh && !calm){ void el.offsetWidth; el.classList.add("enter"); setEye(doneEye, 0); setTimeout(function(){ animateEye(doneEye, 0, 1, 800); chime(0); }, 500); }
    else { el.classList.add("static"); setEye(doneEye, 1); }
    if(fresh) $("doneTitle").focus({preventScroll:true});
    markJoined();
  }
  function markJoined(){
    document.querySelectorAll("a.js-join").forEach(function(a){ a.innerHTML = "You’re on the list <span aria-hidden=\"true\">✓</span>"; a.setAttribute("aria-label", "You’re on the list. View your ticket"); });
  }
  if(ticket) showTicket(ticket, false);

  var shareUrl = (CFG.SITE_URL || location.href.split("#")[0]).replace(/\?.*$/, "");
  $("shareLink").value = shareUrl;
  $("copyLink").addEventListener("click", function(){
    var btn = this, inp = $("shareLink");
    function ok(){ btn.textContent = "Copied"; setTimeout(function(){ btn.textContent = "Copy link"; }, 1800); }
    function fallback(){ inp.focus(); inp.select(); try{ if(document.execCommand("copy")) ok(); }catch(e){} }
    try{ navigator.clipboard.writeText(inp.value).then(ok, fallback); }catch(err){ fallback(); }
  });
  function drawTicket(){
    var c = document.createElement("canvas"), W = 1200, H = 740; c.width = W; c.height = H; var g = c.getContext("2d");
    var withName = $("nameOnImage").checked && ticket && ticket.name;
    g.fillStyle = "#f6e7c1"; g.fillRect(0,0,W,H);
    var x=60,y=60,w=W-120,h=H-120,r=36, ty = y+h*.62;
    g.lineWidth = 5; g.strokeStyle = "#050505"; g.fillStyle = "#f6e7c1";
    g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); g.stroke();
    [[x,-Math.PI/2,Math.PI/2],[x+w,Math.PI/2,Math.PI*1.5]].forEach(function(n){ g.fillStyle="#f6e7c1"; g.fillRect(n[0]-8,ty-30,16,60); g.beginPath(); g.arc(n[0],ty,26,n[1],n[2]); g.stroke(); });
    g.strokeStyle="rgba(5,5,5,.35)"; g.setLineDash([12,10]); g.lineWidth=3; g.beginPath(); g.moveTo(x+50,ty); g.lineTo(x+w-50,ty); g.stroke(); g.setLineDash([]);
    g.fillStyle="#050505"; g.font="700 20px Syncopate, Arial"; g.fillText("NOETIS  ·  THE FIRST LIST", x+50, y+70); g.textAlign="right"; g.fillText("ADMIT ONE", x+w-50, y+70); g.textAlign="left";
    var ex=x+130, ey=y+235; g.strokeStyle="#050505"; g.lineWidth=9; g.beginPath(); g.arc(ex,ey,72,0,7); g.stroke();
    g.beginPath(); g.moveTo(ex-56,ey); g.quadraticCurveTo(ex,ey-60,ex+56,ey); g.quadraticCurveTo(ex,ey+60,ex-56,ey); g.fillStyle="#fffaee"; g.fill(); g.stroke();
    g.fillStyle="#050505"; g.beginPath(); g.arc(ex,ey,20,0,7); g.fill(); g.fillStyle="#fffaee"; g.beginPath(); g.arc(ex+7,ey-7,6,0,7); g.fill();
    g.fillStyle="#050505"; g.font="italic 500 88px 'Cormorant Garamond', serif"; g.fillText("You noticed.", x+250, y+(withName?235:262));
    if(withName){ g.fillStyle="rgba(5,5,5,.74)"; g.font="500 40px 'Cormorant Garamond', serif"; g.fillText(ticket.name, x+254, y+292); }
    g.fillStyle="rgba(5,5,5,.74)"; g.font="700 20px Syncopate, Arial"; g.fillText("ISSUED  "+String(ticket.date).toUpperCase(), x+50, y+h-60);
    g.textAlign="right"; g.fillStyle="#050505"; g.font="500 26px 'JetBrains Mono', monospace"; g.fillText(refText(ticket), x+w-50, y+h-60);
    g.save(); g.translate(x+w-170,y+h*.40); g.rotate(-.19); g.strokeStyle="#a33a2a"; g.fillStyle="#a33a2a"; g.lineWidth=5; g.strokeRect(-115,-32,230,64); g.textAlign="center"; g.font="700 22px Syncopate, Arial"; g.fillText("ADMITTED",0,8); g.restore();
    return c;
  }
  window.noetisDrawTicket = drawTicket;
  $("saveTicket").addEventListener("click", function(){
    var st = $("saveStatus");
    try{
      var a = document.createElement("a"); a.download = "noetis-first-list-ticket.png"; a.href = drawTicket().toDataURL("image/png");
      document.body.appendChild(a); a.click(); a.remove();
      setStatus(st, "Saved. If nothing downloaded, press and hold the ticket image to save it.", "info");
    }catch(e){ setStatus(st, "Your browser blocked the download. Try a screenshot instead.", "bad"); }
  });
  if(navigator.share){
    var sh = $("shareTicket"); sh.hidden = false;
    sh.addEventListener("click", function(){
      var data = {title:"NOETIS", text:"I noticed. The First List is open.", url:shareUrl};
      drawTicket().toBlob(function(b){
        try{ var file = new File([b], "noetis-ticket.png", {type:"image/png"}); if(navigator.canShare && navigator.canShare({files:[file]})) data.files = [file]; }catch(e){}
        navigator.share(data).catch(function(){});
      });
    });
  }

  /* ======================================================================
     Final: the ink eye draws itself once, then gets its pupil
     ====================================================================== */
  (function(){
    var svg = $("ink"); if(!svg) return;
    function wob(i){ return Math.sin(i*1.7)*1.6 + Math.sin(i*.37)*2.4; }
    var pts = [], i = 0, k;
    for(k=0;k<=150;k++){ var a = k/150*Math.PI*3.5 - Math.PI/2, rr = 230 + wob(i++)*2 + k*.08; pts.push([550+Math.cos(a)*rr*1.02, 300+Math.sin(a)*rr]); }
    for(k=0;k<=70;k++){ var x = -1+2*k/70; pts.push([550+x*190, 300-(1-x*x)*120+wob(i++)]); }
    for(k=0;k<=70;k++){ var x2 = 1-2*k/70; pts.push([550+x2*190, 300+(1-x2*x2)*110+wob(i++)]); }
    for(k=0;k<=90;k++){ var b = Math.PI + k/90*Math.PI*6, r2 = 70 - k*.55; pts.push([550+Math.cos(b)*r2+wob(i++)*.5, 300+Math.sin(b)*r2]); }
    var d = "M"+pts[0][0].toFixed(1)+" "+pts[0][1].toFixed(1);
    for(k=1;k<pts.length-1;k++){ var mx=(pts[k][0]+pts[k+1][0])/2, my=(pts[k][1]+pts[k+1][1])/2; d += " Q"+pts[k][0].toFixed(1)+" "+pts[k][1].toFixed(1)+" "+mx.toFixed(1)+" "+my.toFixed(1); }
    var path = svg.querySelector("path"); path.setAttribute("d", d);
    if(calm || !("IntersectionObserver" in window)){ svg.classList.add("done"); return; }
    var len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    var io = new IntersectionObserver(function(ents){
      if(!ents[0].isIntersecting) return; io.disconnect();
      if(path.animate){
        path.animate([{strokeDashoffset:len},{strokeDashoffset:0}], {duration:2600, easing:"cubic-bezier(.45,0,.25,1)", fill:"forwards"}).onfinish = function(){ path.style.strokeDashoffset = 0; svg.classList.add("done"); };
      } else { path.style.strokeDashoffset = 0; svg.classList.add("done"); }
    }, {threshold:.35});
    io.observe(svg.closest("section"));
  })();

  /* ======================================================================
     Privacy and metadata from config (nothing invented)
     ====================================================================== */
  if(CFG.CONTROLLER_NAME || CFG.CONTACT_EMAIL){
    var pc = $("privacyController"); pc.textContent = "";
    pc.appendChild(document.createTextNode("Your details are controlled by " + (CFG.CONTROLLER_NAME || "NOETIS") + "."));
    if(CFG.CONTACT_EMAIL){ pc.appendChild(document.createTextNode(" Questions or deletion requests: ")); var ml = document.createElement("a"); ml.href = "mailto:"+CFG.CONTACT_EMAIL; ml.textContent = CFG.CONTACT_EMAIL; pc.appendChild(ml); pc.appendChild(document.createTextNode(".")); }
  }
  if(CFG.SITE_URL){
    var can = document.createElement("link"); can.rel = "canonical"; can.href = CFG.SITE_URL; document.head.appendChild(can);
  }
  var dlg = $("privacy");
  document.querySelectorAll("[data-privacy]").forEach(function(b){
    b.addEventListener("click", function(){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open",""); });
  });
})();
