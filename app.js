const VERSION = "6.2.0";
const CONFIG_KEY = "couplee_supabase_config_v6";
const app = document.getElementById("app");

const phaseOptions = ["交際初期","近距離","遠距離","ラブラブ","安定期","倦怠期ぎみ","同棲","新婚","夫婦","子あり前後","忙しいカップル","復縁・修復中","改善したい"];
const questions = [
  "今日、相手にひとつだけ伝えたいことは？",
  "次のデートで一緒にしたいことは？",
  "最近うれしかった相手の行動は？",
  "今週、ふたりで大切にしたいことは？",
  "言いづらいけれど、本当はお願いしたいことは？",
  "相手に感謝していることは？",
  "今日の気分を一言でいうと？"
];

const urlInvite = new URL(location.href).searchParams.get("invite") || "";
let state = {
  sb:null, session:null, profile:null, couple:null, members:[], partner:null,
  dailyAnswers:[], memories:[], requests:[], events:[], todos:[], privacy:null,
  error:"", toast:"", loading:true, modal:null,
  ui:{ view:"home", selectedDate:todayKey(), requestFilter:"all" },
  pendingInvite:urlInvite.trim().toUpperCase(), lastShareUrl:""
};

init();

async function init(){
  try{
    setupConfig();
    await connectSupabase();
    await refreshSession();
    if(state.session){
      await loadProfile();
      await loadCouple();
      if(state.pendingInvite && state.profile && !state.couple){
        await joinByInvite(state.pendingInvite, false);
      }
      if(state.couple) await loadAll();
    }
    state.loading=false;
    render();
    startClock();
  }catch(error){
    state.loading=false;
    state.error = readableError(error);
    render();
  }
}

function setupConfig(){
  const fallback = window.COUPLEE_DEFAULT_SUPABASE || {};
  const current = safeJson(localStorage.getItem(CONFIG_KEY));
  const config = current?.url && current?.anonKey ? current : fallback;
  if(config?.url && config?.anonKey) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
function getConfig(){ return safeJson(localStorage.getItem(CONFIG_KEY)) || window.COUPLEE_DEFAULT_SUPABASE || {}; }
async function connectSupabase(){
  const config = getConfig();
  if(!config.url || !config.anonKey) throw new Error("Supabase URL と anon public key が未設定です。設定画面で入力してください。");
  state.sb = window.supabase.createClient(config.url, config.anonKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
  state.sb.auth.onAuthStateChange(async ()=>{ await refreshSession(); });
}
async function refreshSession(){ const { data, error } = await state.sb.auth.getSession(); if(error) throw error; state.session = data.session || null; }

async function ensureAnonSession(){
  await refreshSession();
  if(state.session?.user) return state.session;
  const { data, error } = await state.sb.auth.signInAnonymously();
  if(error){
    if(String(error.message || "").toLowerCase().includes("anonymous")){
      throw new Error("Supabaseで匿名ログインが有効になっていません。Authentication → Providers → Anonymous sign-ins をONにしてください。");
    }
    throw error;
  }
  state.session = data.session;
  return state.session;
}

async function saveProfile(displayName, avatarDataUrl=""){
  await ensureAnonSession();
  const row = { user_id:uid(), display_name:displayName || "あなた", avatar_data_url:avatarDataUrl || state.profile?.avatar_data_url || "", updated_at:new Date().toISOString() };
  const { error } = await state.sb.from("profiles").upsert(row, { onConflict:"user_id" });
  if(error) throw error;
  await loadProfile();
}
async function loadProfile(){
  if(!uid()) return;
  const { data, error } = await state.sb.from("profiles").select("*").eq("user_id", uid()).maybeSingle();
  if(error) throw error;
  state.profile = data || null;
}
async function loadCouple(){
  if(!uid()) return;
  const { data: membership, error } = await state.sb.from("couple_members").select("couple_id, role, joined_at").eq("user_id", uid()).order("joined_at", { ascending:false }).limit(1).maybeSingle();
  if(error) throw error;
  if(!membership){ state.couple=null; state.members=[]; state.partner=null; return; }
  const { data: couple, error:cErr } = await state.sb.from("couples").select("*").eq("id", membership.couple_id).single();
  if(cErr) throw cErr;
  const { data: members, error:mErr } = await state.sb.from("couple_members").select("user_id, role, joined_at").eq("couple_id", couple.id).order("joined_at");
  if(mErr) throw mErr;
  state.couple=couple; state.members=members || [];
  const partnerMember = state.members.find(m=>m.user_id !== uid());
  if(partnerMember){
    const { data: partner } = await state.sb.from("profiles").select("*").eq("user_id", partnerMember.user_id).maybeSingle();
    state.partner=partner || null;
  }else state.partner=null;
}
async function loadAll(){
  if(!state.couple) return;
  const cid = state.couple.id;
  const [daily, memories, requests, events, todos, privacy] = await Promise.all([
    state.sb.from("daily_answers").select("*").eq("couple_id", cid).eq("question_date", todayKey()).order("created_at"),
    state.sb.from("memories").select("*").eq("couple_id", cid).order("memory_date", { ascending:false }),
    state.sb.from("requests").select("*").eq("couple_id", cid).order("created_at", { ascending:false }),
    state.sb.from("events").select("*").eq("couple_id", cid).order("event_date").order("event_time"),
    state.sb.from("todos").select("*").eq("couple_id", cid).order("created_at", { ascending:false }),
    state.sb.from("privacy_settings").select("*").eq("couple_id", cid).maybeSingle()
  ]);
  for(const res of [daily,memories,requests,events,todos,privacy]) if(res.error) throw res.error;
  state.dailyAnswers=daily.data || []; state.memories=memories.data || []; state.requests=requests.data || []; state.events=events.data || []; state.todos=todos.data || [];
  state.privacy=privacy.data || { couple_id:cid, location_enabled:false, location_mode:"timed", consent_required:true };
}
async function reloadAll(toast=""){
  await refreshSession(); await loadProfile(); await loadCouple(); if(state.couple) await loadAll(); render(toast);
}

function render(toast=""){
  if(toast) state.toast=toast;
  app.innerHTML = `<main class="shell">
    <aside class="aside">
      <div class="logo">∞</div>
      <h1>Couplee<br>Easy Link</h1>
      <p>メール認証や招待コード入力で離脱しないように、リンクを送るだけで相手が参加できるv6.2です。</p>
      <div class="chips"><span class="chip">名前だけで開始</span><span class="chip">LINE招待リンク</span><span class="chip">自動参加</span><span class="chip">Supabase同期</span></div>
    </aside>
    <section class="phone">${statusBar()}${renderBody()}${state.modal?renderModal(state.modal):""}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:""}</section>
  </main>`;
  bindEvents();
  if(state.toast){ setTimeout(()=>{state.toast=""; render();}, 1800); }
}
function renderBody(){
  if(state.loading) return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>読み込み中</h1><p>Coupleeを準備しています。</p></div></div>`;
  if(!state.sb || !getConfig().url || !getConfig().anonKey) return renderConfig();
  if(state.pendingInvite && (!state.session || !state.profile || !state.couple)) return renderJoinLink();
  if(!state.session || !state.profile) return renderWelcome();
  if(!state.couple) return renderCreateRoom();
  return renderAppShell();
}
function statusBar(){ return `<div class="status"><span id="clock">${currentTime()}</span><span class="right"><span>5G</span><span>●●●</span><span>🔋</span></span></div>`; }
function renderConfig(){
  const c=getConfig();
  return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>Supabase接続</h1><p>通常は入力不要です。接続できない場合だけ設定してください。</p></div>${state.error?`<div class="error">${esc(state.error)}</div>`:""}<form id="configForm" class="card"><div class="field"><label>Project URL</label><input name="url" value="${esc(c.url||"")}" placeholder="https://xxxx.supabase.co" required></div><div class="field"><label>anon public key</label><input name="anonKey" value="${esc(c.anonKey||"")}" required></div><button class="btn primary full">保存して接続</button></form></div>`;
}
function renderWelcome(){
  return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>Coupleeを始める</h1><p>メール登録なし。まずはあなたの名前と写真だけで始められます。</p></div>${state.error?`<div class="error">${esc(state.error)}</div>`:""}<form id="quickProfileForm" class="card"><div class="photo-upload"><div class="photo-preview" id="myPreview">${imgOrEmoji("","👤")}</div><div class="field" style="margin:0"><label>あなたの画像アイコン</label><input name="avatar" type="file" accept="image/*"></div></div><div class="field"><label>あなたの名前</label><input name="display_name" placeholder="例：龍司" required maxlength="24"></div><button class="btn primary full">次へ進む</button><div class="divider">または</div><button class="small-link" type="button" data-open="emailLogin">メールでログインする</button></form></div>`;
}
function renderCreateRoom(){
  return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>ふたりのルームを作る</h1><p>相手はリンクを開いて名前を入れるだけ。招待コード入力は不要です。</p></div>${state.error?`<div class="error">${esc(state.error)}</div>`:""}<form id="easyCreateForm" class="card"><div class="field"><label>パートナーの名前</label><input name="partner_name_hint" placeholder="例：ゆうか" required maxlength="24"></div><div class="form-grid"><div class="field"><label>交際開始日 / 大切な日</label><input name="start_date" type="date" value="${todayKey()}" required></div><div class="field"><label>記念日名</label><input name="anniversary_name" value="交際記念日" required></div></div><div class="field"><label>関係フェーズ</label><select name="phase">${phaseOptions.map(p=>`<option>${esc(p)}</option>`).join("")}</select></div><div class="field"><label>ふたりの目標</label><input name="goal" value="毎日少しだけ会話する"></div><button class="btn primary full">ルームを作って招待リンクを出す</button></form></div>`;
}
function renderJoinLink(){
  return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>招待リンクで参加</h1><p>招待コードの入力は不要です。あなたの名前だけ入れると自動で参加します。</p></div>${state.error?`<div class="error">${esc(state.error)}</div>`:""}<div class="success">招待コード：${esc(state.pendingInvite)}</div><form id="easyJoinForm" class="card"><div class="photo-upload"><div class="photo-preview" id="joinPreview">${imgOrEmoji("","👤")}</div><div class="field" style="margin:0"><label>あなたの画像アイコン</label><input name="avatar" type="file" accept="image/*"></div></div><div class="field"><label>あなたの名前</label><input name="display_name" placeholder="例：ゆうか" required maxlength="24"></div><button class="btn lav full">名前だけで参加する</button></form></div>`;
}
function renderAppShell(){
  return `<div class="topbar"><div><h2>${viewTitle()}</h2><p>${esc(myName())} × ${esc(partnerName())}｜${esc(state.couple.phase || "")}</p></div><div class="avatars"><div class="avatar">${imgOrEmoji(state.profile?.avatar_data_url,"👤")}</div><div class="avatar">${imgOrEmoji(state.partner?.avatar_data_url,"💞")}</div></div></div><div class="content">${renderView()}</div>${renderNav()}`;
}
function renderNav(){ const tabs=[["home","🏠","ホーム"],["anniv","🎂","記念日"],["album","📷","アルバム"],["board","💌","お願い"],["calendar","🗓️","予定"],["privacy","🛡️","連携"]]; return `<nav class="nav">${tabs.map(t=>`<button data-view="${t[0]}" class="${state.ui.view===t[0]?"active":""}"><span>${t[1]}</span>${t[2]}</button>`).join("")}</nav>`; }
function viewTitle(){ return ({home:"ホーム",anniv:"記念日",album:"アルバム",board:"お願い掲示板",calendar:"共有カレンダー",privacy:"連携・安全"})[state.ui.view] || "ホーム"; }
function renderView(){ return ({home:renderHome,anniv:renderAnniv,album:renderAlbum,board:renderBoard,calendar:renderCalendar,privacy:renderPrivacy})[state.ui.view]?.() || renderHome(); }
function renderHome(){
  const my=myDaily(), partner=partnerDaily(), both=my?.answer && partner?.answer;
  return `<section><div class="card hero"><div><div class="count-label">${esc(state.couple.anniversary_name)}まであと</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">${formatDate(nextAnniv(),"long")}・${yearsTogether()}年記念</span></div><div class="mascot">🐰</div></div><div class="section grid3">${metric("🔗", state.partner?"連携済み":"招待待ち", "ペア状態")}${metric("💗", String(calcPoints()), "ハート")}${metric("🔥", `${Math.min(99,state.dailyAnswers.length + state.requests.filter(r=>r.status==='done').length)}日`, "記録")}</div>${!state.partner?renderShareNudge():""}<div class="section card"><div class="daily-q"><div class="iconbox">💬</div><div><h3>${esc(todayQuestion())}</h3><p>回答は相手と同期されます。</p></div></div><form id="dailyForm" style="margin-top:12px"><div class="field"><label>${esc(myName())}の回答</label><textarea name="answer" placeholder="今日の気持ちを短く入力">${esc(my?.answer || "")}</textarea></div><div class="field"><label>気分</label><select name="mood">${["😊","😌","🥰","😢","😴","😤"].map(m=>`<option ${my?.mood===m?"selected":""}>${m}</option>`).join("")}</select></div><button class="btn primary full">回答を保存</button></form>${both?`<div class="answer-box"><strong>${esc(partnerName())}の回答</strong><p>${esc(partner.answer)}</p></div>`:`<div class="answer-box"><strong>相手の回答</strong><p>${state.partner?"相手の回答待ちです。":"招待リンクを送ると相手が参加できます。"}</p></div>`}</div><div class="section"><div class="section-head"><h3>クイック操作</h3><button class="btn ghost" data-action="refresh">更新</button></div><div class="quick"><button data-open="memory"><span>📷</span>思い出</button><button data-open="request"><span>💌</span>お願い</button><button data-open="event"><span>🗓️</span>予定</button><button data-view="privacy"><span>🔗</span>招待</button></div></div></section>`;
}
function renderShareNudge(){ return `<div class="section card"><div class="section-head"><h3>相手を招待</h3><small>リンクを送るだけ</small></div><p class="hint">相手はメール登録なしで、名前を入れるだけで参加できます。</p><div class="big-actions"><button class="btn primary" data-action="copyInvite">招待リンクをコピー</button><button class="btn green" data-action="lineInvite">LINEで送る</button></div></div>`; }
function renderAnniv(){ return `<section><div class="card hero"><div><div class="count-label">次の記念日まで</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">${formatDate(nextAnniv(),"long")}</span></div><div class="mascot">🎂</div></div><div class="section grid3">${metric("📅",`${relationshipDays()}日`,"一緒の日数")}${metric("💕",state.couple.phase,"関係")}${metric("🎯",state.couple.goal || "未設定","目標")}</div><div class="section card"><div class="section-head"><h3>ふたりの設定</h3><button class="btn ghost" data-open="coupleSettings">編集</button></div><p class="hint">記念日名、関係フェーズ、目標を変更すると相手側にも反映されます。</p></div><div class="section"><div class="section-head"><h3>おすすめデート</h3><small>次の記念日前に</small></div>${[["☕","週末カフェ巡り","90分だけ会話する軽いデート"],["📷","アルバム整理","写真を3枚選んで思い出に残す"],["🎁","小さなサプライズ","相手が最近欲しがっていた物を贈る"]].map(i=>`<div class="event"><time>${i[0]}</time><div><h4>${i[1]}</h4><p>${i[2]}</p></div></div>`).join("")}</div></section>`; }
function renderAlbum(){ return `<section><div class="screen-title"><div><h2>アルバム</h2><p>相手と写真・思い出を同期</p></div><button class="btn primary" data-open="memory">追加</button></div><div class="album-grid">${state.memories.length?state.memories.map(memoryCard).join(""):`<div class="card empty">まだ思い出がありません。写真を追加してください。</div>`}</div></section>`; }
function memoryCard(m){ return `<article class="card memory"><div class="memory-img">${m.image_data_url?`<img src="${m.image_data_url}" alt="">`:"📷"}</div><div class="memory-body"><div class="memory-meta"><span class="pill">${formatDate(m.memory_date)}</span><span class="pill">📍 ${esc(m.place || "未設定")}</span></div><h3>${esc(m.title)}</h3><p>${esc(m.caption || "")}</p>${m.created_by===uid()?`<div class="btn-row" style="margin-top:10px"><button class="btn danger" data-delete-memory="${m.id}">削除</button></div>`:""}</div></article>`; }
function renderBoard(){ const f=state.ui.requestFilter, items=state.requests.filter(r=>f==='all'||r.status===f), done=state.requests.filter(r=>r.status==='done').length, rate=Math.round(done/Math.max(1,state.requests.length)*100); return `<section><div class="screen-title"><div><h2>お願い掲示板</h2><p>お願い・やりたいことを共有</p></div><button class="btn primary" data-open="request">追加</button></div><div class="btn-row" style="margin-bottom:10px">${[["all","すべて"],["pending","未対応"],["accepted","受付中"],["done","完了"]].map(t=>`<button data-filter="${t[0]}" class="btn ${f===t[0]?"primary":""}">${t[1]}</button>`).join("")}</div><div class="section grid2"><div class="card metric"><span>🤝 協力度</span><b>${rate}%</b><div class="progress"><span style="width:${rate}%"></span></div></div><div class="card metric"><span>💗 完了数</span><b>${done}</b></div></div><div class="section">${items.length?items.map(requestCard).join(""):`<div class="card empty">このステータスのお願いはありません。</div>`}</div></section>`; }
function requestCard(r){ return `<article class="card request"><div class="request-top"><div><h3>${esc(r.title)}</h3><p>${esc(r.detail || "")}</p></div><span class="tag ${r.status}">${statusLabel(r.status)}</span></div><div class="btn-row"><span class="pill">${esc(nameByUser(r.created_by))}から</span><span class="pill">+${Number(r.reward_points||0)}pt</span></div><div class="btn-row"><button class="btn" data-req-status="${r.id}:pending">未対応</button><button class="btn" data-req-status="${r.id}:accepted">受付中</button><button class="btn primary" data-req-status="${r.id}:done">完了</button>${r.created_by===uid()?`<button class="btn danger" data-delete-request="${r.id}">削除</button>`:""}</div></article>`; }
function renderCalendar(){ const selected=state.ui.selectedDate, events=state.events.filter(e=>e.event_date===selected).sort((a,b)=>(a.event_time||"").localeCompare(b.event_time||"")), rate=Math.round(state.todos.filter(t=>t.done).length/Math.max(1,state.todos.length)*100); return `<section><div class="screen-title"><div><h2>共有カレンダー</h2><p>予定とToDoを相手と同期</p></div><button class="btn primary" data-open="event">追加</button></div>${renderMonth()}<div class="section"><div class="section-head"><h3>${formatDate(selected)} の予定</h3><button class="btn ghost" data-open="event">予定追加</button></div>${renderEvents(events)}</div><div class="section"><div class="section-head"><h3>ToDo</h3><button class="btn ghost" data-open="todo">追加</button></div><div class="card"><div class="section-head"><span class="pill">メンタルロード</span><b>${rate}%</b></div><div class="progress"><span style="width:${rate}%"></span></div></div><div style="margin-top:10px">${state.todos.length?state.todos.map(t=>`<label class="todo ${t.done?'done':''}"><input type="checkbox" data-todo="${t.id}" ${t.done?'checked':''}><span>${esc(t.title)}｜${esc(nameByUser(t.owner_user_id)||"ふたり")}</span>${t.created_by===uid()?`<button class="btn danger" data-delete-todo="${t.id}" type="button">削除</button>`:""}</label>`).join(""):`<div class="card empty">ToDoはまだありません。</div>`}</div></div></section>`; }
function renderMonth(){ const sel=new Date(`${state.ui.selectedDate}T00:00:00`), y=sel.getFullYear(), m=sel.getMonth(), first=new Date(y,m,1), last=new Date(y,m+1,0), cells=[]; for(let i=0;i<first.getDay();i++) cells.push(null); for(let d=1;d<=last.getDate();d++) cells.push(new Date(y,m,d)); return `<div class="card calendar-card"><div class="month-head"><button class="btn ghost" data-month="-1">‹</button><b>${y}年${m+1}月</b><button class="btn ghost" data-month="1">›</button></div><div class="month-grid">${["日","月","火","水","木","金","土"].map(d=>`<div class="dow">${d}</div>`).join("")}${cells.map(d=>d?`<button class="day ${toKey(d)===todayKey()?"today":""} ${toKey(d)===state.ui.selectedDate?"selected":""} ${state.events.some(e=>e.event_date===toKey(d))?"has":""}" data-date="${toKey(d)}">${d.getDate()}</button>`:`<div></div>`).join("")}</div></div>`; }
function renderEvents(events){ return events.length?`<div>${events.map(e=>`<div class="event"><time>${esc(e.event_time?.slice(0,5)||"--:--")}</time><div><h4>${esc(e.title)}</h4><p>${esc(e.note||"")}｜${esc(e.event_type||"予定")}</p></div>${e.created_by===uid()?`<button class="btn danger" data-delete-event="${e.id}">削除</button>`:""}</div>`).join("")}</div>`:`<div class="card empty">予定はありません。</div>`; }
function renderPrivacy(){ const share=shareUrl(); return `<section><div class="screen-title"><div><h2>かんたん連携</h2><p>相手はリンクを開いて名前だけ</p></div></div><div class="card link-card"><h3>招待リンク</h3><div class="invite-code">${esc(state.couple.invite_code)}</div><p class="hint">招待コード入力は不要。下のリンクを相手に送るだけです。</p><div class="big-actions"><button class="btn primary" data-action="copyInvite">招待リンクをコピー</button><button class="btn green" data-action="lineInvite">LINEで送る</button></div><p class="debug" style="margin-top:12px">${esc(share)}</p></div><div class="section" style="display:grid;gap:9px">${privacyOption("always","📍","常に共有","同意した場合のみ現在地共有")}${privacyOption("timed","⏱️","時間限定共有","必要な時間だけ共有")}${privacyOption("emergency","🆘","緊急時のみ","普段はOFF")}</div><div class="section card"><div class="section-head"><h3>接続状態</h3><button class="btn ghost" data-action="refresh">再読み込み</button></div><p class="debug">User: ${esc(uid())}<br>Couple: ${esc(state.couple.id)}<br>Partner: ${state.partner?esc(state.partner.display_name):"未参加"}</p></div><div class="section grid2"><button class="btn" data-action="exportData">データ書き出し</button><button class="btn danger" data-action="leaveCouple">連携解除</button><button class="btn danger" data-action="logout">この端末からログアウト</button><button class="btn" data-open="profileEdit">プロフィール編集</button></div></section>`; }
function privacyOption(mode,icon,title,desc){ return `<button class="privacy-option ${state.privacy?.location_mode===mode?'active':''}" data-privacy-mode="${mode}"><span>${icon}</span><div><strong>${esc(title)}</strong><small>${esc(desc)}</small></div><span>${state.privacy?.location_mode===mode?'✓':''}</span></button>`; }
function metric(icon,big,label){ return `<div class="card metric"><span>${icon} ${label}</span><b>${esc(big)}</b></div>`; }

function renderModal(type){ const titles={memory:"思い出を追加",request:"お願いを追加",event:"予定を追加",todo:"ToDoを追加",coupleSettings:"ふたりの設定",profileEdit:"プロフィール編集",emailLogin:"メールログイン"}; return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${titles[type]||"追加"}</h3><button class="x" data-close>×</button></div>${modalBody(type)}</div></div>`; }
function modalBody(type){
  if(type==='memory') return `<form data-form="memory"><div class="field"><label>タイトル</label><input name="title" required></div><div class="form-grid"><div class="field"><label>日付</label><input name="memory_date" type="date" value="${todayKey()}" required></div><div class="field"><label>場所</label><input name="place"></div></div><div class="field"><label>写真</label><input name="image" type="file" accept="image/*"></div><div class="field"><label>キャプション</label><textarea name="caption"></textarea></div><button class="btn primary full">保存</button></form>`;
  if(type==='request') return `<form data-form="request"><div class="field"><label>お願いタイトル</label><input name="title" required></div><div class="field"><label>内容</label><textarea name="detail"></textarea></div><div class="field"><label>報酬pt</label><input name="reward_points" type="number" value="30"></div><button class="btn primary full">追加</button></form>`;
  if(type==='event') return `<form data-form="event"><div class="field"><label>予定名</label><input name="title" required></div><div class="form-grid"><div class="field"><label>日付</label><input name="event_date" type="date" value="${state.ui.selectedDate}" required></div><div class="field"><label>時間</label><input name="event_time" type="time" value="19:00"></div></div><div class="field"><label>メモ</label><input name="note"></div><div class="field"><label>種類</label><select name="event_type"><option value="date">デート</option><option value="call">電話</option><option value="task">用事</option><option value="anniversary">記念日</option></select></div><button class="btn primary full">追加</button></form>`;
  if(type==='todo') return `<form data-form="todo"><div class="field"><label>ToDo</label><input name="title" required></div><div class="field"><label>担当</label><select name="owner_user_id"><option value="">ふたり</option><option value="${uid()}">${esc(myName())}</option>${state.partner?`<option value="${state.partner.user_id}">${esc(state.partner.display_name)}</option>`:""}</select></div><button class="btn primary full">追加</button></form>`;
  if(type==='coupleSettings') return `<form data-form="coupleSettings"><div class="field"><label>パートナー名メモ</label><input name="partner_name_hint" value="${esc(state.couple.partner_name_hint||"")}" required></div><div class="form-grid"><div class="field"><label>交際開始日</label><input name="start_date" type="date" value="${state.couple.start_date}" required></div><div class="field"><label>記念日名</label><input name="anniversary_name" value="${esc(state.couple.anniversary_name)}" required></div></div><div class="field"><label>関係フェーズ</label><select name="phase">${phaseOptions.map(p=>`<option ${state.couple.phase===p?'selected':''}>${esc(p)}</option>`).join("")}</select></div><div class="field"><label>ふたりの目標</label><input name="goal" value="${esc(state.couple.goal||"")}"></div><button class="btn primary full">保存</button></form>`;
  if(type==='profileEdit') return `<form data-form="profileEdit"><div class="photo-upload"><div class="photo-preview">${imgOrEmoji(state.profile?.avatar_data_url,"👤")}</div><div class="field" style="margin:0"><label>画像アイコン</label><input name="avatar" type="file" accept="image/*"></div></div><div class="field"><label>あなたの名前</label><input name="display_name" value="${esc(myName())}" required></div><button class="btn primary full">保存</button></form>`;
  if(type==='emailLogin') return `<form id="emailLoginForm"><p class="hint">本番で端末変更に対応したい場合用です。普段はメール不要のかんたん連携でOKです。</p><div class="field"><label>メール</label><input name="email" type="email" required></div><div class="field"><label>パスワード</label><input name="password" type="password" required minlength="6"></div><button class="btn primary full" name="mode" value="signup">新規登録</button><button class="btn lav full" style="margin-top:8px" name="mode" value="signin">ログイン</button></form>`;
  return "";
}

function bindEvents(){
  document.getElementById("configForm")?.addEventListener("submit", async e=>{ e.preventDefault(); const fd=new FormData(e.currentTarget); localStorage.setItem(CONFIG_KEY, JSON.stringify({url:fd.get("url"), anonKey:fd.get("anonKey")})); state.error=""; state.loading=true; render(); await init(); });
  document.getElementById("quickProfileForm")?.addEventListener("submit", async e=>{ e.preventDefault(); await run(async()=>{ const fd=new FormData(e.currentTarget); const img=await fileToDataUrl(fd.get("avatar")); await saveProfile(fd.get("display_name"), img); await reloadAll("プロフィールを保存しました"); }); });
  document.getElementById("easyCreateForm")?.addEventListener("submit", async e=>{ e.preventDefault(); await run(async()=>{ const fd=new FormData(e.currentTarget); const { data, error } = await state.sb.rpc("create_couple_room", { p_partner_name_hint:fd.get("partner_name_hint"), p_start_date:fd.get("start_date"), p_anniversary_name:fd.get("anniversary_name"), p_phase:fd.get("phase"), p_goal:fd.get("goal") }); if(error) throw error; await reloadAll("ルームを作成しました"); state.lastShareUrl=shareUrl(); await copyText(shareText()); render("招待リンクをコピーしました"); }); });
  document.getElementById("easyJoinForm")?.addEventListener("submit", async e=>{ e.preventDefault(); await run(async()=>{ const fd=new FormData(e.currentTarget); const img=await fileToDataUrl(fd.get("avatar")); await saveProfile(fd.get("display_name"), img); await joinByInvite(state.pendingInvite, true); history.replaceState({}, "", location.pathname); state.pendingInvite=""; await reloadAll("参加しました"); }); });
  document.getElementById("dailyForm")?.addEventListener("submit", async e=>{ e.preventDefault(); await run(async()=>{ const fd=new FormData(e.currentTarget); const row={couple_id:state.couple.id,user_id:uid(),question_date:todayKey(),question_text:todayQuestion(),answer:fd.get("answer"),mood:fd.get("mood"),updated_at:new Date().toISOString()}; const { error } = await state.sb.from("daily_answers").upsert(row, { onConflict:"couple_id,user_id,question_date" }); if(error) throw error; await reloadAll("回答を保存しました"); }); });
  document.getElementById("emailLoginForm")?.addEventListener("submit", async e=>{ e.preventDefault(); const submitter=e.submitter?.value || "signin"; await run(async()=>{ const fd=new FormData(e.currentTarget); const auth=submitter==='signup'?state.sb.auth.signUp({email:fd.get("email"),password:fd.get("password"),options:{emailRedirectTo:location.origin}}):state.sb.auth.signInWithPassword({email:fd.get("email"),password:fd.get("password")}); const { error } = await auth; if(error) throw error; state.modal=null; await reloadAll(submitter==='signup'?"確認メールを送信しました":"ログインしました"); }); });
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{ state.ui.view=b.dataset.view; render(); }));
  document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{ state.modal=b.dataset.open; render(); }));
  document.querySelectorAll("[data-close], .modal-backdrop").forEach(el=>el.addEventListener("click",e=>{ if(e.target===el || el.dataset.close!==undefined){ state.modal=null; render(); } }));
  document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>handleAction(b.dataset.action)));
  document.querySelectorAll("[data-form]").forEach(f=>f.addEventListener("submit",handleDataForm));
  document.querySelectorAll("input[type=file]").forEach(inp=>inp.addEventListener("change",previewFile));
  document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{ state.ui.requestFilter=b.dataset.filter; render(); }));
  document.querySelectorAll("[data-date]").forEach(b=>b.addEventListener("click",()=>{ state.ui.selectedDate=b.dataset.date; render(); }));
  document.querySelectorAll("[data-month]").forEach(b=>b.addEventListener("click",()=>{ const d=new Date(`${state.ui.selectedDate}T00:00:00`); d.setMonth(d.getMonth()+Number(b.dataset.month)); state.ui.selectedDate=toKey(d); render(); }));
  document.querySelectorAll("[data-req-status]").forEach(b=>b.addEventListener("click",async()=>{ const [id,status]=b.dataset.reqStatus.split(":"); await run(async()=>{ const { error } = await state.sb.from("requests").update({status,updated_at:new Date().toISOString()}).eq("id", id); if(error) throw error; await reloadAll("ステータスを更新しました"); }); }));
  document.querySelectorAll("[data-todo]").forEach(c=>c.addEventListener("change",async()=>{ await run(async()=>{ const { error } = await state.sb.from("todos").update({done:c.checked,updated_at:new Date().toISOString()}).eq("id", c.dataset.todo); if(error) throw error; await reloadAll("ToDoを更新しました"); }); }));
  document.querySelectorAll("[data-privacy-mode]").forEach(b=>b.addEventListener("click",async()=>{ await run(async()=>{ const { error } = await state.sb.from("privacy_settings").upsert({couple_id:state.couple.id, location_enabled:b.dataset.privacyMode!=='emergency', location_mode:b.dataset.privacyMode, consent_required:true, updated_by:uid(), updated_at:new Date().toISOString()}, { onConflict:"couple_id" }); if(error) throw error; await reloadAll("共有モードを更新しました"); }); }));
  for(const [selector,table] of [["[data-delete-memory]","memories"],["[data-delete-request]","requests"],["[data-delete-event]","events"],["[data-delete-todo]","todos"]]) document.querySelectorAll(selector).forEach(b=>b.addEventListener("click",async e=>{ e.preventDefault(); const id=b.getAttribute(selector.slice(1,-1)); if(confirm("削除しますか？")) await run(async()=>{ const { error } = await state.sb.from(table).delete().eq("id",id); if(error) throw error; await reloadAll("削除しました"); }); }));
}
async function handleDataForm(e){ e.preventDefault(); const type=e.currentTarget.dataset.form; const fd=new FormData(e.currentTarget); await run(async()=>{
  if(type==='memory'){ const image=await fileToDataUrl(fd.get("image")); const { error }=await state.sb.from("memories").insert({couple_id:state.couple.id,created_by:uid(),title:fd.get("title"),caption:fd.get("caption"),place:fd.get("place"),memory_date:fd.get("memory_date"),image_data_url:image}); if(error) throw error; }
  if(type==='request'){ const { error }=await state.sb.from("requests").insert({couple_id:state.couple.id,created_by:uid(),title:fd.get("title"),detail:fd.get("detail"),reward_points:Number(fd.get("reward_points")||30),status:"pending"}); if(error) throw error; }
  if(type==='event'){ const { error }=await state.sb.from("events").insert({couple_id:state.couple.id,created_by:uid(),title:fd.get("title"),event_date:fd.get("event_date"),event_time:fd.get("event_time") || null,note:fd.get("note"),event_type:fd.get("event_type")}); if(error) throw error; state.ui.selectedDate=fd.get("event_date"); }
  if(type==='todo'){ const owner=fd.get("owner_user_id") || null; const { error }=await state.sb.from("todos").insert({couple_id:state.couple.id,created_by:uid(),owner_user_id:owner,title:fd.get("title"),done:false}); if(error) throw error; }
  if(type==='coupleSettings'){ const { error }=await state.sb.from("couples").update({partner_name_hint:fd.get("partner_name_hint"),start_date:fd.get("start_date"),anniversary_name:fd.get("anniversary_name"),phase:fd.get("phase"),goal:fd.get("goal"),updated_at:new Date().toISOString()}).eq("id", state.couple.id); if(error) throw error; }
  if(type==='profileEdit'){ const img=await fileToDataUrl(fd.get("avatar")); await saveProfile(fd.get("display_name"), img || state.profile?.avatar_data_url || ""); }
  state.modal=null; await reloadAll("保存しました");
}); }
async function joinByInvite(code, notify=true){ const { error } = await state.sb.rpc("join_couple_by_invite", { invite:String(code).trim().toUpperCase() }); if(error) throw error; if(notify) state.toast="参加しました"; }
async function handleAction(action){
  if(action==='refresh') return run(async()=>reloadAll("更新しました"));
  if(action==='copyInvite') return run(async()=>{ await copyText(shareText()); render("招待リンクをコピーしました"); });
  if(action==='lineInvite') return run(async()=>{ location.href = `https://line.me/R/msg/text/?${encodeURIComponent(shareText())}`; });
  if(action==='exportData') return downloadFile(`couplee-export-${todayKey()}.json`, JSON.stringify({profile:state.profile,couple:state.couple,partner:state.partner,memories:state.memories,requests:state.requests,events:state.events,todos:state.todos,privacy:state.privacy},null,2), "application/json");
  if(action==='leaveCouple' && confirm("この端末をカップルルームから解除しますか？")) return run(async()=>{ const { error }=await state.sb.from("couple_members").delete().eq("couple_id",state.couple.id).eq("user_id",uid()); if(error) throw error; await reloadAll("連携を解除しました"); });
  if(action==='logout' && confirm("この端末からログアウトしますか？匿名アカウントの場合、戻れなくなる可能性があります。")) return run(async()=>{ await state.sb.auth.signOut(); state.session=null; state.profile=null; state.couple=null; state.partner=null; render("ログアウトしました"); });
}
async function run(fn){ try{ state.error=""; await fn(); }catch(error){ state.error=readableError(error); render(); } }
function shareUrl(){ if(!state.couple?.invite_code) return location.origin; return `${location.origin}${location.pathname}?invite=${encodeURIComponent(state.couple.invite_code)}`; }
function shareText(){ return `Coupleeでふたりのルームに招待されたよ。\nこのリンクを開いて、名前を入れるだけで参加できます。\n\n${shareUrl()}`; }
async function copyText(text){ try{ await navigator.clipboard.writeText(text); }catch{ prompt("コピーしてください", text); } }
function previewFile(e){ const file=e.target.files?.[0]; if(!file) return; const preview=e.target.closest(".photo-upload")?.querySelector(".photo-preview"); const r=new FileReader(); r.onload=()=>{ if(preview) preview.innerHTML=`<img src="${r.result}" alt="">`; }; r.readAsDataURL(file); }
function fileToDataUrl(file){ return new Promise(resolve=>{ if(!file || !file.size) return resolve(""); const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>resolve(""); r.readAsDataURL(file); }); }

function uid(){ return state.session?.user?.id || ""; }
function myName(){ return state.profile?.display_name || "あなた"; }
function partnerName(){ return state.partner?.display_name || state.couple?.partner_name_hint || "相手"; }
function nameByUser(userId){ if(!userId) return "ふたり"; if(userId===uid()) return myName(); if(userId===state.partner?.user_id) return partnerName(); return "ふたり"; }
function myDaily(){ return state.dailyAnswers.find(a=>a.user_id===uid()); }
function partnerDaily(){ return state.dailyAnswers.find(a=>a.user_id!==uid()); }
function todayQuestion(){ return questions[new Date().getDate() % questions.length]; }
function calcPoints(){ return 100 + state.memories.length*20 + state.requests.filter(r=>r.status==='done').length*30 + state.dailyAnswers.length*10 + state.events.length*5; }
function statusLabel(s){ return s==='pending'?'未対応':s==='accepted'?'受付中':'完了'; }
function todayKey(){ return toKey(new Date()); }
function toKey(d){ const x=new Date(d); const y=x.getFullYear(), m=String(x.getMonth()+1).padStart(2,"0"), day=String(x.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function formatDate(s,style="short"){ if(!s) return "未設定"; const d=new Date(`${s}T00:00:00`); return d.toLocaleDateString("ja-JP", style==='long'?{year:"numeric",month:"long",day:"numeric",weekday:"short"}:{year:"numeric",month:"2-digit",day:"2-digit"}); }
function daysBetween(a,b){ return Math.ceil((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`))/86400000); }
function nextYearlyDate(start){ const b=new Date(`${start}T00:00:00`), t=new Date(), n=new Date(t.getFullYear(), b.getMonth(), b.getDate()), td=new Date(t.getFullYear(),t.getMonth(),t.getDate()); if(n<td) n.setFullYear(t.getFullYear()+1); return toKey(n); }
function nextAnniv(){ return nextYearlyDate(state.couple?.start_date || todayKey()); }
function daysToAnniv(){ return Math.max(0, daysBetween(todayKey(), nextAnniv())); }
function relationshipDays(){ return Math.max(1, daysBetween(state.couple?.start_date || todayKey(), todayKey())); }
function yearsTogether(){ const s=new Date(`${state.couple?.start_date || todayKey()}T00:00:00`); const n=new Date(`${nextAnniv()}T00:00:00`); return Math.max(1,n.getFullYear()-s.getFullYear()); }
function currentTime(){ return new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}); }
function startClock(){ setInterval(()=>{ const c=document.getElementById("clock"); if(c) c.textContent=currentTime(); }, 15000); }
function esc(v=""){ return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function imgOrEmoji(src,emoji){ return src?`<img src="${src}" alt="">`:emoji; }
function safeJson(raw){ try{return JSON.parse(raw || "null");}catch{return null;} }
function readableError(error){ const msg=error?.message || String(error); if(msg.includes("create_couple_room")) return "SupabaseのSQLが古い可能性があります。v6.2の supabase-schema.sql をSQL Editorで実行してください。"; if(msg.includes("row-level security")) return "SupabaseのRLS設定で拒否されています。v6.2の supabase-schema.sql を再実行してください。"; return msg; }
function downloadFile(name, content, type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
