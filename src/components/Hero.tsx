import { Hero as ModernHero } from "@/components/blocks/modern-hero"

export const Hero = () => {
  const heroData = {
    title: "Make Smarter Real Estate Decisions",
    description: "AI-powered insights to help you navigate the real estate market with confidence",
    buttonText: "Get Started",
    avatars: [
      {
        src: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
        alt: "User 1"
      },
      {
        src: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
        alt: "User 2"
      },
      {
        src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
        alt: "User 3"
      },
      {
        src: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e",
        alt: "User 4"
      }
    ],
    rating: {
      value: 5.0,
      count: 200
    }
  };

  return <ModernHero {...heroData} />;
};