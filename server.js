require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./database');

const authRoutes  = require('./auth');
const agentRoutes = require('./agents');
const planRoutes  = require('./plans');
const adminRoutes = require('./admin');

const app = express();

app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

const limiter     = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 15,  message: { error: 'Too many attempts' } });
const chatLimiter = rateLimit({ windowMs: 1*60*1000,  max: 30,  message: { error: 'Too many messages' } });

app.use('/api/', limiter);
app.use('/api/auth/login',      authLimiter);
app.use('/api/auth/signup',     authLimiter);
app.use('/api/auth/send-otp',   authLimiter);
app.use('/api/agents/:id/chat', chatLimiter);

app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) { res.status(500).json({ error: 'Database connection failed' }); }
});

// ── WIDGET.JS
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`
(function(){
  if(window.__EAALoaded) return;
  window.__EAALoaded = true;
  function init(){
    var cfg = window.EAA || {};
    if(!cfg.agentId){ console.warn('EasyAIAgents: agentId missing'); return; }
    var API=cfg.apiUrl||'https://api.easyaiagents.online/api',COLOR=cfg.color||'#e85a1e',NAME=cfg.name||'AI Assistant',ICON=cfg.icon||'🤖',SID='eaa_'+Math.random().toString(36).slice(2);
    var style=document.createElement('style');
    style.textContent=['#eaa-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:'+COLOR+';color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.25);z-index:2147483647;border:none;transition:transform .2s}','#eaa-btn:hover{transform:scale(1.08)}','#eaa-box{position:fixed;bottom:96px;right:24px;width:360px;height:520px;background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.2);z-index:2147483646;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}','#eaa-box.open{display:flex}','#eaa-hd{background:'+COLOR+';padding:14px 16px;color:#fff;display:flex;align-items:center;gap:10px}','#eaa-hd .av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}','#eaa-hd .info{flex:1}#eaa-hd .info b{display:block;font-size:14px}#eaa-hd .info small{font-size:11px;opacity:.8}','#eaa-hd .cls{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:2px 6px;border-radius:4px;opacity:.8}','#eaa-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f5f5f7}','.em{max-width:80%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-break:break-word}','.em.bot{background:#fff;color:#111;border-bottom-left-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.1);align-self:flex-start}','.em.usr{background:'+COLOR+';color:#fff;border-bottom-right-radius:3px;align-self:flex-end}','#eaa-typing{display:none;gap:4px;padding:10px 13px;background:#fff;border-radius:14px;border-bottom-left-radius:3px;width:fit-content;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,.1)}','#eaa-typing span{width:7px;height:7px;background:#ccc;border-radius:50%;animation:eb 1.2s infinite}','#eaa-typing span:nth-child(2){animation-delay:.2s}#eaa-typing span:nth-child(3){animation-delay:.4s}','@keyframes eb{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}','#eaa-ft{padding:10px;border-top:1px solid #eee;display:flex;gap:8px;background:#fff}','#eaa-inp{flex:1;border:1.5px solid #ddd;border-radius:20px;padding:9px 14px;font-size:13.5px;outline:none;transition:border .2s;font-family:inherit}','#eaa-inp:focus{border-color:'+COLOR+'}','#eaa-snd{width:38px;height:38px;border-radius:50%;background:'+COLOR+';color:#fff;border:none;cursor:pointer;font-size:16px;flex-shrink:0;transition:opacity .2s}','#eaa-snd:hover{opacity:.85}','#eaa-pw{text-align:center;font-size:10px;color:#bbb;padding:3px 0 7px}#eaa-pw a{color:'+COLOR+';text-decoration:none}','@media(max-width:440px){#eaa-box{width:calc(100vw - 20px);right:10px;bottom:80px}}'].join('');
    document.head.appendChild(style);
    var box=document.createElement('div');box.id='eaa-box';
    box.innerHTML='<div id="eaa-hd"><div class="av">'+ICON+'</div><div class="info"><b>'+NAME+'</b><small>&#x25CF; Online</small></div><button class="cls" id="eaa-cls">&#x2715;</button></div><div id="eaa-msgs"><div id="eaa-typing"><span></span><span></span><span></span></div></div><div id="eaa-ft"><input id="eaa-inp" placeholder="Type a message..." autocomplete="off"><button id="eaa-snd">&#10148;</button></div><div id="eaa-pw">Powered by <a href="https://easyaiagents.online" target="_blank">EasyAIAgents</a></div>';
    var btn=document.createElement('button');btn.id='eaa-btn';btn.innerHTML=ICON;btn.title='Chat with '+NAME;
    document.body.appendChild(box);document.body.appendChild(btn);
    addMsg('bot','Hi! I am '+NAME+'. How can I help you today?');
    function toggle(f){var o=f!==undefined?f:!box.classList.contains('open');box.classList.toggle('open',o);btn.innerHTML=o?'&#x2715;':ICON;if(o)document.getElementById('eaa-inp').focus();}
    btn.onclick=function(){toggle();};document.getElementById('eaa-cls').onclick=function(){toggle(false);};
    document.getElementById('eaa-inp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    document.getElementById('eaa-snd').onclick=send;
    function addMsg(r,t){var m=document.getElementById('eaa-msgs'),tp=document.getElementById('eaa-typing'),el=document.createElement('div');el.className='em '+r;el.textContent=t;m.insertBefore(el,tp);m.scrollTop=m.scrollHeight;}
    function send(){var inp=document.getElementById('eaa-inp'),msg=(inp.value||'').trim();if(!msg)return;inp.value='';inp.disabled=true;addMsg('usr',msg);var tp=document.getElementById('eaa-typing');tp.style.display='flex';document.getElementById('eaa-msgs').scrollTop=9999;fetch(API+'/agents/'+cfg.agentId+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId:SID})}).then(function(r){return r.json();}).then(function(d){tp.style.display='none';inp.disabled=false;inp.focus();addMsg('bot',d.reply||'Sorry, please try again.');}).catch(function(){tp.style.display='none';inp.disabled=false;addMsg('bot','Connection error. Please try again.');});}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
  `);
});

// ── ROUTES
app.use('/api/auth',   authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/plans',  planRoutes);
app.use('/api/admin',  adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'EasyAIAgents API v2', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ message: 'EasyAIAgents API v2', health: '/api/health', widget: '/widget.js' }));
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => { console.error('Error:', err.message); res.status(500).json({ error: 'Internal server error' }); });

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  connectDB().then(() => app.listen(PORT, () => console.log('EasyAIAgents API running on port', PORT))).catch(console.error);
}

module.exports = app;
