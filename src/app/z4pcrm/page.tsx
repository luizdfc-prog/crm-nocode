import { Navbar } from "@/components/features/landing/Navbar";
import { Hero } from "@/components/features/landing/Hero";
import { Features } from "@/components/features/landing/Features";
import { Pricing } from "@/components/features/landing/Pricing";
import { CTAFinal } from "@/components/features/landing/CTAFinal";
import { Footer } from "@/components/features/landing/Footer";

export default function LandingPage() {
  return (
    <div style={{ background: "#0C0C0E", minHeight: "100vh" }}>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
