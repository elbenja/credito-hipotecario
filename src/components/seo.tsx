import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title: string
  description: string
  type?: string
  name?: string
}

export function SEO({ title, description, type = 'website', name = 'CreditoHipotecar.io' }: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <link rel="icon" href="/favicon.ico" />
    </Helmet>
  )
} 