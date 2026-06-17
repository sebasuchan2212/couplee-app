const VERSION = "3.0.0";
const STORAGE_KEY = "couplee_complete_state_v3";

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
  "次の記念日に残したい思い出は？",
  "言いづらいけれど、本当はお願いしたいことは？",
  "一緒に暮らすなら、先に決めておきたいルールは？"
];

const dateIdeas = [
  ["週末カフェ巡り", "近場で90分だけ。会話を増やす軽いデート。", "☕"],
  ["思い出アルバム整理", "写真を3枚選んで、その日の気持ちを残す。", "📷"],
  ["夜の散歩", "スマホをしまって15分だけ歩く。", "🌙"],
  ["サプライズ小物", "高価な物より、相手が最近欲しがっていた小物を。", "🎁"],
  ["次の旅行会議", "行き先・予算・時期だけ先に決める。", "✈️"]
];

const defaultState = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 2);
  start.setMonth(today.getMonth() - 1);
  const startKey = toKey(start);
  return {
    meta: { version: VERSION, createdAt: nowIso(), updatedAt: nowIso() },
    profile: {
      isReady: false,
      appName: "Couplee",
      personA: "ゆうか",
      personB: "こうた",
      avatarA: "👩🏻",
      avatarB: "👨🏻",
      startDate: startKey,
      anniversaryName: "交際記念日",
      phase: "遠距離",
      isLongDistance: true,
      coupleGoal: "毎日少しだけ会話する",
      reminderDays: [30, 7, 1]
    },
    points: 32540,
    streak: 28,
    bestStreak: 45,
    lastVisit: todayKey(),
    companion: { name: "ラビ", emoji: "🐰", exp: 68 },
    daily: {
      date: todayKey(),
      questionIndex: new Date().getDate() % questions.length,
      answerA: "",
      answerB: "",
      revealed: false,
      history: []
    },
    moods: { personA: "😊", personB: "😌", note: "" },
    milestones: [
      { id: cryptoId(), title: "出会った日", date: shiftYear(startKey, -1), emoji: "✨", note: "ここからふたりの物語が始まった。" },
      { id: cryptoId(), title: "お付き合い開始", date: startKey, emoji: "💕", note: "大切な記念日。" },
      { id: cryptoId(), title: "初めての旅行", date: addDays(startKey, 150), emoji: "✈️", note: "また行きたい場所。" }
    ],
    memories: [
      { id: cryptoId(), title: "沖縄旅行", caption: "きれいな海と美味しいごはん。次は夕日も見に行こう。", place: "沖縄", date: "2024-05-03", emoji: "🌺", image: "", tags: ["旅行", "海"] },
      { id: cryptoId(), title: "クリスマスディナー", caption: "予約してくれたお店が本当に素敵だった日。", place: "東京", date: "2023-12-24", emoji: "🎄", image: "", tags: ["記念日", "ごはん"] },
      { id: cryptoId(), title: "初めてのキャンプ", caption: "焚き火を見ながら夜遅くまで話した。", place: "山梨", date: "2022-07-16", emoji: "⛺", image: "", tags: ["自然", "夜"] }
    ],
    requests: [
      { id: cryptoId(), title: "デートを計画しよう", detail: "どこか景色のいい場所に行きたい！", from: "personA", status: "pending", reward: 60, category: "wish", createdAt: todayKey() },
      { id: cryptoId(), title: "今夜電話してね", detail: "寝る前に少しだけ声が聞きたいな。", from: "personB", status: "accepted", reward: 30, category: "care", createdAt: todayKey() },
      { id: cryptoId(), title: "一緒に映画を見る", detail: "週末におすすめ映画を1本見よう。", from: "personA", status: "done", reward: 30, category: "date", createdAt: todayKey() }
    ],
    events: [
      { id: cryptoId(), title: "ディナー予約", date: todayKey(), time: "19:00", note: "レストラン・ソラ", type: "date" },
      { id: cryptoId(), title: "ビデオ通話", date: todayKey(), time: "21:00", note: "おやすみ前の時間", type: "call" }
    ],
    todos: [
      { id: cryptoId(), title: "旅行の計画を立てる", owner: "both", done: false },
      { id: cryptoId(), title: "プレゼントを選ぶ", owner: "personA", done: true },
      { id: cryptoId(), title: "部屋の掃除", owner: "personB", done: true },
      { id: cryptoId(), title: "写真の整理", owner: "both", done: false }
    ],
    privacy: {
      locationSharing: true,
      mode: "timed",
      timedHours: 3,
      consentA: true,
      consentB: true,
      emergencyOnly: false,
      shareHistory: [{ at: nowIso(), action: "初期設定", detail: "時間限定共有を選択" }]
    },
    notifications: { permission: "default", lastReminderCheck: "" },
    ui: { view: "home", modal: null, albumTab: "memories", requestFilter: "all", selectedDate: todayKey(), toast: "" }
  };
};

let state = loadState();
const app = document.getElementById("app");
render();
registerServiceWorker();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = defaultState();
    if (!raw) return base;
    const merged = mergeDeep(base, JSON.parse(raw));
    merged.meta.version = VERSION;
    const today = todayKey();
    if (merged.lastVisit !== today) {
      merged.streak = Number(merged.streak || 0) + 1;
      merged.bestStreak = Math.max(Number(merged.bestStreak || 0), merged.streak);
      merged.lastVisit = today;
    }
    if (merged.daily.date !== today) {
      if (merged.daily.answerA || merged.daily.answerB) {
        merged.daily.history = [{ ...merged.daily }, ...(merged.daily.history || [])].slice(0, 30);
      }
      merged.daily.date = today;
      merged.daily.questionIndex = new Date().getDate() % questions.length;
      merged.daily.answerA = "";
      merged.daily.answerB = "";
      merged.daily.revealed = false;
    }
    return merged;
  } catch (e) {
    console.warn(e);
    return defaultState();
  }
}
function saveState(){ state.meta.updatedAt = nowIso(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function setState(updater, toast="") { state = typeof updater === "function" ? updater(structuredClone(state)) : updater; saveState(); render(toast); }
function mergeDeep(base, patch){
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k,v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) out[k] = mergeDeep(base[k], v);
    else out[k] = v;
  }
  return out;
}
function nowIso(){ return new Date().toISOString(); }
function todayKey(){ return toKey(new Date()); }
function toKey(d){ return new Date(d).toISOString().slice(0,10); }
function cryptoId(){ return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(v=""){ return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function n(v){ return Number(v || 0).toLocaleString("ja-JP"); }
function formatDate(s, style="short") { if(!s) return "未設定"; const d = new Date(`${s}T00:00:00`); if(Number.isNaN(d.getTime())) return s; return d.toLocaleDateString("ja-JP", style === "long" ? {year:"numeric",month:"long",day:"numeric",weekday:"short"} : {year:"numeric",month:"2-digit",day:"2-digit"}); }
function daysBetween(a,b){ const x = new Date(`${a}T00:00:00`); const y = new Date(`${b}T00:00:00`); return Math.ceil((y-x)/86400000); }
function addDays(s, days){ const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate()+days); return toKey(d); }
function shiftYear(s, years){ const d = new Date(`${s}T00:00:00`); d.setFullYear(d.getFullYear()+years); return toKey(d); }
function nextYearlyDate(startDate){ const b = new Date(`${startDate}T00:00:00`); const t = new Date(); const n = new Date(t.getFullYear(), b.getMonth(), b.getDate()); const td = new Date(t.getFullYear(),t.getMonth(),t.getDate()); if(n < td) n.setFullYear(t.getFullYear()+1); return toKey(n); }
function nextAnniversary(){ return nextYearlyDate(state.profile.startDate); }
function daysToAnniv(){ return Math.max(0, daysBetween(todayKey(), nextAnniversary())); }
function relationshipDays(){ return Math.max(1, daysBetween(state.profile.startDate, todayKey())); }
function yearsTogether(){ const s = new Date(`${state.profile.startDate}T00:00:00`); const n = new Date(`${nextAnniversary()}T00:00:00`); return Math.max(1, n.getFullYear() - s.getFullYear()); }
function level(){ return Math.max(1, Math.floor(Number(state.points||0)/1400)); }
function currentQuestion(){ return questions[state.daily.questionIndex % questions.length]; }
function personLabel(key){ return key === "personA" ? state.profile.personA : key === "personB" ? state.profile.personB : "ふたり"; }
function avatar(key){ return key === "personA" ? state.profile.avatarA : key === "personB" ? state.profile.avatarB : "💞"; }
function statusLabel(s){ return s === "pending" ? "未対応" : s === "accepted" ? "受付中" : "完了"; }

function render(toast="") {
  app.innerHTML = `
    <main class="app-shell">
      <aside class="desktop-aside">
        <div class="logo">∞</div>
        <h1>Couplee<br>Couples OS</h1>
        <p>画像のUIをベースに、ホーム・記念日・アルバム・お願い掲示板・共有カレンダー・プライバシーを統合したカップルアプリです。</p>
        <div class="feature-list">
          ${feature("💬","一日一問と気分共有で会話を作る")}
          ${feature("🎂","記念日・通知・マイルストーンを管理")}
          ${feature("📷","写真と思い出をタイムライン化")}
          ${feature("🛡️","GPSは同意ベースでON/OFF可能")}
        </div>
      </aside>
      <section class="device">
        ${state.profile.isReady ? renderPhone() : renderOnboarding()}
        ${state.ui.modal ? renderModal(state.ui.modal) : ""}
        ${toast ? `<div class="toast">${escapeHtml(toast)}</div>` : ""}
      </section>
    </main>`;
  bindEvents();
  if (toast) setTimeout(()=>{ if(app.querySelector('.toast')) render(); }, 1800);
}
function feature(icon,text){ return `<div class="feature-chip"><span>${icon}</span><strong>${escapeHtml(text)}</strong></div>`; }
function statusBar(){ return `<div class="status-row"><span>9:41</span><div class="signal"><span></span><span></span><span></span><strong>5G</strong> 🔋</div></div>`; }
function renderOnboarding(){
  return `<div class="phone"><div class="content" style="padding-bottom:30px">
    ${statusBar()}
    <div class="brand"><div class="logo">∞</div><h1>Couplee</h1><p>ふたりの名前と記念日を入れると、画像のような専用ホーム画面に反映されます。</p></div>
    <form id="onboardingForm" class="card form-card">
      <div class="form-grid">
        ${field("あなたの名前","personA",state.profile.personA)}
        ${field("パートナーの名前","personB",state.profile.personB)}
      </div>
      <div class="form-grid">
        ${field("あなたのアイコン","avatarA",state.profile.avatarA)}
        ${field("相手のアイコン","avatarB",state.profile.avatarB)}
      </div>
      ${field("交際開始日 / 大切な日","startDate",state.profile.startDate,"date")}
      ${field("記念日の名前","anniversaryName",state.profile.anniversaryName)}
      <div class="field"><label>関係フェーズ</label><select name="phase">
        ${opt("交際初期",state.profile.phase)}${opt("遠距離",state.profile.phase)}${opt("同棲",state.profile.phase)}${opt("新婚",state.profile.phase)}${opt("子あり前後",state.profile.phase)}${opt("改善したい",state.profile.phase)}
      </select></div>
      ${field("ふたりの目標","coupleGoal",state.profile.coupleGoal)}
      <label class="todo" style="margin:4px 0 14px"><input type="checkbox" name="isLongDistance" ${state.profile.isLongDistance?"checked":""}><span>遠距離・会えない時間が多い</span></label>
      <button class="btn primary full">ふたりのアプリを始める</button>
    </form>
  </div></div>`;
}
function field(label,name,value,type="text"){ return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" required></div>`; }
function opt(value,selected){ return `<option value="${escapeHtml(value)}" ${value===selected?"selected":""}>${escapeHtml(value)}</option>`; }

function renderPhone(){
  return `<div class="phone">
    ${statusBar()}
    <div class="topbar">
      <div class="hello"><h2>${viewTitle()}</h2><p>${escapeHtml(state.profile.personA)} × ${escapeHtml(state.profile.personB)}｜${escapeHtml(state.profile.phase)}</p></div>
      <div class="avatars"><div class="avatar">${escapeHtml(state.profile.avatarA)}</div><div class="avatar">${escapeHtml(state.profile.avatarB)}</div></div>
    </div>
    <div class="content">${renderView()}</div>
    ${renderNav()}
  </div>`;
}
function viewTitle(){ return ({home:"ホーム",anniversary:"記念日",album:"アルバム",board:"お願い掲示板",calendar:"共有カレンダー",privacy:"プライバシー"})[state.ui.view] || "ホーム"; }
function renderNav(){ const tabs=[['home','🏠','ホーム'],['anniversary','🎂','記念日'],['album','📷','アルバム'],['board','💌','お願い'],['calendar','🗓️','カレンダー'],['privacy','🛡️','安全']]; return `<nav class="nav">${tabs.map(t=>`<button data-view="${t[0]}" class="${state.ui.view===t[0]?'active':''}"><span>${t[1]}</span>${t[2]}</button>`).join('')}</nav>`; }
function renderView(){ return ({home:renderHome,anniversary:renderAnniversary,album:renderAlbum,board:renderBoard,calendar:renderCalendar,privacy:renderPrivacy})[state.ui.view]?.() || renderHome(); }

function renderHome(){
  const exp = Math.min(100, state.companion.exp || 0);
  return `<section>
    <div class="card hero countdown">
      <div><div class="count-label">${escapeHtml(state.profile.anniversaryName)}まであと</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">🎂 ${formatDate(nextAnniversary(),"long")}・${yearsTogether()}年記念</span></div>
      <div class="mascot" title="成長マスコット">${escapeHtml(state.companion.emoji)}</div>
    </div>
    <div class="section grid2">
      ${metric("🔥",`${state.streak}日`,"連続記録")}
      ${metric("💗",n(state.points),"ハートポイント")}
      ${metric("🌱",`Lv.${level()}`,"カップルレベル")}
      ${metric("🐰",`${exp}%`,`${state.companion.name}の成長`)}
    </div>
    <div class="section">${renderDailyCard()}</div>
    <div class="section"><div class="section-head"><h3>気分チェック</h3><small>今の状態を軽く共有</small></div>${renderMood()}</div>
    <div class="section"><div class="section-head"><h3>クイック操作</h3><small>3タップ以内</small></div><div class="quick">
      <button data-open="memory"><span>📷</span>思い出</button><button data-open="request"><span>💌</span>お願い</button><button data-open="event"><span>🗓️</span>予定</button><button data-view="privacy"><span>🛡️</span>安全</button>
    </div></div>
    <div class="section"><div class="section-head"><h3>今日の予定</h3><button class="btn ghost" data-open="event">追加</button></div>${renderEvents(state.events.filter(e=>e.date===todayKey()).slice(0,3))}</div>
  </section>`;
}
function metric(icon,big,label){ return `<div class="card metric"><span>${icon} ${label}</span><b>${escapeHtml(big)}</b></div>`; }
function renderDailyCard(){
  const both = state.daily.answerA && state.daily.answerB;
  return `<div class="card daily-card">
    <div class="daily-q"><div class="iconbox">💬</div><div><h3>${escapeHtml(currentQuestion())}</h3><p>ふたりが答えると、お互いの回答が開きます。</p></div></div>
    <div class="answer-grid">
      <div class="field"><label>${escapeHtml(state.profile.personA)}の回答</label><textarea data-daily="answerA" placeholder="ここに入力">${escapeHtml(state.daily.answerA)}</textarea></div>
      <div class="field"><label>${escapeHtml(state.profile.personB)}の回答</label><textarea data-daily="answerB" placeholder="ここに入力">${escapeHtml(state.daily.answerB)}</textarea></div>
    </div>
    <div class="btn-row"><button class="btn primary" data-action="revealDaily" ${both?"":"disabled"}>回答を開く</button><button class="btn" data-action="nextQuestion">質問を変える</button></div>
    ${state.daily.revealed ? `<div class="reveal"><div class="answer-box"><strong>${escapeHtml(state.profile.personA)}</strong><p>${escapeHtml(state.daily.answerA)}</p></div><div class="answer-box"><strong>${escapeHtml(state.profile.personB)}</strong><p>${escapeHtml(state.daily.answerB)}</p></div></div>` : ""}
  </div>`;
}
function renderMood(){ const moods=["😊","😌","🥰","😢","😴","😤"]; return `<div class="mood-row">${['personA','personB'].map(k=>`<div class="card mood-card"><header><span>${escapeHtml(avatar(k))} ${escapeHtml(personLabel(k))}</span><b>${escapeHtml(state.moods[k])}</b></header><div class="moods">${moods.map(m=>`<button data-mood-person="${k}" data-mood="${m}" class="${state.moods[k]===m?'active':''}">${m}</button>`).join('')}</div></div>`).join('')}</div>`; }

function renderAnniversary(){
  const reminder = state.profile.reminderDays || [];
  return `<section>
    <div class="card hero countdown"><div><div class="count-label">次の記念日まで</div><div class="count-num">${daysToAnniv()}<small>日</small></div><span class="pill">${formatDate(nextAnniversary(),"long")}・${escapeHtml(state.profile.anniversaryName)}</span></div><div class="mascot">🎂</div></div>
    <div class="section grid3">${metric("📅",`${relationshipDays()}日`,"一緒に過ごした日数")}${metric("🏅",`${state.milestones.length}個`,"軌跡")}${metric("🔔",`${reminder.join('/') || '-'}日前`,"通知")}</div>
    <div class="section"><div class="section-head"><h3>記念日リマインダー</h3><button class="btn ghost" data-action="testReminder">通知テスト</button></div><div class="card form-card"><p style="margin:0 0 12px;color:var(--muted);font-size:12px;font-weight:800">30日前・7日前・1日前に記念日を知らせる設定です。ブラウザ通知を許可すると通知テストが使えます。</p><div class="btn-row"><button class="btn ${reminder.includes(30)?'primary':''}" data-reminder="30">30日前</button><button class="btn ${reminder.includes(7)?'primary':''}" data-reminder="7">7日前</button><button class="btn ${reminder.includes(1)?'primary':''}" data-reminder="1">1日前</button></div></div></div>
    <div class="section"><div class="section-head"><h3>ふたりの軌跡</h3><button class="btn ghost" data-open="milestone">追加</button></div><div class="timeline">${state.milestones.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(m=>`<div class="card time-item"><h4>${escapeHtml(m.emoji)} ${escapeHtml(m.title)}</h4><p>${formatDate(m.date)}｜${escapeHtml(m.note || '')}</p></div>`).join('')}</div></div>
    <div class="section"><div class="section-head"><h3>マイルストーンバッジ</h3><small>自動獲得</small></div><div class="badge-grid">${badges().map(b=>`<div class="badge"><i>${b[0]}</i><b>${b[1]}</b></div>`).join('')}</div></div>
    <div class="section"><div class="section-head"><h3>おすすめプラン</h3><small>記念日前に使う</small></div>${dateIdeas.slice(0,3).map(i=>`<div class="event" style="margin-bottom:8px"><time>${i[2]}</time><div><h4>${i[0]}</h4><p>${i[1]}</p></div></div>`).join('')}</div>
  </section>`;
}
function badges(){ const d=relationshipDays(); const list=[["💯","100日"],["🎂","1年記念"],["📷","思い出"],["💌","お願い達成"],["🔥","継続記録"],["🛡️","安全設定"]]; if(d>730) list.push(["💎","2年以上"]); return list; }

function renderAlbum(){
  const sorted = state.memories.slice().sort((a,b)=>b.date.localeCompare(a.date));
  return `<section>
    <div class="screen-title"><div><h2>アルバム</h2><p>写真・日付・場所・キャプションを保存</p></div><button class="btn primary" data-open="memory">追加</button></div>
    <div class="tabrow"><button class="active">思い出</button><button>写真</button><button>タイムライン</button><button>スポット</button></div>
    <div class="section card form-card"><div class="section-head"><h3>Memory Graph</h3><small>${state.memories.length}件</small></div><p style="margin:0;color:var(--muted);font-size:12px;font-weight:800;line-height:1.7">思い出は日付順に整理され、次の記念日やデート提案に使える“ふたりの記憶”として残ります。</p></div>
    <div class="section album-grid">${sorted.length ? sorted.map(memoryCard).join('') : `<div class="card empty">まだ思い出がありません。</div>`}</div>
  </section>`;
}
function memoryCard(m){ return `<article class="card memory"><div class="memory-img">${m.image ? `<img src="${m.image}" alt="">` : escapeHtml(m.emoji || '📷')}</div><div class="memory-body"><div class="memory-meta"><span class="pill">${formatDate(m.date)}</span><span class="pill">📍 ${escapeHtml(m.place || '場所未設定')}</span></div><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.caption || '')}</p><div class="btn-row" style="margin-top:10px"><button class="btn danger" data-delete-memory="${m.id}">削除</button></div></div></article>`; }

function renderBoard(){
  const filter = state.ui.requestFilter;
  const items = state.requests.filter(r => filter === "all" || r.status === filter);
  const done = state.requests.filter(r=>r.status==='done').length;
  const rate = Math.round(done / Math.max(1,state.requests.length) * 100);
  return `<section>
    <div class="screen-title"><div><h2>お願い掲示板</h2><p>お願い・やりたいこと・小さなタスクを共有</p></div><button class="btn primary" data-open="request">追加</button></div>
    <div class="tabrow">${[['all','すべて'],['pending','未対応'],['accepted','受付中'],['done','完了']].map(t=>`<button data-filter="${t[0]}" class="${filter===t[0]?'active':''}">${t[1]}</button>`).join('')}</div>
    <div class="section grid2"><div class="card metric"><span>💗 今月のハート報酬</span><b>+${state.requests.filter(r=>r.status==='done').reduce((s,r)=>s+Number(r.reward||0),0)}</b></div><div class="card metric"><span>🤝 ふたりの協力度</span><b>${rate}%</b><div class="progress"><span style="width:${rate}%"></span></div></div></div>
    <div class="section">${items.length ? items.map(requestCard).join('') : `<div class="card empty">このステータスのお願いはありません。</div>`}</div>
  </section>`;
}
function requestCard(r){ return `<article class="card request"><div class="request-top"><div><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.detail)}</p></div><span class="tag ${r.status}">${statusLabel(r.status)}</span></div><div class="btn-row"><span class="pill">${escapeHtml(avatar(r.from))} ${escapeHtml(personLabel(r.from))}から</span><span class="pill">+${Number(r.reward||0)}pt</span></div><div class="btn-row"><button class="btn" data-req-status="${r.id}:pending">未対応</button><button class="btn" data-req-status="${r.id}:accepted">受付中</button><button class="btn primary" data-req-status="${r.id}:done">完了</button><button class="btn danger" data-delete-request="${r.id}">削除</button></div></article>`; }

function renderCalendar(){
  const selected = state.ui.selectedDate || todayKey();
  const events = state.events.filter(e=>e.date===selected).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const completed = state.todos.filter(t=>t.done).length;
  const rate = Math.round(completed / Math.max(1,state.todos.length) * 100);
  return `<section>
    <div class="screen-title"><div><h2>共有カレンダー</h2><p>予定・デート・ToDoを一緒に管理</p></div><button class="btn primary" data-open="event">予定追加</button></div>
    ${renderMonth()}
    <div class="section"><div class="section-head"><h3>${formatDate(selected)} の予定</h3><button class="btn ghost" data-open="event">追加</button></div>${renderEvents(events)}</div>
    <div class="section"><div class="section-head"><h3>ToDoリスト</h3><button class="btn ghost" data-open="todo">追加</button></div><div class="card form-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span class="pill">メンタルロード可視化</span><b>${rate}% 完了</b></div><div class="progress"><span style="width:${rate}%"></span></div></div><div style="display:grid;gap:8px;margin-top:10px">${state.todos.map(t=>`<label class="todo ${t.done?'done':''}"><input type="checkbox" data-todo="${t.id}" ${t.done?'checked':''}><span>${escapeHtml(t.title)}｜${escapeHtml(personLabel(t.owner))}</span><button class="btn danger" data-delete-todo="${t.id}" type="button">削除</button></label>`).join('')}</div></div>
  </section>`;
}
function renderMonth(){
  const sel = new Date(`${state.ui.selectedDate || todayKey()}T00:00:00`); const y=sel.getFullYear(); const m=sel.getMonth();
  const first = new Date(y,m,1); const last = new Date(y,m+1,0); const pad=first.getDay(); const cells=[];
  for(let i=0;i<pad;i++) cells.push(null); for(let d=1; d<=last.getDate(); d++) cells.push(new Date(y,m,d));
  return `<div class="card calendar-card"><div class="month-head"><button class="btn ghost" data-month="-1">‹</button><b>${y}年${m+1}月</b><button class="btn ghost" data-month="1">›</button></div><div class="month-grid">${['日','月','火','水','木','金','土'].map(d=>`<div class="dow">${d}</div>`).join('')}${cells.map(d=> d ? `<button class="day ${toKey(d)===todayKey()?'today':''} ${state.events.some(e=>e.date===toKey(d))?'has':''}" data-date="${toKey(d)}">${d.getDate()}</button>` : `<div></div>`).join('')}</div></div>`;
}
function renderEvents(events){ return events.length ? `<div class="event-list">${events.map(e=>`<div class="event"><time>${escapeHtml(e.time||'--:--')}</time><div><h4>${escapeHtml(e.title)}</h4><p>${escapeHtml(e.note||'')}｜${escapeHtml(e.type||'予定')}</p></div><button class="btn danger" data-delete-event="${e.id}">削除</button></div>`).join('')}</div>` : `<div class="card empty">予定はまだありません。</div>`; }

function renderPrivacy(){
  return `<section>
    <div class="screen-title"><div><h2>プライバシー</h2><p>GPSは監視ではなく、同意ベースの安心機能</p></div></div>
    <div class="card hero"><div class="section-head"><div><h3>位置情報の共有</h3><small>${state.privacy.locationSharing?'ON':'OFF'}｜${privacyModeLabel()}</small></div><button class="switch ${state.privacy.locationSharing?'on':''}" data-action="toggleLocation" aria-label="位置情報共有"></button></div><div class="mini-map"><div class="pin"><span>💞</span></div></div></div>
    <div class="section" style="display:grid;gap:9px">
      ${privacyOption('always','📍','常に共有','同意した場合のみ、現在地を共有します。')}
      ${privacyOption('timed','⏱️','時間限定共有',`${state.privacy.timedHours}時間だけ共有します。`)}
      ${privacyOption('emergency','🆘','緊急時のみ','普段はOFF、緊急時のみ使います。')}
    </div>
    <div class="section card form-card"><div class="section-head"><h3>同意ステータス</h3><small>双方ONで有効</small></div><label class="todo"><input type="checkbox" data-consent="consentA" ${state.privacy.consentA?'checked':''}><span>${escapeHtml(state.profile.personA)} が同意</span></label><label class="todo"><input type="checkbox" data-consent="consentB" ${state.privacy.consentB?'checked':''}><span>${escapeHtml(state.profile.personB)} が同意</span></label></div>
    <div class="section"><div class="section-head"><h3>安全操作</h3><small>いつでも解除可能</small></div><div class="grid2"><button class="btn" data-action="exportData">データ書き出し</button><button class="btn" data-action="copyInvite">招待リンク作成</button><button class="btn danger" data-action="unlinkPartner">連携解除</button><button class="btn danger" data-action="wipeData">全データ削除</button></div></div>
    <div class="section"><div class="section-head"><h3>共有履歴</h3><small>${state.privacy.shareHistory.length}件</small></div><div class="event-list">${state.privacy.shareHistory.slice().reverse().slice(0,5).map(h=>`<div class="event"><time>🛡️</time><div><h4>${escapeHtml(h.action)}</h4><p>${new Date(h.at).toLocaleString('ja-JP')}｜${escapeHtml(h.detail||'')}</p></div></div>`).join('')}</div></div>
  </section>`;
}
function privacyOption(mode,icon,title,desc){ return `<button class="privacy-option ${state.privacy.mode===mode?'active':''}" data-privacy-mode="${mode}"><span>${icon}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(desc)}</small></div><span>${state.privacy.mode===mode?'✓':''}</span></button>`; }
function privacyModeLabel(){ return state.privacy.mode==='always'?'常に共有':state.privacy.mode==='emergency'?'緊急時のみ':'時間限定'; }

function renderModal(type){
  const title = {memory:'思い出を追加',request:'お願いを追加',event:'予定を追加',todo:'ToDoを追加',milestone:'軌跡を追加'}[type] || '追加';
  return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="x" data-close>×</button></div>${modalBody(type)}</div></div>`;
}
function modalBody(type){
  if(type==='memory') return `<form data-form="memory">${field('タイトル','title','')}<div class="form-grid">${field('日付','date',todayKey(),'date')}${field('場所','place','')}</div><div class="field"><label>写真</label><input name="image" type="file" accept="image/*"></div><div class="field"><label>キャプション</label><textarea name="caption" placeholder="その日の気持ちを残す"></textarea></div><button class="btn primary full">保存</button></form>`;
  if(type==='request') return `<form data-form="request">${field('お願いタイトル','title','')}<div class="field"><label>内容</label><textarea name="detail" placeholder="相手を責めない言い方で書く"></textarea></div><div class="form-grid"><div class="field"><label>投稿者</label><select name="from"><option value="personA">${escapeHtml(state.profile.personA)}</option><option value="personB">${escapeHtml(state.profile.personB)}</option></select></div><div class="field"><label>報酬pt</label><input name="reward" type="number" value="30"></div></div><button class="btn primary full">掲示板に追加</button></form>`;
  if(type==='event') return `<form data-form="event">${field('予定名','title','')}<div class="form-grid">${field('日付','date',state.ui.selectedDate || todayKey(),'date')}${field('時間','time','19:00','time')}</div>${field('メモ','note','')}<div class="field"><label>種類</label><select name="type"><option value="date">デート</option><option value="call">電話</option><option value="task">用事</option><option value="anniversary">記念日</option></select></div><button class="btn primary full">予定を追加</button></form>`;
  if(type==='todo') return `<form data-form="todo">${field('ToDo','title','')}<div class="field"><label>担当</label><select name="owner"><option value="both">ふたり</option><option value="personA">${escapeHtml(state.profile.personA)}</option><option value="personB">${escapeHtml(state.profile.personB)}</option></select></div><button class="btn primary full">ToDoを追加</button></form>`;
  if(type==='milestone') return `<form data-form="milestone">${field('タイトル','title','')}<div class="form-grid">${field('日付','date',todayKey(),'date')}${field('絵文字','emoji','✨')}</div>${field('メモ','note','')}<button class="btn primary full">軌跡に追加</button></form>`;
  return '';
}

function bindEvents(){
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.ui.view=b.dataset.view; return s;})));
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.ui.modal=b.dataset.open; return s;})));
  document.querySelectorAll('[data-close], .modal-backdrop').forEach(el=>el.addEventListener('click',e=>{ if(e.target===el || el.dataset.close!==undefined) setState(s=>{s.ui.modal=null; return s;}); }));
  const onboarding = document.getElementById('onboardingForm');
  if(onboarding) onboarding.addEventListener('submit', e=>{ e.preventDefault(); const fd=new FormData(onboarding); setState(s=>{ Object.assign(s.profile, Object.fromEntries(fd.entries())); s.profile.isLongDistance = fd.get('isLongDistance') === 'on'; s.profile.isReady = true; s.milestones = [{ id:cryptoId(), title:s.profile.anniversaryName, date:s.profile.startDate, emoji:'💕', note:'ふたりの大切な日' }, ...s.milestones]; return s; }, '専用アプリを作成しました'); });
  document.querySelectorAll('[data-daily]').forEach(t=>t.addEventListener('input',()=>{ state.daily[t.dataset.daily]=t.value; saveState(); }));
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>handleAction(b.dataset.action)));
  document.querySelectorAll('[data-mood-person]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.moods[b.dataset.moodPerson]=b.dataset.mood; s.points+=5; s.companion.exp=Math.min(100,(s.companion.exp||0)+2); return s;}, '気分を共有しました')));
  document.querySelectorAll('[data-reminder]').forEach(b=>b.addEventListener('click',()=>setState(s=>{ const d=Number(b.dataset.reminder); const arr=new Set(s.profile.reminderDays||[]); arr.has(d)?arr.delete(d):arr.add(d); s.profile.reminderDays=[...arr].sort((a,b)=>b-a); return s;}, '通知設定を更新しました')));
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.ui.requestFilter=b.dataset.filter; return s;})));
  document.querySelectorAll('[data-req-status]').forEach(b=>b.addEventListener('click',()=>{ const [id,status]=b.dataset.reqStatus.split(':'); setState(s=>{ const r=s.requests.find(x=>x.id===id); if(r){ const was=r.status; r.status=status; if(status==='done' && was!=='done'){ s.points+=Number(r.reward||0); s.companion.exp=Math.min(100,(s.companion.exp||0)+8); } } return s;}, status==='done'?'お願いを完了しました':'ステータスを更新しました'); }));
  document.querySelectorAll('[data-delete-request]').forEach(b=>b.addEventListener('click',()=>confirm('削除しますか？')&&setState(s=>{s.requests=s.requests.filter(r=>r.id!==b.dataset.deleteRequest); return s;}, '削除しました')));
  document.querySelectorAll('[data-delete-memory]').forEach(b=>b.addEventListener('click',()=>confirm('削除しますか？')&&setState(s=>{s.memories=s.memories.filter(r=>r.id!==b.dataset.deleteMemory); return s;}, '削除しました')));
  document.querySelectorAll('[data-delete-event]').forEach(b=>b.addEventListener('click',()=>confirm('削除しますか？')&&setState(s=>{s.events=s.events.filter(r=>r.id!==b.dataset.deleteEvent); return s;}, '削除しました')));
  document.querySelectorAll('[data-delete-todo]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault(); confirm('削除しますか？')&&setState(s=>{s.todos=s.todos.filter(r=>r.id!==b.dataset.deleteTodo); return s;}, '削除しました');}));
  document.querySelectorAll('[data-todo]').forEach(c=>c.addEventListener('change',()=>setState(s=>{ const t=s.todos.find(x=>x.id===c.dataset.todo); if(t){ t.done=c.checked; if(c.checked) s.points+=10; } return s;}, 'ToDoを更新しました')));
  document.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.ui.selectedDate=b.dataset.date; return s;})));
  document.querySelectorAll('[data-month]').forEach(b=>b.addEventListener('click',()=>setState(s=>{ const d=new Date(`${s.ui.selectedDate || todayKey()}T00:00:00`); d.setMonth(d.getMonth()+Number(b.dataset.month)); s.ui.selectedDate=toKey(d); return s;})));
  document.querySelectorAll('[data-privacy-mode]').forEach(b=>b.addEventListener('click',()=>setState(s=>{s.privacy.mode=b.dataset.privacyMode; s.privacy.shareHistory.push({at:nowIso(),action:'共有モード変更',detail:privacyModeName(b.dataset.privacyMode)}); return s;}, '共有モードを更新しました')));
  document.querySelectorAll('[data-consent]').forEach(c=>c.addEventListener('change',()=>setState(s=>{s.privacy[c.dataset.consent]=c.checked; s.privacy.shareHistory.push({at:nowIso(),action:'同意設定変更',detail:c.dataset.consent}); return s;}, '同意設定を更新しました')));
  document.querySelectorAll('[data-form]').forEach(f=>f.addEventListener('submit',handleForm));
}
function privacyModeName(m){ return m==='always'?'常に共有':m==='emergency'?'緊急時のみ':'時間限定共有'; }

async function handleForm(e){
  e.preventDefault(); const form=e.currentTarget; const fd=new FormData(form); const type=form.dataset.form;
  if(type==='memory'){
    let image=""; const file=fd.get('image'); if(file && file.size) image = await readFileAsDataUrl(file);
    setState(s=>{ s.memories.unshift({id:cryptoId(),title:fd.get('title')||'新しい思い出',caption:fd.get('caption')||'',place:fd.get('place')||'',date:fd.get('date')||todayKey(),emoji:'📷',image,tags:[]}); s.points+=20; s.ui.modal=null; return s;}, '思い出を追加しました');
  }
  if(type==='request') setState(s=>{s.requests.unshift({id:cryptoId(),title:fd.get('title')||'お願い',detail:fd.get('detail')||'',from:fd.get('from')||'personA',status:'pending',reward:Number(fd.get('reward')||30),category:'wish',createdAt:todayKey()}); s.ui.modal=null; return s;}, 'お願いを追加しました');
  if(type==='event') setState(s=>{s.events.push({id:cryptoId(),title:fd.get('title')||'予定',date:fd.get('date')||todayKey(),time:fd.get('time')||'',note:fd.get('note')||'',type:fd.get('type')||'date'}); s.ui.selectedDate=fd.get('date')||todayKey(); s.ui.modal=null; return s;}, '予定を追加しました');
  if(type==='todo') setState(s=>{s.todos.push({id:cryptoId(),title:fd.get('title')||'ToDo',owner:fd.get('owner')||'both',done:false}); s.ui.modal=null; return s;}, 'ToDoを追加しました');
  if(type==='milestone') setState(s=>{s.milestones.push({id:cryptoId(),title:fd.get('title')||'新しい軌跡',date:fd.get('date')||todayKey(),emoji:fd.get('emoji')||'✨',note:fd.get('note')||''}); s.ui.modal=null; return s;}, '軌跡を追加しました');
}
function readFileAsDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

function handleAction(action){
  if(action==='revealDaily') return setState(s=>{s.daily.revealed=true; s.points+=40; s.companion.exp=Math.min(100,(s.companion.exp||0)+10); return s;}, '回答を開きました');
  if(action==='nextQuestion') return setState(s=>{s.daily.questionIndex=(s.daily.questionIndex+1)%questions.length; s.daily.answerA=''; s.daily.answerB=''; s.daily.revealed=false; return s;}, '質問を変更しました');
  if(action==='toggleLocation') return setState(s=>{s.privacy.locationSharing=!s.privacy.locationSharing; s.privacy.shareHistory.push({at:nowIso(),action:'位置情報共有',detail:s.privacy.locationSharing?'ON':'OFF'}); return s;}, '位置情報設定を更新しました');
  if(action==='testReminder') return testNotification();
  if(action==='exportData') return exportData();
  if(action==='copyInvite') return copyInvite();
  if(action==='unlinkPartner') return confirm('パートナー連携を解除しますか？データは端末内に残ります。') && setState(s=>{s.profile.personB='未連携'; s.privacy.locationSharing=false; s.privacy.shareHistory.push({at:nowIso(),action:'連携解除',detail:'パートナー表示を未連携に変更'}); return s;}, '連携を解除しました');
  if(action==='wipeData') return confirm('全データを削除します。この操作は戻せません。') && (localStorage.removeItem(STORAGE_KEY), state=defaultState(), render('全データを削除しました'));
}
async function testNotification(){
  if(!('Notification' in window)) return render('このブラウザは通知に対応していません');
  let p = Notification.permission;
  if(p === 'default') p = await Notification.requestPermission();
  if(p === 'granted') { new Notification('Couplee 記念日リマインダー', { body: `${state.profile.anniversaryName}まであと${daysToAnniv()}日です。`, icon: '/assets/icon.svg' }); render('通知テストを送信しました'); }
  else render('通知が許可されていません');
}
function exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`couplee-data-${todayKey()}.json`; a.click(); URL.revokeObjectURL(url); render('データを書き出しました'); }
async function copyInvite(){ const url = `${location.origin}?invite=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ app:'Couplee', from:state.profile.personA, startDate:state.profile.startDate })))) )}`; try{ await navigator.clipboard.writeText(url); render('招待リンクをコピーしました'); }catch{ prompt('招待リンクをコピーしてください', url); } }
function registerServiceWorker(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }
