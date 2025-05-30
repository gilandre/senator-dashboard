// Section Configuration - Ajouter le lien vers la gestion des politiques de mot de passe
{
  name === 'settings' && role === 'admin' && (
    <>
      <SidebarItem
        Icon={FolderIcon}
        text="Données de référence"
        href="/settings/reference-data"
        isActive={pathname.startsWith('/settings/reference-data')}
      />
      <SidebarItem
        Icon={KeyIcon}
        text="Politiques de mot de passe"
        href="/settings/security/password-policies"
        isActive={pathname.startsWith('/settings/security/password-policies')}
      />
      <SidebarItem
        Icon={UsersIcon}
        text="Profils & Permissions"
        href="/settings/profiles"
        isActive={pathname.startsWith('/settings/profiles')}
      />
      {/* Autres éléments de configuration */}
    </>
  )
} 