import { Button } from "@/components/ui/button";
import { Calendar, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";

export const Expert = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="/placeholder.svg"
              alt="Andres Velarde"
              className="rounded-2xl shadow-xl"
              width={400}
              height={500}
            />
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-6">Meet Our Expert</h2>
            <h3 className="text-2xl font-semibold mb-4">Andres Velarde</h3>
            <p className="text-gray-600 mb-6">
              With over 15 years of experience in real estate, Andres has helped countless clients make
              informed decisions about their property investments.
            </p>
            <div className="flex gap-4 mb-8">
              <a href="#" className="text-gray-600 hover:text-primary">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                <Linkedin className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-600 hover:text-primary">
                <Youtube className="h-6 w-6" />
              </a>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Calendar className="mr-2 h-4 w-4" /> Book a Consultation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};