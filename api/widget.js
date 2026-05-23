export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const js = `
(function(){
  var script = document.currentScript;
  var agentKey = script.getAttribute('data-agent');
  if(!agentKey) return;

  var btn = document.createElement('div');
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#e85a1e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:9999;transition:transform .2s';
  btn.onmouseover=function(){btn.style.transform='scale(1.1)'};
  btn.onmouseout=function(){btn.style.transform='scale(1)'};

  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;bottom:90px;right:20px;width:360px;height:500px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;z-index:9999;font-family:system-ui,sans-serif';
  box.innerHTML = '<div style="background:#08090c;color:white;padding:16px;font-weight:700">AI Assistant</div><div id="eaa-msgs" style="flex:1;padding:16px;overflow-y:auto;background:#f5f4f0"></div><div style="padding:12px;border-top:1px solid #ddd;display:flex;gap:8px"><input id="eaa-inp" placeholder="Type a message..." style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;outline:none"/><button id="eaa-snd" style="background:#e85a1e;color:white;border:none;padding:10px 16px;border-radius:8px;cursor:pointer">Send</button></div>';

  document.body.appendChild(btn);
  document.body.appendChild(box);

  var session = 'web_' + Date.now();
  btn.onclick = function(){ box.style.display = box.style.display==='flex'?'none':'flex'; };

  function addMsg(text, isUser){
    var d = document.createElement('div');
    d.style.cssText = 'margin:8px 0;padding:10px 14px;border-radius:12px;max-width:80%;font-size:14px;'+(isUser?'background:#08090c;color:white;margin-left:auto;text-align:right':'background:white;color:#08090c;border:1px solid #eee');
    d.textContent = text;
    document.getElementById('eaa-msgs').appendChild(d);
    document.getElementById('eaa-msgs').scrollTop = 99999;
  }

  addMsg('👋 Hi! How can I help you today?', false);

  document.getElementById('eaa-snd').onclick = sendMsg;
  document.getElementById('eaa-inp').onkeydown = function(e){ if(e.key==='Enter') sendMsg(); };

  function sendMsg(){
    var inp = document.getElementById('eaa-inp');
    var msg = inp.value.trim();
    if(!msg) return;
    addMsg(msg, true);
    inp.value = '';
    
    fetch('https://api.easyaiagents.online/api/widget/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ agentKey: agentKey, message: msg, sessionId: session })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){ addMsg(d.reply || 'Error responding', false); })
    .catch(function(){ addMsg('Connection error', false); });
  }
})();
`;

  res.status(200).send(js);
}