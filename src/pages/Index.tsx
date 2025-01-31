import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Expert } from "@/components/Expert";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Features />
      <Expert />
      <Footer />
    </div>
  );
};

export default Index;