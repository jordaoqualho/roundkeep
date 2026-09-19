import type { State } from "./model";
let dbPromise: Promise<IDBDatabase>;
function db() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("roundkeep", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("data");
    };
    req.onsuccess = async () => {
      const database = req.result;
      try {
        const tx = database.transaction("data", "readonly");
        const existing = await new Promise((res) => {
          const r = tx.objectStore("data").get("state");
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(undefined);
        });
        if (!existing && typeof indexedDB.databases === "function") {
          const dbs = await indexedDB.databases();
          if (dbs.some((d) => d.name === "patron")) {
            const oldReq = indexedDB.open("patron", 1);
            oldReq.onsuccess = () => {
              const oldDb = oldReq.result;
              const oldTx = oldDb.transaction("data", "readonly");
              const oldStateReq = oldTx.objectStore("data").get("state");
              oldStateReq.onsuccess = () => {
                if (oldStateReq.result) {
                  const writeTx = database.transaction("data", "readwrite");
                  writeTx.objectStore("data").put(oldStateReq.result, "state");
                }
              };
            };
          }
        }
      } catch {}
      resolve(database);
    };
    req.onerror = () => reject(req.error);
  }));
}
export async function get<T>(key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const r = database.transaction("data").objectStore("data").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function put(key: string, value: unknown) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function catalogue<T>(name: string): Promise<T[]> {
  const key = "catalogue:2026-09-18-v2:" + name;
  let cached: T[] | undefined;
  try {
    cached = await get<T[]>(key);
  } catch {}
  if (cached) return cached;
  const r = await fetch("/data/" + name + ".json?v=2026-09-18-v2");
  if (!r.ok) throw new Error("Não foi possível carregar a biblioteca.");
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error("Catálogo inválido.");
  try {
    await put(key, data);
  } catch {}
  return data;
}
export async function saveState(state: State) {
  await put("state", state);
}
