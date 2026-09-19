import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  createElement,
  Database,
  Dices,
  Download,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Keyboard,
  Layers,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide";
import {
  advance,
  applyHP,
  clamp,
  type Combatant,
  createCombatant,
  emptyEncounter,
  type Encounter,
  id,
  importOriginal,
  num,
  ordered,
  removeCombatant,
  roll,
  type Spell,
  type StatBlock,
  type State,
  validateState,
} from "./model";
import { catalogue, get, put, saveState } from "./storage";
import "./style.css";
const icons: Record<string, any> = {
  Swords,
  BookOpen,
  Users,
  Layers,
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Dices,
  Shield,
  Heart,
  X,
  Download,
  Upload,
  Settings2,
  Eye,
  EyeOff,
  Check,
  MoreHorizontal,
  Trash2,
  Copy,
  Sparkles,
  ScrollText,
  ChevronDown,
  CircleHelp,
  Save,
  Keyboard,
  WifiOff,
  Database,
  ArrowUpRight,
  Flag,
  CheckCheck,
  Zap,
  Pencil,
};
const icon = (name: string, size = 18) =>
  createElement([
    "svg",
    {
      ...(icons[name] || Sparkles)[1],
      width: size,
      height: size,
      "stroke-width": 1.7,
      "aria-hidden": "true",
    },
    (icons[name] || Sparkles)[2],
  ]).outerHTML;
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const btn = (action: string, label: string, i?: string, cls = "", attrs = "") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${i ? icon(i) : ""}${label}</button>`;
const app = document.querySelector<HTMLDivElement>("#app")!,
  modal = document.querySelector<HTMLDialogElement>("#modal")!,
  command = document.querySelector<HTMLDialogElement>("#command")!;
type ThemePreference = "system" | "light" | "dark";
const themeStorageKey = "roundkeep-theme";
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(themeStorageKey) ?? localStorage.getItem("patron-theme");
    return value === "light" || value === "dark" ? value : "dark";
  } catch {
    // Dark is the safe visual default; System remains available as an explicit choice.
    return "dark";
  }
}
let themePreference: ThemePreference = readThemePreference();
function applyTheme() {
  const dark = themePreference === "dark" || (themePreference === "system" && themeMedia.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#000000" : "#f5f5f5");
}
function setThemePreference(value: ThemePreference) {
  themePreference = value;
  try {
    if (value === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, value);
  } catch {}
  applyTheme();
}
applyTheme();
themeMedia.addEventListener("change", () => {
  if (themePreference === "system") applyTheme();
});
let state: State,
  base: StatBlock[] = [],
  baseSpells: Spell[] = [],
  selected = "",
  tab = "creatures",
  query = "",
  source = "all",
  view = "combat",
  history: Encounter[] = [],
  preview: StatBlock | Spell | null = null,
  editingStat: StatBlock | undefined,
  saveError = false,
  pendingSaves = 0,
  saveQueue = Promise.resolve(),
  toastTimer: ReturnType<typeof setTimeout>,
  ready = false;
const playerMode = new URLSearchParams(location.search).has("player");
const channel = new BroadcastChannel("roundkeep-player");
function toast(message: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4000);
}
function projection() {
  return {
    name: state.encounter.name,
    round: state.encounter.round,
    activeId: state.encounter.activeId,
    combatants: ordered(state.encounter)
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        name: c.name,
        side: c.side,
        initiative: c.initiative,
        conditions: c.conditions,
        health: c.hp === 0 ? "Caído" : c.hp <= c.maxHp / 2 ? "Ferido" : "Saudável",
      })),
  };
}
function broadcast() {
  channel.postMessage({ type: "state", data: projection() });
}
function persist() {
  state.updatedAt = new Date().toISOString();
  const snapshot = structuredClone(state);
  pendingSaves++;
  saveQueue = saveQueue
    .then(() => saveState(snapshot))
    .then(() => {
      saveError = false;
      updateSaveStatus();
    })
    .catch(() => {
      saveError = true;
      updateSaveStatus();
      toast("Não foi possível salvar. Exporte um backup para proteger suas alterações.");
    })
    .finally(() => {
      pendingSaves--;
      updateSaveStatus();
    });
  broadcast();
}
function updateSaveStatus() {
  const el = document.querySelector("#save-status");
  if (el)
    el.innerHTML =
      icon(saveError ? "WifiOff" : "CheckCheck", 14) +
      (saveError ? "Falha ao salvar" : pendingSaves ? "Salvando…" : "Salvo neste navegador");
}
function change(fn: () => void, message?: string) {
  history.push(structuredClone(state.encounter));
  if (history.length > 60) history.shift();
  fn();
  if (message) {
    state.encounter.log.unshift(message);
    state.encounter.log = state.encounter.log.slice(0, 100);
  }
  persist();
  render();
}
function selectedC() {
  return state.encounter.combatants.find((c) => c.id === selected);
}
function allCreatures() {
  return [...state.library, ...base];
}
function allSpells() {
  return [...state.spells, ...baseSpells];
}
function openModal(title: string, body: string, wide = false) {
  modal.innerHTML = `<div class="modal-head"><div><h2>${title}</h2></div>${btn("close", "", "X", "icon-button", 'aria-label="Fechar"')}</div>${body}`;
  modal.classList.toggle("wide", wide);
  modal.showModal();
  enhanceSelects(modal);
}
function closeModal() {
  modal.close();
}
function closeCommand() {
  command.close();
  command.innerHTML = "";
}
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function enhanceSelects(root: ParentNode) {
  root.querySelectorAll<HTMLSelectElement>("select:not([data-enhanced])").forEach((select) => {
    select.dataset.enhanced = "true";
    const wrap = document.createElement("div");
    wrap.className = "select";
    select.parentNode?.insertBefore(wrap, select);
    wrap.appendChild(select);
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (select.getAttribute("aria-label")) trigger.setAttribute("aria-label", select.getAttribute("aria-label")!);
    const menu = document.createElement("div");
    menu.className = "select-menu";
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    const sync = () => {
      trigger.innerHTML = `<span>${esc(select.selectedOptions[0]?.text || select.value)}</span>${icon("ChevronDown", 14)}`;
      menu.innerHTML = [...select.options]
        .map(
          (option) =>
            `<button type="button" class="select-option" role="option" data-value="${esc(option.value)}" aria-selected="${option.selected}">${esc(option.text)} ${option.selected ? icon("Check", 14) : ""}</button>`,
        )
        .join("");
    };
    const close = () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      document.querySelectorAll(".select-menu").forEach((el) => {
        (el as HTMLElement).hidden = true;
        el.previousElementSibling?.setAttribute("aria-expanded", "false");
      });
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    };
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.hidden) open();
      else close();
    });
    menu.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLElement>("[data-value]");
      if (!option) return;
      event.preventDefault();
      select.value = option.dataset.value!;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
      close();
    });
    sync();
    wrap.append(trigger, menu);
  });
}
function commandActions() {
  const e = state.encounter;
  const started = e.started;
  return [
    {
      action: "next",
      label: started ? "Próximo turno" : "Iniciar combate",
      hint: started ? "Avançar a ordem" : "Começar a rodada",
      icon: started ? "ChevronRight" : "Play",
      kbd: "N",
    },
    {
      action: "roll-initiative",
      label: "Rolar iniciativas",
      hint: "1d20 + modificador",
      icon: "Dices",
    },
    {
      action: "dice",
      label: "Rolar dados",
      hint: "Expressão livre",
      icon: "Dices",
      kbd: "D",
    },
    {
      action: "undo",
      label: "Desfazer última ação",
      hint: "Reverter o último passo",
      icon: "RotateCcw",
      kbd: "⌘Z",
    },
    {
      action: "save",
      label: "Salvar encontro",
      hint: "Guardar na coleção",
      icon: "Save",
    },
    {
      action: "new",
      label: "Novo encontro",
      hint: "Abrir uma mesa nova",
      icon: "Plus",
    },
    {
      action: "add-party",
      label: "Adicionar grupo",
      hint: "Heróis da biblioteca",
      icon: "Users",
    },
    {
      action: "create",
      label: "Criar ficha",
      hint: "Combatente ou magia",
      icon: "Plus",
    },
    {
      action: "notes",
      label: "Notas do mestre",
      hint: "Anotações do encontro",
      icon: "ScrollText",
    },
    {
      action: view === "saved" ? "view-combat" : "view-saved",
      label: view === "saved" ? "Voltar à mesa" : "Encontros salvos",
      hint: view === "saved" ? "Combate atual" : "Abrir a coleção",
      icon: view === "saved" ? "Swords" : "Layers",
    },
    {
      action: "player",
      label: "Visão dos jogadores",
      hint: "Janela local da mesa",
      icon: "Eye",
    },
    {
      action: "settings",
      label: "Dados e configurações",
      hint: "Backup e aparência",
      icon: "Settings2",
    },
    {
      action: "help",
      label: "Ajuda e atalhos",
      hint: "Teclado da mesa",
      icon: "CircleHelp",
    },
  ];
}
function renderCommandList(q = "") {
  const needle = fold(q);
  const actions = commandActions().filter((item) => !needle || fold(item.label + " " + item.hint).includes(needle));
  const records = needle
    ? [...allCreatures(), ...allSpells()]
        .filter((item) => fold(item.Name + " " + (item.Type || "") + " " + (item.Path || "")).includes(needle))
        .slice(0, 8)
    : [];
  const actionRows = actions
    .map(
      (item, i) =>
        `<button type="button" class="command-item ${i === 0 ? "active" : ""}" data-action="run-command" data-run="${esc(item.action)}" data-index="${i}">${icon(item.icon, 16)}<span>${esc(item.label)}</span>${item.kbd ? `<kbd>${esc(item.kbd)}</kbd>` : `<small>${esc(item.hint)}</small>`}</button>`,
    )
    .join("");
  const recordRows = records
    .map((item, i) => {
      const index = actions.length + i;
      const spell = "Level" in item;
      return `<button type="button" class="command-item ${index === 0 ? "active" : ""}" data-action="run-command" data-run="${spell ? "command-preview" : "command-add"}" data-id="${esc(item.Id)}" data-index="${index}">${icon(spell ? "Sparkles" : item.Player ? "Shield" : "Swords", 16)}<span>${esc(item.Name)}</span><small>${spell ? `Magia · nível ${num(item.Level)}` : "Adicionar ao encontro"}</small></button>`;
    })
    .join("");
  return `${actionRows ? `<div class="command-group">Ações</div>${actionRows}` : ""}${
    recordRows ? `<div class="command-group">Biblioteca</div>${recordRows}` : ""
  }${!actionRows && !recordRows ? `<p class="command-empty">Nenhuma ação ou ficha encontrada.</p>` : ""}`;
}
function openCommand(seed = "") {
  command.innerHTML = `<label class="command-search">${icon("Search", 16)}<input id="command-input" type="search" value="${esc(seed)}" placeholder="Buscar fichas ou executar uma ação…" aria-label="Buscar ou executar uma ação" autocomplete="off"><kbd>esc</kbd></label><div id="command-list" class="command-list" role="listbox">${renderCommandList(seed)}</div>`;
  if (!command.open) command.showModal();
  const input = command.querySelector<HTMLInputElement>("#command-input");
  input?.focus();
  input?.select();
}
function moveCommand(delta: number) {
  const items = [...command.querySelectorAll<HTMLElement>(".command-item")];
  if (!items.length) return;
  const current = items.findIndex((el) => el.classList.contains("active"));
  const next = (Math.max(current, 0) + delta + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle("active", i === next));
  items[next].scrollIntoView({ block: "nearest" });
}
function avatar(c: Combatant | StatBlock, large = false) {
  const s = ("stat" in c ? c.stat : c) as StatBlock;
  const ally = "side" in c ? c.side === "ally" : !!s.Player;
  return `<span class="avatar ${ally ? "ally" : "enemy"} ${large ? "large" : ""}">${icon(ally ? "Shield" : "Swords", large ? 30 : 20)}</span>`;
}
function render() {
  if (playerMode) return;
  if (!state) return;
  const e = state.encounter,
    cs = ordered(e),
    current = cs.find((c) => c.id === e.activeId),
    allies = cs.filter((c) => c.side === "ally"),
    enemies = cs.filter((c) => c.side === "enemy");
  app.innerHTML = `<aside class="rail"><a class="brand-mark" href="/" aria-label="RoundKeep início" title="RoundKeep · Início"><svg viewBox="0 0 64 64" fill="none"><path d="M12 16 H22 V22 H28 V16 H36 V22 H42 V16 H52 V36 C52 47 32 56 32 56 C32 56 12 47 12 36 Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M32 26 L41 38 H36 V48 H28 V38 H23 Z" fill="var(--rail-bg)" stroke="var(--rail-bg)" stroke-width="1.5" stroke-linejoin="round"/></svg></a><div class="rail-nav">${btn("view-combat", "", "Swords", "rail-button " + (view === "combat" ? "active" : ""), 'aria-label="Mesa de combate" title="Mesa de combate"')}${btn("view-saved", "", "Layers", "rail-button " + (view === "saved" ? "active" : ""), 'aria-label="Encontros salvos" title="Encontros salvos"')}${btn("notes", "", "ScrollText", "rail-button", 'aria-label="Notas do encontro" title="Notas do encontro"')}</div><div class="rail-bottom">${btn("help", "", "CircleHelp", "rail-button", 'aria-label="Ajuda e atalhos"')}${btn("settings", "", "Settings2", "rail-button", 'aria-label="Dados e configurações"')}<span class="profile" title="Mestre da mesa">M</span></div></aside>
 <div class="workspace"><header class="topbar"><div class="topbar-context"><div class="wordmark">ROUNDKEEP</div><div class="breadcrumb">Sua mesa ${icon("ChevronRight", 13)} <strong>${view === "saved" ? "Encontros" : "Encontro atual"}</strong></div></div>${btn("open-command", "<span>Buscar ou ação rápida…</span><kbd>⌘ K</kbd>", "Search", "command-trigger", 'aria-label="Abrir busca e ações rápidas"')}<div class="top-actions"><span id="save-status" class="save-status"></span>${btn("player", "Visão dos jogadores", "Eye", "subtle")}${btn("settings", "", "Settings2", "icon-button", 'aria-label="Configurações"')}</div></header>
 <main><section class="page-heading"><div><h1>${view === "saved" ? "Seus encontros" : esc(e.name)} ${view === "combat" ? btn("rename", "", "Pencil", "title-edit", 'aria-label="Renomear encontro"') : ""}</h1></div><div class="heading-actions">${btn("save", "Salvar encontro", "Save", "secondary")}${btn("new", "Novo encontro", "Plus", "primary")}</div></section>
 ${
   view === "saved"
     ? renderSaved()
     : `<div class="combat-layout"><aside class="library panel"><div class="panel-title"><div><h2>Biblioteca</h2></div>${btn("create", "", "Plus", "icon-button", 'aria-label="Criar ficha"')}</div><div class="library-tabs">${[
         ["creatures", "Criaturas"],
         ["characters", "Heróis"],
         ["spells", "Magias"],
       ]
         .map(([key, label]) => btn("tab", label, undefined, tab === key ? "selected" : "", `data-tab="${key}"`))
         .join(
           "",
         )}</div><div class="library-search"><label class="searchbox">${icon("Search", 16)}<input id="search" type="search" value="${esc(query)}" placeholder="Buscar ${tab === "spells" ? "magias" : "na biblioteca"}…" aria-label="Buscar na biblioteca"><kbd>/</kbd></label><select id="source" aria-label="Filtrar origem"><option value="all" ${source === "all" ? "selected" : ""}>Todas as origens</option><option value="personal" ${source === "personal" ? "selected" : ""}>Minha biblioteca</option><option value="srd" ${source === "srd" ? "selected" : ""}>Regras básicas (SRD)</option></select></div><div id="library-list" class="library-list">${renderLibrary()}</div><div class="library-footer">${icon("Database", 13)} Catálogo disponível offline <span>${allCreatures().length}</span></div></aside>
 <section class="battle"><div class="battle-toolbar"><div class="round-icon">${icon("Swords", 18)}</div><div><h2>${e.started ? "Rodada " + String(e.round).padStart(2, "0") : "Ordem de iniciativa"}</h2></div><div class="battle-buttons">${e.started ? btn("end-combat", "", "Pause", "icon-button", 'aria-label="Encerrar combate" title="Encerrar combate"') : ""}${btn("roll-initiative", "", "Dices", "icon-button", 'aria-label="Rolar iniciativas" title="Rolar iniciativas"')}${btn("undo", "", "RotateCcw", "icon-button", `aria-label="Desfazer última ação" title="Desfazer" ${!history.length ? "disabled" : ""}`)}<span class="divider"></span>${btn("previous", "", "ChevronLeft", "icon-button", `aria-label="Turno anterior" ${!e.started ? "disabled" : ""}`)}${btn("next", e.started ? "Próximo turno" : "Iniciar combate", e.started ? "ChevronRight" : "Play", "primary", `${!cs.length ? "disabled" : ""} title="${e.started ? "Próximo turno (N)" : "Iniciar combate"}"`)}</div></div>
 <div class="battle-summary"><span><i class="dot ally-dot"></i>${allies.length} aliados</span><span><i class="dot enemy-dot"></i>${enemies.length} adversários</span><span class="summary-end">${icon("Users", 14)} ${cs.length} combatentes</span></div>
 ${cs.length ? `<div class="table-labels"><span>Ini</span><span>Combatente</span><span>PV</span><span>CA</span><span></span></div><div class="combatant-list">${cs.map((c) => renderCombatant(c, e.activeId === c.id)).join("")}</div><div class="add-combatant">${btn("create", "Adicionar combatente", "Plus", "text-button")}${btn("add-party", "Adicionar grupo", "Users", "text-button")}</div>` : `<div class="empty-combat"><h2>Nenhum combatente</h2><p>Use o botão + na biblioteca ou adicione seu grupo.</p><div>${btn("add-party", "Adicionar grupo", "Users", "primary")}${btn("demo", "Abrir exemplo", undefined, "subtle")}</div></div>`}
 <div class="battle-bottom"><div class="encounter-note"><span>${icon("ScrollText", 15)} Notas</span>${btn("notes", e.notes ? esc(e.notes.slice(0, 95)) : "Adicionar notas do encontro", undefined, "note-preview")}</div><div class="session-log"><div><h3>Atividade</h3>${btn("log", "Ver histórico", "ChevronRight", "text-button")}</div><p>${esc(e.log[0] || "Nenhuma ação registrada.")}</p></div></div>
 <footer class="battle-footer"><span>${icon("Keyboard", 14)} <kbd>N</kbd> próximo turno <kbd>/</kbd> buscar <kbd>D</kbd> dados</span>${btn("dice", "Rolar dados", "Dices", "text-button")}</footer></section><aside class="details panel">${renderDetails()}</aside></div>`
 }
 </main><footer class="app-footer"><span><i class="live-dot"></i> ${navigator.onLine ? "Armazenamento local" : "Offline · dados disponíveis"}</span><span>D&D 5e · SRD 2024</span></footer></div>`;
  updateSaveStatus();
  enhanceSelects(app);
}
function renderLibrary() {
  let items: (StatBlock | Spell)[] =
    tab === "spells" ? allSpells() : allCreatures().filter((s) => (tab === "characters" ? !!s.Player : !s.Player));
  if (source !== "all")
    items = items.filter((s) =>
      source === "personal"
        ? !s.Id.startsWith("creatures-") && !s.Id.startsWith("spells-")
        : s.Id.startsWith("creatures-") || s.Id.startsWith("spells-"),
    );
  const q = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  items = items.filter((s) =>
    (s.Name + " " + (s.Type || "") + " " + (s.Path || ""))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(q),
  );
  return `<div class="list-caption">${tab === "characters" ? "Seu grupo" : source === "personal" ? "Minha biblioteca" : "Fichas disponíveis"}<span>${items.length}</span></div>${
    items.length
      ? items
          .slice(0, 150)
          .map(
            (s) =>
              `<div class="library-item"><button class="library-preview" data-action="preview" data-id="${esc(s.Id)}"><span class="small-glyph ${s.Player ? "green" : ""}">${icon(tab === "spells" ? "Sparkles" : s.Player ? "Shield" : "Swords", 17)}</span><span><strong>${esc(s.Name)}</strong><small>${tab === "spells" ? `Nível ${num(s.Level)} · ${esc(s.School)}` : s.Player ? "Personagem do grupo" : esc(s.Path || (s.Id.startsWith("creatures-") ? "SRD 2024 · " : "") + "ND " + (s.Challenge || "—"))}</small></span></button>${tab !== "spells" ? btn("add", "", "Plus", "add-button", `data-id="${esc(s.Id)}" aria-label="Adicionar ${esc(s.Name)}"`) : ""}</div>`,
          )
          .join("")
      : `<div class="empty-library">${icon("Search", 26)}<p>Nenhum resultado.</p><small>Tente outro nome ou origem.</small></div>`
  }${items.length > 150 ? '<p class="list-hint">Refine a busca para ver os demais resultados.</p>' : ""}`;
}
function renderCombatant(c: Combatant, active: boolean) {
  return `<article class="combatant ${active ? "current" : ""} ${selected === c.id ? "selected" : ""} ${c.hp === 0 ? "fallen" : ""}"><div class="initiative"><input type="number" min="-99" max="999" value="${c.initiative}" data-field="initiative" data-id="${c.id}" aria-label="Iniciativa de ${esc(c.name)}"></div><button class="combatant-identity" data-action="select" data-id="${c.id}">${avatar(c)}<span><strong>${esc(c.name)} ${c.hidden ? icon("EyeOff", 12) : ""}</strong><small>${active ? '<span class="turn-label">Turno atual</span>' : c.side === "ally" ? "Aliado" : "Adversário"}${c.conditions.length ? " · " + esc(c.conditions.join(", ")) : ""}${c.hp === 0 ? " · Caído" : ""}</small></span></button><button class="hp-cell" data-action="hp" data-id="${c.id}" aria-label="Alterar vida de ${esc(c.name)}"><span><strong>${c.hp}</strong><small>/ ${c.maxHp}</small>${c.tempHp ? `<em>+${c.tempHp}</em>` : ""}</span><div class="hp-track"><i class="${c.hp / c.maxHp <= 0.25 ? "critical" : c.side}" style="width:${(c.hp / c.maxHp) * 100}%"></i></div></button><div class="armor">${icon("Shield", 14)}${c.ac}</div>${btn("combatant-menu", "", "MoreHorizontal", "icon-button", `data-id="${c.id}" aria-label="Opções de ${esc(c.name)}"`)}</article>`;
}
function renderDetails() {
  const c = selectedC();
  if (!c)
    return `<div class="panel-title"><div><h2>Ficha de combate</h2></div>${icon("BookOpen", 20)}</div><div class="detail-empty">${icon("BookOpen", 42)}<h3>Selecione um combatente</h3><p>Selecione um combatente para consultar sua ficha, ações e condições.</p></div>`;
  return `<div class="detail-header">${btn("back-to-combat", "Combate", "ChevronLeft", "back-to-combat text-button")}<h3>Ficha</h3>${btn("edit", "", "Pencil", "icon-button", `data-id="${c.id}" aria-label="Editar combatente"`)}</div><div class="detail-identity">${avatar(c, true)}<span class="badge ${c.side}">${c.side === "ally" ? "Aliado" : "Adversário"}</span><h2>${esc(c.name)}</h2><p>${esc(c.stat.Type || "Combatente personalizado")}</p></div><div class="stat-tiles"><div>${icon("Heart", 16)}<strong>${c.hp}<small>/${c.maxHp}</small></strong><span>Vida</span></div><div>${icon("Shield", 16)}<strong>${c.ac}</strong><span>Defesa</span></div><div>${icon("Zap", 16)}<strong>${num(c.stat.InitiativeModifier) >= 0 ? "+" : ""}${num(c.stat.InitiativeModifier)}</strong><span>Iniciativa</span></div></div><div class="detail-content"><div class="section-line"><h3>Condições</h3>${btn("conditions", "", "Plus", "tiny-button", 'aria-label="Adicionar condição"')}</div><div class="condition-tags">${c.conditions.length ? c.conditions.map((x) => btn("remove-condition", esc(x) + " ×", undefined, "condition-chip", `data-condition="${esc(x)}"`)).join("") : '<span class="muted">Nenhuma condição ativa</span>'}</div><div class="reaction-row"><span>Reação disponível</span><button class="toggle ${!c.reaction ? "on" : ""}" data-action="reaction" role="switch" aria-checked="${!c.reaction}" aria-label="Reação disponível"><i></i></button></div>${renderStat(c.stat)}<h3>Notas do combatente</h3><textarea id="combatant-notes" placeholder="Concentração, objetivos, lembretes…">${esc(c.notes)}</textarea></div>`;
}
function renderStat(s: StatBlock) {
  return `${s.Speed?.length ? `<p class="speed"><strong>Deslocamento</strong> ${esc(s.Speed.join(", "))}</p>` : ""}${
    s.Abilities
      ? `<div class="abilities">${Object.entries(s.Abilities)
          .map(
            ([k, v]) =>
              `<button data-action="ability" data-score="${num(v)}" data-ability="${esc(k)}"><span>${esc(({ Str: "FOR", Dex: "DES", Con: "CON", Int: "INT", Wis: "SAB", Cha: "CAR" } as Record<string, string>)[k] || k)}</span><strong>${num(v)}</strong><small>${Math.floor((num(v) - 10) / 2) >= 0 ? "+" : ""}${Math.floor((num(v) - 10) / 2)}</small></button>`,
          )
          .join("")}</div>`
      : ""
  }${["Saves", "Skills"].map((k, i) => (Array.isArray(s[k]) && (s[k] as any[]).length ? `<p class="stat-line"><b>${i ? "Perícias" : "Salvaguardas"}.</b> ${(s[k] as any[]).map((v) => esc(v.Name) + " " + (num(v.Modifier) >= 0 ? "+" : "") + num(v.Modifier)).join(", ")}</p>` : "")).join("")}${["DamageResistances", "DamageImmunities", "ConditionImmunities", "DamageVulnerabilities", "Senses", "Languages"].map((k, i) => (Array.isArray(s[k]) && (s[k] as string[]).length ? `<p class="stat-line"><b>${["Resistências", "Imunidades a dano", "Imunidades a condições", "Vulnerabilidades", "Sentidos", "Idiomas"][i]}.</b> ${esc((s[k] as string[]).join(", "))}</p>` : "")).join("")}${[
    ["Traits", "Características"],
    ["Actions", "Ações"],
    ["BonusActions", "Ações bônus"],
    ["Reactions", "Reações"],
    ["MythicActions", "Ações míticas"],
    ["LegendaryActions", "Ações lendárias"],
  ]
    .map(([key, label]) =>
      Array.isArray(s[key]) && (s[key] as any[]).length
        ? `<h3 class="feature-heading">${label}</h3>${(s[key] as any[]).map((f: any) => `<details class="feature" ${key === "Actions" ? "open" : ""}><summary>${esc(f.Name)}${icon("ChevronDown", 14)}</summary><p>${esc(f.Content)}</p></details>`).join("")}`
        : "",
    )
    .join("")}${s.Description ? `<h3>Descrição</h3><p class="stat-description">${esc(s.Description)}</p>` : ""}`;
}
function renderSaved() {
  return `<section class="saved-grid">${state.saved.length ? state.saved.map((e) => `<article class="saved-card panel"><span class="saved-icon">${icon("Layers", 22)}</span><h2>${esc(e.name)}</h2><p>${e.combatants.length} combatentes · ${e.started ? "Rodada " + e.round : "Preparação"}</p><div>${btn("load", "Abrir encontro", "ArrowUpRight", "primary", `data-id="${e.id}"`)}${btn("delete-saved", "", "Trash2", "icon-button", `data-id="${e.id}" aria-label="Excluir ${esc(e.name)}"`)}</div></article>`).join("") : `<div class="saved-empty panel">${icon("Layers", 36)}<h2>Nenhum encontro salvo</h2><p>Salve um encontro na mesa para voltar a ele quando quiser.</p>${btn("view-combat", "Voltar à mesa", "Swords", "primary")}</div>`}</section>`;
}
function hpModal(c: Combatant) {
  selected = c.id;
  openModal(
    "Pontos de vida",
    `<div class="hp-modal-identity">${avatar(c)}<div><strong>${esc(c.name)}</strong><p>${c.hp} / ${c.maxHp} PV${c.tempHp ? " · " + c.tempHp + " temporários" : ""}</p></div></div><form id="hp-form"><label>Quantidade<input name="amount" type="number" min="0" max="999999" value="1" required autofocus></label><div class="modal-actions three"><button name="mode" value="damage" class="danger" type="submit">${icon("Swords")}Aplicar dano</button><button name="mode" value="heal" class="primary" type="submit">${icon("Heart")}Curar</button><button name="mode" value="temp" class="secondary" type="submit">+ Temporários</button></div></form>`,
  );
}
function featureFields(key: string, features: any[] = []) {
  return `<details class="edit-features"><summary>${({ Traits: "Características", Actions: "Ações", BonusActions: "Ações bônus", Reactions: "Reações", LegendaryActions: "Ações lendárias" } as Record<string, string>)[key]}</summary><div data-feature-list="${key}">${features.map((f) => featureRow(key, f)).join("")}</div>${btn("add-feature", "Adicionar", "Plus", "text-button", `type="button" data-kind="${key}"`)}</details>`;
}
function featureRow(key: string, f: any = {}) {
  return `<div class="feature-row"><input type="hidden" name="${key}Original" value="${esc(JSON.stringify(f))}"><div><input name="${key}Name" aria-label="Nome da ação" placeholder="Nome" value="${esc(f.Name)}">${btn("remove-feature", "", "X", "icon-button", 'type="button" aria-label="Remover ação"')}</div><textarea name="${key}Content" aria-label="Descrição da ação" placeholder="Descrição, ataque, dano ou efeito">${esc(f.Content)}</textarea></div>`;
}
function formCreature(c?: Combatant, s?: StatBlock) {
  const stat = c?.stat || s;
  editingStat = stat;
  openModal(
    c ? "Editar combatente" : s ? "Editar ficha" : "Criar combatente",
    `<form id="creature-form" data-add="${!s && !c}" data-combatant="${c?.id || ""}" data-library="${s?.Id || ""}"><div class="form-grid"><label class="full">Nome<input name="name" value="${esc(c?.name || stat?.Name || "")}" maxlength="120" required autofocus></label><label>Lado<select name="side"><option value="enemy">Adversário</option><option value="ally" ${c?.side === "ally" || stat?.Player ? "selected" : ""}>Aliado</option></select></label><label>Tipo<input name="type" value="${esc(stat?.Type || "")}" placeholder="Humanoide, morto-vivo…"></label><label>Vida máxima<input name="hp" type="number" min="1" max="999999" value="${c?.maxHp || stat?.HP?.Value || 10}" required></label><label>Classe de armadura<input name="ac" type="number" min="0" max="999" value="${c?.ac ?? stat?.AC?.Value ?? 10}" required></label><label>Bônus de iniciativa<input name="modifier" type="number" min="-99" max="99" value="${num(stat?.InitiativeModifier)}" required></label><label>Iniciativa atual<input name="initiative" type="number" min="-99" max="999" value="${c?.initiative ?? 0}" required></label><label class="full">Descrição<textarea name="description">${esc(stat?.Description || "")}</textarea></label></div><div class="edit-abilities">${["Str", "Dex", "Con", "Int", "Wis", "Cha"].map((k, i) => `<label>${["FOR", "DES", "CON", "INT", "SAB", "CAR"][i]}<input name="ability-${k}" type="number" min="1" max="99" value="${num(stat?.Abilities?.[k], 10)}" required></label>`).join("")}</div>${["Traits", "Actions", "BonusActions", "Reactions", "LegendaryActions"].map((k) => featureFields(k, (stat?.[k] as any[]) || [])).join("")}<div class="modal-actions">${btn("close", "Cancelar", undefined, "secondary", 'type="button"')}<button type="submit" class="primary">${icon("Check")}${c || s ? "Salvar alterações" : "Criar e adicionar"}</button></div></form>`,
  );
}
function formSpell(s?: Spell) {
  openModal(
    s ? "Editar magia" : "Criar magia",
    `<form id="spell-form" data-id="${s && !s.Id.startsWith("spells-") ? esc(s.Id) : ""}"><div class="form-grid"><label class="full">Nome<input name="name" value="${esc(s?.Name)}" required maxlength="120"></label><label>Nível<input name="level" type="number" min="0" max="9" value="${s?.Level || 0}" required></label><label>Escola<input name="school" value="${esc(s?.School)}" required></label><label>Tempo de conjuração<input name="casting" value="${esc(s?.CastingTime || "1 ação")}" required></label><label>Alcance<input name="range" value="${esc(s?.Range)}" required></label><label>Duração<input name="duration" value="${esc(s?.Duration)}" required></label><label>Componentes<input name="components" value="${esc(s?.Components)}"></label><label class="full">Descrição<textarea name="description" rows="7" required>${esc(s?.Description)}</textarea></label></div><div class="modal-actions"><button class="primary">Salvar magia</button></div></form>`,
  );
}
function previewModal(s: StatBlock | Spell) {
  preview = s;
  const spell = "Level" in s;
  openModal(
    esc(s.Name),
    spell
      ? `<p class="muted">Nível ${num(s.Level)} · ${esc(s.School)}</p><div class="spell-meta">${[
          ["Conjuração", s.CastingTime],
          ["Alcance", s.Range],
          ["Duração", s.Duration],
          ["Componentes", s.Components],
        ]
          .map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
          .join(
            "",
          )}</div><p class="spell-description">${esc(s.Description)}</p><div class="modal-actions">${btn("edit-spell", state.spells.some((x) => x.Id === s.Id) ? "Editar magia" : "Criar cópia", "Pencil", "secondary")}</div>`
      : `<p class="muted">${esc(s.Type)}</p><div class="preview-stats"><span>PV <b>${num((s as StatBlock).HP?.Value, 1)}</b></span><span>CA <b>${num((s as StatBlock).AC?.Value, 10)}</b></span><span>ND <b>${esc(s.Challenge || "—")}</b></span></div>${renderStat(s as StatBlock)}<div class="modal-actions">${btn("edit-library", state.library.some((x) => x.Id === s.Id) ? "Editar ficha" : "Criar cópia", "Pencil", "secondary")}${btn("add-preview", "Adicionar ao encontro", "Plus", "primary")}</div>`,
    true,
  );
}
function addStat(s: StatBlock) {
  change(() => {
    const c = createCombatant(s, s.Player ? "ally" : "enemy");
    if (s.Player && s.ImportedCurrentHP !== undefined) c.hp = clamp(num(s.ImportedCurrentHP), 0, c.maxHp);
    c.notes = String(s.ImportedNotes || "");
    state.encounter.combatants.push(c);
    selected = c.id;
  }, `${s.Name} entrou no encontro.`);
  toast(`${s.Name} adicionado.`);
}
function settings() {
  openModal(
    "Dados e backups",
    `<div class="settings-section"><h3>${icon("Database")} Armazenamento local</h3><p>Encontro, fichas, magias e notas são salvos neste navegador. Exporte backups para levar sua campanha a outro dispositivo.</p><div class="settings-metrics"><div><b>${state.library.length}</b><span>fichas pessoais</span></div><div><b>${base.length}</b><span>criaturas SRD</span></div><div><b>${allSpells().length}</b><span>magias</span></div></div><div class="settings-actions">${btn("export", "Exportar backup", "Download", "primary")}${btn("import", "Importar JSON", "Upload", "secondary")}</div><input type="file" id="import-file" accept=".json,application/json" hidden><p class="small muted">Aceita backups RoundKeep, além de exportações Improved Initiative. A importação é validada antes de alterar seus dados.</p></div><div class="settings-section"><h3>Backup de origem</h3><p>${state.sourceBackup ? "O backup completo do Improved Initiative foi preservado, inclusive configurações e campos de origem." : "Nenhum backup do Improved Initiative importado."}</p>${state.sourceBackup ? btn("export-original", "Baixar backup original", "Download", "secondary") : ""}</div><div class="settings-section"><h3>Conteúdo e créditos</h3><p>Interface e motor de combate próprios. Criaturas SRD 5.2 (2024) via Open5e, sob CC BY 4.0. Magias de regras básicas distribuídas pelo projeto Improved Initiative, de Evan Bailey. Textos de regras mantidos no idioma da fonte.</p><a href="/credits.html" target="_blank" rel="noopener">Créditos e licenças</a><br><a href="/SRD-OGL_V1.1.pdf" target="_blank" rel="noopener">Open Gaming License / SRD ${icon("ArrowUpRight", 14)}</a></div>`,
  );
  const appearance = `<div class="settings-section theme-section"><h3>${icon("Settings2")} Aparência</h3><p>Escolha claro, escuro ou acompanhe automaticamente o tema do sistema operacional.</p><label class="theme-control">Tema da interface<select id="theme-preference" aria-label="Tema da interface"><option value="system" ${themePreference === "system" ? "selected" : ""}>Usar tema do sistema</option><option value="light" ${themePreference === "light" ? "selected" : ""}>Claro</option><option value="dark" ${themePreference === "dark" ? "selected" : ""}>Escuro</option></select></label></div>`;
  const firstSection = modal.querySelector(".settings-section");
  if (firstSection) firstSection.insertAdjacentHTML("beforebegin", appearance);
  else modal.insertAdjacentHTML("beforeend", appearance);
  enhanceSelects(modal);
}
function download(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Backup exportado.");
}
async function action(kind: string, el: HTMLElement) {
  const e = state.encounter,
    c = el.dataset.id ? e.combatants.find((c) => c.id === el.dataset.id) : selectedC();
  switch (kind) {
    case "close":
      closeModal();
      break;
    case "open-command":
      openCommand();
      break;
    case "run-command": {
      const run = el.dataset.run!;
      closeCommand();
      if (run === "command-preview") {
        const s = [...allCreatures(), ...allSpells()].find((item) => item.Id === el.dataset.id);
        if (s) previewModal(s);
      } else if (run === "command-add") {
        const s = allCreatures().find((item) => item.Id === el.dataset.id);
        if (s) addStat(s);
      } else await action(run, el);
      break;
    }
    case "tab":
      tab = el.dataset.tab!;
      query = "";
      render();
      break;
    case "view-combat":
      view = "combat";
      render();
      break;
    case "view-saved":
      view = "saved";
      render();
      break;
    case "back-to-combat":
      document.querySelector(".battle")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
      break;
    case "select":
      selected = el.dataset.id!;
      render();
      if (window.matchMedia("(max-width:1250px)").matches)
        document.querySelector(".details")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "instant" : "smooth",
          block: "start",
        });
      break;
    case "add": {
      const s = allCreatures().find((s) => s.Id === el.dataset.id);
      if (s) addStat(s);
      break;
    }
    case "preview": {
      const s = (tab === "spells" ? allSpells() : allCreatures()).find((s) => s.Id === el.dataset.id);
      if (s) previewModal(s);
      break;
    }
    case "add-preview":
      if (preview) {
        closeModal();
        addStat(preview as StatBlock);
      }
      break;
    case "edit-library":
      if (preview) {
        const original = state.library.find((s) => s.Id === preview!.Id);
        closeModal();
        formCreature(undefined, original || ({ ...preview, Id: "" } as StatBlock));
      }
      break;
    case "next":
      change(() => advance(e), e.started ? "Próximo turno." : "Combate iniciado.");
      break;
    case "end-combat":
      openModal(
        "Encerrar combate?",
        `<p>A ordem, os pontos de vida e as condições serão mantidos para sua próxima preparação.</p><div class="modal-actions">${btn("close", "Continuar combate", undefined, "secondary")}${btn("confirm-end", "Encerrar combate", "Flag", "primary")}</div>`,
      );
      break;
    case "confirm-end":
      closeModal();
      change(() => {
        e.started = false;
        e.round = 0;
        e.activeId = null;
      }, "Combate encerrado.");
      break;
    case "previous":
      change(() => advance(e, -1), "Voltou ao turno anterior.");
      break;
    case "roll-initiative":
      change(() => {
        for (const c of e.combatants) c.initiative = roll("1d20").total + num(c.stat.InitiativeModifier);
      }, "Iniciativas roladas.");
      toast("Iniciativas roladas.");
      break;
    case "undo": {
      const previous = history.pop();
      if (previous) {
        state.encounter = previous;
        persist();
        render();
        toast("Última ação desfeita.");
      }
      break;
    }
    case "hp":
      if (c) hpModal(c);
      break;
    case "reaction":
      if (c) change(() => (c.reaction = !c.reaction));
      break;
    case "remove-condition":
      if (c) change(() => (c.conditions = c.conditions.filter((x) => x !== el.dataset.condition)));
      break;
    case "conditions":
      if (c)
        openModal(
          "Condições",
          `<div class="condition-picker">${["Amedrontado", "Agarrado", "Atordoado", "Caído", "Cego", "Enfeitiçado", "Envenenado", "Impedido", "Incapacitado", "Inconsciente", "Invisível", "Paralisado", "Petrificado", "Surdo", "Concentração", "Exaustão"].map((x) => btn("toggle-condition", esc(x), c.conditions.includes(x) ? "Check" : "Plus", c.conditions.includes(x) ? "selected" : "", `data-condition="${x}" aria-pressed="${c.conditions.includes(x)}"`)).join("")}</div><form id="condition-form"><label>Condição personalizada<input name="condition" maxlength="60" placeholder="Ex.: Marca do caçador" required></label><button class="primary">Adicionar</button></form>`,
        );
      break;
    case "toggle-condition":
      if (c) {
        change(() => {
          const x = el.dataset.condition!;
          c.conditions = c.conditions.includes(x) ? c.conditions.filter((t) => t !== x) : [...c.conditions, x];
        });
        el.classList.toggle("selected", c.conditions.includes(el.dataset.condition!));
        el.setAttribute("aria-pressed", String(c.conditions.includes(el.dataset.condition!)));
      }
      break;
    case "add-feature":
      modal
        .querySelector(`[data-feature-list="${el.dataset.kind}"]`)!
        .insertAdjacentHTML("beforeend", featureRow(el.dataset.kind!));
      break;
    case "remove-feature":
      el.closest(".feature-row")?.remove();
      break;
    case "create":
      preview = null;
      if (tab === "spells") formSpell();
      else formCreature();
      break;
    case "edit-spell":
      if (preview) {
        const spell = preview as Spell;
        closeModal();
        formSpell(spell);
      }
      break;
    case "edit":
      if (c) formCreature(c);
      break;
    case "combatant-menu":
      if (c) {
        selected = c.id;
        openModal(
          esc(c.name),
          `<div class="menu-actions">${btn("edit", "Editar combatente", "Pencil", "secondary")}${btn("hp", "Dano, cura e vida temporária", "Heart", "secondary")}${btn("conditions", "Gerenciar condições", "Sparkles", "secondary")}${btn("duplicate", "Duplicar combatente", "Copy", "secondary")}${btn("hide", c.hidden ? "Mostrar aos jogadores" : "Ocultar dos jogadores", c.hidden ? "Eye" : "EyeOff", "secondary")}${btn("remove", "Remover do encontro", "Trash2", "danger")}</div>`,
        );
      }
      break;
    case "duplicate":
      if (c) {
        closeModal();
        change(() => {
          const copy = structuredClone(c);
          copy.id = id();
          copy.name += " (2)";
          e.combatants.push(copy);
          selected = copy.id;
        }, `${c.name} duplicado.`);
      }
      break;
    case "hide":
      if (c) {
        closeModal();
        change(() => (c.hidden = !c.hidden));
      }
      break;
    case "remove":
      if (c) {
        closeModal();
        change(() => {
          removeCombatant(e, c.id);
          selected = "";
        }, `${c.name} removido do encontro.`);
      }
      break;
    case "add-party": {
      const party = state.library.filter((s) => s.Player && !e.combatants.some((c) => c.stat.Id === s.Id));
      if (!party.length) {
        toast("Nenhum herói novo para adicionar. Crie uma ficha de aliado.");
        break;
      }
      change(() => {
        for (const s of party) {
          const c = createCombatant(s, "ally");
          if (s.ImportedCurrentHP !== undefined) c.hp = clamp(num(s.ImportedCurrentHP), 0, c.maxHp);
          c.notes = String(s.ImportedNotes || "");
          e.combatants.push(c);
        }
        selected = e.combatants[0].id;
      }, "Grupo adicionado ao encontro.");
      break;
    }
    case "rename":
      openModal(
        "Nome do encontro",
        `<form id="rename-form"><label>Nome<input name="name" value="${esc(e.name)}" maxlength="120" required autofocus></label><div class="modal-actions"><button class="primary">Salvar nome</button></div></form>`,
      );
      break;
    case "notes":
      openModal(
        "Notas do mestre",
        `<form id="notes-form"><p class="muted">Visíveis apenas na sua mesa.</p><textarea name="notes" rows="9" placeholder="Prepare o cenário, os objetivos e as surpresas…">${esc(e.notes)}</textarea><div class="modal-actions"><button class="primary">Salvar notas</button></div></form>`,
      );
      break;
    case "save": {
      const copy = structuredClone(e),
        idx = state.saved.findIndex((s) => s.id === copy.id);
      if (idx >= 0) state.saved[idx] = copy;
      else state.saved.push(copy);
      persist();
      render();
      toast("Encontro salvo na sua coleção.");
      break;
    }
    case "new":
      openModal(
        "Um novo encontro",
        `<p>O encontro atual será salvo na sua coleção antes de abrir a nova mesa.</p><form id="new-form"><label>Nome<input name="name" placeholder="Ex.: Emboscada na estrada" value="Novo encontro" maxlength="120" required></label><div class="modal-actions"><button class="primary">Criar encontro</button></div></form>`,
      );
      break;
    case "load": {
      const saved = state.saved.find((s) => s.id === el.dataset.id);
      if (saved) {
        const loaded = structuredClone(saved);
        const idx = state.saved.findIndex((s) => s.id === e.id);
        if (idx >= 0) state.saved[idx] = structuredClone(e);
        else state.saved.push(structuredClone(e));
        history = [];
        state.encounter = loaded;
        selected = "";
        view = "combat";
        persist();
        render();
      }
      break;
    }
    case "delete-saved":
      openModal(
        "Excluir encontro salvo?",
        `<p>O encontro em andamento não será alterado. Exporte um backup se quiser preservar esta cópia.</p><div class="modal-actions">${btn("close", "Cancelar", undefined, "secondary")}${btn("confirm-delete-saved", "Excluir cópia salva", "Trash2", "danger", `data-id="${el.dataset.id}"`)}</div>`,
      );
      break;
    case "confirm-delete-saved":
      state.saved = state.saved.filter((s) => s.id !== el.dataset.id);
      persist();
      closeModal();
      render();
      break;
    case "dice":
      openModal(
        "Rolar dados",
        `<form id="dice-form"><label>Rolagem<input name="expression" value="1d20" placeholder="2d6+3" required autofocus></label><div class="dice-presets">${[4, 6, 8, 10, 12, 20, 100].map((n) => btn("dice-preset", "d" + n, undefined, "secondary", `type="button" data-die="${n}"`)).join("")}</div><button class="primary" type="submit">${icon("Dices")} Rolar dados</button></form><div id="dice-result" aria-live="polite" class="dice-result"></div>`,
      );
      break;
    case "dice-preset":
      (modal.querySelector("[name=expression]") as HTMLInputElement).value = "1d" + el.dataset.die;
      break;
    case "ability": {
      const mod = Math.floor((num(el.dataset.score) - 10) / 2),
        r = roll("1d20" + (mod >= 0 ? "+" : "") + mod);
      toast(`${el.dataset.ability}: ${r.total} (${r.dice[0]} ${mod >= 0 ? "+" : ""}${mod})`);
      break;
    }
    case "settings":
      settings();
      break;
    case "export":
      download(state, "roundkeep-backup.json");
      break;
    case "export-original":
      download(state.sourceBackup, "improved-initiative-original.json");
      break;
    case "import":
      (document.querySelector("#import-file") as HTMLInputElement).click();
      break;
    case "confirm-import":
      if (pendingImport) {
        await put("before-import", structuredClone(state));
        state = pendingImport;
        pendingImport = null;
        history = [];
        selected = "";
        persist();
        closeModal();
        render();
        toast("Importação concluída.");
      }
      break;
    case "help":
      openModal(
        "Sua mesa, sem complicação",
        `<div class="help-list"><p><kbd>⌘ K</kbd> Busca e ações rápidas</p><p><kbd>N</kbd> Avançar turno</p><p><kbd>/</kbd> Buscar na biblioteca</p><p><kbd>D</kbd> Abrir rolagem de dados</p><p><kbd>Ctrl / ⌘ + Z</kbd> Desfazer uma ação de combate</p><p>Clique no valor de iniciativa para editá-lo. Clique na vida para aplicar dano ou cura. A visão dos jogadores oculta notas, CA e vida exata.</p><p>A janela dos jogadores sincroniza neste mesmo navegador e dispositivo. Não é um link remoto de sessão.</p></div>`,
      );
      break;
    case "player":
      window.open("/?player", "roundkeep-player-view");
      break;
    case "log":
      openModal(
        "Histórico do encontro",
        `<ol class="log-list">${e.log.length ? e.log.map((x) => `<li>${esc(x)}</li>`).join("") : "<li>Ainda não há ações registradas.</li>"}</ol>`,
      );
      break;
    case "demo":
      change(() => {
        e.name = "Emboscada na estrada";
        for (const name of ["Goblin", "Wolf"]) {
          const s = base.find((x) => x.Name === name || x.Name.startsWith(name + " "));
          if (s) {
            const c = createCombatant(s);
            c.initiative = name === "Goblin" ? 15 : 11;
            e.combatants.push(c);
          }
        }
        const hero = createCombatant(
          {
            Id: "demo-hero",
            Name: "Aria, a patrulheira",
            Type: "Elfa · Patrulheira",
            HP: { Value: 32 },
            AC: { Value: 15 },
            InitiativeModifier: 3,
            Abilities: { Str: 12, Dex: 16, Con: 14, Int: 10, Wis: 15, Cha: 10 },
          },
          "ally",
        );
        hero.initiative = 18;
        e.combatants.push(hero);
        selected = hero.id;
      }, "Demonstração adicionada.");
      break;
  }
}
let pendingImport: State | null = null;
document.addEventListener("click", (event) => {
  if (!(event.target as HTMLElement).closest(".select")) {
    document.querySelectorAll(".select-menu").forEach((menu) => {
      (menu as HTMLElement).hidden = true;
      menu.previousElementSibling?.setAttribute("aria-expanded", "false");
    });
  }
  const el = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el) return;
  event.preventDefault();
  if (modal.open && ["edit", "hp", "conditions"].includes(el.dataset.action!)) closeModal();
  const skipBusy = el.dataset.action === "open-command";
  if (!skipBusy) el.setAttribute("aria-busy", "true");
  Promise.resolve(action(el.dataset.action!, el))
    .catch((err) => toast(err.message || "Não foi possível concluir a ação."))
    .finally(() => el.removeAttribute("aria-busy"));
});
document.addEventListener("input", (event) => {
  const el = event.target as HTMLInputElement;
  if (el.id === "command-input") {
    const list = command.querySelector("#command-list");
    if (list) list.innerHTML = renderCommandList(el.value);
  }
  if (el.id === "search") {
    query = el.value;
    document.querySelector("#library-list")!.innerHTML = renderLibrary();
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target as HTMLInputElement;
  try {
    if (el.id === "theme-preference") {
      setThemePreference(el.value as ThemePreference);
      toast(
        el.value === "system"
          ? "Tema sincronizado com o sistema."
          : `Tema ${el.value === "dark" ? "escuro" : "claro"} aplicado.`,
      );
    }
    if (el.id === "source") {
      source = el.value;
      document.querySelector("#library-list")!.innerHTML = renderLibrary();
    }
    if (el.dataset.field === "initiative") {
      const c = state.encounter.combatants.find((c) => c.id === el.dataset.id);
      if (c) change(() => (c.initiative = clamp(num(el.value), -99, 999)));
    }
    if (el.id === "combatant-notes") {
      const c = selectedC();
      if (c) {
        c.notes = el.value;
        persist();
      }
    }
    if (el.id === "import-file" && el.files?.[0]) {
      const file = el.files[0];
      if (file.size > 20_000_000) throw new Error("O arquivo deve ter menos de 20 MB.");
      const raw = JSON.parse(await file.text());
      if (raw?.version === 1) pendingImport = validateState(raw);
      else {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Formato não reconhecido.");
        const imported = importOriginal(raw);
        if (!imported.library.length && !imported.spells.length && !imported.saved.length && !imported.encounter)
          throw new Error("Nenhum dado compatível encontrado.");
        pendingImport = structuredClone(state);
        const byId = new Map(pendingImport.library.map((s) => [s.Id, s]));
        imported.library.forEach((s) => byId.set(s.Id, s));
        pendingImport.library = [...byId.values()];
        const spells = new Map(pendingImport.spells.map((s) => [s.Id, s]));
        imported.spells.forEach((s) => spells.set(s.Id, s));
        pendingImport.spells = [...spells.values()];
        pendingImport.saved.push(...imported.saved);
        if (imported.encounter?.combatants.length) {
          pendingImport.saved.push(structuredClone(state.encounter));
          pendingImport.encounter = imported.encounter;
        }
        pendingImport.sourceBackup = raw;
        pendingImport.importRevision = 1;
        validateState(pendingImport);
      }
      closeModal();
      openModal(
        "Revisar importação",
        `<p>O arquivo contém ${pendingImport.library.length} fichas pessoais, ${pendingImport.spells.length} magias pessoais e ${pendingImport.saved.length} encontros salvos.</p><p>Exporte a versão atual antes de confirmar caso queira mantê-la.</p><div class="modal-actions">${btn("export", "Backup atual", "Download", "secondary")}${btn("confirm-import", "Confirmar importação", "Check", "primary")}</div>`,
      );
    }
  } catch (err) {
    toast((err as Error).message);
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  event.preventDefault();
  const fd = new FormData(form);
  const value = (key: string) => String(fd.get(key) || "");
  try {
    switch (form.id) {
      case "spell-form": {
        const spell: Spell = {
          Id: form.dataset.id || id(),
          Name: value("name").trim(),
          Level: num(value("level")),
          School: value("school"),
          CastingTime: value("casting"),
          Range: value("range"),
          Duration: value("duration"),
          Components: value("components"),
          Description: value("description"),
          Source: "Minha biblioteca",
        };
        if (!spell.Name) throw new Error("Informe um nome.");
        const index = state.spells.findIndex((s) => s.Id === spell.Id);
        if (index >= 0) state.spells[index] = spell;
        else state.spells.push(spell);
        closeModal();
        persist();
        render();
        toast("Magia salva.");
        break;
      }
      case "hp-form": {
        const c = selectedC();
        if (!c) break;
        const mode = ((event as SubmitEvent).submitter as HTMLButtonElement)?.value as "damage" | "heal" | "temp";
        if (!mode) break;
        const amount = num(value("amount"));
        closeModal();
        change(
          () => applyHP(c, amount, mode),
          `${c.name}: ${amount} ${mode === "damage" ? "de dano" : mode === "heal" ? "de cura" : "PV temporários"}.`,
        );
        break;
      }
      case "creature-form": {
        const c = state.encounter.combatants.find((c) => c.id === form.dataset.combatant);
        const original = editingStat;
        const stat: StatBlock = {
          ...(c?.stat || original || {}),
          Id: c?.stat.Id || form.dataset.library || id(),
          Name: value("name").trim(),
          Type: value("type"),
          HP: { ...original?.HP, Value: num(value("hp"), 1) },
          AC: { ...original?.AC, Value: num(value("ac"), 10) },
          InitiativeModifier: num(value("modifier")),
          Description: value("description"),
          Player: value("side") === "ally" ? "player" : "",
        };
        if (!stat.Name) throw new Error("Informe um nome.");
        stat.Abilities = Object.fromEntries(
          ["Str", "Dex", "Con", "Int", "Wis", "Cha"].map((k) => [k, num(value("ability-" + k), 10)]),
        );
        for (const key of ["Traits", "Actions", "BonusActions", "Reactions", "LegendaryActions"]) {
          const names = fd.getAll(key + "Name"),
            contents = fd.getAll(key + "Content"),
            originals = fd.getAll(key + "Original");
          stat[key] = names
            .map((name, i) => ({
              ...JSON.parse(String(originals[i] || "{}")),
              Name: String(name).trim(),
              Content: String(contents[i] || ""),
            }))
            .filter((f) => f.Name);
        }
        closeModal();
        change(() => {
          if (c) {
            c.name = stat.Name;
            c.stat = stat;
            c.maxHp = stat.HP!.Value;
            c.hp = Math.min(c.hp, c.maxHp);
            c.ac = stat.AC!.Value;
            c.side = value("side") as "ally" | "enemy";
            c.initiative = num(value("initiative"));
          } else {
            const idx = state.library.findIndex((s) => s.Id === stat.Id);
            if (idx >= 0) state.library[idx] = stat;
            else state.library.push(stat);
            if (form.dataset.add === "true") {
              const fresh = createCombatant(stat, value("side") as "ally" | "enemy");
              fresh.initiative = num(value("initiative"));
              state.encounter.combatants.push(fresh);
              selected = fresh.id;
            }
          }
        }, `${stat.Name}: ficha salva.`);
        break;
      }
      case "rename-form": {
        const name = value("name").trim();
        if (!name) throw new Error("Informe um nome.");
        closeModal();
        change(() => (state.encounter.name = name));
        break;
      }
      case "new-form": {
        const name = value("name").trim();
        if (!name) throw new Error("Informe um nome.");
        const idx = state.saved.findIndex((s) => s.id === state.encounter.id);
        if (idx >= 0) state.saved[idx] = structuredClone(state.encounter);
        else state.saved.push(structuredClone(state.encounter));
        state.encounter = emptyEncounter(name);
        history = [];
        selected = "";
        view = "combat";
        closeModal();
        persist();
        render();
        break;
      }
      case "notes-form":
        closeModal();
        change(() => (state.encounter.notes = value("notes")));
        break;
      case "condition-form": {
        const c = selectedC(),
          condition = value("condition").trim();
        if (c && condition && !c.conditions.includes(condition)) {
          change(() => c.conditions.push(condition));
          closeModal();
        }
        break;
      }
      case "dice-form": {
        const expression = value("expression"),
          result = roll(expression);
        document.querySelector("#dice-result")!.innerHTML =
          `<p class="dice-expression">${esc(expression)}</p><strong class="dice-total">${result.total}</strong><p class="dice-breakdown">${result.dice.join(" + ")}${result.modifier ? " " + (result.modifier >= 0 ? "+" : "") + result.modifier : ""}</p>`;
        state.encounter.log.unshift(`${expression} → ${result.total}`);
        state.encounter.log = state.encounter.log.slice(0, 100);
        persist();
        break;
      }
    }
  } catch (err) {
    toast((err as Error).message);
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (playerMode) return;
    if (command.open) closeCommand();
    else openCommand();
    return;
  }
  if (command.open) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommand();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCommand(1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCommand(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      command.querySelector<HTMLElement>(".command-item.active")?.click();
    }
    return;
  }
  if (
    !ready ||
    playerMode ||
    modal.open ||
    (event.target as HTMLElement).closest("input,textarea,select,[contenteditable]")
  )
    return;
  if (event.key === "/") {
    event.preventDefault();
    document.querySelector<HTMLInputElement>("#search")?.focus();
  }
  if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey) void action("next", document.body);
  if (event.key.toLowerCase() === "d" && !event.metaKey && !event.ctrlKey) void action("dice", document.body);
  if (event.key === "z" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    void action("undo", document.body);
  }
});
command.addEventListener("click", (event) => {
  if (event.target === command) closeCommand();
});
command.addEventListener("mousemove", (event) => {
  const item = (event.target as HTMLElement).closest(".command-item");
  if (!item) return;
  command.querySelectorAll(".command-item").forEach((el) => el.classList.toggle("active", el === item));
});
window.addEventListener("online", () => render());
window.addEventListener("offline", () => render());
function renderPlayer(p: any) {
  app.innerHTML = `<main class="player-screen"><div class="wordmark">ROUNDKEEP<span>Visão dos jogadores</span></div><p class="muted">${p.round ? "Rodada " + p.round : "Preparação"}</p><h1>${esc(p.name)}</h1><div class="player-list">${p.combatants.map((c: any) => `<article class="player-card ${c.id === p.activeId ? "current" : ""}"><span class="player-initiative">${num(c.initiative)}</span><div><h2>${esc(c.name)}</h2><p>${esc(c.health)}${c.conditions.length ? " · " + esc(c.conditions.join(", ")) : ""}</p></div>${c.id === p.activeId ? '<span class="turn-label">Turno atual</span>' : ""}</article>`).join("") || "<p>Aguardando os combatentes…</p>"}</div><p class="muted">Sincronização local · mantenha a mesa do mestre aberta neste navegador.</p></main>`;
}
async function init() {
  document.documentElement.classList.add("is-loading");
  if (playerMode) {
    app.innerHTML = '<div class="boot">ROUNDKEEP<br><small>Aguardando a mesa do mestre…</small></div>';
    channel.onmessage = (event) => {
      if (event.data.type === "state") renderPlayer(event.data.data);
    };
    channel.postMessage({ type: "request" });
    return;
  }
  channel.onmessage = (event) => {
    if (event.data.type === "request" && state) broadcast();
  };
  let stored: unknown;
  try {
    stored = await get<State>("state");
  } catch {
    app.innerHTML =
      '<div class="boot">Armazenamento indisponível.<small>Seus dados não foram alterados. Reabra esta página quando o navegador permitir o acesso.</small></div>';
    return;
  }
  if (stored) {
    try {
      state = validateState(stored);
    } catch {
      app.innerHTML = `<div class="boot">Seu backup precisa de atenção.<small>Os dados existentes foram preservados. Exporte-os antes de tentar recuperar.</small><button id="recover-backup" class="primary">Baixar dados para recuperação</button></div>`;
      document
        .querySelector("#recover-backup")!
        .addEventListener("click", () => download(stored, "roundkeep-recovery.json"));
      return;
    }
  } else {
    state = {
      version: 1,
      encounter: emptyEncounter(),
      library: [],
      spells: [],
      saved: [],
      updatedAt: new Date().toISOString(),
    };
    try {
      const r = await fetch("/api/bootstrap");
      if (r.ok) {
        const raw = await r.json(),
          imported = importOriginal(raw);
        state.importRevision = 1;
        state.library = imported.library;
        state.spells = imported.spells;
        state.saved = imported.saved;
        if (Object.keys(raw).length) state.sourceBackup = raw;
        if (imported.encounter) state.encounter = imported.encounter;
        state.encounter.name = "Novo encontro";
      }
    } catch {}
  }
  if (state.sourceBackup && !state.importRevision) {
    const imported = importOriginal(state.sourceBackup as Record<string, unknown>);
    for (const stat of imported.library) {
      const existing = state.library.find((s) => s.Id === stat.Id);
      if (existing) existing.InitiativeModifier = stat.InitiativeModifier;
    }
    state.importRevision = 1;
  }
  const result = await Promise.allSettled([catalogue<StatBlock>("creatures"), catalogue<Spell>("spells")]);
  if (result[0].status === "fulfilled") base = result[0].value;
  if (result[1].status === "fulfilled") baseSpells = result[1].value;
  selected = state.encounter.activeId || ordered(state.encounter)[0]?.id || "";
  ready = true;
  document.documentElement.classList.remove("is-loading");
  render();
  persist();
  if (result.some((r) => r.status === "rejected"))
    toast("Parte do catálogo não carregou. Suas fichas pessoais continuam disponíveis.");
  if (import.meta.env.PROD && "serviceWorker" in navigator)
    navigator.serviceWorker.register("/sw.js").catch(() => toast("Cache offline indisponível neste navegador."));
}
async function start() {
  if (playerMode || !navigator.locks) return init();
  await navigator.locks.request("roundkeep-master", { ifAvailable: true }, async (lock) => {
    if (!lock) {
      app.innerHTML =
        '<div class="boot">Sua mesa já está aberta.<small>Use a primeira aba para editar. Isso evita alterações conflitantes.</small><a class="primary" href="/?player">Abrir visão dos jogadores</a><button class="secondary" onclick="location.reload()">Tentar novamente</button></div>';
      return;
    }
    const lifetime = new Promise<void>((resolve) =>
      window.addEventListener("pagehide", () => resolve(), { once: true }),
    );
    await init();
    await lifetime;
  });
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted && !playerMode) location.reload();
});
start().catch((err) => {
  app.innerHTML = `<div class="boot">Não foi possível abrir a mesa.<br><small>${esc(err.message)}</small><button onclick="location.reload()">Tentar novamente</button></div>`;
});
