/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'randomuser.me'],
  },
  // Redirections mises à jour
  async redirects() {
    return [
      // Rediriger de auth/login vers /login (standardisation)
      {
        source: '/auth/login',
        destination: '/login',
        permanent: true,
      },
      // Rediriger de auth/signin vers /login
      {
        source: '/auth/signin',
        destination: '/login',
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
    serverActions: {
      // Configuration d'actions serveur en tant qu'objet
      allowedOrigins: ['localhost:3010'],
    },
  },
  serverExternalPackages: ['mongoose', 'bcryptjs']
};

module.exports = nextConfig;