const VERSION = "6.0.0";
const CONFIG_KEY = "couplee_supabase_config_v6";
const DEMO_KEY = "couplee_demo_state_v6";
const AVATAR_LIMIT = 480;
const app = document.getElementById("app");

const questions = [
  "ふたりで今年中に行きたい場所はどこ？",
  "最近、相手にしてもらって嬉しかったことは？",
  "今週、ふたりの時間を10分増やすなら何をしたい？",
  "相手にもっと伝えたい感謝は？",
  "次のデートで食べたいものは？",
  "最近少しだけ寂しかった瞬間は？",
  "相手の好きなところをひとつだけ言うなら？",
  "ふたりの関係で、今月大切にしたいことは？",
  "忙しい日にされると助かることは？",
  "言いづらいけど、本当はお願いしたいことは？"
];

const phaseOptions = ["交際初期", "近距離", "遠距離", "ラブラブ", "安定期", "倦怠期ぎみ", "同棲", "新婚", "夫婦", "子あり前後", "忙しいカップル", "復縁・修復中", "改善したい"];

const state = {
  config: loadConfig(),
  sb: null,
  session: null,
  authMode: "login",
  demo: false,
  loading: true,
  error: "",
  toast: "",
  ui: { view: "home", modal: null, setupStep: 1, selectedDate: todayKey(), requestFilter: "all" },
  pendingProfile: { display_name: "", avatar_data_url: "" },
  profile: null,
  couple: null,
  partner: null,
  members: [],
  dailyAnswers: [],
  memories: [],
  requests: [],
  events: [],
  todos: [],
  privacy: null,
  pollTimer: null
};

init();

async function init(){
  try{
    if(state.config?.url && state.config?.anonKey && window.supabase){
      state.sb = window.supabase.createClient(state.config.url, state.config.anonKey);
      const { data } = await state.sb.auth.getSession();
      state.session = data?.session || null;
      state.sb.auth.onAuthStateChange((_event, session)=>{ state.session = session; bootAfterAuth(); });
    }
    await bootAfterAuth();
  }catch(e){
    state.error = normalizeError(e);
    state.loading = false;
    render();
  }
}

async function bootAfterAuth(){
  state.loading = true;
  render();
  if(!state.sb || !state.session){
    state.loading = false;
    render();
    return;
  }
  await loadProfile();
  if(state.profile) await loadCouple();
  if(state.couple) await loadAll();
  startPolling();
  state.loading = false;
  render();
}

function startPolling(){
  if(state.pollTimer) clearInterval(state.pollTimer);
  if(state.sb && state.session && state.couple){
    state.pollTimer = setInterval(()=>loadAll(false), 5000);
  }
}

function loadConfig(){
  try{return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");}catch{return null;}
}
function saveConfig(url, anonKey){
  state.config = { url: url.trim(), anonKey: anonKey.trim() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
}

async function loadProfile(){
  const uid = state.session.user.id;
  const { data, error } = await state.sb.from("profiles").select("*").eq("user_id", uid).maybeSingle();
  if(error) throw error;
  state.profile = data;
  if(data){
    state.pendingProfile.display_name = data.display_name || "";
    state.pendingProfile.avatar_data_url = data.avatar_data_url || "";
  }
}

async function loadCouple(){
  const uid = state.session.user.id;
  const { data: membership, error } = await state.sb.from("couple_members").select("couple_id, role, joined_at").eq("user_id", uid).order("joined_at", { ascending:false }).limit(1).maybeSingle();
  if(error) throw error;
  if(!membership){ state.couple = null; state.partner = null; state.members = []; return; }
  const { data: couple, error: cError } = await state.sb.from("couples").select("*").eq("id", membership.couple_id).single();
  if(cError) throw cError;
  state.couple = couple;
  const { data: members, error: mError } = await state.sb.from("couple_members").select("user_id, role, joined_at").eq("couple_id", couple.id).order("joined_at");
  if(mError) throw mError;
  state.members = members || [];
  const partnerMember = state.members.find(m=>m.user_id !== uid);
  if(partnerMember){
    const { data: partner, error: pError } = await state.sb.from("profiles").select("*").eq("user_id", partnerMember.user_id).maybeSingle();
    if(pError) throw pError;
    state.partner = partner;
  }else{
    state.partner = null;
  }
}

async function loadAll(showSpinner=true){
  if(!state.couple) return;
  if(showSpinner){ state.loading = true; render(); }
  const cid = state.couple.id;
  const [daily, memories, requests, events, todos, privacy] = await Promise.all([
    state.sb.from("daily_answers").select("*").eq("couple_id", cid).eq("question_date", todayKey()).order("created_at"),
    state.sb.from("memories").select("*").eq("couple_id", cid).order("memory_date", { ascending:false }),
    state.sb.from("requests").select("*").eq("couple_id", cid).order("created_at", { ascending:false }),
    state.sb.from("events").select("*").eq("couple_id", cid).order("event_date").order("event_time"),
    state.sb.from("todos").select("*").eq("couple_id", cid).order("created_at", { ascending:false }),
    state.sb.from("privacy_settings").select("*").eq("couple_id", cid).maybeSingle()
  ]);
  for(const res of [daily, memories, requests, events, todos, privacy]) if(res.error) throw res.error;
  state.dailyAnswers = daily.data || [];
  state.memories = memories.data || [];
  state.requests = requests.data || [];
  state.events = events.data || [];
  state.todos = todos.data || [];
  state.privacy = privacy.data || defaultPrivacy();
  if(showSpinner) state.loading = false;
  render();
}

function defaultPrivacy(){
  return { couple_id: state.couple?.id, location_enabled:false, location_mode:"timed", consent_required:true, updated_at: new Date().toISOString() };
}

function render(toast=""){
  if(toast){ state.toast = toast; setTimeout(()=>{state.toast=""; render();}, 1800); }
  app.innerHTML = `
    <main class="app-shell">
      <aside class="aside">
        <div class="logo">∞</div>
        <h1>Couplee<br>v6 Sync</h1>
        <p>Supabaseで、相手の端末と予定・お願い・アルバム・今日の質問を同期するカップルアプリです。</p>
        <div class="feature-list">
          ${feature("🔗", "招待コードで本当に相手と連携")}
          ${feature("📷", "画像アイコン・アルバムを同期")}
          ${feature("💌", "お願い掲示板とカレンダーを共有")}
          ${feature("🛡️", "GPSは同意ベースの設定管理")}
        </div>
      </aside>
      <div class="device-wrap">
        <section class="phone">
          ${statusBar()}
          ${renderCurrent()}
          ${state.ui.modal ? renderModal(state.ui.modal) : ""}
          ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
        </section>
      </div>
    </main>`;
  bindEvents();
}

function renderCurrent(){
  if(state.loading) return `<div class="content full"><div class="brand"><div class="logo">∞</div><h1>Couplee</h1><p>読み込み中...</p></div><div class="card empty">Supabaseと同期しています</div></div>`;
  if(!state.config?.url || !state.config?.anonKey || !state.sb) return renderSupabaseSetup();
  if(!state.session) return renderAuth();
  if(!state.profile) return renderProfileSetup();
  if(!state.couple) return renderCoupleLink();
  return renderAppShell();
}

function renderSupabaseSetup(){
  return `<div class="content full">
    <div class="brand"><div class="logo">∞</div><h1>Supabase設定</h1><p>最初にCouplee専用SupabaseのURLとanon keyを設定します。</p></div>
    ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
    <form id="configForm" class="card auth-card">
      <div class="field"><label>Supabase Project URL</label><input name="url" placeholder="https://xxxxx.supabase.co" value="${esc(state.config?.url||"")}" required></div>
      <div class="field"><label>Supabase anon public key</label><input name="anonKey" placeholder="eyJhbGciOi..." value="${esc(state.config?.anonKey||"")}" required></div>
      <button class="btn primary full">保存して接続する</button>
      <p class="hint">先にZIP内の <b>supabase-schema.sql</b> をSupabase SQL Editorで実行してください。</p>
    </form>
    <button class="btn full" data-action="demoMode" style="margin-top:12px">Supabaseなしでデモを見る</button>
  </div>`;
}

function renderAuth(){
  return `<div class="content full">
    <div class="brand"><div class="logo">∞</div><h1>ログイン</h1><p>相手と同期するためにメールアドレスでログインします。</p></div>
    ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
    <div class="tabrow" style="justify-content:center"><button class="${state.authMode==='login'?'active':''}" data-auth-mode="login">ログイン</button><button class="${state.authMode==='signup'?'active':''}" data-auth-mode="signup">新規登録</button></div>
    <form id="authForm" class="card auth-card">
      <div class="field"><label>メールアドレス</label><input name="email" type="email" required placeholder="you@example.com"></div>
      <div class="field"><label>パスワード</label><input name="password" type="password" minlength="6" required placeholder="6文字以上"></div>
      <button class="btn primary full">${state.authMode==='login'?'ログイン':'新規登録'}</button>
      <p class="hint">登録後に確認メールが届く設定の場合は、メール認証後にログインしてください。</p>
    </form>
    <button class="btn danger full" data-action="resetConfig" style="margin-top:12px">Supabase設定をやり直す</button>
  </div>`;
}

function renderProfileSetup(){
  return `<div class="content full">
    <div class="brand"><div class="logo">∞</div><h1>プロフィール設定</h1><p>あなたの名前と画像アイコンを設定します。相手の画面にも表示されます。</p></div>
    ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
    <form id="profileForm" class="card auth-card">
      <div class="photo-upload">
        <div class="photo-preview" id="profilePreview">${imgOrEmoji(state.pendingProfile.avatar_data_url, "👤")}</div>
        <div class="field" style="margin:0"><label>画像アイコン</label><input name="avatar" type="file" accept="image/*"></div>
      </div>
      <div class="field"><label>あなたの名前</label><input name="display_name" value="${esc(state.pendingProfile.display_name || "")}" placeholder="例：龍司" required maxlength="24"></div>
      <button class="btn primary full">プロフィールを保存</button>
    </form>
  </div>`;
}

function renderCoupleLink(){
  return `<div class="content full">
    <div class="brand"><div class="logo">∞</div><h1>相手と連携</h1><p>新しくカップルルームを作るか、相手から届いた招待コードで参加します。</p></div>
    ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
    <div class="card link-card">
      <h3>自分が作成する</h3>
      <p class="hint">相手に招待コードを送る側はこちら。</p>
      <form id="createCoupleForm">
        <div class="field"><label>パートナー名メモ</label><input name="partner_name_hint" placeholder="例：ゆうか" required></div>
        <div class="field"><label>交際開始日 / 大切な日</label><input name="start_date" type="date" value="${todayKey()}" required></div>
        <div class="field"><label>記念日の名前</label><input name="anniversary_name" value="交際記念日" required></div>
        <div class="field"><label>関係フェーズ</label><select name="phase">${phaseOptions.map(p=>`<option>${esc(p)}</option>`).join("")}</select></div>
        <div class="field"><label>ふたりの目標</label><input name="goal" value="毎日少しだけ会話する"></div>
        <button class="btn primary full">カップルルームを作成</button>
      </form>
    </div>
    <div class="card link-card" style="margin-top:12px">
      <h3>相手の招待コードで参加</h3>
      <form id="joinCoupleForm">
        <div class="field"><label>招待コード</label><input name="invite_code" placeholder="例：CPL-AB12CD" required></div>
        <button class="btn lav full">参加する</button>
      </form>
    </div>
  </div>`;
}

function renderAppShell(){
  return `
    <div class="topbar">
      <div><h2>${viewTitle()}</h2><p>${esc(myName())} × ${esc(partnerName())}｜${esc(state.couple.phase || "")}</p></div>
      <div class="avatar-stack"><div class="avatar">${imgOrEmoji(state.profile?.avatar_data_url,"👤")}</div><div class="avatar">${imgOrEmoji(state.partner?.avatar_data_url,"💞")}</div></div>
    </div>
    <div class="content">${renderView()}</div>
    ${renderNav()}`;
}

function renderNav(){
  const tabs = [["home","🏠","ホーム"],["anniv","🎂","記念日"],["album","📷","アルバム"],["board","💌","お願い"],["calendar","🗓️","予定"],["privacy","🛡️","安全"]];
  return `<nav class="nav">${tabs.map(t=>`<button data-view="${t[0]}" class="${state.ui.view===t[0]?"active":""}"><span>${t[1]}</span>${t[2]}</button>`).join("")}</nav>`;
}
function viewTitle(){ return ({home:"ホーム",anniv:"記念日",album:"アルバム",board:"お願い掲示板",calendar:"共有カレンダー",privacy:"プライバシー"})[state.ui.view] || "ホーム"; }
function renderView(){ return ({home:renderHome,anniv:renderAnniv,album:renderAlbum,board:renderBoard,calendar:renderCalendar,privacy:renderPrivacy})[state.ui.view]?.() || renderHome(); }

function renderHome(){
  const my = myDaily();
  const partner = partnerDaily();
  const bothAnswered = my?.answer && partner?.answer;
  return `<section>
    <div class="card hero"><div><div class="count-label">${esc(state.couple.anniversary_name)}まであと</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">${formatDate(nextAnniv(),"long")}・${yearsTogether()}年記念</span></div><div class="mascot">🐰</div></div>
    <div class="section grid3">
      ${metric("🔗", state.partner ? "連携済み" : "未連携", "ペア状態")}
      ${metric("💗", String(calcPoints()), "ハート")}
      ${metric("🔥", `${Math.min(99, state.dailyAnswers.length + state.requests.filter(r=>r.status==='done').length)}日`, "記録")}
    </div>
    <div class="section card">
      <div class="daily-q"><div class="iconbox">💬</div><div><h3>${esc(todayQuestion())}</h3><p>自分の回答は保存され、相手が回答するとお互いに見えます。</p></div></div>
      <form id="dailyForm" style="margin-top:12px">
        <div class="field"><label>${esc(myName())}の回答</label><textarea name="answer" placeholder="今日の気持ちを短く入力">${esc(my?.answer || "")}</textarea></div>
        <div class="field"><label>気分</label><select name="mood">${["😊","😌","🥰","😢","😴","😤"].map(m=>`<option ${my?.mood===m?"selected":""}>${m}</option>`).join("")}</select></div>
        <button class="btn primary full">回答を保存</button>
      </form>
      ${bothAnswered ? `<div class="answer-box"><strong>${esc(partnerName())}の回答</strong><p>${esc(partner.answer)}</p></div>` : `<div class="answer-box"><strong>相手の回答</strong><p>${state.partner ? "相手の回答待ちです。" : "まだ相手が連携されていません。"}</p></div>`}
    </div>
    <div class="section"><div class="section-head"><h3>今日の予定</h3><button class="btn ghost" data-open="event">追加</button></div>${renderEvents(state.events.filter(e=>e.event_date===todayKey()).slice(0,3))}</div>
    <div class="section"><div class="section-head"><h3>クイック操作</h3><small>同期されます</small></div><div class="quick"><button data-open="memory"><span>📷</span>思い出</button><button data-open="request"><span>💌</span>お願い</button><button data-open="event"><span>🗓️</span>予定</button><button data-view="privacy"><span>🛡️</span>連携</button></div></div>
  </section>`;
}
function renderAnniv(){
  return `<section>
    <div class="card hero"><div><div class="count-label">次の記念日まで</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">${formatDate(nextAnniv(),"long")}</span></div><div class="mascot">🎂</div></div>
    <div class="section grid3">${metric("📅",`${relationshipDays()}日`,"一緒の日数")}${metric("💕",state.couple.phase,"関係")}${metric("🎯",state.couple.goal || "未設定","目標")}</div>
    <div class="section card"><div class="section-head"><h3>ふたりの設定</h3><button class="btn ghost" data-open="coupleSettings">編集</button></div><p class="hint">記念日名、関係フェーズ、目標を変更すると相手側にも反映されます。</p></div>
    <div class="section"><div class="section-head"><h3>マイルストーン</h3><small>自動表示</small></div><div class="badge-grid">${badges().map(b=>`<div class="badge"><i>${b[0]}</i><b>${esc(b[1])}</b></div>`).join("")}</div></div>
    <div class="section"><div class="section-head"><h3>おすすめデート</h3><small>次の記念日前に</small></div>${[["☕","週末カフェ巡り","90分だけ会話する軽いデート"],["📷","アルバム整理","写真を3枚選んで思い出に残す"],["🎁","小さなサプライズ","相手が最近欲しがっていた物を贈る"]].map(i=>`<div class="event"><time>${i[0]}</time><div><h4>${i[1]}</h4><p>${i[2]}</p></div></div>`).join("")}</div>
  </section>`;
}
function renderAlbum(){
  return `<section>
    <div class="screen-title"><div><h2>アルバム</h2><p>相手と写真・思い出を同期</p></div><button class="btn primary" data-open="memory">追加</button></div>
    <div class="album-grid">${state.memories.length ? state.memories.map(memoryCard).join("") : `<div class="card empty">まだ思い出がありません。写真を追加してください。</div>`}</div>
  </section>`;
}
function memoryCard(m){ return `<article class="card memory"><div class="memory-img">${m.image_data_url ? `<img src="${m.image_data_url}" alt="">` : "📷"}</div><div class="memory-body"><div class="memory-meta"><span class="pill">${formatDate(m.memory_date)}</span><span class="pill">📍 ${esc(m.place || "未設定")}</span></div><h3>${esc(m.title)}</h3><p>${esc(m.caption || "")}</p>${m.created_by===uid()?`<div class="btn-row" style="margin-top:10px"><button class="btn danger" data-delete-memory="${m.id}">削除</button></div>`:""}</div></article>`; }
function renderBoard(){
  const f = state.ui.requestFilter;
  const items = state.requests.filter(r=>f==='all'||r.status===f);
  const done = state.requests.filter(r=>r.status==='done').length;
  const rate = Math.round(done/Math.max(1,state.requests.length)*100);
  return `<section>
    <div class="screen-title"><div><h2>お願い掲示板</h2><p>お願い・やりたいことを共有</p></div><button class="btn primary" data-open="request">追加</button></div>
    <div class="tabrow">${[["all","すべて"],["pending","未対応"],["accepted","受付中"],["done","完了"]].map(t=>`<button data-filter="${t[0]}" class="${f===t[0]?"active":""}">${t[1]}</button>`).join("")}</div>
    <div class="section grid2"><div class="card metric"><span>🤝 協力度</span><b>${rate}%</b><div class="progress"><span style="width:${rate}%"></span></div></div><div class="card metric"><span>💗 完了数</span><b>${done}</b></div></div>
    <div class="section">${items.length ? items.map(requestCard).join("") : `<div class="card empty">このステータスのお願いはありません。</div>`}</div>
  </section>`;
}
function requestCard(r){ return `<article class="card request"><div class="request-top"><div><h3>${esc(r.title)}</h3><p>${esc(r.detail || "")}</p></div><span class="tag ${r.status}">${statusLabel(r.status)}</span></div><div class="btn-row"><span class="pill">${esc(nameByUser(r.created_by))}から</span><span class="pill">+${Number(r.reward_points||0)}pt</span></div><div class="btn-row"><button class="btn" data-req-status="${r.id}:pending">未対応</button><button class="btn" data-req-status="${r.id}:accepted">受付中</button><button class="btn primary" data-req-status="${r.id}:done">完了</button>${r.created_by===uid()?`<button class="btn danger" data-delete-request="${r.id}">削除</button>`:""}</div></article>`; }
function renderCalendar(){
  const selected = state.ui.selectedDate;
  const events = state.events.filter(e=>e.event_date===selected).sort((a,b)=>(a.event_time||"").localeCompare(b.event_time||""));
  const rate = Math.round(state.todos.filter(t=>t.done).length/Math.max(1,state.todos.length)*100);
  return `<section>
    <div class="screen-title"><div><h2>共有カレンダー</h2><p>予定とToDoを相手と同期</p></div><button class="btn primary" data-open="event">追加</button></div>
    ${renderMonth()}
    <div class="section"><div class="section-head"><h3>${formatDate(selected)} の予定</h3><button class="btn ghost" data-open="event">予定追加</button></div>${renderEvents(events)}</div>
    <div class="section"><div class="section-head"><h3>ToDo</h3><button class="btn ghost" data-open="todo">追加</button></div><div class="card"><div class="section-head"><span class="pill">メンタルロード</span><b>${rate}%</b></div><div class="progress"><span style="width:${rate}%"></span></div></div><div style="display:grid;gap:8px;margin-top:10px">${state.todos.map(t=>`<label class="todo ${t.done?'done':''}"><input type="checkbox" data-todo="${t.id}" ${t.done?'checked':''}><span>${esc(t.title)}｜${ownerLabel(t.owner)}</span>${t.created_by===uid()?`<button class="btn danger" type="button" data-delete-todo="${t.id}">削除</button>`:""}</label>`).join("")}</div></div>
  </section>`;
}
function renderEvents(events){ return events.length ? `<div class="event-list">${events.map(e=>`<div class="event"><time>${esc((e.event_time||"--:--").slice(0,5))}</time><div><h4>${esc(e.title)}</h4><p>${esc(e.note||"")}｜${esc(e.event_type||"予定")}</p></div>${e.created_by===uid()?`<button class="btn danger" data-delete-event="${e.id}">削除</button>`:""}</div>`).join("")}</div>` : `<div class="card empty">予定はありません。</div>`; }
function renderPrivacy(){
  return `<section>
    <div class="screen-title"><div><h2>プライバシー</h2><p>連携・招待・GPS同意設定</p></div></div>
    <div class="card link-card"><h3>招待コード</h3><div class="invite-code">${esc(state.couple.invite_code)}</div><p class="hint">相手はこのアプリでアカウント作成後、「招待コードで参加」にこのコードを入力します。</p><button class="btn primary full" data-action="copyInvite">招待文をコピー</button></div>
    <div class="section card hero"><div class="section-head"><div><h3>位置情報の共有</h3><small>${state.privacy?.location_enabled?"ON":"OFF"}｜${privacyModeLabel()}</small></div><button class="switch ${state.privacy?.location_enabled?'on':''}" data-action="toggleLocation"></button></div><div class="mini-map"><div class="pin"><span>💞</span></div></div></div>
    <div class="section" style="display:grid;gap:9px">${privacyOption('always','📍','常に共有','双方同意がある場合のみ。')}${privacyOption('timed','⏱️','時間限定共有','デートや帰宅時だけ使う。')}${privacyOption('emergency','🆘','緊急時のみ','通常はOFF。必要時だけ共有。')}</div>
    <div class="section grid2"><button class="btn" data-action="exportData">データ書き出し</button><button class="btn" data-action="refresh">再同期</button><button class="btn danger" data-action="signOut">ログアウト</button><button class="btn danger" data-action="leaveCouple">連携解除</button></div>
    <div class="section card"><h3>接続状態</h3><p class="debug">User: ${esc(uid())}<br>Couple: ${esc(state.couple.id)}<br>Partner: ${state.partner ? esc(state.partner.display_name) : "未参加"}</p></div>
  </section>`;
}
function privacyOption(mode,icon,title,desc){ return `<button class="privacy-option ${state.privacy?.location_mode===mode?'active':''}" data-privacy-mode="${mode}"><span>${icon}</span><div><strong>${esc(title)}</strong><small>${esc(desc)}</small></div><span>${state.privacy?.location_mode===mode?'✓':''}</span></button>`; }

function renderMonth(){
  const sel = new Date(`${state.ui.selectedDate || todayKey()}T00:00:00`); const y=sel.getFullYear(); const m=sel.getMonth();
  const first = new Date(y,m,1); const last = new Date(y,m+1,0); const cells=[];
  for(let i=0;i<first.getDay();i++) cells.push(null); for(let d=1;d<=last.getDate();d++) cells.push(new Date(y,m,d));
  return `<div class="card calendar-card"><div class="month-head"><button class="btn ghost" data-month="-1">‹</button><b>${y}年${m+1}月</b><button class="btn ghost" data-month="1">›</button></div><div class="month-grid">${["日","月","火","水","木","金","土"].map(d=>`<div class="dow">${d}</div>`).join("")}${cells.map(d=>d?`<button class="day ${toKey(d)===todayKey()?"today":""} ${state.events.some(e=>e.event_date===toKey(d))?"has":""}" data-date="${toKey(d)}">${d.getDate()}</button>`:`<div></div>`).join("")}</div></div>`;
}

function renderModal(type){
  const title = {memory:"思い出を追加",request:"お願いを追加",event:"予定を追加",todo:"ToDoを追加",coupleSettings:"ふたりの設定"}[type] || "追加";
  return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="x" data-close>×</button></div>${modalBody(type)}</div></div>`;
}
function modalBody(type){
  if(type==='memory') return `<form data-form="memory"><div class="field"><label>写真</label><input name="image" type="file" accept="image/*"></div>${field("タイトル","title","")}<div class="grid2">${field("日付","memory_date",todayKey(),"date")}${field("場所","place","")}</div><div class="field"><label>キャプション</label><textarea name="caption"></textarea></div><button class="btn primary full">保存</button></form>`;
  if(type==='request') return `<form data-form="request">${field("お願いタイトル","title","")}<div class="field"><label>内容</label><textarea name="detail" placeholder="相手を責めない言い方で書く"></textarea></div><div class="field"><label>報酬pt</label><input name="reward_points" type="number" value="30"></div><button class="btn primary full">追加</button></form>`;
  if(type==='event') return `<form data-form="event">${field("予定名","title","")}<div class="grid2">${field("日付","event_date",state.ui.selectedDate,"date")}${field("時間","event_time","19:00","time")}</div>${field("メモ","note","")}<div class="field"><label>種類</label><select name="event_type"><option value="date">デート</option><option value="call">電話</option><option value="task">用事</option><option value="anniversary">記念日</option></select></div><button class="btn primary full">追加</button></form>`;
  if(type==='todo') return `<form data-form="todo">${field("ToDo","title","")}<div class="field"><label>担当</label><select name="owner"><option value="both">ふたり</option><option value="me">自分</option><option value="partner">相手</option></select></div><button class="btn primary full">追加</button></form>`;
  if(type==='coupleSettings') return `<form data-form="coupleSettings"><div class="field"><label>パートナー名メモ</label><input name="partner_name_hint" value="${esc(state.couple.partner_name_hint||"")}"></div>${field("交際開始日","start_date",state.couple.start_date,"date")}${field("記念日名","anniversary_name",state.couple.anniversary_name)}<div class="field"><label>関係フェーズ</label><select name="phase">${phaseOptions.map(p=>`<option ${state.couple.phase===p?'selected':''}>${esc(p)}</option>`).join("")}</select></div>${field("ふたりの目標","goal",state.couple.goal||"")}<button class="btn primary full">保存</button></form>`;
  return "";
}
function field(label,name,value,type="text"){ return `<div class="field"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value||"")}" required></div>`; }

function bindEvents(){
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{ state.ui.view=b.dataset.view; render(); });
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{ state.ui.modal=b.dataset.open; render(); });
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{ state.ui.modal=null; render(); });
  document.querySelectorAll(".modal-backdrop").forEach(b=>b.onclick=e=>{ if(e.target===b){ state.ui.modal=null; render(); } });
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>handleAction(b.dataset.action));
  document.querySelectorAll("[data-auth-mode]").forEach(b=>b.onclick=()=>{ state.authMode=b.dataset.authMode; state.error=""; render(); });
  document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{ state.ui.requestFilter=b.dataset.filter; render(); });
  document.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{ state.ui.selectedDate=b.dataset.date; render(); });
  document.querySelectorAll("[data-month]").forEach(b=>b.onclick=()=>{ const d=new Date(`${state.ui.selectedDate}T00:00:00`); d.setMonth(d.getMonth()+Number(b.dataset.month)); state.ui.selectedDate=toKey(d); render(); });
  document.querySelectorAll("[data-privacy-mode]").forEach(b=>b.onclick=()=>updatePrivacy({ location_mode:b.dataset.privacyMode }));
  document.querySelectorAll("[data-req-status]").forEach(b=>b.onclick=()=>{ const [id,status]=b.dataset.reqStatus.split(":"); updateRequestStatus(id,status); });
  document.querySelectorAll("[data-delete-memory]").forEach(b=>b.onclick=()=>deleteRow("memories", b.dataset.deleteMemory));
  document.querySelectorAll("[data-delete-request]").forEach(b=>b.onclick=()=>deleteRow("requests", b.dataset.deleteRequest));
  document.querySelectorAll("[data-delete-event]").forEach(b=>b.onclick=()=>deleteRow("events", b.dataset.deleteEvent));
  document.querySelectorAll("[data-delete-todo]").forEach(b=>b.onclick=e=>{ e.preventDefault(); deleteRow("todos", b.dataset.deleteTodo); });
  document.querySelectorAll("[data-todo]").forEach(c=>c.onchange=()=>toggleTodo(c.dataset.todo,c.checked));

  const configForm = document.getElementById("configForm"); if(configForm) configForm.onsubmit = handleConfig;
  const authForm = document.getElementById("authForm"); if(authForm) authForm.onsubmit = handleAuth;
  const profileForm = document.getElementById("profileForm"); if(profileForm){ profileForm.onsubmit = handleProfile; const file = profileForm.querySelector('input[type=file]'); if(file) file.onchange = handleProfileFile; const name = profileForm.querySelector('input[name=display_name]'); if(name) name.oninput = e=>state.pendingProfile.display_name=e.target.value; }
  const createForm = document.getElementById("createCoupleForm"); if(createForm) createForm.onsubmit = handleCreateCouple;
  const joinForm = document.getElementById("joinCoupleForm"); if(joinForm) joinForm.onsubmit = handleJoinCouple;
  const dailyForm = document.getElementById("dailyForm"); if(dailyForm) dailyForm.onsubmit = handleDaily;
  document.querySelectorAll("[data-form]").forEach(f=>f.onsubmit=handleDataForm);
}

async function handleConfig(e){
  e.preventDefault(); const fd = new FormData(e.currentTarget);
  saveConfig(fd.get("url"), fd.get("anonKey"));
  location.reload();
}
async function handleAuth(e){
  e.preventDefault(); state.error=""; const fd = new FormData(e.currentTarget);
  try{
    const email = fd.get("email"); const password = fd.get("password");
    if(state.authMode === "signup"){
      const { error } = await state.sb.auth.signUp({ email, password });
      if(error) throw error;
      showToast("登録しました。メール認証が必要な場合は確認してください");
    }else{
      const { error } = await state.sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
      showToast("ログインしました");
    }
  }catch(e){ state.error = normalizeError(e); render(); }
}
async function handleProfileFile(e){
  const file = e.target.files?.[0]; if(!file) return;
  try{
    state.pendingProfile.avatar_data_url = await imageToDataUrl(file, AVATAR_LIMIT);
    const preview = document.getElementById("profilePreview"); if(preview) preview.innerHTML = imgOrEmoji(state.pendingProfile.avatar_data_url,"👤");
  }catch(err){ showToast("画像を読み込めませんでした"); }
}
async function handleProfile(e){
  e.preventDefault(); state.error=""; const fd = new FormData(e.currentTarget);
  try{
    const row = { user_id: uid(), display_name: String(fd.get("display_name")||"").trim(), avatar_data_url: state.pendingProfile.avatar_data_url || null, updated_at:new Date().toISOString() };
    const { error } = await state.sb.from("profiles").upsert(row, { onConflict:"user_id" });
    if(error) throw error;
    await loadProfile();
    showToast("プロフィールを保存しました");
    render();
  }catch(e){ state.error = normalizeError(e); render(); }
}
async function handleCreateCouple(e){
  e.preventDefault(); state.error=""; const fd = new FormData(e.currentTarget);
  try{
    const invite = makeInviteCode();
    const { data: couple, error } = await state.sb.from("couples").insert({
      invite_code: invite,
      created_by: uid(),
      partner_name_hint: fd.get("partner_name_hint"),
      start_date: fd.get("start_date"),
      anniversary_name: fd.get("anniversary_name"),
      phase: fd.get("phase"),
      goal: fd.get("goal")
    }).select("*").single();
    if(error) throw error;
    const { error: mErr } = await state.sb.from("couple_members").insert({ couple_id: couple.id, user_id: uid(), role:"owner" });
    if(mErr) throw mErr;
    await state.sb.from("privacy_settings").insert({ couple_id: couple.id, location_enabled:false, location_mode:"timed", consent_required:true, updated_by:uid() });
    await loadCouple(); await loadAll(false);
    showToast("カップルルームを作成しました"); render();
  }catch(e){ state.error = normalizeError(e); render(); }
}
async function handleJoinCouple(e){
  e.preventDefault(); state.error=""; const code = new FormData(e.currentTarget).get("invite_code");
  try{
    const { error } = await state.sb.rpc("join_couple_by_invite", { invite: String(code).trim().toUpperCase() });
    if(error) throw error;
    await loadCouple(); await loadAll(false);
    showToast("相手と連携しました"); render();
  }catch(e){ state.error = normalizeError(e); render(); }
}
async function handleDaily(e){
  e.preventDefault(); const fd = new FormData(e.currentTarget);
  try{
    const row = { couple_id: state.couple.id, user_id: uid(), question_date: todayKey(), question_text: todayQuestion(), answer: fd.get("answer"), mood: fd.get("mood"), updated_at:new Date().toISOString() };
    const { error } = await state.sb.from("daily_answers").upsert(row, { onConflict:"couple_id,user_id,question_date" });
    if(error) throw error;
    await loadAll(false); showToast("回答を同期しました");
  }catch(e){ showToast(normalizeError(e)); }
}
async function handleDataForm(e){
  e.preventDefault(); const form=e.currentTarget; const fd = new FormData(form); const type = form.dataset.form;
  try{
    if(type==='memory'){
      let image = null; const file = fd.get("image"); if(file && file.size) image = await imageToDataUrl(file, 900);
      const { error } = await state.sb.from("memories").insert({ couple_id:state.couple.id, created_by:uid(), title:fd.get("title"), caption:fd.get("caption"), place:fd.get("place"), memory_date:fd.get("memory_date"), image_data_url:image });
      if(error) throw error;
    }
    if(type==='request'){
      const { error } = await state.sb.from("requests").insert({ couple_id:state.couple.id, created_by:uid(), title:fd.get("title"), detail:fd.get("detail"), reward_points:Number(fd.get("reward_points")||30), status:"pending" });
      if(error) throw error;
    }
    if(type==='event'){
      const { error } = await state.sb.from("events").insert({ couple_id:state.couple.id, created_by:uid(), title:fd.get("title"), event_date:fd.get("event_date"), event_time:fd.get("event_time"), note:fd.get("note"), event_type:fd.get("event_type") });
      if(error) throw error;
    }
    if(type==='todo'){
      const owner = fd.get("owner")==='me' ? uid() : fd.get("owner")==='partner' ? state.partner?.user_id : null;
      const { error } = await state.sb.from("todos").insert({ couple_id:state.couple.id, created_by:uid(), title:fd.get("title"), owner_user_id:owner, done:false });
      if(error) throw error;
    }
    if(type==='coupleSettings'){
      const { error } = await state.sb.from("couples").update({ partner_name_hint:fd.get("partner_name_hint"), start_date:fd.get("start_date"), anniversary_name:fd.get("anniversary_name"), phase:fd.get("phase"), goal:fd.get("goal"), updated_at:new Date().toISOString() }).eq("id", state.couple.id);
      if(error) throw error;
      await loadCouple();
    }
    state.ui.modal = null; await loadAll(false); showToast("同期しました");
  }catch(e){ showToast(normalizeError(e)); }
}
async function updateRequestStatus(id,status){
  const { error } = await state.sb.from("requests").update({ status, updated_at:new Date().toISOString() }).eq("id", id);
  if(error) return showToast(normalizeError(error));
  await loadAll(false); showToast("更新しました");
}
async function toggleTodo(id,done){
  const { error } = await state.sb.from("todos").update({ done, updated_at:new Date().toISOString() }).eq("id", id);
  if(error) return showToast(normalizeError(error));
  await loadAll(false);
}
async function deleteRow(table,id){
  if(!confirm("削除しますか？")) return;
  const { error } = await state.sb.from(table).delete().eq("id", id);
  if(error) return showToast(normalizeError(error));
  await loadAll(false); showToast("削除しました");
}
async function updatePrivacy(patch){
  const row = { couple_id:state.couple.id, ...state.privacy, ...patch, updated_by:uid(), updated_at:new Date().toISOString() };
  const { error } = await state.sb.from("privacy_settings").upsert(row, { onConflict:"couple_id" });
  if(error) return showToast(normalizeError(error));
  await loadAll(false); showToast("プライバシー設定を同期しました");
}
async function handleAction(action){
  if(action==='resetConfig'){ localStorage.removeItem(CONFIG_KEY); location.reload(); }
  if(action==='demoMode'){ startDemoMode(); }
  if(action==='signOut'){ await state.sb.auth.signOut(); location.reload(); }
  if(action==='refresh'){ await loadCouple(); await loadAll(false); showToast("再同期しました"); }
  if(action==='toggleLocation'){ await updatePrivacy({ location_enabled: !state.privacy?.location_enabled }); }
  if(action==='copyInvite'){
    const text = `Coupleeに招待します。\nアプリを開いてアカウント作成後、この招待コードを入力してください。\n\n招待コード：${state.couple.invite_code}\n\nURL：${location.origin}`;
    try{ await navigator.clipboard.writeText(text); showToast("招待文をコピーしました"); }catch{ prompt("招待文をコピーしてください", text); }
  }
  if(action==='exportData'){
    const data = JSON.stringify({ profile:state.profile, couple:state.couple, partner:state.partner, memories:state.memories, requests:state.requests, events:state.events, todos:state.todos, privacy:state.privacy }, null, 2);
    downloadFile(`couplee-export-${todayKey()}.json`, data, "application/json");
  }
  if(action==='leaveCouple'){
    if(!confirm("このカップル連携から退出しますか？")) return;
    const { error } = await state.sb.from("couple_members").delete().eq("couple_id", state.couple.id).eq("user_id", uid());
    if(error) return showToast(normalizeError(error));
    state.couple=null; state.partner=null; await loadCouple(); render("連携を解除しました");
  }
}

function startDemoMode(){
  alert("デモモードは見た目確認用です。本当の連携はSupabase設定後に使えます。");
  saveConfig("demo", "demo");
  localStorage.removeItem(CONFIG_KEY);
  state.config = null;
  state.error = "デモはこのv6では省略しています。Supabase設定で本番同期を使ってください。";
  render();
}

function statusBar(){
  const t = new Date().toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" });
  return `<div class="status"><span>${t}</span><div class="sig"><i></i><i></i><i></i><strong>5G</strong> 🔋</div></div>`;
}
function feature(icon,text){return `<div class="feature-chip"><span>${icon}</span><strong>${esc(text)}</strong></div>`;}
function metric(icon,big,label){ return `<div class="card metric"><span>${icon} ${esc(label)}</span><b>${esc(big)}</b></div>`; }
function badges(){ const d=relationshipDays(); const list=[["💯","100日"],["🎂","1年記念"],["📷","思い出"],["💌","お願い達成"],["🛡️","安全設定"],["🔗","連携"]]; if(d>730) list.push(["💎","2年以上"]); return list; }
function uid(){ return state.session?.user?.id || ""; }
function myName(){ return state.profile?.display_name || "あなた"; }
function partnerName(){ return state.partner?.display_name || state.couple?.partner_name_hint || "相手"; }
function nameByUser(userId){ if(userId===uid()) return myName(); if(state.partner?.user_id===userId) return partnerName(); return "相手"; }
function ownerLabel(userId){ if(!userId) return "ふたり"; return nameByUser(userId); }
function myDaily(){ return state.dailyAnswers.find(a=>a.user_id===uid()); }
function partnerDaily(){ return state.dailyAnswers.find(a=>a.user_id!==uid()); }
function todayQuestion(){ return questions[new Date().getDate() % questions.length]; }
function nextAnniv(){ return nextYearlyDate(state.couple?.start_date || todayKey()); }
function daysToAnniv(){ return Math.max(0, daysBetween(todayKey(), nextAnniv())); }
function relationshipDays(){ return Math.max(1, daysBetween(state.couple?.start_date || todayKey(), todayKey())); }
function yearsTogether(){ const s=new Date(`${state.couple?.start_date || todayKey()}T00:00:00`); const n=new Date(`${nextAnniv()}T00:00:00`); return Math.max(1,n.getFullYear()-s.getFullYear()); }
function calcPoints(){ return state.dailyAnswers.length*20 + state.memories.length*25 + state.requests.filter(r=>r.status==='done').reduce((sum,r)=>sum+Number(r.reward_points||0),0) + state.todos.filter(t=>t.done).length*10; }
function statusLabel(s){ return s==='pending'?'未対応':s==='accepted'?'受付中':'完了'; }
function privacyModeLabel(){ return state.privacy?.location_mode==='always'?'常に共有':state.privacy?.location_mode==='emergency'?'緊急時のみ':'時間限定'; }
function imgOrEmoji(src, emoji){ return src ? `<img src="${src}" alt="">` : esc(emoji); }
function esc(v=""){ return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function todayKey(){ return toKey(new Date()); }
function toKey(d){ const x=new Date(d); const y=x.getFullYear(); const m=String(x.getMonth()+1).padStart(2,"0"); const day=String(x.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function formatDate(s, style="short"){ if(!s) return "未設定"; const d=new Date(`${s}T00:00:00`); if(Number.isNaN(d.getTime())) return s; return d.toLocaleDateString("ja-JP", style==='long'?{year:"numeric",month:"long",day:"numeric",weekday:"short"}:{year:"numeric",month:"2-digit",day:"2-digit"}); }
function daysBetween(a,b){ return Math.ceil((new Date(`${b}T00:00:00`)-new Date(`${a}T00:00:00`))/86400000); }
function nextYearlyDate(start){ const b=new Date(`${start}T00:00:00`); const t=new Date(); const n=new Date(t.getFullYear(),b.getMonth(),b.getDate()); const td=new Date(t.getFullYear(),t.getMonth(),t.getDate()); if(n<td)n.setFullYear(t.getFullYear()+1); return toKey(n); }
function makeInviteCode(){ return `CPL-${Math.random().toString(36).slice(2,8).toUpperCase()}`; }
function normalizeError(e){ return e?.message || e?.error_description || String(e); }
function showToast(text){ render(text); }
function downloadFile(name, content, type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function imageToDataUrl(file, maxWidth=700){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(1,maxWidth/img.width); const w=Math.round(img.width*scale); const h=Math.round(img.height*scale);
        const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
        const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL("image/jpeg", .78));
      };
      img.onerror=reject; img.src=reader.result;
    };
    reader.onerror=reject; reader.readAsDataURL(file);
  });
}

render();
