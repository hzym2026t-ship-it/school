import "server-only";

/** Request time, read once per render outside the component body. */
export async function currentTime(): Promise<number> {
  return Date.now();
}
