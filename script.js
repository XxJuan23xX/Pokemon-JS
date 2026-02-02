const input = document.getElementById("pokemonInput");
const btn = document.getElementById("searchBtn");
const errorBox = document.getElementById("error");

const screenName = document.getElementById("screenName");
const screenId = document.getElementById("screenId");
const pokemonImg = document.getElementById("pokemonImg");

const typesEl = document.getElementById("types");
const heightEl = document.getElementById("height");
const weightEl = document.getElementById("weight");
const abilitiesEl = document.getElementById("abilities");
const statsEl = document.getElementById("stats");

const SHINY_CHANCE = 0.01;     // 1%
const SHINY_BOOST = 1.10;      // +10% stats
const FEMALE_CHANCE = 0.0012; // 0.12%
const startBattleBtn = document.getElementById("startBattle");
const TEAM_STORAGE_KEY = "pokedex_team_v1";

// --- CRUZ (D-PAD) ---
const crossUp = document.getElementById("crossUp");
const crossDown = document.getElementById("crossDown");
const crossLeft = document.getElementById("crossLeft");
const crossRight = document.getElementById("crossRight");

// Keypad buttons
const keypad = document.querySelectorAll(".key");
const addBtn = document.getElementById("addBtn");
const teamBody = document.getElementById("teamBody");
const teamCount = document.getElementById("teamCount");
const clearTeamBtn = document.getElementById("clearTeam");

// --- Modals ---
const nicknameModal = document.getElementById("nicknameModal");
const nicknameInput = document.getElementById("nicknameInput");
const closeNickname = document.getElementById("closeNickname");
const cancelNickname = document.getElementById("cancelNickname");
const saveNickname = document.getElementById("saveNickname");

const infoModal = document.getElementById("infoModal");
const infoTitle = document.getElementById("infoTitle");
const infoStats = document.getElementById("infoStats");
const infoMoves = document.getElementById("infoMoves");
const closeInfo = document.getElementById("closeInfo");
const okInfo = document.getElementById("okInfo");

const addOverlay = document.getElementById("addOverlay");
const addGif = document.getElementById("addGif");

let editingId = null;


let currentId = 1;
let currentData = null;

// sprite view mode: "front" | "back"
let spriteView = "front";

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function showError(msg) {
  errorBox.style.display = "block";
  errorBox.textContent = msg;
}
function hideError() {
  errorBox.style.display = "none";
  errorBox.textContent = "";
}

function updateBattleButton(){
  startBattleBtn.disabled = team.length === 0;
}

startBattleBtn.addEventListener("click", () => {
  if (team.length === 0) {
    showError("Agrega al menos un Pokémon para iniciar combate.");
    return;
  }
  saveTeam(); 
  window.location.href = "battle.html";
});


let team = loadTeam();

function updateTeamUI() {
  teamBody.innerHTML = "";

  team.forEach((p, index) => {
    const tr = document.createElement("tr");

    const typesHtml = p.types.map(t => {
      const typeName = t.type.name;
      return `<img class="type-icon" src="images/${typeName}.png" alt="${typeName}"
                onerror="this.outerHTML='<span class=\\'type-pill\\'>${typeName}</span>'">`;
    }).join("");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><img class="team-sprite" src="${p.sprite}" alt="${p.name}"></td>
      <td><b>${p.name}</b> <span style="opacity:.75">(#${String(p.id).padStart(3,"0")})</span></td>
      <td class="gender-td">
    <img class="gender-icon" src="${genderIconSrc(p.gender)}" alt="${p.gender === "F" ? "Hembra" : "Macho"}">
  </td>
      <td>${p.nickname}</td>
      <td><div class="team-types">${typesHtml}</div></td>
      <td>
        <div class="action-btns">
          <button class="small-btn mote" data-mote="${p.id}">Mote</button>
          <button class="small-btn info" data-info="${p.id}">Info</button>
          <button class="small-btn remove" data-remove="${p.id}">Quitar</button>
        </div>
      </td>
    `;

    teamBody.appendChild(tr);
  });

  teamCount.textContent = `${team.length} / 6`;
  addBtn.disabled = team.length >= 6;
  if (startBattleBtn) startBattleBtn.disabled = team.length === 0;
  updateBattleButton();
}

function saveTeam() {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
}


function loadTeam() {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rollGender(){
  return (Math.random() < FEMALE_CHANCE) ? "F" : "M";
}

function genderIconSrc(g){
  return g === "F" ? "images/Hembra.webp" : "images/Macho.webp";
}

addBtn.addEventListener("click", async () => {
  if (!currentData) {
    showError("Primero busca un Pokémon para poder agregarlo.");
    return;
  }

  if (team.length >= 6) {
    showError("Tu equipo ya tiene 6 Pokémon. Quita uno para agregar otro.");
    return;
  }

  const alreadyInTeam = team.some(p => p.id === currentData.id);
  if (alreadyInTeam) {
    showError(`"${cap(currentData.name)}" ya está en tu equipo.`);
    return;
  }

  hideError();

  // 🔥 Animación 
  await playAddAnimation(2000);

  const sprite = getSprite(currentData);

  team.push({
  id: currentData.id,
  name: cap(currentData.name),
  nickname: cap(currentData.name),
  types: currentData.types,
  sprite: getSprite(currentData),
  stats: currentData.stats,     
  moves: currentData.moves,
  isShiny: !!currentData._isShiny,
  gender: rollGender()
});


  updateTeamUI();
  saveTeam();
});



teamBody.addEventListener("click", (e) => {
  const moteBtn = e.target.closest("button[data-mote]");
  const infoBtn = e.target.closest("button[data-info]");
  const removeBtn = e.target.closest("button[data-remove]");

  // Quitar
  if (removeBtn) {
    const id = Number(removeBtn.dataset.remove);
    team = team.filter(p => p.id !== id);
    updateTeamUI();
    saveTeam();
    return;
  }

  // Mote
  if (moteBtn) {
    const id = Number(moteBtn.dataset.mote);
    const p = team.find(x => x.id === id);
    if (!p) return;

    editingId = id;
    nicknameInput.value = p.nickname || p.name;
    openModal(nicknameModal);
    nicknameInput.focus();
    nicknameInput.select();
    return;
  }

  // Info
  if (infoBtn) {
    const id = Number(infoBtn.dataset.info);
    const p = team.find(x => x.id === id);
    if (!p) return;

    infoTitle.textContent = `Info: ${p.name} (#${String(p.id).padStart(3,"0")})`;

    // Render stats 
    infoStats.innerHTML = "";
    p.stats.forEach(s => {
      const row = document.createElement("div");
      row.className = "stat-row";

      const label = document.createElement("div");
      label.textContent = statLabel(s.stat.name);

      const bar = document.createElement("div");
      bar.className = "bar";

      const fill = document.createElement("div");
      const pct = Math.min(100, Math.round((s.base_stat / 200) * 100));
      fill.style.width = pct + "%";
      bar.appendChild(fill);

      const val = document.createElement("div");
      val.style.textAlign = "right";
      val.textContent = s.base_stat;

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(val);

      infoStats.appendChild(row);
    });

    // Render moves (primeros 4)
    infoMoves.innerHTML = "";
    p.moves.slice(0, 4).forEach(m => {
      const pill = document.createElement("span");
      pill.className = "move-pill";
      pill.textContent = cap(m.move.name.replace("-", " "));
      infoMoves.appendChild(pill);
    });

    openModal(infoModal);
    return;
  }
});

function saveNicknameForEditing(){
  if (editingId == null) return;

  const p = team.find(x => x.id === editingId);
  if (!p) return;

  const newNick = nicknameInput.value.trim();
  p.nickname = newNick ? newNick : p.name; 
  updateTeamUI();
  saveTeam();
  closeModal(nicknameModal);
  editingId = null;
}

saveNickname.addEventListener("click", saveNicknameForEditing);
nicknameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveNicknameForEditing();
  if (e.key === "Escape") closeModal(nicknameModal);
});

closeNickname.addEventListener("click", () => closeModal(nicknameModal));
cancelNickname.addEventListener("click", () => closeModal(nicknameModal));


clearTeamBtn.addEventListener("click", () => {
  team = [];
  updateTeamUI();
  saveTeam();
});

closeInfo.addEventListener("click", () => closeModal(infoModal));
okInfo.addEventListener("click", () => closeModal(infoModal))

function getSprite(data) {
  const isShiny = !!data?._isShiny;

  // Normal
  const officialFront = data?.sprites?.other?.["official-artwork"]?.front_default;
  const homeFront = data?.sprites?.other?.home?.front_default;
  const front = data?.sprites?.front_default;
  const back = data?.sprites?.back_default;

  // Shiny 
  const homeFrontShiny = data?.sprites?.other?.home?.front_shiny;
  const frontShiny = data?.sprites?.front_shiny;
  const backShiny = data?.sprites?.back_shiny;

  if (spriteView === "back") {
    if (isShiny) return backShiny || frontShiny || homeFrontShiny || front || officialFront || "";
    return back || front || officialFront || homeFront || "";
  } else {
    if (isShiny) return homeFrontShiny || frontShiny || officialFront || homeFront || front || "";
    return officialFront || homeFront || front || back || "";
  }
}


function renderTypes(types) {
  typesEl.innerHTML = "";

  types.forEach(t => {
    const typeName = t.type.name; 

    const img = document.createElement("img");
    img.classList.add("type-icon");
    img.src = `images/${typeName}.png`;
    img.alt = typeName;

    // Si la imagen no existe, mostramos texto
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement("span");
      fallback.textContent = cap(typeName);
      typesEl.appendChild(fallback);
    };

    typesEl.appendChild(img);
  });
}

function renderAbilities(abilities) {
  abilitiesEl.textContent = abilities
    .map(a => cap(a.ability.name.replace("-", " ")))
    .join(", ");
}

function statLabel(apiName) {
  const map = {
    hp: "HP",
    attack: "Ataque",
    defense: "Defensa",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Velocidad",
  };
  return map[apiName] || apiName;
}

function renderStats(stats) {
  statsEl.innerHTML = "";
  stats.forEach(s => {
    const row = document.createElement("div");
    row.className = "stat-row";

    const label = document.createElement("div");
    label.textContent = statLabel(s.stat.name);

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    const pct = Math.min(100, Math.round((s.base_stat / 200) * 100));
    fill.style.width = pct + "%";

    bar.appendChild(fill);

    const val = document.createElement("div");
    val.style.textAlign = "right";
    val.textContent = s.base_stat;

    row.appendChild(label);
    row.appendChild(bar);
    row.appendChild(val);

    statsEl.appendChild(row);
  });
}

async function fetchPokemon(query) {
  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query.trim().toLowerCase())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se encontró ese Pokémon. Revisa el número/nombre.");
  return res.json();
}

function paintPokemon(data) {
  currentData = data;
  currentId = data.id;

  screenName.textContent = cap(data.name);
  screenId.textContent = "#" + String(data.id).padStart(3, "0");

  pokemonImg.src = getSprite(data);

  renderTypes(data.types);

  // height dm => m, weight hg => kg
  heightEl.textContent = (data.height / 10) + " m";
  weightEl.textContent = (data.weight / 10) + " kg";

  renderAbilities(data.abilities);
  renderStats(data.stats);
}

async function search() {
  const q = input.value.trim();
  if (!q) return showError("Escribe un número o nombre para buscar.");

  hideError();
  btn.disabled = true;
  btn.textContent = "Buscando...";

  try {
    spriteView = "front";

    const data = await fetchPokemon(q);

    // 🎲 1% shiny
    const isShiny = Math.random() < SHINY_CHANCE;

    // Clonamos para no tocar el objeto original 
    const d = structuredClone ? structuredClone(data) : JSON.parse(JSON.stringify(data));
    d._isShiny = isShiny;

    // ⭐ Boost stats si es shiny (+10%)
    if (isShiny && Array.isArray(d.stats)) {
      d.stats = d.stats.map(s => ({
        ...s,
        base_stat: Math.max(1, Math.round(s.base_stat * SHINY_BOOST))
      }));
    }

    paintPokemon(d);

  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Buscar";
  }
}

function openModal(modalEl){
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
}

function closeModal(modalEl){
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

// Cerrar al hacer click afuera del modal
[nicknameModal, infoModal].forEach(m => {
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModal(m);
  });
});

function playAddAnimation(durationMs = 2000) {
  return new Promise((resolve) => {
    const src = addGif.getAttribute("src");
    addGif.setAttribute("src", "");
    addGif.setAttribute("src", src);

    addOverlay.classList.add("show");
    addOverlay.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      addOverlay.classList.remove("show");
      addOverlay.setAttribute("aria-hidden", "true");
      resolve();
    }, durationMs);
  });
}

// --- D-PAD functionality (placeholder useful) ---
// Subir: Pokémon anterior
if (crossUp) {
  crossUp.addEventListener("click", () => {
    if (currentId > 1) fetchPokemon(String(currentId - 1)).then(paintPokemon);
  });
}

if (crossDown) {
  crossDown.addEventListener("click", () => {
    fetchPokemon(String(currentId + 1)).then(paintPokemon);
  });
}

// Izquierda: sprite frontal
crossLeft.addEventListener("click", () => {
  spriteView = "front";
  if (currentData) {
    pokemonImg.src = getSprite(currentData);
  }
});

// Derecha: sprite trasero
crossRight.addEventListener("click", () => {
  spriteView = "back";
  if (currentData) {
    pokemonImg.src = getSprite(currentData);
  }
});

// --- Search events ---
btn.addEventListener("click", search);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

// --- Keypad: mete números al input ---
keypad.forEach(k => {
  k.addEventListener("click", () => {
    input.value += k.dataset.key;
    input.focus();
  });
});

// Cargar inicial
input.value = "1";
search();
updateTeamUI();
