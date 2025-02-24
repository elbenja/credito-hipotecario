import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/blocks/modern-hero";
import { Features } from "@/components/blocks/features";
import { Footer } from "@/components/blocks/footer";
import { SEO } from "@/components/seo";

export default function Index() {
  return (
    <>
      <SEO 
        title="CreditoHipotecar.io - Smart Mortgage Management"
        description="Manage your mortgage credits, property listings, and rental properties with our comprehensive tools. Calculate amortizations, track payments, and make informed decisions."
        type="website"
      />
      <Navigation />
      <Hero
        title="Manage your mortgage credits with confidence"
        description="Calculate amortizations, track payments, and make informed decisions with our comprehensive mortgage management tools."
        buttonText="Get Started"
      />
      <Features />
      <Footer />
    </>
  );
}