import { Calculator, Building2, LineChart, Clock } from "lucide-react"

const features = [
  {
    name: "Amortization Calculator",
    description: "Calculate and compare different mortgage scenarios with our advanced amortization tools.",
    icon: Calculator,
  },
  {
    name: "Property Management",
    description: "Track your properties, costs, and mortgage details in one centralized dashboard.",
    icon: Building2,
  },
  {
    name: "Financial Analytics",
    description: "Get insights into your mortgage payments and property investments with detailed analytics.",
    icon: LineChart,
  },
  {
    name: "Real-time Updates",
    description: "Stay up to date with your mortgage payments and property performance.",
    icon: Clock,
  },
]

export function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to manage your mortgages
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Powerful tools to help you make informed decisions about your property investments.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.name} className="relative p-6 bg-white rounded-2xl shadow-sm ring-1 ring-slate-900/10">
              <div>
                <span className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-lg">
                  <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.name}</h3>
              <p className="mt-2 text-base text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 