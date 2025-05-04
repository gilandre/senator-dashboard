/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'randomuser.me'],
  },
  // Supprimer les redirections avec destinations incorrectes
  async redirects() {
    return [
      // Rediriger vers le dashboard après la connexion
      {
        source: '/auth/signin',
        destination: '/auth/login',
        permanent: true,
      },
      // Rediriger l'ancienne route de changement de mot de passe
      {
        source: '/auth/change-password',
        destination: '/first-password-change',
        permanent: false,
      },
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
}

module.exports = nextConfig 