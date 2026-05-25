// DeGENERATE → /submit handoff. The exported blob is too big for sessionStorage,
// so it rides through IndexedDB and is consumed exactly once by the submit form.
const DB_NAME = "degenerate";
const STORE = "handoff";
const KEY = "pending";

export type HandoffPayload = { blob: Blob; filename: string; mime: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable."));
  });
}

/** Stash an exported image for the submit form to pick up. */
export async function stashImage(payload: HandoffPayload): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Stash failed."));
    });
  } finally {
    db.close();
  }
}

/** Read and delete the pending image. Returns null if there is nothing waiting. */
export async function takeImage(): Promise<HandoffPayload | null> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  try {
    const payload = await new Promise<HandoffPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const getReq = store.get(KEY);
      getReq.onsuccess = () => {
        store.delete(KEY);
        resolve((getReq.result as HandoffPayload) ?? null);
      };
      getReq.onerror = () => reject(getReq.error ?? new Error("Read failed."));
    });
    return payload;
  } catch {
    return null;
  } finally {
    db.close();
  }
}
