import dns, { type LookupAddress, type LookupOptions } from "node:dns";

/**
 * Makes DNS resolution for outgoing requests (Supabase) resilient on
 * networks where the system resolver intermittently stalls or fails
 * (EAI_AGAIN / ENOTFOUND / slow lookups):
 *  - a successful answer is cached and reused, refreshed in the background;
 *  - if the system resolver fails and nothing is cached, public DNS is tried.
 * Patches dns.lookup, which Node's fetch uses to open connections.
 */
const FRESH_MS = 5 * 60_000;
const cache = new Map<string, { addrs: LookupAddress[]; at: number }>();
const publicResolver = new dns.promises.Resolver({ timeout: 4000, tries: 2 });
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

type Callback = (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void;

let installed = false;

export function installDnsCache() {
  if (installed) return;
  installed = true;
  const original = dns.lookup.bind(dns) as (
    host: string,
    opts: LookupOptions & { all: true },
    cb: (err: NodeJS.ErrnoException | null, addrs: LookupAddress[]) => void,
  ) => void;

  const resolve = (host: string, done: (err: NodeJS.ErrnoException | null, addrs?: LookupAddress[]) => void) => {
    original(host, { all: true }, (err, addrs) => {
      if (!err && addrs?.length) {
        cache.set(host, { addrs, at: Date.now() });
        return done(null, addrs);
      }
      const stale = cache.get(host);
      if (stale) return done(null, stale.addrs);
      publicResolver
        .resolve4(host)
        .then((ips) => {
          const list = ips.map((address) => ({ address, family: 4 }));
          cache.set(host, { addrs: list, at: Date.now() });
          done(null, list);
        })
        .catch(() => done(err));
    });
  };

  const patched = (host: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === "function" ? options : callback) as Callback;
    const opts: LookupOptions =
      typeof options === "number" ? { family: options } : typeof options === "object" && options ? options : {};

    const reply = (addrs: LookupAddress[]) => {
      let list = addrs;
      if (opts.family === 4 || opts.family === 6) list = addrs.filter((a) => a.family === opts.family);
      if (!list.length) list = addrs;
      if (opts.all) cb(null, list);
      else cb(null, list[0].address, list[0].family);
    };

    const hit = cache.get(host);
    if (hit) {
      reply(hit.addrs);
      if (Date.now() - hit.at > FRESH_MS) resolve(host, () => {}); // refresh in background
      return;
    }
    resolve(host, (err, addrs) => (err || !addrs ? cb(err) : reply(addrs)));
  };

  (dns as unknown as { lookup: typeof patched }).lookup = patched;
}

/** Resolve a host once so the first real request doesn't wait on DNS. */
export function warmDns(host: string) {
  dns.lookup(host, { all: true }, () => {});
}
