import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";

const read=(path:string)=>readFileSync(join(process.cwd(),path),"utf8");

test("homepage keeps the approved first video hero unchanged and places the light layout after it",()=>{
 const page=read("app/page.tsx");
 const hero=read("components/FluidHero.tsx");
 assert.ok(page.includes("<FluidHero/>"));
 assert.ok(page.includes("<SymbioticLanding/>"));
 assert.ok(page.indexOf("<FluidHero/>")<page.indexOf("<SymbioticLanding/>"));
 assert.ok(hero.includes("hf_20260428_193507_4286c423-2fd9-4efd-92bd-91a939453fc1.mp4"));
 assert.ok(hero.includes("Fluid Asset Streams"));
});

test("all below-hero sections use a unified pale canvas, not the old dark homepage layout",()=>{
 const page=read("app/page.tsx");
 const css=read("app/landing-v2.module.css");
 assert.ok(!page.includes("home.module.css"));
 assert.match(css,/\.landing\s*\{[\s\S]*?background:\s*#f5f5f5;/);
 assert.match(css,/\.flowSection\{[^}]*background:#f5f5f5;/);
 assert.match(css,/\.footer\{[^}]*background:#f5f5f5;/);
 assert.match(css,/@keyframes homepageMarquee/);
 assert.ok(css.includes("/fonts/tt-norms-pro-regular.woff2"));
 assert.ok(css.includes("/fonts/tt-norms-pro-semibold.woff2"));
});

test("light homepage contains the requested visuals, feature areas, and real Symbiotic routes",()=>{
 const landing=read("components/SymbioticLanding.tsx");
 for(const needle of [
  "hf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png",
  "hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4",
  "Meet<br/>Symbiotic V2",
  "id=\"markets\"","id=\"rwa\"","id=\"architecture\"",
  "id=\"risk\"","id=\"proof\"","id=\"roadmap\"",
  "/trade","/rwa","/folder/longbow","/folder/twofold",
  "/earn","/portfolio","/status/validators"
 ]){
  assert.ok(landing.includes(needle),"Missing Symbiotic homepage feature: "+needle);
 }
 assert.ok(!landing.includes("USD Halo"));
 assert.ok(!landing.includes("5.2K"));
 assert.ok(!landing.includes("Funded by premier partners"));
 assert.ok(landing.includes("not a list of investors or endorsements"));
});
