// fetch for server-side Supabase calls that retries when the connection
// itself fails (slow DNS, connect timeout). These errors happen before the
// request reaches Supabase, so retrying is safe even for sign-in.
const RETRYABLE = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ETIMEDOUT",
]);

function causeCode(e: unknown): string | undefined {
  const cause = (e as { cause?: { code?: string } })?.cause;
  return cause?.code;
}

export const resilientFetch: typeof fetch = async (input, init) => {
  const attempts = 3;
  for (let i = 1; ; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      const code = causeCode(e);
      if (i >= attempts || !code || !RETRYABLE.has(code)) throw e;
      console.warn(`[supabase] connection failed (${code}), retry ${i}/${attempts - 1}`);
      await new Promise((r) => setTimeout(r, 300 * i));
    }
  }
};
