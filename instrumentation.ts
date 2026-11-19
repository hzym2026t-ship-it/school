// Runs once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // On some networks DNS lookups stall or fail intermittently, so the
    // server can't reach Supabase ("fetch failed", EAI_AGAIN). Prefer IPv4,
    // cache resolved addresses, and resolve the Supabase host up front.
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
    const { installDnsCache, warmDns } = await import("./lib/dns-cache");
    installDnsCache();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) warmDns(new URL(url).hostname);
  }
}
