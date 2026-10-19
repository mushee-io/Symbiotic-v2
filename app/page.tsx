import {FluidHero} from "@/components/FluidHero";
import {SymbioticLanding} from "@/components/SymbioticLanding";

/**
 * The original full-screen video hero stays unchanged.
 * Everything after it uses the unified light Symbiotic V2 design system.
 */
export default function HomePage(){
 return <main>
  <FluidHero/>
  <SymbioticLanding/>
 </main>;
}
