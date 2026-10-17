import { PreprodCommandCenter } from "@/components/PreprodCommandCenter";
export const metadata = { title: "Portfolio | Symbiotic V2", description: "Read-only Cardano Preprod wallet portfolio and transaction activity." };
export default function PortfolioPage() { return <PreprodCommandCenter view="portfolio" />; }
