import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Expert } from "@/components/Expert";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Features />
      <Expert />
      <Footer />
    </div>
  );
};

export default Index;