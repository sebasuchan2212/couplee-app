const STORAGE_KEY = "couplee_app_state_v1";

const dailyQuestions = [
  "ふたりで今年中に行きたい場所はどこ？",
  "最近、相手にしてもらって嬉しかったことは？",
  "今週、ふたりの時間を10分増やすなら何をしたい？",
  "相手にもっと伝えたい感謝は？",
  "次のデートで食べたいものは？",
  "最近少しだけ寂しかった瞬間は？",
  "相手の好きなところをひとつだけ言うなら？",
  "ふたりの関係で、今月大切にしたいことは？",
  "忙しい日にされると助かることは？",
  "次の記念日に残したい思い出は？"
];

const defaultState = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 2);
  start.setMonth(today.getMonth() - 1);
  const nextAnniv = nextYearlyDate(start.toISOString().slice(0, 10));

  return {
    profile: {
      isReady: false,
      appName: "Couplee",
      personA: "ゆうか",
      personB: "こうた",
      startDate: start.toISOString().slice(0, 10),
      anniversaryName: "交際記念日",
      phase: "遠距離",
      isLongDistance: true,
      language: "ja"
    },
    points: 32540,
    streak: 28,
    bestStreak: 45,
    daily: {
      date: todayKey(),
      questionIndex: today.getDate() % dailyQuestions.length,
      answerA: "",
      answerB: "",
      revealed: false
    },
    moods: {
      personA: "😊",
      personB: "😌"
    },
    memories: [
      {
        id: cryptoId(),
        title: "沖縄旅行",
        caption: "きれいな海と美味しいごはん。次は夕日も見に行こう。",
        place: "沖縄",
        date: "2024-05-03",
        emoji: "🌺",
        image: ""
      },
      {
        id: cryptoId(),
        title: "クリスマスディナー",
        caption: "予約してくれたお店が本当に素敵だった日。",
        place: "東京",
        date: "2023-12-24",
        emoji: "🎄",
        image: ""
      },
      {
        id: cryptoId(),
        title: "初めてのキャンプ",
        caption: "焚き火を見ながら夜遅くまで話した。",
        place: "山梨",
        date: "2022-07-16",
        emoji: "⛺",
        image: ""
      }
    ],
    requests: [
      {
        id: cryptoId(),
        title: "デートを計画しよう",
        detail: "どこか景色のいい場所に行きたい！",
        from: "personA",
        status: "pending",
        reward: 60,
        createdAt: todayKey()
      },
      {
        id: cryptoId(),
        title: "今夜電話してね",
        detail: "寝る前に少しだけ声が聞きたいな。",
        from: "personB",
        status: "accepted",
        reward: 30,
        createdAt: todayKey()
      },
      {
        id: cryptoId(),
        title: "一緒に映画を見る",
        detail: "週末におすすめ映画を1本見よう。",
        from: "personA",
        status: "done",
        reward: 30,
        createdAt: todayKey()
      }
    ],
    events: [
      {
        id: cryptoId(),
        title: "ディナー予約",
        date: todayKey(),
        time: "19:00",
        note: "レストラン・ソラ",
        type: "date"
      },
      {
        id: cryptoId(),
        title: "ビデオ通話",
        date: todayKey(),
        time: "21:00",
        note: "おやすみ前の時間",
        type: "call"
      }
    ],
    todos: [
      { id: cryptoId(), title: "旅行の計画を立てる", done: false },
      { id: cryptoId(), title: "プレゼントを選ぶ", done: true },
      { id: cryptoId(), title: "部屋の掃除", done: true },
      { id: cryptoId(), title: "写真の整理", done: false }
    ],
    privacy: {
      locationSharing: true,
      mode: "timed",
      timedHours: 3,
      shareHistory: []
    },
    ui: {
      view: "home",
      modal: null,
      albumTab: "memories",
      requestFilter: "all"
    }
  };
};

let state = loadState();
const app = document.getElementById("app");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const merged = mergeDeep(defaultState(), parsed);
    const currentKey = todayKey();
    if (merged.daily.date !== currentKey) {
      merged.daily = {
        date: currentKey,
        questionIndex: new Date().getDate() % dailyQuestions.length,
        answerA: "",
        answerB: "",
        revealed: false
      };
      merged.streak = Number(merged.streak || 0) + 1;
    }
    return merged;
  } catch (error) {
    console.warn("Failed to load state", error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(updater) {
  state = typeof updater === "function" ? updater(structuredClone(state)) : updater;
  saveState();
  render();
}

function mergeDeep(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      result[key] = mergeDeep(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString, style = "short") {
  if (!dateString) return "未設定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  if (style === "long") {
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function daysBetween(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.max(0, Math.ceil((end - start) / 86400000));
}

function nextYearlyDate(startDate) {
  const base = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  const next = new Date(today.getFullYear(), base.getMonth(), base.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return next.toISOString().slice(0, 10);
}

function relationshipDays() {
  return Math.max(1, daysBetween(state.profile.startDate, todayKey()));
}

function nextAnniversary() {
  return nextYearlyDate(state.profile.startDate);
}

function yearsTogether() {
  const start = new Date(`${state.profile.startDate}T00:00:00`);
  const next = new Date(`${nextAnniversary()}T00:00:00`);
  return Math.max(1, next.getFullYear() - start.getFullYear());
}

function coupleLevel() {
  return Math.max(1, Math.floor(Number(state.points || 0) / 1400));
}

function render() {
  app.innerHTML = `
    <main class="app-shell">
      <aside class="desktop-aside">
        <div class="logo">∞</div>
        <h1>${escapeHtml(state.profile.appName)}<br>Couples OS</h1>
        <p>記念日、アルバム、お願い掲示板、共有カレンダー、プライバシーをひとつに。ふたりの名前を入れるだけで、毎日の関係メンテナンスが始まります。</p>
        <div class="feature-list">
          ${featureChip("💬", "一日一問で、自然に会話が生まれる")}
          ${featureChip("📷", "思い出をアルバムとタイムラインに保存")}
          ${featureChip("🗓️", "予定とお願いを共有して生活摩擦を減らす")}
          ${featureChip("🛡️", "位置情報は同意ベースで安全に管理")}
        </div>
      </aside>
      <section class="device" aria-label="Couplee app preview">
        ${state.profile.isReady ? renderApp() : renderOnboarding()}
        ${state.ui.modal ? renderModal(state.ui.modal) : ""}
      </section>
    </main>`;

  bindEvents();
}

function featureChip(icon, text) {
  return `<div class="feature-chip"><span>${icon}</span><strong>${escapeHtml(text)}</strong></div>`;
}

function statusBar() {
  return `
    <div class="status-row">
      <span>9:41</span>
      <div class="signal"><span></span><span></span><span></span> <strong>5G</strong> 🔋</div>
    </div>`;
}

function renderOnboarding() {
  return `
    <div class="onboarding">
      ${statusBar()}
      <div class="brand">
        <div class="logo">∞</div>
        <h1>Couplee</h1>
        <p>ふたりの毎日を、もっと愛おしく。<br>名前と記念日を入れるだけで、専用のホーム画面が完成します。</p>
      </div>
      <form id="onboardingForm" class="card form-card">
        <div class="form-grid">
          <div class="field">
            <label for="personA">あなたの名前</label>
            <input id="personA" name="personA" value="${escapeHtml(state.profile.personA)}" required maxlength="20" />
          </div>
          <div class="field">
            <label for="personB">パートナーの名前</label>
            <input id="personB" name="personB" value="${escapeHtml(state.profile.personB)}" required maxlength="20" />
          </div>
        </div>
        <div class="field">
          <label for="startDate">交際開始日 / 大切な日</label>
          <input id="startDate" name="startDate" type="date" value="${escapeHtml(state.profile.startDate)}" required />
        </div>
        <div class="field">
          <label for="anniversaryName">記念日の名前</label>
          <input id="anniversaryName" name="anniversaryName" value="${escapeHtml(state.profile.anniversaryName)}" maxlength="24" />
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="phase">関係フェーズ</label>
            <select id="phase" name="phase">
              ${option("交際初期", state.profile.phase)}
              ${option("遠距離", state.profile.phase)}
              ${option("同棲", state.profile.phase)}
              ${option("新婚", state.profile.phase)}
              ${option("子育て前後", state.profile.phase)}
              ${option("関係改善", state.profile.phase)}
            </select>
          </div>
          <div class="field">
            <label for="isLongDistance">距離感</label>
            <select id="isLongDistance" name="isLongDistance">
              <option value="true" ${state.profile.isLongDistance ? "selected" : ""}>遠距離あり</option>
              <option value="false" ${!state.profile.isLongDistance ? "selected" : ""}>近くに住んでいる</option>
            </select>
          </div>
        </div>
        <button class="btn full" type="submit">ふたりのホームを作成する</button>
        <p class="notice">このプロトタイプは端末内のlocalStorageに保存されます。本番ではSupabase / Firebase連携でパートナー同期できます。</p>
      </form>
    </div>`;
}

function option(value, selected) {
  return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function renderApp() {
  return `
    <div class="screen">
      ${statusBar()}
      ${renderView()}
    </div>
    ${renderNav()}`;
}

function renderView() {
  switch (state.ui.view) {
    case "anniversary": return renderAnniversary();
    case "album": return renderAlbum();
    case "requests": return renderRequests();
    case "calendar": return renderCalendar();
    case "privacy": return renderPrivacy();
    default: return renderHome();
  }
}

function renderTopbar(title, subtitle, action = "") {
  return `
    <div class="topbar">
      <div class="h-title">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      ${action}
    </div>`;
}

function avatarPair() {
  return `<div class="avatar-pair"><div class="avatar">${initialEmoji(state.profile.personA, 0)}</div><div class="avatar">${initialEmoji(state.profile.personB, 1)}</div></div>`;
}

function initialEmoji(name, index) {
  const icons = ["😊", "😌", "🌸", "🌙", "🐰", "🧸"];
  const code = [...String(name || "")].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return icons[(code + index) % icons.length];
}

function renderHome() {
  const anniv = nextAnniversary();
  const days = daysBetween(todayKey(), anniv);
  const level = coupleLevel();
  const progress = Math.min(100, Math.round(((state.points % 1400) / 1400) * 100));
  const upcoming = [...state.events].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 3);

  return `
    ${renderTopbar(`おはよう、${state.profile.personA}さん ☀️`, "素敵な1日をふたりでつくろうね", avatarPair())}
    <div class="stack-lg">
      <div class="grid-2">
        <article class="card hero-card">
          <p class="kicker">記念日まであと</p>
          <div class="big-num">${days}<span>日</span></div>
          <div class="meta">${formatDate(anniv, "long")}<br>${yearsTogether()}年 ${escapeHtml(state.profile.anniversaryName)} 💕</div>
        </article>
        <div class="stack">
          <article class="card level-card">
            <h3>カップルレベル</h3>
            <div class="level-value">Lv. ${level}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="meta">あと ${1400 - (state.points % 1400)}pt</div>
          </article>
          <article class="card points-card">
            <h3>ハートポイント</h3>
            <div class="points"><span class="heart-chip">♡</span>${state.points.toLocaleString()}</div>
          </article>
        </div>
      </div>

      <div class="grid-2">
        <article class="card question-card">
          <p class="kicker">今日の質問</p>
          <div class="question-text">${escapeHtml(dailyQuestions[state.daily.questionIndex])}</div>
          <button class="btn small" data-modal="daily">答える</button>
          <div class="mascot">🐰</div>
        </article>
        <article class="card mood-card">
          <p class="kicker">気分チェック</p>
          <div class="meta">お互いの気分をシェアしよう</div>
          <div class="mood-grid">
            ${moodSelect("personA", state.profile.personA, state.moods.personA)}
            ${moodSelect("personB", state.profile.personB, state.moods.personB)}
          </div>
        </article>
      </div>

      <article class="card streak-card">
        <span>🔥 連続記録</span>
        <strong>${state.streak}日</strong>
        <span>ベスト: ${state.bestStreak}日</span>
      </article>

      <div>
        <div class="section-head"><h3>予定</h3><button data-view="calendar">すべて見る</button></div>
        <div class="list">
          ${upcoming.length ? upcoming.map(renderEventListItem).join("") : empty("🗓️", "予定はまだありません")}
        </div>
      </div>
    </div>`;
}

function moodSelect(key, name, value) {
  const moods = ["😊", "😌", "🥰", "😴", "😢", "😤", "🤒", "🔥"];
  return `
    <div class="mood-item">
      <div class="mood-face">${escapeHtml(value)}</div>
      <select data-mood="${key}" aria-label="${escapeHtml(name)}の気分">
        ${moods.map(m => `<option value="${m}" ${m === value ? "selected" : ""}>${m} ${escapeHtml(name)}</option>`).join("")}
      </select>
    </div>`;
}

function renderEventListItem(event) {
  return `
    <div class="list-item">
      <div class="icon-box">${event.type === "call" ? "📹" : "🗓️"}</div>
      <div class="item-main"><strong>${escapeHtml(event.time)}　${escapeHtml(event.title)}</strong><span>${formatDate(event.date)} / ${escapeHtml(event.note || "")}</span></div>
      ${avatarPairSmall()}
    </div>`;
}

function avatarPairSmall() {
  return `<div class="avatar-pair"><div class="avatar small">${initialEmoji(state.profile.personA, 0)}</div><div class="avatar small">${initialEmoji(state.profile.personB, 1)}</div></div>`;
}

function renderAnniversary() {
  const anniv = nextAnniversary();
  const days = daysBetween(todayKey(), anniv);
  const totalDays = relationshipDays();
  const start = state.profile.startDate;
  const items = [
    ["💕", "出会った日", start],
    ["💌", "お付き合い開始", start],
    ["💯", "100日記念日", addDays(start, 100)],
    ["🎂", "1年記念日", addYears(start, 1)],
    ["🌟", "2年記念日", addYears(start, 2)],
    ["🏆", `次の${yearsTogether()}年記念日`, anniv]
  ];

  return `
    ${renderTopbar("記念日", "大切な日を一緒にお祝いしよう", `<button class="btn small secondary" data-modal="settings">編集</button>`)}
    <div class="stack-lg">
      <article class="card hero-card">
        <p class="kicker">次の記念日まで</p>
        <div class="big-num">${days}<span>日</span></div>
        <div class="meta">${formatDate(anniv, "long")}<br>${yearsTogether()}年 ${escapeHtml(state.profile.anniversaryName)} 💕</div>
      </article>

      <div class="grid-2">
        <article class="card small-card">
          <h3>一緒に過ごした日数</h3>
          <div class="level-value">${totalDays.toLocaleString()}日</div>
          <div class="meta">毎日がふたりの資産です</div>
        </article>
        <article class="card small-card">
          <h3>今月のハート</h3>
          <div class="level-value">+120</div>
          <div class="meta">お願い完了で増えます</div>
        </article>
      </div>

      <section>
        <div class="section-head"><h3>ふたりの軌跡</h3></div>
        <div class="timeline">
          ${items.map(([icon, title, date]) => `<div class="timeline-item" data-icon="${icon}"><strong>${escapeHtml(title)}</strong><span>${formatDate(date)}</span></div>`).join("")}
        </div>
      </section>

      <section>
        <div class="section-head"><h3>マイルストーンバッジ</h3></div>
        <div class="badge-grid">
          ${badge("💯", "100日")}
          ${badge("🎂", "1年記念")}
          ${badge("📷", "思い出")}
          ${badge("🗓️", "予定上手")}
          ${badge("💬", "会話マスター")}
          ${badge("🛡️", "安心設計")}
        </div>
      </section>

      <section>
        <div class="section-head"><h3>おすすめプラン</h3></div>
        <div class="suggestion-row">
          ${suggestion("s1", "週末旅行", "自然の中でリラックス")}
          ${suggestion("s2", "サプライズディナー", "特別な夜にしよう")}
          ${suggestion("s3", "思い出アルバム", "一年分を振り返る")}
        </div>
      </section>
    </div>`;
}

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addYears(dateString, years) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function badge(icon, label) {
  return `<div class="badge"><div>${icon}</div><strong>${escapeHtml(label)}</strong></div>`;
}

function suggestion(cls, title, text) {
  return `<div class="suggestion ${cls}"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderAlbum() {
  const sorted = [...state.memories].sort((a,b) => b.date.localeCompare(a.date));
  return `
    ${renderTopbar("アルバム", "思い出を残して、未来に振り返ろう", `<button class="btn icon" data-modal="memory">+</button>`)}
    <div class="tab-row">
      ${tab("memories", "思い出", state.ui.albumTab, "albumTab")}
      ${tab("photos", "写真", state.ui.albumTab, "albumTab")}
      ${tab("timeline", "タイムライン", state.ui.albumTab, "albumTab")}
      ${tab("spots", "スポット", state.ui.albumTab, "albumTab")}
    </div>
    <div class="list">
      ${sorted.length ? sorted.map(renderMemory).join("") : empty("📷", "まだ思い出がありません。右上の＋から追加できます。")}
    </div>`;
}

function tab(value, label, current, attr) {
  return `<button class="${value === current ? "active" : ""}" data-${attr}="${value}">${escapeHtml(label)}</button>`;
}

function renderMemory(memory) {
  const img = memory.image
    ? `<img class="memory-photo" src="${memory.image}" alt="${escapeHtml(memory.title)}" />`
    : `<div class="memory-photo">${escapeHtml(memory.emoji || "📷")}</div>`;
  return `
    <article class="card memory-card">
      ${img}
      <div>
        <h4>${escapeHtml(memory.title)} ${escapeHtml(memory.emoji || "")}</h4>
        <p>${escapeHtml(memory.caption)}</p>
        <div class="memory-meta"><span>${formatDate(memory.date)}</span><span>${escapeHtml(memory.place || "場所未設定")}</span><span>♡ ${Math.max(12, memory.title.length * 3)}</span></div>
        <div class="inline-actions"><button class="btn small ghost" data-delete-memory="${memory.id}">削除</button></div>
      </div>
    </article>`;
}

function renderRequests() {
  const filter = state.ui.requestFilter;
  const items = state.requests.filter(req => filter === "all" || req.status === filter);
  const completedThisMonth = state.requests.filter(req => req.status === "done").reduce((sum, req) => sum + Number(req.reward || 0), 0);
  const ratio = Math.min(100, Math.round((state.requests.filter(r => r.status === "done").length / Math.max(1, state.requests.length)) * 100));

  return `
    ${renderTopbar("お願い掲示板", "お願いごとややりたいことを共有しよう", `<button class="btn small" data-modal="request">＋お願いする</button>`)}
    <div class="tab-row">
      ${tab("all", "すべて", filter, "requestFilter")}
      ${tab("pending", "未対応", filter, "requestFilter")}
      ${tab("accepted", "受付中", filter, "requestFilter")}
      ${tab("done", "完了", filter, "requestFilter")}
    </div>
    <div class="grid-2">
      <div class="list full">
        ${items.length ? items.map(renderRequest).join("") : empty("🎁", "このステータスのお願いはありません。")}
      </div>
      <article class="card small-card">
        <h3>今月のハート報酬</h3>
        <div class="level-value">+${completedThisMonth}</div>
        <div class="meta">完了したお願いの合計</div>
      </article>
      <article class="card small-card">
        <h3>ふたりの協力度</h3>
        <div class="level-value">${ratio}%</div>
        <div class="progress-track"><div class="progress-fill" style="width:${ratio}%"></div></div>
      </article>
    </div>`;
}

function renderRequest(req) {
  const statusMap = {
    pending: ["未対応", "pending"],
    accepted: ["受付中", "accepted"],
    done: ["完了", "done"]
  };
  const [label, cls] = statusMap[req.status] || statusMap.pending;
  return `
    <article class="card request-card">
      <div class="request-top">
        <span class="request-title">${requestIcon(req.title)} ${escapeHtml(req.title)}</span>
        <span class="status ${cls}">${label}</span>
      </div>
      <p>${escapeHtml(req.detail)}</p>
      <div class="mini-row" style="justify-content:space-between;gap:8px;">
        <span class="meta">${req.from === "personA" ? escapeHtml(state.profile.personA) : escapeHtml(state.profile.personB)}から / +${req.reward}pt</span>
        <div class="inline-actions" style="margin:0;">
          ${req.status !== "accepted" ? `<button class="btn small secondary" data-request-status="${req.id}:accepted">受付</button>` : ""}
          ${req.status !== "done" ? `<button class="btn small" data-request-status="${req.id}:done">完了</button>` : ""}
          <button class="btn small ghost" data-delete-request="${req.id}">削除</button>
        </div>
      </div>
    </article>`;
}

function requestIcon(title) {
  if (title.includes("電話")) return "📞";
  if (title.includes("花")) return "💐";
  if (title.includes("映画")) return "🎬";
  if (title.includes("デート")) return "💕";
  return "🎁";
}

function renderCalendar() {
  const events = [...state.events].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  return `
    ${renderTopbar("共有カレンダー", "予定を共有して、もっとスムーズに", `<button class="btn icon" data-modal="event">+</button>`)}
    <div class="stack-lg">
      <article class="card calendar-card">
        <div class="row" style="justify-content:space-between;"><strong>${today.getFullYear()}年${today.getMonth() + 1}月</strong><button class="btn small secondary" data-modal="todo">ToDo追加</button></div>
        <div class="week-row">
          ${week.map(day => `<div class="day ${sameDay(day, today) ? "today" : ""}"><span>${"日月火水木金土"[day.getDay()]}</span><strong>${day.getDate()}</strong></div>`).join("")}
        </div>
      </article>

      <section>
        <div class="section-head"><h3>予定</h3></div>
        <div class="list">
          ${events.length ? events.map(renderCalendarEvent).join("") : empty("🗓️", "予定はまだありません。")}
        </div>
      </section>

      <section>
        <div class="section-head"><h3>ToDoリスト</h3><button data-modal="todo">追加</button></div>
        <div class="list">
          ${state.todos.length ? state.todos.map(todo => `<label class="todo ${todo.done ? "completed" : ""}"><input type="checkbox" data-todo="${todo.id}" ${todo.done ? "checked" : ""}/><span>${escapeHtml(todo.title)}</span><button class="btn small ghost" type="button" data-delete-todo="${todo.id}">削除</button></label>`).join("") : empty("✅", "ToDoはありません。")}
        </div>
      </section>
    </div>`;
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function renderCalendarEvent(event) {
  return `
    <article class="event-item">
      <div class="event-time">${escapeHtml(event.time)}</div>
      <div>
        <strong>${escapeHtml(event.title)}</strong>
        <div class="meta">${formatDate(event.date)} / ${escapeHtml(event.note || "メモなし")}</div>
        <div class="inline-actions"><button class="btn small ghost" data-delete-event="${event.id}">削除</button></div>
      </div>
    </article>`;
}

function renderPrivacy() {
  return `
    ${renderTopbar("プライバシー", "安心・安全に使うための設定を大切に", "")}
    <div class="stack-lg">
      <article class="card form-card">
        <div class="row" style="justify-content:space-between;margin-bottom:14px;gap:12px;">
          <div>
            <strong>位置情報の共有</strong>
            <p class="meta">お互いの同意のもとで、安心をサポートします</p>
          </div>
          <button class="toggle ${state.privacy.locationSharing ? "on" : ""}" data-toggle-location aria-label="位置情報共有切替"></button>
        </div>
        <div class="privacy-mode">
          ${privacyMode("always", "📍", "常に共有", "常時共有します")}
          ${privacyMode("timed", "⏱️", "時間限定", `${state.privacy.timedHours}時間だけ共有`)}
          ${privacyMode("emergency", "🆘", "緊急時のみ", "必要時だけ共有")}
        </div>
      </article>

      <article class="card form-card">
        <div class="section-head" style="margin-top:0;"><h3>同意と境界設定</h3></div>
        <div class="list">
          <div class="list-item"><div class="icon-box">👁️</div><div class="item-main"><strong>共有履歴を確認する</strong><span>いつ、どの設定で共有したかを確認できます</span></div></div>
          <div class="list-item"><div class="icon-box">🔐</div><div class="item-main"><strong>プライバシー設定の詳細</strong><span>位置情報・写真・日記は別々に管理します</span></div></div>
          <div class="list-item"><div class="icon-box">🚨</div><div class="item-main"><strong>セーフティ導線</strong><span>監視・強要・不安がある場合はすぐ停止できます</span></div></div>
        </div>
      </article>

      <div class="privacy-actions">
        <button class="btn secondary" data-action="unlink">🔗<span>連携解除</span></button>
        <button class="btn secondary" data-action="export">⬇️<span>データ書き出し</span></button>
        <button class="btn danger" data-action="deleteAll">🗑️<span>全データ削除</span></button>
      </div>
    </div>`;
}

function privacyMode(mode, icon, title, text) {
  return `<button class="mode-card ${state.privacy.mode === mode ? "active" : ""}" data-privacy-mode="${mode}"><div class="mode-icon">${icon}</div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></button>`;
}

function empty(icon, text) {
  return `<div class="card empty"><div>${icon}</div><p>${escapeHtml(text)}</p></div>`;
}

function renderNav() {
  const nav = [
    ["home", "⌂", "ホーム"],
    ["anniversary", "♡", "記念日"],
    ["album", "▧", "アルバム"],
    ["requests", "❤", "お願い"],
    ["calendar", "▣", "カレンダー"],
    ["privacy", "☰", "安全"]
  ];
  return `<nav class="nav" aria-label="主要ナビゲーション">${nav.map(([view, icon, label]) => `<button class="${state.ui.view === view ? "active" : ""}" data-view="${view}"><span>${icon}</span><span>${label}</span></button>`).join("")}</nav>`;
}

function renderModal(type) {
  const content = {
    daily: dailyModal(),
    memory: memoryModal(),
    request: requestModal(),
    event: eventModal(),
    todo: todoModal(),
    settings: settingsModal()
  }[type] || "";
  return `<div class="modal-backdrop" data-close-modal><div class="modal card" data-modal-panel>${content}</div></div>`;
}

function dailyModal() {
  return `
    <h2>今日の質問</h2>
    <p class="meta">${escapeHtml(dailyQuestions[state.daily.questionIndex])}</p>
    <form id="dailyForm">
      <div class="field"><label>${escapeHtml(state.profile.personA)}の回答</label><textarea name="answerA" maxlength="160" placeholder="ここに回答を入力">${escapeHtml(state.daily.answerA)}</textarea></div>
      <div class="field"><label>${escapeHtml(state.profile.personB)}の回答</label><textarea name="answerB" maxlength="160" placeholder="ここに回答を入力">${escapeHtml(state.daily.answerB)}</textarea></div>
      ${state.daily.revealed ? `<div class="card form-card"><strong>回答を開示しました 💕</strong><p class="meta">小さな会話を続けることで、ハートポイントが増えます。</p></div>` : ""}
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>閉じる</button><button class="btn" type="submit">回答を保存して開示</button></div>
    </form>`;
}

function memoryModal() {
  return `
    <h2>思い出を追加</h2>
    <form id="memoryForm">
      <div class="field"><label>タイトル</label><input name="title" required maxlength="32" placeholder="例：温泉旅行" /></div>
      <div class="form-grid"><div class="field"><label>日付</label><input name="date" type="date" value="${todayKey()}" required /></div><div class="field"><label>場所</label><input name="place" maxlength="24" placeholder="例：箱根" /></div></div>
      <div class="field"><label>キャプション</label><textarea name="caption" maxlength="180" placeholder="どんな思い出でしたか？"></textarea></div>
      <div class="field"><label>写真</label><input name="image" type="file" accept="image/*" /></div>
      <div class="field"><label>絵文字</label><input name="emoji" maxlength="4" placeholder="📷" /></div>
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>キャンセル</button><button class="btn" type="submit">保存する</button></div>
    </form>`;
}

function requestModal() {
  return `
    <h2>お願いを追加</h2>
    <form id="requestForm">
      <div class="field"><label>お願いタイトル</label><input name="title" required maxlength="32" placeholder="例：今夜電話してね" /></div>
      <div class="field"><label>内容</label><textarea name="detail" maxlength="180" placeholder="相手が受け取りやすい言い方で書きましょう"></textarea></div>
      <div class="form-grid"><div class="field"><label>投稿者</label><select name="from"><option value="personA">${escapeHtml(state.profile.personA)}</option><option value="personB">${escapeHtml(state.profile.personB)}</option></select></div><div class="field"><label>報酬pt</label><input name="reward" type="number" min="0" max="300" value="60" /></div></div>
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>キャンセル</button><button class="btn" type="submit">掲示板に追加</button></div>
    </form>`;
}

function eventModal() {
  return `
    <h2>予定を追加</h2>
    <form id="eventForm">
      <div class="field"><label>予定名</label><input name="title" required maxlength="32" placeholder="例：ディナー予約" /></div>
      <div class="form-grid"><div class="field"><label>日付</label><input name="date" type="date" value="${todayKey()}" required /></div><div class="field"><label>時間</label><input name="time" type="time" value="19:00" required /></div></div>
      <div class="field"><label>メモ</label><input name="note" maxlength="60" placeholder="場所や持ち物など" /></div>
      <div class="field"><label>種類</label><select name="type"><option value="date">デート</option><option value="call">通話</option><option value="task">用事</option></select></div>
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>キャンセル</button><button class="btn" type="submit">予定に追加</button></div>
    </form>`;
}

function todoModal() {
  return `
    <h2>ToDoを追加</h2>
    <form id="todoForm">
      <div class="field"><label>ToDo</label><input name="title" required maxlength="50" placeholder="例：旅行の計画を立てる" /></div>
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>キャンセル</button><button class="btn" type="submit">追加する</button></div>
    </form>`;
}

function settingsModal() {
  return `
    <h2>プロフィール編集</h2>
    <form id="settingsForm">
      <div class="form-grid"><div class="field"><label>あなたの名前</label><input name="personA" value="${escapeHtml(state.profile.personA)}" required maxlength="20" /></div><div class="field"><label>パートナーの名前</label><input name="personB" value="${escapeHtml(state.profile.personB)}" required maxlength="20" /></div></div>
      <div class="field"><label>交際開始日</label><input name="startDate" type="date" value="${escapeHtml(state.profile.startDate)}" required /></div>
      <div class="field"><label>記念日の名前</label><input name="anniversaryName" value="${escapeHtml(state.profile.anniversaryName)}" maxlength="24" /></div>
      <div class="field"><label>関係フェーズ</label><select name="phase">${["交際初期", "遠距離", "同棲", "新婚", "子育て前後", "関係改善"].map(v => option(v, state.profile.phase)).join("")}</select></div>
      <div class="inline-actions"><button type="button" class="btn secondary" data-close>キャンセル</button><button class="btn" type="submit">更新する</button></div>
    </form>`;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.ui.view = btn.dataset.view; s.ui.modal = null; return s; }));
  });

  document.querySelectorAll("[data-modal]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.ui.modal = btn.dataset.modal; return s; }));
  });

  document.querySelectorAll("[data-close], [data-close-modal]").forEach(el => {
    el.addEventListener("click", event => {
      if (event.currentTarget.dataset.closeModal !== undefined && event.target.closest("[data-modal-panel]")) return;
      setState(s => { s.ui.modal = null; return s; });
    });
  });

  document.querySelectorAll("[data-mood]").forEach(select => {
    select.addEventListener("change", () => setState(s => { s.moods[select.dataset.mood] = select.value; s.points += 5; return s; }));
  });

  document.querySelectorAll("[data-albumTab]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.ui.albumTab = btn.dataset.albumtab; return s; }));
  });

  document.querySelectorAll("[data-requestFilter]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.ui.requestFilter = btn.dataset.requestfilter; return s; }));
  });

  document.querySelectorAll("[data-request-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [id, status] = btn.dataset.requestStatus.split(":");
      setState(s => {
        const req = s.requests.find(r => r.id === id);
        if (req) {
          const wasDone = req.status === "done";
          req.status = status;
          if (status === "done" && !wasDone) s.points += Number(req.reward || 0);
        }
        return s;
      });
    });
  });

  document.querySelectorAll("[data-delete-request]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.requests = s.requests.filter(r => r.id !== btn.dataset.deleteRequest); return s; }));
  });

  document.querySelectorAll("[data-delete-memory]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.memories = s.memories.filter(m => m.id !== btn.dataset.deleteMemory); return s; }));
  });

  document.querySelectorAll("[data-delete-event]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.events = s.events.filter(e => e.id !== btn.dataset.deleteEvent); return s; }));
  });

  document.querySelectorAll("[data-delete-todo]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => { s.todos = s.todos.filter(t => t.id !== btn.dataset.deleteTodo); return s; }));
  });

  document.querySelectorAll("[data-todo]").forEach(input => {
    input.addEventListener("change", () => setState(s => { const todo = s.todos.find(t => t.id === input.dataset.todo); if (todo) todo.done = input.checked; if (input.checked) s.points += 10; return s; }));
  });

  document.querySelector("[data-toggle-location]")?.addEventListener("click", () => setState(s => {
    s.privacy.locationSharing = !s.privacy.locationSharing;
    s.privacy.shareHistory.unshift({ at: new Date().toISOString(), action: s.privacy.locationSharing ? "ON" : "OFF", mode: s.privacy.mode });
    return s;
  }));

  document.querySelectorAll("[data-privacy-mode]").forEach(btn => {
    btn.addEventListener("click", () => setState(s => {
      s.privacy.mode = btn.dataset.privacyMode;
      s.privacy.shareHistory.unshift({ at: new Date().toISOString(), action: "MODE_CHANGE", mode: s.privacy.mode });
      return s;
    }));
  });

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => handlePrivacyAction(btn.dataset.action));
  });

  bindForms();
}

function bindForms() {
  document.getElementById("onboardingForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.profile.personA = String(fd.get("personA") || "").trim();
      s.profile.personB = String(fd.get("personB") || "").trim();
      s.profile.startDate = String(fd.get("startDate") || todayKey());
      s.profile.anniversaryName = String(fd.get("anniversaryName") || "交際記念日").trim();
      s.profile.phase = String(fd.get("phase") || "遠距離");
      s.profile.isLongDistance = fd.get("isLongDistance") === "true";
      s.profile.isReady = true;
      return s;
    });
  });

  document.getElementById("dailyForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.daily.answerA = String(fd.get("answerA") || "").trim();
      s.daily.answerB = String(fd.get("answerB") || "").trim();
      s.daily.revealed = Boolean(s.daily.answerA || s.daily.answerB);
      if (s.daily.revealed) s.points += 40;
      s.ui.modal = null;
      return s;
    });
  });

  document.getElementById("memoryForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const file = fd.get("image");
    const image = file && file.size ? await resizeImage(file, 720) : "";
    setState(s => {
      s.memories.unshift({
        id: cryptoId(),
        title: String(fd.get("title") || "思い出").trim(),
        date: String(fd.get("date") || todayKey()),
        place: String(fd.get("place") || "").trim(),
        caption: String(fd.get("caption") || "").trim(),
        emoji: String(fd.get("emoji") || "📷").trim(),
        image
      });
      s.points += 30;
      s.ui.modal = null;
      return s;
    });
  });

  document.getElementById("requestForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.requests.unshift({
        id: cryptoId(),
        title: String(fd.get("title") || "お願い").trim(),
        detail: String(fd.get("detail") || "").trim(),
        from: String(fd.get("from") || "personA"),
        status: "pending",
        reward: Number(fd.get("reward") || 0),
        createdAt: todayKey()
      });
      s.points += 10;
      s.ui.modal = null;
      return s;
    });
  });

  document.getElementById("eventForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.events.push({
        id: cryptoId(),
        title: String(fd.get("title") || "予定").trim(),
        date: String(fd.get("date") || todayKey()),
        time: String(fd.get("time") || "19:00"),
        note: String(fd.get("note") || "").trim(),
        type: String(fd.get("type") || "date")
      });
      s.points += 15;
      s.ui.modal = null;
      return s;
    });
  });

  document.getElementById("todoForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.todos.push({ id: cryptoId(), title: String(fd.get("title") || "ToDo").trim(), done: false });
      s.points += 5;
      s.ui.modal = null;
      return s;
    });
  });

  document.getElementById("settingsForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setState(s => {
      s.profile.personA = String(fd.get("personA") || "").trim();
      s.profile.personB = String(fd.get("personB") || "").trim();
      s.profile.startDate = String(fd.get("startDate") || todayKey());
      s.profile.anniversaryName = String(fd.get("anniversaryName") || "交際記念日").trim();
      s.profile.phase = String(fd.get("phase") || "遠距離");
      s.ui.modal = null;
      return s;
    });
  });
}

function handlePrivacyAction(action) {
  if (action === "export") {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `couplee-export-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (action === "unlink") {
    if (!confirm("パートナー連携を解除しますか？保存データは端末に残ります。")) return;
    setState(s => {
      s.profile.personB = "パートナー";
      s.privacy.locationSharing = false;
      s.privacy.shareHistory.unshift({ at: new Date().toISOString(), action: "UNLINK", mode: s.privacy.mode });
      return s;
    });
    return;
  }

  if (action === "deleteAll") {
    if (!confirm("全データを削除して初期状態に戻します。よろしいですか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    render();
  }
}

function resizeImage(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});
