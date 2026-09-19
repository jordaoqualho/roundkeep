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
        health: c.hp === 0 ? "Down" : c.hp <= c.maxHp / 2 ? "Bloodied" : "Healthy",
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
      toast("Could not save. Export a backup to protect your changes.");
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
      (saveError ? "Save failed" : pendingSaves ? "Saving…" : "Saved in this browser");
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
  modal.innerHTML = `<div class="modal-head"><div><h2>${title}</h2></div>${btn("close", "", "X", "icon-button", 'aria-label="Close"')}</div>${body}`;
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
      label: started ? "Next turn" : "Start combat",
      hint: started ? "Advance the order" : "Begin the round",
      icon: started ? "ChevronRight" : "Play",
      kbd: "N",
    },
    {
      action: "roll-initiative",
      label: "Roll initiative",
      hint: "1d20 + modifier",
      icon: "Dices",
    },
    {
      action: "dice",
      label: "Roll dice",
      hint: "Free expression",
      icon: "Dices",
      kbd: "D",
    },
    {
      action: "undo",
      label: "Undo last action",
      hint: "Revert the last step",
      icon: "RotateCcw",
      kbd: "⌘Z",
    },
    {
      action: "save",
      label: "Save encounter",
      hint: "Store in collection",
      icon: "Save",
    },
    {
      action: "new",
      label: "New encounter",
      hint: "Open a fresh table",
      icon: "Plus",
    },
    {
      action: "add-party",
      label: "Add party",
      hint: "Heroes from library",
      icon: "Users",
    },
    {
      action: "create",
      label: "Create stat block",
      hint: "Combatant or spell",
      icon: "Plus",
    },
    {
      action: "notes",
      label: "DM notes",
      hint: "Encounter annotations",
      icon: "ScrollText",
    },
    {
      action: view === "saved" ? "view-combat" : "view-saved",
      label: view === "saved" ? "Back to table" : "Saved encounters",
      hint: view === "saved" ? "Current combat" : "Open collection",
      icon: view === "saved" ? "Swords" : "Layers",
    },
    {
      action: "player",
      label: "Player view",
      hint: "Local table window",
      icon: "Eye",
    },
    {
      action: "settings",
      label: "Data and settings",
      hint: "Backup and appearance",
      icon: "Settings2",
    },
    {
      action: "help",
      label: "Help and shortcuts",
      hint: "Table keyboard",
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
      return `<button type="button" class="command-item ${index === 0 ? "active" : ""}" data-action="run-command" data-run="${spell ? "command-preview" : "command-add"}" data-id="${esc(item.Id)}" data-index="${index}">${icon(spell ? "Sparkles" : item.Player ? "Shield" : "Swords", 16)}<span>${esc(item.Name)}</span><small>${spell ? `Spell · level ${num(item.Level)}` : "Add to encounter"}</small></button>`;
    })
    .join("");
  return `${actionRows ? `<div class="command-group">Actions</div>${actionRows}` : ""}${
    recordRows ? `<div class="command-group">Library</div>${recordRows}` : ""
  }${!actionRows && !recordRows ? `<p class="command-empty">No actions or stat blocks found.</p>` : ""}`;
}
function openCommand(seed = "") {
  command.innerHTML = `<label class="command-search">${icon("Search", 16)}<input id="command-input" type="search" value="${esc(seed)}" placeholder="Search stat blocks or run an action…" aria-label="Search or run an action" autocomplete="off"><kbd>esc</kbd></label><div id="command-list" class="command-list" role="listbox">${renderCommandList(seed)}</div>`;
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
  app.innerHTML = `<aside class="rail"><a class="brand-mark" href="/" aria-label="RoundKeep home" title="RoundKeep · Home"><svg viewBox="0 0 64 64" fill="none"><path d="M12 16 H22 V22 H28 V16 H36 V22 H42 V16 H52 V36 C52 47 32 56 32 56 C32 56 12 47 12 36 Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M32 26 L41 38 H36 V48 H28 V38 H23 Z" fill="var(--rail-bg)" stroke="var(--rail-bg)" stroke-width="1.5" stroke-linejoin="round"/></svg></a><div class="rail-nav">${btn("view-combat", "", "Swords", "rail-button " + (view === "combat" ? "active" : ""), 'aria-label="Combat table" title="Combat table"')}${btn("view-saved", "", "Layers", "rail-button " + (view === "saved" ? "active" : ""), 'aria-label="Saved encounters" title="Saved encounters"')}${btn("notes", "", "ScrollText", "rail-button", 'aria-label="Encounter notes" title="Encounter notes"')}</div><div class="rail-bottom">${btn("help", "", "CircleHelp", "rail-button", 'aria-label="Help and shortcuts"')}${btn("settings", "", "Settings2", "rail-button", 'aria-label="Data and settings"')}<span class="profile" title="Dungeon Master">M</span></div></aside>
 <div class="workspace"><header class="topbar"><div class="topbar-context"><div class="wordmark">ROUNDKEEP</div><div class="breadcrumb">Your table ${icon("ChevronRight", 13)} <strong>${view === "saved" ? "Encounters" : "Current encounter"}</strong></div></div>${btn("open-command", "<span>Search or quick action…</span><kbd>⌘ K</kbd>", "Search", "command-trigger", 'aria-label="Open search and quick actions"')}<div class="top-actions"><span id="save-status" class="save-status"></span>${btn("player", "Player view", "Eye", "subtle")}${btn("settings", "", "Settings2", "icon-button", 'aria-label="Settings"')}</div></header>
 <main><section class="page-heading"><div><h1>${view === "saved" ? "Your encounters" : esc(e.name)} ${view === "combat" ? btn("rename", "", "Pencil", "title-edit", 'aria-label="Rename encounter"') : ""}</h1></div><div class="heading-actions">${btn("save", "Save encounter", "Save", "secondary")}${btn("new", "New encounter", "Plus", "primary")}</div></section>
 ${
   view === "saved"
     ? renderSaved()
     : `<div class="combat-layout"><aside class="library panel"><div class="panel-title"><div><h2>Library</h2></div>${btn("create", "", "Plus", "icon-button", 'aria-label="Create stat block"')}</div><div class="library-tabs">${[
         ["creatures", "Creatures"],
         ["characters", "Heroes"],
         ["spells", "Spells"],
       ]
         .map(([key, label]) => btn("tab", label, undefined, tab === key ? "selected" : "", `data-tab="${key}"`))
         .join(
           "",
         )}</div><div class="library-search"><label class="searchbox">${icon("Search", 16)}<input id="search" type="search" value="${esc(query)}" placeholder="Search ${tab === "spells" ? "spells" : "library"}…" aria-label="Search library"><kbd>/</kbd></label><select id="source" aria-label="Filter source"><option value="all" ${source === "all" ? "selected" : ""}>All sources</option><option value="personal" ${source === "personal" ? "selected" : ""}>My library</option><option value="srd" ${source === "srd" ? "selected" : ""}>Basic rules (SRD)</option></select></div><div id="library-list" class="library-list">${renderLibrary()}</div><div class="library-footer">${icon("Database", 13)} Offline catalogue available <span>${allCreatures().length}</span></div></aside>
 <section class="battle"><div class="battle-toolbar"><div class="round-icon">${icon("Swords", 18)}</div><div><h2>${e.started ? "Round " + String(e.round).padStart(2, "0") : "Initiative order"}</h2></div><div class="battle-buttons">${e.started ? btn("end-combat", "", "Pause", "icon-button", 'aria-label="End combat" title="End combat"') : ""}${btn("roll-initiative", "", "Dices", "icon-button", 'aria-label="Roll initiative" title="Roll initiative"')}${btn("undo", "", "RotateCcw", "icon-button", `aria-label="Undo last action" title="Undo" ${!history.length ? "disabled" : ""}`)}<span class="divider"></span>${btn("previous", "", "ChevronLeft", "icon-button", `aria-label="Previous turn" ${!e.started ? "disabled" : ""}`)}${btn("next", e.started ? "Next turn" : "Start combat", e.started ? "ChevronRight" : "Play", "primary", `${!cs.length ? "disabled" : ""} title="${e.started ? "Next turn (N)" : "Start combat"}"`)}</div></div>
 <div class="battle-summary"><span><i class="dot ally-dot"></i>${allies.length} allies</span><span><i class="dot enemy-dot"></i>${enemies.length} enemies</span><span class="summary-end">${icon("Users", 14)} ${cs.length} combatants</span></div>
 ${cs.length ? `<div class="table-labels"><span>Init</span><span>Combatant</span><span>HP</span><span>AC</span><span></span></div><div class="combatant-list">${cs.map((c) => renderCombatant(c, e.activeId === c.id)).join("")}</div><div class="add-combatant">${btn("create", "Add combatant", "Plus", "text-button")}${btn("add-party", "Add party", "Users", "text-button")}</div>` : `<div class="empty-combat"><h2>No combatants</h2><p>Use the + button in the library or add your party.</p><div>${btn("add-party", "Add party", "Users", "primary")}${btn("demo", "Open demo", undefined, "subtle")}</div></div>`}
 <div class="battle-bottom"><div class="encounter-note"><span>${icon("ScrollText", 15)} Notes</span>${btn("notes", e.notes ? esc(e.notes.slice(0, 95)) : "Add encounter notes", undefined, "note-preview")}</div><div class="session-log"><div><h3>Activity</h3>${btn("log", "View history", "ChevronRight", "text-button")}</div><p>${esc(e.log[0] || "No actions recorded.")}</p></div></div>
 <footer class="battle-footer"><span>${icon("Keyboard", 14)} <kbd>N</kbd> next turn <kbd>/</kbd> search <kbd>D</kbd> dice</span>${btn("dice", "Roll dice", "Dices", "text-button")}</footer></section><aside class="details panel">${renderDetails()}</aside></div>`
 }
 </main><footer class="app-footer"><span><i class="live-dot"></i> ${navigator.onLine ? "Local storage" : "Offline · data available"}</span><span>D&D 5e · SRD 2024</span></footer></div>`;
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
  return `<div class="list-caption">${tab === "characters" ? "Your party" : source === "personal" ? "My library" : "Available stat blocks"}<span>${items.length}</span></div>${
    items.length
      ? items
          .slice(0, 150)
          .map(
            (s) =>
              `<div class="library-item"><button class="library-preview" data-action="preview" data-id="${esc(s.Id)}"><span class="small-glyph ${s.Player ? "green" : ""}">${icon(tab === "spells" ? "Sparkles" : s.Player ? "Shield" : "Swords", 17)}</span><span><strong>${esc(s.Name)}</strong><small>${tab === "spells" ? `Level ${num(s.Level)} · ${esc(s.School)}` : s.Player ? "Party character" : esc(s.Path || (s.Id.startsWith("creatures-") ? "SRD 2024 · " : "") + "CR " + (s.Challenge || "—"))}</small></span></button>${tab !== "spells" ? btn("add", "", "Plus", "add-button", `data-id="${esc(s.Id)}" aria-label="Add ${esc(s.Name)}"`) : ""}</div>`,
          )
          .join("")
      : `<div class="empty-library">${icon("Search", 26)}<p>No results.</p><small>Try another name or source.</small></div>`
  }${items.length > 150 ? '<p class="list-hint">Refine your search to see more results.</p>' : ""}`;
}
function renderCombatant(c: Combatant, active: boolean) {
  return `<article class="combatant ${active ? "current" : ""} ${selected === c.id ? "selected" : ""} ${c.hp === 0 ? "fallen" : ""}"><div class="initiative"><input type="number" min="-99" max="999" value="${c.initiative}" data-field="initiative" data-id="${c.id}" aria-label="Initiative for ${esc(c.name)}"></div><button class="combatant-identity" data-action="select" data-id="${c.id}">${avatar(c)}<span><strong>${esc(c.name)} ${c.hidden ? icon("EyeOff", 12) : ""}</strong><small>${active ? '<span class="turn-label">Current turn</span>' : c.side === "ally" ? "Ally" : "Enemy"}${c.conditions.length ? " · " + esc(c.conditions.join(", ")) : ""}${c.hp === 0 ? " · Down" : ""}</small></span></button><button class="hp-cell" data-action="hp" data-id="${c.id}" aria-label="Change HP for ${esc(c.name)}"><span><strong>${c.hp}</strong><small>/ ${c.maxHp}</small>${c.tempHp ? `<em>+${c.tempHp}</em>` : ""}</span><div class="hp-track"><i class="${c.hp / c.maxHp <= 0.25 ? "critical" : c.side}" style="width:${(c.hp / c.maxHp) * 100}%"></i></div></button><div class="armor">${icon("Shield", 14)}${c.ac}</div>${btn("combatant-menu", "", "MoreHorizontal", "icon-button", `data-id="${c.id}" aria-label="Options for ${esc(c.name)}"`)}</article>`;
}
function renderDetails() {
  const c = selectedC();
  if (!c)
    return `<div class="panel-title"><div><h2>Combat sheet</h2></div>${icon("BookOpen", 20)}</div><div class="detail-empty">${icon("BookOpen", 42)}<h3>Select a combatant</h3><p>Select a combatant to view their stat block, actions, and conditions.</p></div>`;
  return `<div class="detail-header">${btn("back-to-combat", "Combat", "ChevronLeft", "back-to-combat text-button")}<h3>Sheet</h3>${btn("edit", "", "Pencil", "icon-button", `data-id="${c.id}" aria-label="Edit combatant"`)}</div><div class="detail-identity">${avatar(c, true)}<span class="badge ${c.side}">${c.side === "ally" ? "Ally" : "Enemy"}</span><h2>${esc(c.name)}</h2><p>${esc(c.stat.Type || "Custom combatant")}</p></div><div class="stat-tiles"><div>${icon("Heart", 16)}<strong>${c.hp}<small>/${c.maxHp}</small></strong><span>HP</span></div><div>${icon("Shield", 16)}<strong>${c.ac}</strong><span>AC</span></div><div>${icon("Zap", 16)}<strong>${num(c.stat.InitiativeModifier) >= 0 ? "+" : ""}${num(c.stat.InitiativeModifier)}</strong><span>Initiative</span></div></div><div class="detail-content"><div class="section-line"><h3>Conditions</h3>${btn("conditions", "", "Plus", "tiny-button", 'aria-label="Add condition"')}</div><div class="condition-tags">${c.conditions.length ? c.conditions.map((x) => btn("remove-condition", esc(x) + " ×", undefined, "condition-chip", `data-condition="${esc(x)}"`)).join("") : '<span class="muted">No active conditions</span>'}</div><div class="reaction-row"><span>Reaction available</span><button class="toggle ${!c.reaction ? "on" : ""}" data-action="reaction" role="switch" aria-checked="${!c.reaction}" aria-label="Reaction available"><i></i></button></div>${renderStat(c.stat)}<h3>Combatant notes</h3><textarea id="combatant-notes" placeholder="Concentration, objectives, reminders…">${esc(c.notes)}</textarea></div>`;
}
function renderStat(s: StatBlock) {
  return `${s.Speed?.length ? `<p class="speed"><strong>Speed</strong> ${esc(s.Speed.join(", "))}</p>` : ""}${
    s.Abilities
      ? `<div class="abilities">${Object.entries(s.Abilities)
          .map(
            ([k, v]) =>
              `<button data-action="ability" data-score="${num(v)}" data-ability="${esc(k)}"><span>${esc(({ Str: "STR", Dex: "DEX", Con: "CON", Int: "INT", Wis: "WIS", Cha: "CHA" } as Record<string, string>)[k] || k)}</span><strong>${num(v)}</strong><small>${Math.floor((num(v) - 10) / 2) >= 0 ? "+" : ""}${Math.floor((num(v) - 10) / 2)}</small></button>`,
          )
          .join("")}</div>`
      : ""
  }${["Saves", "Skills"].map((k, i) => (Array.isArray(s[k]) && (s[k] as any[]).length ? `<p class="stat-line"><b>${i ? "Skills" : "Saving Throws"}.</b> ${(s[k] as any[]).map((v) => esc(v.Name) + " " + (num(v.Modifier) >= 0 ? "+" : "") + num(v.Modifier)).join(", ")}</p>` : "")).join("")}${["DamageResistances", "DamageImmunities", "ConditionImmunities", "DamageVulnerabilities", "Senses", "Languages"].map((k, i) => (Array.isArray(s[k]) && (s[k] as string[]).length ? `<p class="stat-line"><b>${["Resistances", "Damage Immunities", "Condition Immunities", "Vulnerabilities", "Senses", "Languages"][i]}.</b> ${esc((s[k] as string[]).join(", "))}</p>` : "")).join("")}${[
    ["Traits", "Traits"],
    ["Actions", "Actions"],
    ["BonusActions", "Bonus Actions"],
    ["Reactions", "Reactions"],
    ["MythicActions", "Mythic Actions"],
    ["LegendaryActions", "Legendary Actions"],
  ]
    .map(([key, label]) =>
      Array.isArray(s[key]) && (s[key] as any[]).length
        ? `<h3 class="feature-heading">${label}</h3>${(s[key] as any[]).map((f: any) => `<details class="feature" ${key === "Actions" ? "open" : ""}><summary>${esc(f.Name)}${icon("ChevronDown", 14)}</summary><p>${esc(f.Content)}</p></details>`).join("")}`
        : "",
    )
    .join("")}${s.Description ? `<h3>Description</h3><p class="stat-description">${esc(s.Description)}</p>` : ""}`;
}
function renderSaved() {
  return `<section class="saved-grid">${state.saved.length ? state.saved.map((e) => `<article class="saved-card panel"><span class="saved-icon">${icon("Layers", 22)}</span><h2>${esc(e.name)}</h2><p>${e.combatants.length} combatants · ${e.started ? "Round " + e.round : "Preparation"}</p><div>${btn("load", "Open encounter", "ArrowUpRight", "primary", `data-id="${e.id}"`)}${btn("delete-saved", "", "Trash2", "icon-button", `data-id="${e.id}" aria-label="Delete ${esc(e.name)}"`)}</div></article>`).join("") : `<div class="saved-empty panel">${icon("Layers", 36)}<h2>No saved encounters</h2><p>Save an encounter at the table to return to it later.</p>${btn("view-combat", "Back to table", "Swords", "primary")}</div>`}</section>`;
}
function hpModal(c: Combatant) {
  selected = c.id;
  openModal(
    "Hit Points",
    `<div class="hp-modal-identity">${avatar(c)}<div><strong>${esc(c.name)}</strong><p>${c.hp} / ${c.maxHp} HP${c.tempHp ? " · " + c.tempHp + " temporary" : ""}</p></div></div><form id="hp-form"><label>Amount<input name="amount" type="number" min="0" max="999999" value="1" required autofocus></label><div class="modal-actions three"><button name="mode" value="damage" class="danger" type="submit">${icon("Swords")}Apply damage</button><button name="mode" value="heal" class="primary" type="submit">${icon("Heart")}Heal</button><button name="mode" value="temp" class="secondary" type="submit">+ Temporary</button></div></form>`,
  );
}
function featureFields(key: string, features: any[] = []) {
  return `<details class="edit-features"><summary>${({ Traits: "Traits", Actions: "Actions", BonusActions: "Bonus Actions", Reactions: "Reactions", LegendaryActions: "Legendary Actions" } as Record<string, string>)[key]}</summary><div data-feature-list="${key}">${features.map((f) => featureRow(key, f)).join("")}</div>${btn("add-feature", "Add", "Plus", "text-button", `type="button" data-kind="${key}"`)}</details>`;
}
function featureRow(key: string, f: any = {}) {
  return `<div class="feature-row"><input type="hidden" name="${key}Original" value="${esc(JSON.stringify(f))}"><div><input name="${key}Name" aria-label="Action name" placeholder="Name" value="${esc(f.Name)}">${btn("remove-feature", "", "X", "icon-button", 'type="button" aria-label="Remove action"')}</div><textarea name="${key}Content" aria-label="Action description" placeholder="Description, attack, damage, or effect">${esc(f.Content)}</textarea></div>`;
}
function formCreature(c?: Combatant, s?: StatBlock) {
  const stat = c?.stat || s;
  editingStat = stat;
  openModal(
    c ? "Edit combatant" : s ? "Edit stat block" : "Create combatant",
    `<form id="creature-form" data-add="${!s && !c}" data-combatant="${c?.id || ""}" data-library="${s?.Id || ""}"><div class="form-grid"><label class="full">Name<input name="name" value="${esc(c?.name || stat?.Name || "")}" maxlength="120" required autofocus></label><label>Side<select name="side"><option value="enemy">Enemy</option><option value="ally" ${c?.side === "ally" || stat?.Player ? "selected" : ""}>Ally</option></select></label><label>Type<input name="type" value="${esc(stat?.Type || "")}" placeholder="Humanoid, undead…"></label><label>Max HP<input name="hp" type="number" min="1" max="999999" value="${c?.maxHp || stat?.HP?.Value || 10}" required></label><label>Armor Class<input name="ac" type="number" min="0" max="999" value="${c?.ac ?? stat?.AC?.Value ?? 10}" required></label><label>Initiative bonus<input name="modifier" type="number" min="-99" max="99" value="${num(stat?.InitiativeModifier)}" required></label><label>Current initiative<input name="initiative" type="number" min="-99" max="999" value="${c?.initiative ?? 0}" required></label><label class="full">Description<textarea name="description">${esc(stat?.Description || "")}</textarea></label></div><div class="edit-abilities">${["Str", "Dex", "Con", "Int", "Wis", "Cha"].map((k, i) => `<label>${["STR", "DEX", "CON", "INT", "WIS", "CHA"][i]}<input name="ability-${k}" type="number" min="1" max="99" value="${num(stat?.Abilities?.[k], 10)}" required></label>`).join("")}</div>${["Traits", "Actions", "BonusActions", "Reactions", "LegendaryActions"].map((k) => featureFields(k, (stat?.[k] as any[]) || [])).join("")}<div class="modal-actions">${btn("close", "Cancel", undefined, "secondary", 'type="button"')}<button type="submit" class="primary">${icon("Check")}${c || s ? "Save changes" : "Create and add"}</button></div></form>`,
  );
}
function formSpell(s?: Spell) {
  openModal(
    s ? "Edit spell" : "Create spell",
    `<form id="spell-form" data-id="${s && !s.Id.startsWith("spells-") ? esc(s.Id) : ""}"><div class="form-grid"><label class="full">Name<input name="name" value="${esc(s?.Name)}" required maxlength="120"></label><label>Level<input name="level" type="number" min="0" max="9" value="${s?.Level || 0}" required></label><label>School<input name="school" value="${esc(s?.School)}" required></label><label>Casting time<input name="casting" value="${esc(s?.CastingTime || "1 action")}" required></label><label>Range<input name="range" value="${esc(s?.Range)}" required></label><label>Duration<input name="duration" value="${esc(s?.Duration)}" required></label><label>Components<input name="components" value="${esc(s?.Components)}"></label><label class="full">Description<textarea name="description" rows="7" required>${esc(s?.Description)}</textarea></label></div><div class="modal-actions"><button class="primary">Save spell</button></div></form>`,
  );
}
function previewModal(s: StatBlock | Spell) {
  preview = s;
  const spell = "Level" in s;
  openModal(
    esc(s.Name),
    spell
      ? `<p class="muted">Level ${num(s.Level)} · ${esc(s.School)}</p><div class="spell-meta">${[
          ["Casting", s.CastingTime],
          ["Range", s.Range],
          ["Duration", s.Duration],
          ["Components", s.Components],
        ]
          .map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
          .join(
            "",
          )}</div><p class="spell-description">${esc(s.Description)}</p><div class="modal-actions">${btn("edit-spell", state.spells.some((x) => x.Id === s.Id) ? "Edit spell" : "Create copy", "Pencil", "secondary")}</div>`
      : `<p class="muted">${esc(s.Type)}</p><div class="preview-stats"><span>HP <b>${num((s as StatBlock).HP?.Value, 1)}</b></span><span>AC <b>${num((s as StatBlock).AC?.Value, 10)}</b></span><span>CR <b>${esc(s.Challenge || "—")}</b></span></div>${renderStat(s as StatBlock)}<div class="modal-actions">${btn("edit-library", state.library.some((x) => x.Id === s.Id) ? "Edit stat block" : "Create copy", "Pencil", "secondary")}${btn("add-preview", "Add to encounter", "Plus", "primary")}</div>`,
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
  }, `${s.Name} joined the encounter.`);
  toast(`${s.Name} added.`);
}
function settings() {
  openModal(
    "Data and backups",
    `<div class="settings-section"><h3>${icon("Database")} Local storage</h3><p>Encounters, stat blocks, spells, and notes are saved in this browser. Export backups to move your campaign to another device.</p><div class="settings-metrics"><div><b>${state.library.length}</b><span>personal stat blocks</span></div><div><b>${base.length}</b><span>SRD creatures</span></div><div><b>${allSpells().length}</b><span>spells</span></div></div><div class="settings-actions">${btn("export", "Export backup", "Download", "primary")}${btn("import", "Import JSON", "Upload", "secondary")}</div><input type="file" id="import-file" accept=".json,application/json" hidden><p class="small muted">Accepts RoundKeep backups and Improved Initiative exports. Import is validated before changing your data.</p></div><div class="settings-section"><h3>Source backup</h3><p>${state.sourceBackup ? "The full Improved Initiative backup was preserved, including settings and source fields." : "No Improved Initiative backup imported."}</p>${state.sourceBackup ? btn("export-original", "Download original backup", "Download", "secondary") : ""}</div><div class="settings-section"><h3>Content and credits</h3><p>Custom interface and combat engine. SRD 5.2 (2024) creatures via Open5e, under CC BY 4.0. Basic rules spells distributed by Evan Bailey's Improved Initiative project. Rule text kept in the source language.</p><a href="/credits.html" target="_blank" rel="noopener">Credits and licenses</a><br><a href="/SRD-OGL_V1.1.pdf" target="_blank" rel="noopener">Open Gaming License / SRD ${icon("ArrowUpRight", 14)}</a></div>`,
  );
  const appearance = `<div class="settings-section theme-section"><h3>${icon("Settings2")} Appearance</h3><p>Choose light, dark, or follow your operating system theme automatically.</p><label class="theme-control">Interface theme<select id="theme-preference" aria-label="Interface theme"><option value="system" ${themePreference === "system" ? "selected" : ""}>Use system theme</option><option value="light" ${themePreference === "light" ? "selected" : ""}>Light</option><option value="dark" ${themePreference === "dark" ? "selected" : ""}>Dark</option></select></label></div>`;
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
  toast("Backup exported.");
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
      change(() => advance(e), e.started ? "Next turn." : "Combat started.");
      break;
    case "end-combat":
      openModal(
        "End combat?",
        `<p>Initiative order, hit points, and conditions will be kept for your next preparation.</p><div class="modal-actions">${btn("close", "Continue combat", undefined, "secondary")}${btn("confirm-end", "End combat", "Flag", "primary")}</div>`,
      );
      break;
    case "confirm-end":
      closeModal();
      change(() => {
        e.started = false;
        e.round = 0;
        e.activeId = null;
      }, "Combat ended.");
      break;
    case "previous":
      change(() => advance(e, -1), "Returned to previous turn.");
      break;
    case "roll-initiative":
      change(() => {
        for (const c of e.combatants) c.initiative = roll("1d20").total + num(c.stat.InitiativeModifier);
      }, "Initiative rolled.");
      toast("Initiative rolled.");
      break;
    case "undo": {
      const previous = history.pop();
      if (previous) {
        state.encounter = previous;
        persist();
        render();
        toast("Last action undone.");
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
          "Conditions",
          `<div class="condition-picker">${["Frightened", "Grappled", "Stunned", "Prone", "Blinded", "Charmed", "Poisoned", "Restrained", "Incapacitated", "Unconscious", "Invisible", "Paralyzed", "Petrified", "Deafened", "Concentration", "Exhaustion"].map((x) => btn("toggle-condition", esc(x), c.conditions.includes(x) ? "Check" : "Plus", c.conditions.includes(x) ? "selected" : "", `data-condition="${x}" aria-pressed="${c.conditions.includes(x)}"`)).join("")}</div><form id="condition-form"><label>Custom condition<input name="condition" maxlength="60" placeholder="e.g. Hunter's mark" required></label><button class="primary">Add</button></form>`,
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
          `<div class="menu-actions">${btn("edit", "Edit combatant", "Pencil", "secondary")}${btn("hp", "Damage, healing, and temp HP", "Heart", "secondary")}${btn("conditions", "Manage conditions", "Sparkles", "secondary")}${btn("duplicate", "Duplicate combatant", "Copy", "secondary")}${btn("hide", c.hidden ? "Show to players" : "Hide from players", c.hidden ? "Eye" : "EyeOff", "secondary")}${btn("remove", "Remove from encounter", "Trash2", "danger")}</div>`,
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
        }, `${c.name} duplicated.`);
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
        }, `${c.name} removed from encounter.`);
      }
      break;
    case "add-party": {
      const party = state.library.filter((s) => s.Player && !e.combatants.some((c) => c.stat.Id === s.Id));
      if (!party.length) {
        toast("No new heroes to add. Create an ally stat block.");
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
      }, "Party added to encounter.");
      break;
    }
    case "rename":
      openModal(
        "Encounter name",
        `<form id="rename-form"><label>Name<input name="name" value="${esc(e.name)}" maxlength="120" required autofocus></label><div class="modal-actions"><button class="primary">Save name</button></div></form>`,
      );
      break;
    case "notes":
      openModal(
        "DM notes",
        `<form id="notes-form"><p class="muted">Visible only at your table.</p><textarea name="notes" rows="9" placeholder="Prepare the scene, objectives, and surprises…">${esc(e.notes)}</textarea><div class="modal-actions"><button class="primary">Save notes</button></div></form>`,
      );
      break;
    case "save": {
      const copy = structuredClone(e),
        idx = state.saved.findIndex((s) => s.id === copy.id);
      if (idx >= 0) state.saved[idx] = copy;
      else state.saved.push(copy);
      persist();
      render();
      toast("Encounter saved to your collection.");
      break;
    }
    case "new":
      openModal(
        "A new encounter",
        `<p>The current encounter will be saved to your collection before opening the new table.</p><form id="new-form"><label>Name<input name="name" placeholder="e.g. Roadside ambush" value="New encounter" maxlength="120" required></label><div class="modal-actions"><button class="primary">Create encounter</button></div></form>`,
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
        "Delete saved encounter?",
        `<p>The encounter in progress will not be changed. Export a backup if you want to keep this copy.</p><div class="modal-actions">${btn("close", "Cancel", undefined, "secondary")}${btn("confirm-delete-saved", "Delete saved copy", "Trash2", "danger", `data-id="${el.dataset.id}"`)}</div>`,
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
        "Roll dice",
        `<form id="dice-form"><label>Roll<input name="expression" value="1d20" placeholder="2d6+3" required autofocus></label><div class="dice-presets">${[4, 6, 8, 10, 12, 20, 100].map((n) => btn("dice-preset", "d" + n, undefined, "secondary", `type="button" data-die="${n}"`)).join("")}</div><button class="primary" type="submit">${icon("Dices")} Roll dice</button></form><div id="dice-result" aria-live="polite" class="dice-result"></div>`,
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
        toast("Import complete.");
      }
      break;
    case "help":
      openModal(
        "Your table, simplified",
        `<div class="help-list"><p><kbd>⌘ K</kbd> Search and quick actions</p><p><kbd>N</kbd> Advance turn</p><p><kbd>/</kbd> Search library</p><p><kbd>D</kbd> Open dice roller</p><p><kbd>Ctrl / ⌘ + Z</kbd> Undo a combat action</p><p>Click initiative to edit it. Click HP to apply damage or healing. Player view hides notes, AC, and exact HP.</p><p>The player window syncs in this same browser and device. It is not a remote session link.</p></div>`,
      );
      break;
    case "player":
      window.open("/?player", "roundkeep-player-view");
      break;
    case "log":
      openModal(
        "Encounter history",
        `<ol class="log-list">${e.log.length ? e.log.map((x) => `<li>${esc(x)}</li>`).join("") : "<li>No actions recorded yet.</li>"}</ol>`,
      );
      break;
    case "demo":
      change(() => {
        e.name = "Roadside ambush";
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
            Name: "Aria, the ranger",
            Type: "Elf · Ranger",
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
      }, "Demo added.");
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
    .catch((err) => toast(err.message || "Could not complete the action."))
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
          ? "Theme synced with system."
          : `${el.value === "dark" ? "Dark" : "Light"} theme applied.`,
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
      if (file.size > 20_000_000) throw new Error("File must be under 20 MB.");
      const raw = JSON.parse(await file.text());
      if (raw?.version === 1) pendingImport = validateState(raw);
      else {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Unrecognized format.");
        const imported = importOriginal(raw);
        if (!imported.library.length && !imported.spells.length && !imported.saved.length && !imported.encounter)
          throw new Error("No compatible data found.");
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
        "Review import",
        `<p>The file contains ${pendingImport.library.length} personal stat blocks, ${pendingImport.spells.length} personal spells, and ${pendingImport.saved.length} saved encounters.</p><p>Export the current version before confirming if you want to keep it.</p><div class="modal-actions">${btn("export", "Current backup", "Download", "secondary")}${btn("confirm-import", "Confirm import", "Check", "primary")}</div>`,
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
          Source: "My library",
        };
        if (!spell.Name) throw new Error("Enter a name.");
        const index = state.spells.findIndex((s) => s.Id === spell.Id);
        if (index >= 0) state.spells[index] = spell;
        else state.spells.push(spell);
        closeModal();
        persist();
        render();
        toast("Spell saved.");
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
          `${c.name}: ${amount} ${mode === "damage" ? "damage" : mode === "heal" ? "healing" : "temporary HP"}.`,
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
        if (!stat.Name) throw new Error("Enter a name.");
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
        }, `${stat.Name}: stat block saved.`);
        break;
      }
      case "rename-form": {
        const name = value("name").trim();
        if (!name) throw new Error("Enter a name.");
        closeModal();
        change(() => (state.encounter.name = name));
        break;
      }
      case "new-form": {
        const name = value("name").trim();
        if (!name) throw new Error("Enter a name.");
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
  app.innerHTML = `<main class="player-screen"><div class="wordmark">ROUNDKEEP<span>Player view</span></div><p class="muted">${p.round ? "Round " + p.round : "Preparation"}</p><h1>${esc(p.name)}</h1><div class="player-list">${p.combatants.map((c: any) => `<article class="player-card ${c.id === p.activeId ? "current" : ""}"><span class="player-initiative">${num(c.initiative)}</span><div><h2>${esc(c.name)}</h2><p>${esc(c.health)}${c.conditions.length ? " · " + esc(c.conditions.join(", ")) : ""}</p></div>${c.id === p.activeId ? '<span class="turn-label">Current turn</span>' : ""}</article>`).join("") || "<p>Waiting for combatants…</p>"}</div><p class="muted">Local sync · keep the DM table open in this browser.</p></main>`;
}
async function init() {
  document.documentElement.classList.add("is-loading");
  if (playerMode) {
    app.innerHTML = '<div class="boot">ROUNDKEEP<br><small>Waiting for the DM table…</small></div>';
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
      '<div class="boot">Storage unavailable.<small>Your data was not changed. Reopen this page when the browser allows access.</small></div>';
    return;
  }
  if (stored) {
    try {
      state = validateState(stored);
    } catch {
      app.innerHTML = `<div class="boot">Your backup needs attention.<small>Existing data was preserved. Export it before attempting recovery.</small><button id="recover-backup" class="primary">Download data for recovery</button></div>`;
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
        state.encounter.name = "New encounter";
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
    toast("Part of the catalogue failed to load. Your personal stat blocks remain available.");
  if (import.meta.env.PROD && "serviceWorker" in navigator)
    navigator.serviceWorker.register("/sw.js").catch(() => toast("Offline cache unavailable in this browser."));
}
async function start() {
  if (playerMode || !navigator.locks) return init();
  await navigator.locks.request("roundkeep-master", { ifAvailable: true }, async (lock) => {
    if (!lock) {
      app.innerHTML =
        '<div class="boot">Your table is already open.<small>Use the first tab to edit. This prevents conflicting changes.</small><a class="primary" href="/?player">Open player view</a><button class="secondary" onclick="location.reload()">Try again</button></div>';
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
  app.innerHTML = `<div class="boot">Could not open the table.<br><small>${esc(err.message)}</small><button onclick="location.reload()">Try again</button></div>`;
});
