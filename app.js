import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBn_b3C0EEt5ETRMQXVCjaxFf9SRgOiBKg",
  authDomain: "gu-world.firebaseapp.com",
  projectId: "gu-world",
  storageBucket: "gu-world.firebasestorage.app",
  messagingSenderId: "520066392434",
  appId: "1:520066392434:web:8b6203c35f57dd143bfdeb",
  measurementId: "G-RG829DQ72Z"
};

const ADMIN_PASS = "yunchenguo";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let uid = null, myName = localStorage.getItem("guName") || "", admin = localStorage.getItem("guAdmin") === "1", current = "home";
const state = { players: [], sects: [], guworms: [], killmoves: [], guhouses: [], recipes: [], trades: [], messages: [] };

const navs = [
  ["home","天机殿","世界总览、公告、最新动态"],["players","人物阁","人员资料、属性、流派、蛊虫与杀招"],["guworms","蛊虫阁","库内所有蛊虫，可点击查看详情"],["killmoves","杀招阁","杀招创作与组合记录"],["guhouses","凡蛊屋阁","凡蛊屋创作、核心蛊与效果"],["recipes","蛊方阁","蛊方、材料、成功率储存"],["trades","交易坊","赠与、交换、出售、求购"],["chat","传音阁","世界频道、势力频道、好友群聊雏形"],["sects","势力殿","宗门、家族、势力排名"],["rankings","天机榜","战力、财富、境界、胜场排行"],["rules","世界规则","境界、寿蛊、劫难、仙元与道痕"]
];
const icons = {home:"✦",players:"人",guworms:"蛊",killmoves:"杀",guhouses:"屋",recipes:"方",trades:"市",chat:"音",sects:"宗",rankings:"榜",rules:"卷"};

function $(id){return document.getElementById(id)}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;$('toast').appendChild(d);setTimeout(()=>d.remove(),2600)}
function safe(v){return (v ?? "").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function n(v){return Number(v||0)}
function col(name){return collection(db,name)}
function byId(arr,id){return arr.find(x=>x.id===id)}

function initNav(){ $('nav').innerHTML = navs.map(([id,t])=>`<button class="nav-btn ${id===current?'active':''}" data-nav="${id}"><b>${icons[id]}</b>${t}</button>`).join(''); document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav)); }
function go(id){current=id; const meta=navs.find(x=>x[0]===id); $('pageTitle').textContent=meta[1]; $('pageDesc').textContent=meta[2]; initNav(); render();}
function openModal(html){$('modalContent').innerHTML=html;$('modal').showModal(); bindModalButtons();}
function closeModal(){$('modal').close()}
function modalHead(title){return `<div class="modal-head"><h2>${title}</h2><button class="close" data-close>关闭</button></div>`}
function bindModalButtons(){document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal)}

function canEditPlayer(p){return admin || p.ownerUid===uid || p.name===myName}
function canEditItem(type,item){
  if(admin) return true;
  if(!item) return true; // 新建允许，保存时会自动绑定创建者
  if(type==='players') return canEditPlayer(item);
  if(['guworms','killmoves','guhouses','recipes'].includes(type)){
    return item.ownerUid===uid || item.creatorUid===uid || item.createdByUid===uid || item.ownerName===myName || item.creatorName===myName || item.owner===myName || item.creator===myName;
  }
  // 势力、世界规则、排行榜等核心资料，普通玩家只能查看
  if(type==='sects') return false;
  return false;
}
function creatorBadge(item){
  const name = item.creatorName || item.ownerName || item.creator || item.owner || '未知';
  return `<p class="muted">创建者/持有者：${safe(name)}</p>`;
}

async function boot(){initNav(); signInAnonymously(auth).catch(e=>toast('登录失败：'+e.message)); onAuthStateChanged(auth,u=>{uid=u?.uid; subscribeAll(); renderUser(); render();}); $('adminBtn').onclick=()=>{ if(admin){admin=false;localStorage.removeItem('guAdmin');toast('已退出管理员');render()} else {const p=prompt('输入管理员口令'); if(p===ADMIN_PASS){admin=true;localStorage.setItem('guAdmin','1');toast('管理员已开启');render()} else toast('口令不对');} renderUser();}; $('openProfileBtn').onclick=profileModal; $('globalSearch').oninput=render; }
function renderUser(){ $('currentUserName').textContent = `${myName||'未命名玩家'} · ${admin?'管理员':'玩家'}`; }
function subscribeAll(){ if(window.subbed) return; window.subbed=true; ["players","sects","guworms","killmoves","guhouses","recipes","trades"].forEach(name=>onSnapshot(col(name),snap=>{state[name]=snap.docs.map(d=>({id:d.id,...d.data()})); render();})); onSnapshot(query(col('messages'),orderBy('createdAt','asc')),snap=>{state.messages=snap.docs.map(d=>({id:d.id,...d.data()})); if(current==='chat') render();}); }

function render(){ const q=($('globalSearch')?.value||'').trim(); if(current==='home') return renderHome(); if(current==='players') return renderList('players', q); if(current==='guworms') return renderList('guworms', q); if(current==='killmoves') return renderList('killmoves', q); if(current==='guhouses') return renderList('guhouses', q); if(current==='recipes') return renderList('recipes', q); if(current==='trades') return renderTrades(q); if(current==='chat') return renderChat(); if(current==='sects') return renderSects(q); if(current==='rankings') return renderRankings(); if(current==='rules') return renderRules(); }

function renderHome(){ const c=$('content'); c.innerHTML=`
 <div class="hero"><div class="scroll-panel"><h2>天机殿公告</h2><p>此平台用于记录蛊师、蛊虫、杀招、凡蛊屋、蛊方、交易、势力与聊天。数据实时进入 Firestore，所有人打开同一网址即可同步查看。</p><div class="stat"><div><b>${state.players.length}</b><br>蛊师</div><div><b>${state.guworms.length}</b><br>蛊虫</div><div><b>${state.killmoves.length}</b><br>杀招</div><div><b>${state.sects.length}</b><br>势力</div><div><b>${state.trades.length}</b><br>交易</div></div></div><div class="scroll-panel"><h2>快速创建</h2><div class="toolbar"><button onclick="window.quick('players')">人物</button><button onclick="window.quick('guworms')">蛊虫</button><button onclick="window.quick('killmoves')">杀招</button><button onclick="window.quick('sects')">势力</button></div><p class="muted">普通玩家只能改自己的姓名、年龄、势力、备注。管理员可改全部。</p></div></div>
 <h2 class="section-title">最新蛊虫</h2><div class="grid">${state.guworms.slice(-4).reverse().map(cardGu).join('')||empty()}</div>
 <h2 class="section-title">最新杀招</h2><div class="grid">${state.killmoves.slice(-4).reverse().map(cardKill).join('')||empty()}</div>`; bindCards();}
function empty(){return `<div class="card muted">暂无记录，等待天意落子。</div>`}
function filter(arr,q){return !q?arr:arr.filter(x=>JSON.stringify(x).includes(q))}

function renderList(type,q){ const c=$('content'), arr=filter(state[type],q); const title={players:'人物',guworms:'蛊虫',killmoves:'杀招',guhouses:'凡蛊屋',recipes:'蛊方'}[type]; c.innerHTML=`<div class="toolbar"><button onclick="window.quick('${type}')">新增${title}</button></div><div class="grid">${arr.map(itemCard(type)).join('')||empty()}</div>`; bindCards(); }
function itemCard(type){ return item=> type==='players'?cardPlayer(item):type==='guworms'?cardGu(item):type==='killmoves'?cardKill(item):type==='guhouses'?cardHouse(item):cardRecipe(item); }
function img(path,cls='detail-img'){return path?`<img class="${cls}" src="${safe(path)}" onerror="this.style.display='none'">`:''}
function cardPlayer(p){return `<div class="card" data-open="players:${p.id}"><h3>${safe(p.name||p.id)}</h3><span class="pill">${safe(p.realm||'未定境界')}</span><span class="pill">${safe(p.aptitude||'资质未定')}</span><p>${safe(p.faction||'散修')} · 主修${safe(p.mainPath||'未定')}</p><p class="muted">战力 ${power(p)}｜元石 ${n(p.stones)}｜胜场 ${n(p.wins)}</p></div>`}
function cardGu(g){return `<div class="card" data-open="guworms:${g.id}">${img(g.image)}<h3>${safe(g.name||g.id)}</h3><span class="pill">${safe(g.rank||'一转')}</span><span class="pill">${safe(g.path||'未知流派')}</span><p>${safe(g.effect||'无效果描述')}</p><p class="muted">攻${n(g.attack)} 防${n(g.defense)} 距${safe(g.range||'-')} 冷却${safe(g.cooldown||'-')}</p></div>`}
function cardKill(k){return `<div class="card" data-open="killmoves:${k.id}">${img(k.image)}<h3>${safe(k.name||k.id)}</h3><span class="pill">${safe(k.path||'复合流派')}</span><span class="pill">威力 ${n(k.power)}</span><p>${safe(k.effect||'无效果描述')}</p><p class="muted">所需：${safe(k.requiredGu||'未填')}</p></div>`}
function cardHouse(h){return `<div class="card" data-open="guhouses:${h.id}">${img(h.image)}<h3>${safe(h.name||h.id)}</h3><span class="pill">${safe(h.rank||'一转')}</span><span class="pill">${safe(h.owner||'无主')}</span><p>${safe(h.effect||'无效果描述')}</p></div>`}
function cardRecipe(r){return `<div class="card" data-open="recipes:${r.id}"><h3>${safe(r.name||r.id)}</h3><span class="pill">炼制：${safe(r.target||'未定')}</span><span class="pill">成功率：${safe(r.rate||'-')}</span><p>${safe(r.materials||'材料未填')}</p></div>`}
function bindCards(){document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>detail(...el.dataset.open.split(':')))}

function power(p){return n(p.life)+n(p.power)+n(p.speed)+n(p.defense)+n(p.spirit)+n(p.wins)*2+n(p.stones)/100}
window.quick=(type)=>editForm(type,null);

function field(k,label,type='text',v=''){return `<label>${label}<input name="${k}" type="${type}" value="${safe(v)}"></label>`}
function area(k,label,v=''){return `<label class="wide">${label}<textarea name="${k}" rows="3">${safe(v)}</textarea></label>`}
function select(k,label,opts,v=''){return `<label>${label}<select name="${k}">${opts.map(o=>`<option ${o==v?'selected':''}>${o}</option>`).join('')}</select></label>`}

function formWrap(title,type,item,inner){
  const can = canEditItem(type,item);
  return `${modalHead(title)}<form id="editForm" class="form"><div class="row">${inner}</div><div class="toolbar">${can?'<button type="submit">保存</button>':'<span class="pill">只可查看，无编辑权限</span>'}${item&&can?`<button type="button" class="danger" id="deleteBtn">删除</button>`:''}</div></form>`
}
function editForm(type,item){ const i=item||{}; let html='';
 if(type==='players') html=formWrap('人物卷宗',type,item, field('name','姓名','text',i.name)+field('age','年龄','number',i.age)+select('aptitude','资质',['丁','丙','乙','甲','十绝体'],i.aptitude)+select('realm','境界',['一转初期','一转中期','一转后期','一转巅峰','二转初期','二转中期','二转后期','二转巅峰','三转初期','三转中期','三转后期','三转巅峰','四转','五转','六转蛊仙'],i.realm)+field('faction','势力','text',i.faction)+field('mainPath','主流派','text',i.mainPath)+field('mainAttain','主流派成就','text',i.mainAttain)+field('subPath','副流派','text',i.subPath)+field('subAttain','副流派成就','text',i.subAttain)+field('life','生命','number',i.life)+field('power','力量','number',i.power)+field('speed','速度','number',i.speed)+field('defense','防御','number',i.defense)+field('spirit','精神','number',i.spirit)+field('stones','元石','number',i.stones)+field('wins','胜场','number',i.wins)+field('image','头像路径','text',i.image)+area('gu','拥有蛊虫',i.gu)+area('kills','拥有杀招',i.kills)+area('note','备注',i.note));
 if(type==='guworms') html=formWrap('蛊虫卷宗',type,item, field('name','名称','text',i.name)+select('rank','等级',['一转','二转','三转','四转','五转'],i.rank)+field('path','流派','text',i.path)+field('image','图标路径','text',i.image)+field('attack','攻击','number',i.attack)+field('defense','防御','number',i.defense)+field('life','生命/回血','number',i.life)+field('speed','速度','number',i.speed)+field('spirit','精神','number',i.spirit)+field('range','距离','text',i.range)+field('cooldown','冷却','text',i.cooldown)+field('duration','持续/定身','text',i.duration)+field('price','价格','number',i.price)+field('owner','持有者','text',i.owner)+area('effect','效果',i.effect));
 if(type==='killmoves') html=formWrap('杀招创作',type,item, field('name','杀招名','text',i.name)+field('path','流派','text',i.path)+field('image','图片路径','text',i.image)+field('requiredGu','所需蛊虫','text',i.requiredGu)+field('power','威力','number',i.power)+field('range','距离','text',i.range)+field('cooldown','冷却','text',i.cooldown)+field('cost','消耗','text',i.cost)+field('creator','创作者','text',i.creator)+area('effect','效果',i.effect));
 if(type==='guhouses') html=formWrap('凡蛊屋创作',type,item, field('name','名称','text',i.name)+select('rank','等级',['一转','二转','三转','四转','五转'],i.rank)+field('image','图片路径','text',i.image)+field('coreGu','核心蛊','text',i.coreGu)+field('components','组成蛊虫','text',i.components)+field('attack','攻击','number',i.attack)+field('defense','防御','number',i.defense)+field('move','移动','number',i.move)+field('owner','所属者/势力','text',i.owner)+area('effect','效果',i.effect));
 if(type==='recipes') html=formWrap('蛊方储存',type,item, field('name','蛊方名','text',i.name)+field('target','炼制目标','text',i.target)+field('rate','成功率','text',i.rate)+field('owner','持有者','text',i.owner)+area('materials','材料',i.materials)+area('replace','替代材料',i.replace)+area('note','备注',i.note));
 if(type==='sects') html=formWrap('势力卷宗',type,item, field('name','势力名','text',i.name)+field('master','宗主/族长','text',i.master)+field('level','等级','text',i.level)+field('image','徽记路径','text',i.image)+field('territory','领地','text',i.territory)+field('stones','势力元石','number',i.stones)+area('note','备注',i.note));
 openModal(html); const form=$('editForm');
 if(!canEditItem(type,item)){
   [...form.elements].forEach(el=>{ if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT') el.disabled=true; });
 }
 form.onsubmit=async e=>{
   e.preventDefault();
   if(!canEditItem(type,item)) return toast('你没有权限编辑此资料');
   const data=Object.fromEntries(new FormData(form).entries());
   Object.keys(data).forEach(k=>{if(['age','life','power','speed','defense','spirit','stones','wins','attack','price','move'].includes(k)) data[k]=Number(data[k]||0)});
   if(type==='players' && !item){data.ownerUid=uid; myName=data.name; localStorage.setItem('guName',myName); renderUser();}
   if(type==='players' && item && !canEditPlayer(item)) return toast('你只能编辑自己的基础资料');
   if(!item){
     data.ownerUid = uid;
     data.creatorUid = uid;
     data.creatorName = myName || data.name || '无名蛊师';
     data.createdAt = serverTimestamp();
     if(type==='guworms' && !data.owner) data.owner = myName || '无主';
     if(type==='killmoves' && !data.creator) data.creator = myName || '无名蛊师';
   }
   if(item) await setDoc(doc(db,type,item.id),{...item,...data,updatedAt:serverTimestamp()},{merge:true});
   else await addDoc(col(type),data);
   closeModal(); toast('已保存');
 };
 if(item && $('deleteBtn')) $('deleteBtn').onclick=async()=>{
   if(!canEditItem(type,item)) return toast('你没有权限删除此资料');
   if(!admin && item.ownerUid!==uid && item.creatorUid!==uid) return toast('只能删除自己创建的资料');
   if(confirm('确定删除？')){await deleteDoc(doc(db,type,item.id)); closeModal();}
 };
}

function detail(type,id){
  const item=byId(state[type],id); if(!item) return;
  const can = canEditItem(type,item);
  let html=modalHead(item.name||id);
  html+=`<div class="card">${img(item.image)}${creatorBadge(item)}<pre style="white-space:pre-wrap;font-family:inherit">${safe(JSON.stringify(item,null,2))}</pre><div class="toolbar">${can?'<button id="editThis">编辑</button>':'<span class="pill">只可查看</span>'}</div></div>`;
  openModal(html);
  if(can && $('editThis')) $('editThis').onclick=()=>editForm(type,item);
}

function profileModal(){ const mine=state.players.find(p=>p.ownerUid===uid || p.name===myName); editForm('players',mine||null); }

function renderTrades(q){ const arr=filter(state.trades,q); $('content').innerHTML=`<div class="toolbar"><button onclick="window.tradeForm()">新增交易</button></div><table class="table"><tr><th>类型</th><th>发起者</th><th>对象</th><th>内容</th><th>状态</th><th>操作</th></tr>${arr.map(t=>`<tr><td>${safe(t.type)}</td><td>${safe(t.from)}</td><td>${safe(t.to)}</td><td>${safe(t.content)}</td><td>${safe(t.status||'待确认')}</td><td><button data-trade="${t.id}">确认完成</button></td></tr>`).join('')}</table>`; document.querySelectorAll('[data-trade]').forEach(b=>b.onclick=()=>setDoc(doc(db,'trades',b.dataset.trade),{status:'已完成'},{merge:true})); }
window.tradeForm=()=>{openModal(`${modalHead('交易记录')}<form id="tradeForm" class="form"><div class="row">${select('type','类型',['赠与','交换','出售','求购'],'赠与')}${field('from','发起者','text',myName)}${field('to','对象','text','')}${area('content','交易内容','')}</div><button>提交交易</button></form>`); $('tradeForm').onsubmit=async e=>{e.preventDefault(); await addDoc(col('trades'),{...Object.fromEntries(new FormData(e.target).entries()),status:'待确认',createdAt:serverTimestamp()}); closeModal();}}

function renderChat(){ $('content').innerHTML=`<div class="toolbar"><button onclick="window.channel='world';render()">世界频道</button><button onclick="window.channel='sect';render()">势力频道</button><button onclick="window.channel='group';render()">群聊</button></div><div class="chat-box" id="chatBox">${state.messages.filter(m=>(m.channel||'world')===(window.channel||'world')).map(m=>`<div class="msg"><b>${safe(m.name||'无名')}</b>：${safe(m.text)}</div>`).join('')}</div><form class="chat-input" id="chatForm"><input name="text" placeholder="传音入密……"><button>发送</button></form>`; $('chatForm').onsubmit=async e=>{e.preventDefault(); const text=e.target.text.value.trim(); if(!text) return; await addDoc(col('messages'),{name:myName||'无名蛊师',text,channel:window.channel||'world',createdAt:serverTimestamp(),uid}); e.target.reset();}; setTimeout(()=>{const b=$('chatBox'); if(b) b.scrollTop=b.scrollHeight},50); }

function renderSects(q){ const arr=filter(state.sects,q).map(s=>({...s,members:state.players.filter(p=>p.faction===s.name).length,totalPower:state.players.filter(p=>p.faction===s.name).reduce((a,p)=>a+power(p),0)})).sort((a,b)=>b.totalPower-a.totalPower); $('content').innerHTML=`<div class="toolbar"><button onclick="window.quick('sects')">新增势力</button></div><div class="grid">${arr.map(s=>`<div class="card" data-open="sects:${s.id}">${img(s.image)}<h3>${safe(s.name)}</h3><span class="pill">${safe(s.level||'未定')}</span><span class="pill">成员 ${s.members}</span><p>宗主：${safe(s.master||'未定')}</p><p class="muted">总战力 ${Math.round(s.totalPower)}｜元石 ${n(s.stones)}</p></div>`).join('')||empty()}</div>`; bindCards(); }
function renderRankings(){ const p=[...state.players]; const rows=(arr,fn)=>arr.slice(0,20).map((x,i)=>`<tr><td>${i+1}</td><td>${safe(x.name)}</td><td>${fn(x)}</td><td>${safe(x.faction||'散修')}</td></tr>`).join(''); $('content').innerHTML=`<h2>战力榜</h2><table class="table"><tr><th>名次</th><th>姓名</th><th>战力</th><th>势力</th></tr>${rows(p.sort((a,b)=>power(b)-power(a)),x=>Math.round(power(x)))}</table><h2>财富榜</h2><table class="table"><tr><th>名次</th><th>姓名</th><th>元石</th><th>势力</th></tr>${rows(p.sort((a,b)=>n(b.stones)-n(a.stones)),x=>n(x.stones))}</table><h2>胜场榜</h2><table class="table"><tr><th>名次</th><th>姓名</th><th>胜场</th><th>势力</th></tr>${rows(p.sort((a,b)=>n(b.wins)-n(a.wins)),x=>n(x.wins))}</table>`; }
function renderRules(){ $('content').innerHTML=`<div class="scroll-panel"><h2>凡人境界</h2><p>一转至五转，每转分初期、中期、后期、巅峰；每十场胜利提升一个小境界。</p><h2>资质</h2><p>十绝体、甲、乙、丙、丁。资质决定真元恢复、容量、成长潜力。</p><h2>蛊仙与劫难</h2><p>六转青提仙元，一年地劫，十年天劫，熬过八个天劫可晋七转。七转红荔仙元，百年亿劫，熬过八个亿劫可晋八转。八转白梨仙元，千年浩劫，熬过八个浩劫可晋九转仙尊。九转黄杏仙元。</p><h2>仙元换算</h2><p>一颗仙元石等于一亿元石；一颗仙元石等于一青提仙元；一红荔等于一百青提；一白梨等于一百红荔；一黄杏等于一百白梨。</p><h2>道痕</h2><p>地劫几十至数百道痕，天劫几百至数千，亿劫几千至数万，浩劫几万至数十万。道痕需对应流派成就足够深厚才能吸收。</p><h2>寿蛊</h2><p>突破六转增十年寿，七转百年，八转千年。其余寿命极难获得，需寿蛊。仙人层次，寿命是追求一切的前提。</p></div>`; }

boot();