export const TRANSACTIONS_UPDATED_EVENT = "transactionsUpdated";
export const TRANSACTIONS_UPDATED_STORAGE_KEY = "transactionsUpdated";
export const LIVE_UPDATES_CHANNEL = "dashboard-updates";

export const emitTransactionsUpdated = () => {
  const timestamp = Date.now();

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TRANSACTIONS_UPDATED_STORAGE_KEY, String(timestamp));
  } catch {
    // Ignore storage write failures.
  }

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(LIVE_UPDATES_CHANNEL);
    channel.postMessage({ type: TRANSACTIONS_UPDATED_EVENT, timestamp });
    channel.close();
  }

  window.dispatchEvent(new CustomEvent(TRANSACTIONS_UPDATED_EVENT, { detail: timestamp }));
};
