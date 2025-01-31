import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Home, Brain, TrendingUp } from "lucide-react";

const features = [
  {
    title: "Amortization Simulator",
    description: "Optimize your mortgage payments and see the impact of different down payments.",
    icon: Calculator,
  },
  {
    title: "Rent Return Simulator",
    description: "Calculate how long it takes to recover your investment through rental income.",
    icon: TrendingUp,
  },
  {
    title: "AI Real Estate Expert",
    description: "Get personalized insights and recommendations based on your goals.",
    icon: Brain,
  },
  {
    title: "Market Analysis",
    description: "Stay informed with real-time market trends and property valuations.",
    icon: Home,
  },
];

export const Features = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <h2 className="text-4xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};