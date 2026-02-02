// =========================
// Config + Helpers
// =========================
const TEAM_STORAGE_KEY = "pokedex_team_v1";
const MENU_URL = "index.html";

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
const RIVAL_TEAM_IDS = [
  257, // Blaziken
  137, // Porygon
  41,  // Zubat
  448, // Lucario
  937, // Ceruledge
  692  // Clauncher
];

const TYPE_ES = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  electric: "Eléctrico",
  grass: "Planta",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada",
};

const moveTypeCache = new Map();
const moveDataCache = new Map(); // moveName -> move JSON (power, damage_class, type, etc.)
const typeDataCache = new Map(); // typeName -> type JSON (damage_relations)
const gameOverModal = document.getElementById("gameOverModal");
const gameOverMenu = document.getElementById("gameOverMenu");

function loadTeam(){
  try{
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }catch{
    return [];
  }
}

async function hydrateTeamHP(){
  for (const p of team){
    if (p.maxHp != null && p.hp != null) continue;

    const full = await fetchPokemon(p.id);
    const computedMax = calcHP(full.stats);

    if (p.maxHp == null) p.maxHp = computedMax;

    // ✅ si hp era placeholder (1) o null, inicializa a full SOLO 1ra vez
    if (p.hp == null || p.hp === 1) p.hp = p.maxHp;
  }

  loadTeam();
}

async function fetchPokemon(idOrName){
  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(String(idOrName).toLowerCase())}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("No se pudo cargar Pokémon.");
  return res.json();
}

function getFrontSprite(p){
  // 2D clásico
  return p?.sprites?.front_default
    || p?.sprites?.versions?.["generation-v"]?.["black-white"]?.front_default
    || "";
}

function getBackSprite(p){
  return p?.sprites?.other?.home?.back_default
    || p?.sprites?.back_default
    || p?.sprites?.front_default
    || "";
}

async function getMoveType(moveName){
  const key = String(moveName).toLowerCase();
  if (moveTypeCache.has(key)) return moveTypeCache.get(key);

  const url = `https://pokeapi.co/api/v2/move/${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok){
    moveTypeCache.set(key, "normal");
    return "normal";
  }
  const data = await res.json();
  const type = data?.type?.name || "normal";
  moveTypeCache.set(key, type);
  return type;
}

async function fetchMove(moveName){
  const key = String(moveName).toLowerCase();
  if (moveDataCache.has(key)) return moveDataCache.get(key);

  const url = `https://pokeapi.co/api/v2/move/${encodeURIComponent(key)}`;
  const res = await fetch(url);

  if (!res.ok){
    // fallback mínimo para que no truene
    const fallback = { name: key, power: null, type: {name:"normal"}, damage_class:{name:"status"} };
    moveDataCache.set(key, fallback);
    return fallback;
  }

  const data = await res.json();
  moveDataCache.set(key, data);
  return data;
}

async function fetchType(typeName){
  const key = String(typeName).toLowerCase();
  if (typeDataCache.has(key)) return typeDataCache.get(key);

  const url = `https://pokeapi.co/api/v2/type/${encodeURIComponent(key)}`;
  const res = await fetch(url);

  if (!res.ok){
    const fallback = { damage_relations: { double_damage_to:[], half_damage_to:[], no_damage_to:[] } };
    typeDataCache.set(key, fallback);
    return fallback;
  }

  const data = await res.json();
  typeDataCache.set(key, data);
  return data;
}

// =========================
// DOM (todo en un solo bloque)
// =========================
const intro = document.getElementById("intro");
const flash = document.getElementById("flash");
const black = document.getElementById("black");
const vs = document.getElementById("vs");
const whooshAudio = document.getElementById("whooshAudio");

const battleScene = document.getElementById("battleScene");
const backBtn = document.getElementById("backBtn");
const dialogText = document.getElementById("dialogText");

const actionMenu = document.getElementById("actionMenu");
const subPanel = document.getElementById("subPanel");
const dialogHint = document.getElementById("dialogHint");

const enemySpriteEl = document.getElementById("enemySprite");
const playerSpriteEl = document.getElementById("playerSprite1");
const battleBgm = document.getElementById("battleBgm");

const enemyHud = document.querySelector(".enemy-hud");
const playerHud = document.querySelector(".player-hud");

const enemyNameEl = document.getElementById("enemyName");
const enemyLvlEl  = document.getElementById("enemyLvl");
const enemyHpFill = document.getElementById("enemyHpFill");
const enemyHpText = document.getElementById("enemyHpText");

const playerNameEl = document.getElementById("playerName");
const playerLvlEl  = document.getElementById("playerLvl");
const playerHpFill = document.getElementById("playerHpFill");
const playerHpText = document.getElementById("playerHpText");
let mustSwitchPlayer = false; // cuando tu pokemon queda KO
let switchingLock = false;    // evita doble click en el cambio forzado
let forceSwitch = false;     // si es KO, no se puede cerrar

const switchModal = document.getElementById("switchModal");
const switchList = document.getElementById("switchList");
const switchClose = document.getElementById("switchClose");
const switchTitle = document.getElementById("switchTitle");
const switchSubtitle = document.getElementById("switchSubtitle");
const switchInfo = document.getElementById("switchInfo");
const switchInfoName = document.getElementById("switchInfoName");
const switchInfoId = document.getElementById("switchInfoId");
const switchInfoHpFill = document.getElementById("switchInfoHpFill");
const switchInfoHpText = document.getElementById("switchInfoHpText");
const switchInfoTypes = document.getElementById("switchInfoTypes");
const switchInfoSprite = document.getElementById("switchInfoSprite");

const switchCancelBtn = document.getElementById("switchCancelBtn");
const switchConfirmBtn = document.getElementById("switchConfirmBtn");
const panel = document.querySelector(".switch-panel");
const victoryBanner = document.getElementById("victoryBanner");
const victoryAudio  = document.getElementById("victoryAudio");

// =========================
// State
// =========================
let team = loadTeam();
let playerActive = null;
let enemyActive = null;
let enemyTeam = [];
let enemyIndex = 0;
let turnLock = false;
let switchOptions = [];
let switchSelected = 0;
let gameOverOpen = false;
let gameOverIndex = 0;
// =========================
// Audio
// =========================
function playWhoosh(){
  if(!whooshAudio) return;
  whooshAudio.currentTime = 0;
  whooshAudio.play().catch(()=>{});
}

// =========================
// Battle setup (BACK)
// =========================
function calcHP(stats){
  const hp = stats?.find(s => s.stat?.name === "hp")?.base_stat ?? 50;
  return Math.max(1, hp + 50);
}

function setHp(fillEl, textEl, current, max){
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  fillEl.style.width = pct + "%";
  textEl.textContent = `${current} / ${max}`;
}
function getStat(stats, name, fallback=60){
  return stats?.find(s => s.stat?.name === name)?.base_stat ?? fallback;
}

function getTypeNamesFromPokemon(p){
  return (p.types || []).map(t => t.type?.name).filter(Boolean);
}

function hasAliveEnemy(){
  return enemyTeam.some(p => p.hp > 0);
}

function hasAlivePlayer(){
  return team.some(p => (p.hp ?? 1) > 0); 
}

function genderIconSrc(g){
  return g === "F" ? "images/Hembra.webp" : "images/Macho.webp";
}

function genderAlt(g){
  return g === "F" ? "Hembra" : "Macho";
}

async function openSwitchModal({ forced = false } = {}){
  await hydrateTeamHP(); 
  forceSwitch = forced;

  // Si es forzado, bloquea cerrar
  if (switchClose) switchClose.style.display = forced ? "none" : "inline-flex";
switchSelected = 0;
  // Renderiza lista de opciones
  renderSwitchList();

  switchModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.activeElement?.blur();
}

function openGameOverModal(){
  stopBattleBgm();
  gameOverOpen = true;
  gameOverIndex = 0;

  // bloquear todo
  turnLock = true;
  forceSwitch = false;        // por si quedó forzado
  mustSwitchPlayer = false;

  // cerrar el modal de cambio si estaba abierto
  if (switchModal && !switchModal.classList.contains("hidden")) {
    switchModal.classList.add("hidden");
  }

  gameOverModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  renderGameOverMenu();
  document.activeElement?.blur();
}

function closeGameOverModal(){
  gameOverOpen = false;
  gameOverModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function renderGameOverMenu(){
  const opts = gameOverMenu.querySelectorAll(".gba-option");
  opts.forEach((el, i) => el.classList.toggle("active", i === gameOverIndex));
}

async function restartBattleSameTeams(){
  closeGameOverModal();
  await startBattleFromScratch();
}

function handleGameOverSelect(){
  const opts = gameOverMenu.querySelectorAll(".gba-option");
  const chosen = opts[gameOverIndex];
  if(!chosen) return;

  const action = chosen.dataset.action;
  if(action === "retry"){
    restartBattleSameTeams();
  }else if(action === "menu"){
    stopBattleBgm();
    window.location.href = MENU_URL;
  }
}

function closeSwitchModal(){
  if(forceSwitch) return; // no se puede cerrar si es forzado (KO)
  switchModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function getTeamAliveOptions(){
  const activeId = playerActive?.id;

  return team.filter(p => {
    const hp = (p.hp ?? 1);
    return hp > 0 && p.id !== activeId;
  });
}

function renderSwitchInfo(p){
  if(!p) return;
  const nm = (p.nickname || p.name || "—").toUpperCase();
  const g  = p.gender || "M";

  switchInfoName.innerHTML = `
  ${nm}
  <img class="gender-icon" src="${genderIconSrc(g)}" alt="${genderAlt(g)}">
`;
  switchInfoId.textContent = `#${String(p.id).padStart(3,"0")}`;
if (switchInfoSprite){
  // si guardas p.sprite del equipo, úsalo
  const sprite = p.sprite
    || p.frontSprite
    || "";

  switchInfoSprite.src = sprite;

  // fallback si no existe
  switchInfoSprite.onerror = () => {
    switchInfoSprite.src = "";
  };
}
async function restartBattleSameTeams(){
  // cerrar modal
  closeGameOverModal();

  // resetear HP del jugador a full
  await hydrateTeamHP(); // asegura maxHp
  team.forEach(p => {
    p.hp = p.maxHp;       // full
  });
  loadTeam(); 

  // resetear estado del combate (locks y UI)
  turnLock = false;
  switchingLock = false;
  forceSwitch = false;
  mustSwitchPlayer = false;

  // reset enemigo 
  resetEnemyTeam();  
  await startBattleFromScratch(); 
}

// Click handlers
gameOverMenu?.addEventListener("click", (e) => {
  const item = e.target.closest(".gba-option");
  if(!item) return;
  const opts = [...gameOverMenu.querySelectorAll(".gba-option")];
  gameOverIndex = Math.max(0, opts.indexOf(item));
  renderGameOverMenu();
  handleGameOverSelect();
});

// Keyboard 
window.addEventListener("keydown", (e) => {
  if(!gameOverModal || gameOverModal.classList.contains("hidden")) return;

  if(["ArrowUp","ArrowDown","Enter"].includes(e.key)){
    e.preventDefault();
    e.stopPropagation();
  }

  const opts = gameOverMenu.querySelectorAll(".gba-option");
  if(!opts.length) return;

  if(e.key === "ArrowUp"){
    gameOverIndex = (gameOverIndex + opts.length - 1) % opts.length;
    renderGameOverMenu();
  }else if(e.key === "ArrowDown"){
    gameOverIndex = (gameOverIndex + 1) % opts.length;
    renderGameOverMenu();
  }else if(e.key === "Enter"){
    handleGameOverSelect();
  }
}, true);

  const hp = p.hp ?? p.maxHp ?? 1;
  const maxHp = p.maxHp ?? hp ?? 1;
  const pct = Math.max(0, Math.min(100, Math.round((hp / Math.max(1,maxHp)) * 100)));

  switchInfoHpFill.style.width = pct + "%";
  switchInfoHpText.textContent = `${hp} / ${maxHp}`;

  // tipos (texto)
  const types = (p.types || []).map(t => t.type?.name || t);
  switchInfoTypes.innerHTML = types.length
    ? types.map(t => `<span style="border:2px solid #1a1a1a; padding:4px 8px; border-radius:10px; font-weight:900;">${(TYPE_ES[t]||cap(t)).toUpperCase()}</span>`).join("")
    : "—";
}

function renderSwitchList(){
  console.log("TEAM:", team);
console.log("playerActive:", playerActive);
console.log("alive options:", getTeamAliveOptions());

  if(!switchList) return;

  switchOptions = getTeamAliveOptions(); // vivos y no el actual
    // ✅ llenar panel cuando hay 5 visibles (porque el activo no aparece)
  const switchPanel = document.querySelector(".switch-panel");
  if (switchPanel) {
    switchPanel.classList.toggle("fill5", switchOptions.length === 5);
  }
  // ✅ NO reiniciar siempre; solo si está fuera de rango
if (switchSelected < 0) switchSelected = 0;
if (switchSelected >= switchOptions.length) switchSelected = 0;

 if(!switchOptions.length){
  // si ni siquiera hay vivos en todo el team -> derrota real
  if(!hasAnyAliveInTeam()){
    // cierra modal de cambio por si quedó abierto
    switchModal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    openGameOverModal(); // <-- el modal GBA de derrota
    return;
  }

  switchTitle.textContent = "SIN OPCIONES";
  switchSubtitle.textContent = "No hay Pokémon disponibles para cambiar.";
  switchList.innerHTML = "";
  switchConfirmBtn.disabled = true;
  return;
}

  switchTitle.textContent = "CAMBIAR";
  switchSubtitle.textContent = forceSwitch
    ? "Tu Pokémon se debilitó. Debes cambiar."
    : "Elige un Pokémon (consume turno).";

  switchConfirmBtn.disabled = false;

  switchList.innerHTML = switchOptions.map((p, i) => `
    <div class="switch-row ${i===switchSelected ? "active":""}" data-i="${i}">
      <div class="switch-caret">▶</div>
      <div class="switch-name">${(p.nickname || p.name).toUpperCase()}</div>
      <div class="switch-meta">#${String(p.id).padStart(3,"0")}</div>
    </div>
  `).join("");

  renderSwitchInfo(switchOptions[switchSelected]);

  // click en fila: seleccionar / doble click = confirmar
  switchList.querySelectorAll(".switch-row").forEach(row => {
    row.addEventListener("click", () => {
      const i = Number(row.dataset.i);
      if(i === switchSelected){
        confirmSwitch();
      }else{
        switchSelected = i;
        renderSwitchList(); // re-render simple
      }
    });
  });
}

function hasAnyAliveInTeam(){
  return team.some(p => (p.hp ?? 0) > 0);
}

async function confirmSwitch(){
  if(switchingLock) return;
  const p = switchOptions[switchSelected];
  if(!p) return;

  switchingLock = true;
  const consumeTurn = !forceSwitch;

  try{
    if(consumeTurn) turnLock = true;

    await setActivePokemonById(p.id);

    forceSwitch = false;
    mustSwitchPlayer = false;

    switchModal.classList.add("hidden");
    document.body.classList.remove("modal-open"); 

    dialogText.textContent = `¡Adelante, ${playerActive.name}!`;
    showMenu();

    if(consumeTurn){
      await sleep(500);
      await enemyTurn();
    }
  }catch(err){
    console.error(err);
    dialogText.textContent = "Error al cambiar Pokémon.";
  }finally{
    switchingLock = false;
    turnLock = false;
  }
  console.log("CERRÉ MODAL", { forceSwitch, mustSwitchPlayer, activeId: playerActive.id, activeHp: playerActive.hp });

}


switchCancelBtn?.addEventListener("click", () => {
  if(forceSwitch) return;
  closeSwitchModal();
});

switchConfirmBtn?.addEventListener("click", confirmSwitch);

window.addEventListener("keydown", (e) => {
  if(!switchModal || switchModal.classList.contains("hidden")) return;

  // evitar que Enter/Esc/Arrows hagan cosas fuera del modal
  if(["Escape","ArrowUp","ArrowDown","Enter"].includes(e.key)){
    e.preventDefault();
    e.stopPropagation();
  }

  if(e.key === "Escape"){
    if(forceSwitch) return;
    closeSwitchModal();
    return;
  }

  if(e.key === "ArrowUp"){
    switchSelected = (switchSelected + switchOptions.length - 1) % switchOptions.length;
    renderSwitchList();
    return;
  }

  if(e.key === "ArrowDown"){
    switchSelected = (switchSelected + 1) % switchOptions.length;
    renderSwitchList();
    return;
  }

  if(e.key === "Enter"){
    confirmSwitch();
    return;
  }
}, true); 

function playBattleBgm(){
  if(!battleBgm) return;
  battleBgm.volume = 0.45;      
  battleBgm.currentTime = 0;
  battleBgm.play().catch(()=>{});
}

function stopBattleBgm(){
  if(!battleBgm) return;
  battleBgm.pause();
  battleBgm.currentTime = 0;
}

async function sendNextEnemy(){
  // marca KO al actual
  enemyTeam[enemyIndex].hp = 0;
  enemyTeam[enemyIndex].fainted = true;

  // busca el siguiente con vida
  const next = enemyTeam.findIndex((p, idx) => idx > enemyIndex && p.hp > 0);
  if (next === -1){
    // si no hay adelante, busca cualquiera con vida (por si KO fuera de orden)
    const any = enemyTeam.findIndex(p => p.hp > 0);
    if (any === -1) return false; // ya no hay enemigos => victoria
    enemyIndex = any;
  } else {
    enemyIndex = next;
  }

  enemyActive = enemyTeam[enemyIndex];

  // pintar HUD + sprite
  enemyNameEl.innerHTML = `
  ${enemyActive.name}
  <img class="gender-icon" src="${genderIconSrc(enemyActive.gender)}" alt="${genderAlt(enemyActive.gender)}">
`;
  enemyLvlEl.textContent = `Lv ${enemyActive.level}`;
  setHp(enemyHpFill, enemyHpText, enemyActive.hp, enemyActive.maxHp);

  enemySpriteEl.src = getFrontSprite(enemyActive);
  enemySpriteEl.classList.add("show");

  return true;
}

function syncActiveToTeam(){
 const t = team.find(x => x.id === playerActive.id);
  if (t) t.hp = 0; 

  // del activo al team (persistencia)
  t.hp = playerActive.hp;
  t.maxHp = playerActive.maxHp;
  t.nickname = playerActive.name; 

  loadTeam?.();
}

async function computeEffectiveness(moveType, defender){
  const typeData = await fetchType(moveType);
  const rel = typeData.damage_relations || {};

  const doubleTo = (rel.double_damage_to || []).map(x => x.name);
  const halfTo   = (rel.half_damage_to || []).map(x => x.name);
  const noTo     = (rel.no_damage_to || []).map(x => x.name);

  const defTypes = getTypeNamesFromPokemon(defender);

  let mult = 1;
  for(const dt of defTypes){
    if(noTo.includes(dt)) mult *= 0;
    else if(doubleTo.includes(dt)) mult *= 2;
    else if(halfTo.includes(dt)) mult *= 0.5;
  }
  return mult;
}

function isSTAB(moveType, attacker){
  const atkTypes = getTypeNamesFromPokemon(attacker);
  return atkTypes.includes(moveType);
}

async function loadEnemyTeam(){
  const team = [];

  for (const id of RIVAL_TEAM_IDS){
    const data = await fetchPokemon(id);

    team.push({
      id: data.id,
      name: cap(data.name),
      gender: "M",
      level: 50,
      sprites: data.sprites,
      maxHp: calcHP(data.stats),
      hp: calcHP(data.stats),
      fainted: false
    });
  }

  return team;
}
function rand(min, max){ return Math.random() * (max - min) + min; }

function effectivenessText(mult){
  if(mult === 0) return "No afecta...";
  if(mult >= 2) return "¡Es súper efectivo!";
  if(mult <= 0.5) return "No es muy efectivo...";
  return "";
}

async function calcDamage(attacker, defender, moveData){
  const power = moveData.power;

  // regla #2: status NO hace daño
  if(power == null || moveData.damage_class?.name === "status"){
    return { dmg: 0, eff: 1, status: true };
  }

  const moveType = moveData.type?.name || "normal";
  const dmgClass = moveData.damage_class?.name || "physical";

  const atkStatName = (dmgClass === "special") ? "special-attack" : "attack";
  const defStatName = (dmgClass === "special") ? "special-defense" : "defense";

  const atk = getStat(attacker.stats, atkStatName, 60);
  const def = getStat(defender.stats, defStatName, 60);

  const stab = isSTAB(moveType, attacker) ? 1.2 : 1;
  const eff  = await computeEffectiveness(moveType, defender);

  const base = (power * (atk / Math.max(1, def)));
  const variance = rand(0.85, 1.0);

  let dmg = Math.round(base * variance * stab * eff);
  if(eff > 0) dmg = Math.max(1, dmg);
  else dmg = 0;

  return { dmg, eff, status:false, moveType, stab: stab>1 };
}

function effectivenessText(mult){
  if(mult === 0) return "No afecta...";
  if(mult >= 2) return "¡Es súper efectivo!";
  if(mult <= 0.5) return "No es muy efectivo...";
  return "";
}

async function handleVictory(){
  stopBattleBgm();
  // bloquear todo
  turnLock = true;
  forceSwitch = false;
  mustSwitchPlayer = false;

  // cerrar modal de cambio si estuviera abierto
  if(switchModal && !switchModal.classList.contains("hidden")){
    switchModal.classList.add("hidden");
  }

  document.body.classList.add("modal-open");

  // mostrar banner
  victoryBanner.classList.remove("hidden");

  // reproducir sonido
  if(victoryAudio){
    victoryAudio.currentTime = 0;
    victoryAudio.play().catch(()=>{});
  }

  // texto de combate
  if(dialogText){
    dialogText.textContent = "¡Has ganado el combate!";
  }

  // duración del banner
  await sleep(2800);

  // ocultar banner
  victoryBanner.classList.add("hidden");

  // abrir modal final (reutilizamos el de derrota pero con texto de victoria)
  openVictoryModal();
}
function openVictoryModal(){
  gameOverOpen = true;
  gameOverIndex = 0;

  // cambiar textos
  document.getElementById("gameOverTitle").textContent = "VICTORIA";
  document.getElementById("gameOverText").textContent =
    "Has derrotado a todos los Pokémon del rival.";

  gameOverModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  renderGameOverMenu();
  document.activeElement?.blur();
}

async function animateHit(targetEl){
  if(!targetEl) return;
  targetEl.classList.add("hit");
  await sleep(260);
  targetEl.classList.remove("hit");
}

async function playerUseMove(moveName){
  if(turnLock) return;
  if(!playerActive || !enemyActive) return;

  turnLock = true;

  // cerrar UI
  showMenu(); // vuelve al menú normal visualmente 
  dialogText.textContent = `¡${playerActive.name} usó ${prettyMove(moveName)}!`;

  const moveData = await fetchMove(moveName);
  const result = await calcDamage(playerActive, enemyActive, moveData);

  await sleep(250);
  await animateHit(enemySpriteEl);

  if(result.status || result.dmg === 0){
    const msg = result.status ? "Pero no pasó nada..." : "No afecta...";
    await sleep(250);
    dialogText.textContent = msg;
  }else{
    enemyActive.hp = Math.max(0, enemyActive.hp - result.dmg);
    setHp(enemyHpFill, enemyHpText, enemyActive.hp, enemyActive.maxHp);

    const effMsg = effectivenessText(result.eff);
    if(effMsg){
      await sleep(350);
      dialogText.textContent = effMsg;
    }
  }

  // siguiente paso: KO enemigo y cambio
  if (enemyActive.hp <= 0){
  await sleep(450);
  dialogText.textContent = `¡${enemyActive.name} se debilitó!`;
  await sleep(900);

const ok = await sendNextEnemy();
if (!ok){
  await handleVictory(); // banner + sonido + modal
  return;
}

  dialogText.textContent = `¡El rival envió a ${enemyActive.name}!`;
  await sleep(900);

  turnLock = false;
  showMenu();
  return;
}

  // Turno enemigo
  await sleep(650);
  await enemyTurn();

  // siguiente paso: KO jugador y forzar cambio

  turnLock = false;
  showMenu();
}

function openPokemonForced(){
  mustSwitchPlayer = true;
  dialog.classList.add("only-moves"); 

  // filtra vivos (hp>0) y NO el que ya está KO (playerActive)
  const alive = team.filter(p => (p.hp ?? 1) > 0 && p.id !== playerActive.id);

  if (!alive.length){
    dialogText.textContent = "¡Has perdido el combate!";
    showMenu();
    return;
  }

  const rows = alive.map(p => `
    <div class="sub-row">
      <div>
        <strong>${p.nickname || p.name}</strong>
        <small> (#${String(p.id).padStart(3,"0")})</small>
      </div>
      <button class="small-action" data-pick="${p.id}">Elegir</button>
    </div>
  `).join("");

  showSubPanel(`
    <div style="font-weight:900; margin-bottom:10px; opacity:.9;">
      Elige un Pokémon
    </div>
    <div>${rows}</div>
  `);

  subPanel.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (switchingLock) return;
      switchingLock = true;

      const id = Number(btn.dataset.pick);
      await setActivePokemonById(id);

      dialogText.textContent = `¡Adelante, ${playerActive.name}!`;

      mustSwitchPlayer = false;
      switchingLock = false;
      turnLock = false; // desbloquea el juego
      showMenu();
    });
  });
}

function pickEnemyMoveNames(enemy){
  const moves = enemy?.moves || [];
  // tomar 4 de los primeros que tengan power 
  return moves.slice(0, 12).map(m => m.move.name);
}

async function enemyChooseMove(){
  const candidates = pickEnemyMoveNames(enemyActive);

  const checks = await Promise.all(candidates.map(async n => {
    const md = await fetchMove(n);
    const ok = md.power != null && md.damage_class?.name !== "status";
    return ok ? n : null;
  }));

  const usable = checks.filter(Boolean);
  if(usable.length) return usable[Math.floor(Math.random() * usable.length)];

  return candidates[0] || "tackle";
}

async function enemyTurn(){
  const moveName = await enemyChooseMove();
  dialogText.textContent = `¡${enemyActive.name} usó ${prettyMove(moveName)}!`;

  const moveData = await fetchMove(moveName);
  const result = await calcDamage(enemyActive, playerActive, moveData);

  await sleep(250);
  await animateHit(playerSpriteEl);

  if(result.status || result.dmg === 0){
    const msg = result.status ? "Pero no pasó nada..." : "No afecta...";
    await sleep(250);
    dialogText.textContent = msg;
  }else{
    playerActive.hp = Math.max(0, playerActive.hp - result.dmg);
    setHp(playerHpFill, playerHpText, playerActive.hp, playerActive.maxHp);
    syncActiveToTeam();

    const effMsg = effectivenessText(result.eff);
    if(effMsg){
      await sleep(350);
      dialogText.textContent = effMsg;
    }
  }
  
if(playerActive.hp <= 0){
  await sleep(450);
  dialogText.textContent = `¡${playerActive.name} se debilitó!`;
  await sleep(800);

  // marca KO en team
  // importante: dejar hp=0 persistente
  playerActive.hp = 0;
  syncActiveToTeam();
  loadTeam();

  // 1) si ya no queda nadie vivo -> derrota (NO abrir switch)
  const anyAlive = team.some(p => (p.hp ?? 0) > 0);
  if(!anyAlive){
    // cierra por si acaso el switch modal estaba abierto
    switchModal?.classList.add("hidden");
    document.body.classList.remove("modal-open");

    openGameOverModal();
    return;
  }

  // 2) si sí quedan vivos -> forzar cambio
  turnLock = true;
  mustSwitchPlayer = true;
  await openSwitchModal({ forced: true });
  return;
}
}

function markPlayerKO(){
  const idx = team.findIndex(p => p.id === playerActive.id);
  if(idx !== -1){
    team[idx].hp = 0;
  }
}

async function setupBattle(){
  team.forEach(p => {
  if (p.hp == null) p.hp = 1; // “vivo” hasta calcular el real
});
await hydrateTeamHP();
  if(!team.length){
    if(dialogText) dialogText.textContent = "No hay equipo guardado. Regresa y agrega Pokémon.";
    return;
  }

  // Player: primer pokemon del equipo (usamos PokeAPI para el back sprite real)
  const first = team[0];
  const fullPlayer = await fetchPokemon(first.id);
if (first.maxHp == null) first.maxHp = calcHP(fullPlayer.stats);
if (first.hp == null || first.hp === 1) first.hp = first.maxHp;
playerActive = {
    id: first.id,
    name: first.nickname || first.name,
    gender: first.gender || "M",
    level: 50,
    sprites: fullPlayer.sprites,
    stats: fullPlayer.stats,
    types: fullPlayer.types,
    moves: fullPlayer.moves,
    maxHp: first.maxHp,
    hp: first.hp,
    isShiny: !!first.isShiny,
    fullData: fullPlayer
  };

  // Enemy team
  enemyTeam = await loadEnemyTeam();
enemyIndex = 0;
enemyActive = enemyTeam[enemyIndex];

  // HUD texts
  enemyNameEl.innerHTML = `
  ${enemyActive.name}
  <img class="gender-icon" src="${genderIconSrc(enemyActive.gender)}" alt="${genderAlt(enemyActive.gender)}">
`;
  enemyLvlEl.textContent = `Lv ${enemyActive.level}`;
  setHp(enemyHpFill, enemyHpText, enemyActive.hp, enemyActive.maxHp);

  playerNameEl.innerHTML = `
  ${playerActive.name}
  <img class="gender-icon" src="${genderIconSrc(playerActive.gender)}" alt="${genderAlt(playerActive.gender)}">
`;
  playerLvlEl.textContent = `Lv ${playerActive.level}`;
  setHp(playerHpFill, playerHpText, playerActive.hp, playerActive.maxHp);

  // Sprites
  enemySpriteEl.src = getFrontSprite(enemyActive);
  playerSpriteEl.src = getBackSprite(playerActive);

  enemySpriteEl.classList.add("show");
  playerSpriteEl.classList.add("show");
  enemyHud.classList.add("show");
  playerHud.classList.add("show");

  if(dialogText){
    dialogText.textContent = `¡El rival envió a ${enemyActive.name}! ¡Adelante, ${playerActive.name}!`;
  }
  showMenu();
  syncActiveToTeam();
  playBattleBgm();
}

async function resetEnemyTeam(){
  enemyActive = null;
  enemyTeam = [];
  enemyIndex = 0;

  enemyTeam = await loadEnemyTeam();
  enemyIndex = 0;
  enemyActive = enemyTeam[enemyIndex];
}

async function startBattleFromScratch(){
  // desbloqueos / flags
  turnLock = true;
  switchingLock = false;
  forceSwitch = false;
  mustSwitchPlayer = false;

  // cerrar modales
  switchModal?.classList.add("hidden");
  document.body.classList.remove("modal-open");

  // 1) asegurar hp/maxHp en team
  await hydrateTeamHP();

  // 2) resetear HP del jugador a full
  team.forEach(p => {
    if (p.maxHp != null) p.hp = p.maxHp;
    p.fainted = false; 
  });
  loadTeam();

  // 3) reset rival
  await resetEnemyTeam();

  // 4) set playerActive desde team[0] SIN resetear a calcHP
  const first = team[0];
  const fullPlayer = await fetchPokemon(first.id);

  if (first.maxHp == null) first.maxHp = calcHP(fullPlayer.stats);
  if (first.hp == null || first.hp === 1) first.hp = first.maxHp;

  playerActive = {
    id: first.id,
    name: first.nickname || first.name,
    level: 50,
    sprites: fullPlayer.sprites,
    stats: fullPlayer.stats,
    types: fullPlayer.types,
    moves: fullPlayer.moves,
    maxHp: first.maxHp,
    hp: first.hp,
    isShiny: !!first.isShiny,
    fullData: fullPlayer
  };

  // 5) pintar HUD + sprites
  enemyNameEl.textContent = enemyActive.name;
  enemyLvlEl.textContent = `Lv ${enemyActive.level}`;
  setHp(enemyHpFill, enemyHpText, enemyActive.hp, enemyActive.maxHp);

  playerNameEl.textContent = playerActive.name;
  playerLvlEl.textContent = `Lv ${playerActive.level}`;
  setHp(playerHpFill, playerHpText, playerActive.hp, playerActive.maxHp);

  enemySpriteEl.src = getFrontSprite(enemyActive);
  playerSpriteEl.src = getBackSprite(playerActive);

  enemySpriteEl.classList.add("show");
  playerSpriteEl.classList.add("show");
  enemyHud.classList.add("show");
  playerHud.classList.add("show");

  if(dialogText){
    dialogText.textContent = `¡El rival envió a ${enemyActive.name}! ¡Adelante, ${playerActive.name}!`;
  }

  syncActiveToTeam();
  showMenu();
  playBattleBgm();

  // listo
  turnLock = false;
}

// ===== UI helpers =====
function showMenu(){
  dialog.classList.remove("only-moves");
  actionMenu.classList.remove("hidden");
  subPanel.classList.add("hidden");
  subPanel.innerHTML = "";
  if (dialogHint) dialogHint.textContent = "Enter / Click";
}

function showSubPanel(html){
  actionMenu.classList.add("hidden");
  subPanel.classList.remove("hidden");
  subPanel.innerHTML = html;
  if (dialogHint) dialogHint.textContent = "Esc / Atrás";
}

function prettyMove(name){ 
  return cap(String(name).replaceAll("-", " ")); 
}

// ===== Moves (Juega) =====
function getActiveMoves(){
  // playerActiveFullData lo guardaremos en setupBattle 
  const data = playerActive?.fullData;
  const moves = data?.moves || [];
  const first4 = moves.slice(0, 4).map(m => m.move.name);
  return first4.length ? first4 : ["tackle"]; // fallback
}

async function openMoves(){
  dialog.classList.add("only-moves");

  const moves = getActiveMoves(); // 4 moves
  // Cargar tipos en paralelo
  const typed = await Promise.all(
    moves.map(async (m) => {
      const type = await getMoveType(m);
      const typeEs = TYPE_ES[type] || cap(type);
      return { name: m, type, typeEs };
    })
  );

  let selectedIndex = 0;

  function render(){
    const left = typed.map((m, i) => `
      <div class="move-row ${i===selectedIndex ? "active":""}" data-i="${i}">
        <div class="move-caret">▶</div>
        <div class="move-name">${prettyMove(m.name)}</div>
      </div>
    `).join("");

    const current = typed[selectedIndex];

    showSubPanel(`
      <div class="moves-ui">
        <div class="moves-left">
          <div class="moves-list">${left}</div>
        </div>

        <div class="moves-right">
          <div class="label">TIPO/${(current.typeEs || "Normal").toUpperCase()}</div>
          <div class="moves-type">${(current.typeEs || "Normal").toUpperCase()}</div>
        </div>
      </div>
    `);

    // clicks: seleccionar o usar
    subPanel.querySelectorAll(".move-row").forEach(row => {
  row.addEventListener("click", async () => {
    const i = Number(row.dataset.i);

    if (i === selectedIndex){
      if (turnLock) return;
      const move = typed[selectedIndex].name;
      await playerUseMove(move);
      return;
    }

    selectedIndex = i;
    render();
  });
});
  }

  render();

  // teclado: arriba/abajo/enter/esc
  function onKey(e){
    if (subPanel.classList.contains("hidden")) return;

    if (e.key === "Escape"){
      showMenu();
      window.removeEventListener("keydown", onKey);
      return;
    }

    if (e.key === "ArrowUp"){
      selectedIndex = (selectedIndex + typed.length - 1) % typed.length;
      render();
    } else if (e.key === "ArrowDown"){
      selectedIndex = (selectedIndex + 1) % typed.length;
      render();
    } else if (e.key === "Enter"){
      const move = typed[selectedIndex].name;
      (async () => {
      await playerUseMove(move);
      window.removeEventListener("keydown", onKey);
    })();
    }
  }

  window.addEventListener("keydown", onKey, { passive: true });
}

switchClose?.addEventListener("click", closeSwitchModal);

// click fuera (backdrop) para cerrar solo si no es forzado
switchModal?.addEventListener("click", (e) => {
  if(e.target.classList.contains("modal-backdrop")) closeSwitchModal();
});

// ESC para cerrar solo si no es forzado
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !switchModal.classList.contains("hidden")){
    closeSwitchModal();
  }
});

// ===== Items (Objetos) =====
function openItems(){
  dialogText.textContent = "Objetos aún no disponible (próximamente).";
  showMenu();
}

// ===== Pokemon (cambiar) =====
async function setActivePokemonById(id){
  const picked = team.find(p => p.id === id);
  if(!picked) return;

  picked.fullData ??= await fetchPokemon(picked.id);
  const full = picked.fullData;

  if (picked.maxHp == null) picked.maxHp = calcHP(full.stats);
  if (picked.hp == null) picked.hp = picked.maxHp;

  playerActive = {
    id: picked.id,
    name: picked.nickname || picked.name,
    gender: picked.gender || "M",
    level: 50,
    sprites: full.sprites,
    maxHp: picked.maxHp,
    hp: picked.hp,
    isShiny: !!picked.isShiny,
    fullData: full
  };

  playerNameEl.innerHTML = `
  ${playerActive.name}
  <img class="gender-icon" src="${genderIconSrc(playerActive.gender)}" alt="${genderAlt(playerActive.gender)}">
`;
  playerLvlEl.textContent = `Lv ${playerActive.level}`;
  setHp(playerHpFill, playerHpText, playerActive.hp, playerActive.maxHp);

  playerSpriteEl.src = getBackSprite(playerActive);
  playerSpriteEl.classList.add("show");

  syncActiveToTeam();
  loadTeam();
}


function openPokemon(){
    dialog.classList.add("only-moves");
  const rows = team.map(p => `
    <div class="sub-row">
      <div>
        <strong>${p.nickname || p.name}</strong>
        <small> (#${String(p.id).padStart(3,"0")})</small>
      </div>
      <button class="small-action" data-pick="${p.id}">Cambiar</button>
    </div>
  `).join("");

  showSubPanel(`
    <div>${rows || "<div style='opacity:.8'>No hay equipo.</div>"}</div>
    <button class="cancel-action" data-back="1">Volver</button>
  `);

  subPanel.querySelectorAll("[data-pick]").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (turnLock) return;            

    const id = Number(btn.dataset.pick);

    turnLock = true;                 
    try{
      await setActivePokemonById(id);

      dialogText.textContent = `¡Adelante, ${playerActive.name}!`;
      showMenu();

      await sleep(500);               // pequeño timing “juego”
      await enemyTurn();              // enemigo ataca porque tu cambio consumió turno

    }finally{
      turnLock = false;               // DESBLOQUEA al final sí o sí
      showMenu();
    }
  });
});

  subPanel.querySelector("[data-back]")?.addEventListener("click", showMenu);
}

// ===== Run (Huir) =====
function openRun(){
  dialogText.textContent = "No puedes huir.";
  showMenu();
}

actionMenu?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  if (turnLock || mustSwitchPlayer) return;
  const act = btn.dataset.action;

  if(act === "fight") return openMoves();
  if(act === "items") return openItems();
  if(act === "pokemon"){
  if(turnLock) return;
  openSwitchModal({ forced: false }); // modal normal (consume turno)
  return;
}
  if(act === "run") return openRun();
});

// Esc para volver desde subpanel
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){  
    if(!subPanel.classList.contains("hidden")) showMenu();
  }
});

// =========================
// Intro animation (3s audio feel)
// =========================
async function playIntro(){
  intro.classList.add("open");
  intro.classList.add("play");

  // reset VS
  if (vs) {
    vs.classList.remove("hide");
    vs.style.opacity = "";
  }
  intro.classList.remove("fadeout");

  // whoosh + shake
  await sleep(120);
  playWhoosh();
  intro.classList.add("shake");
  setTimeout(() => intro.classList.remove("shake"), 350);

  // Para lograr 3s TOTAL incluyendo flash+negro:
  // 3000 - (220 flash) - (1000 negro) - (120 hide delay) = 1660 aprox
  await sleep(1660);

  // hide VS y flash
  if (vs) vs.classList.add("hide");
  await sleep(120);

  flash.classList.add("on");
  await sleep(220);
  flash.classList.remove("on");

  black.classList.add("on");
  await sleep(1000);

  // reveal
  intro.classList.remove("open");
  intro.classList.remove("play");
  black.classList.remove("on");

  battleScene.classList.remove("hidden");
  await setupBattle();
}

// =========================
// Navigation
// =========================
if (backBtn){
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// =========================
// Run
// =========================
playIntro();
