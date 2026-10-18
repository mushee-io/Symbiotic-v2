/** Cloudflare Access machine-to-machine auth for the Ubuntu builder tunnel.
 * Keep credentials on Vercel only; never expose them as NEXT_PUBLIC variables.
 */
export function cloudflareBuilderAccess(env: Record<string, string | undefined>) {
  const id = env.SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_ID?.trim();
  const secret = env.SYMBIOTIC_BUILDER_CF_ACCESS_CLIENT_SECRET?.trim();
  if (Boolean(id) !== Boolean(secret)) throw new Error("Cloudflare Access service token must have both client ID and secret");
  if (!id || !secret) return {};
  if (/[\r\n]/.test(id) || /[\r\n]/.test(secret)) throw new Error("Invalid Cloudflare Access service token headers");
  return {"CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret};
}
