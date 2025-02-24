import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  type?: string
  name?: string
  image?: string
}

export function SEO({ 
  title = "CreditoHipotecar.io - Smart Mortgage Management",
  description = "Manage your mortgage credits, property listings, and rental properties with our comprehensive tools. Calculate amortization, track rentals, and make informed property decisions.",
  type = "website",
  name = "CreditoHipotecar.io",
  image = "/lovable-uploads/a179b4ab-ef74-48e2-a2bd-1c7acb5526ed.png"
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="author" content={name} />
      <meta name="keywords" content="mortgage calculator, property management, real estate, amortization calculator, rental tracking, property investment" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={name} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Favicon */}
      <link rel="icon" type="image/png" href="/lovable-uploads/3be3c8e2-65ff-4336-b2bc-67ea41ebe61d.png" />
    </Helmet>
  )
} 