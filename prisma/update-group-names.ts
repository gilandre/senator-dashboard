import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateGroupNames() {
  try {
    console.log('Mise à jour de la table group_name...')
    
    // Récupérer tous les noms de groupe uniques de la table access_logs
    const uniqueGroups = await prisma.$queryRaw<{group_name: string}[]>`
      SELECT DISTINCT group_name 
      FROM access_logs 
      WHERE group_name IS NOT NULL AND group_name != ''
      ORDER BY group_name
    `
    
    console.log(`${uniqueGroups.length} groupes uniques trouvés dans access_logs`)
    
    // Pour chaque groupe, vérifier s'il existe déjà et l'insérer si nécessaire
    let newGroupsCount = 0
    
    for (const group of uniqueGroups) {
      const groupName = group.group_name
      
      // Vérifier si le groupe existe déjà
      const existingGroup = await prisma.$queryRaw<{count: number}[]>`
        SELECT COUNT(*) as count FROM group_name WHERE name = ${groupName}
      `
      
      if (existingGroup[0].count === 0) {
        // Déterminer la date de première apparition dans les logs
        const firstSeen = await prisma.$queryRaw<{first_seen: Date}[]>`
          SELECT MIN(event_date) as first_seen
          FROM access_logs
          WHERE group_name = ${groupName}
        `
        
        // Créer l'entrée dans la table group_name
        await prisma.$executeRaw`
          INSERT INTO group_name (name, description, first_seen_date, created_at)
          VALUES (
            ${groupName},
            ${'Groupe importé depuis les logs d\'accès'},
            ${firstSeen[0]?.first_seen || new Date()},
            NOW()
          )
        `
        
        newGroupsCount++
        console.log(`Nouveau groupe ajouté: ${groupName}`)
      }
    }
    
    console.log(`Mise à jour terminée: ${newGroupsCount} nouveaux groupes ajoutés`)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des groupes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Si exécuté directement (pas importé comme module)
if (require.main === module) {
  updateGroupNames()
    .then(() => console.log('Script terminé avec succès'))
    .catch(e => {
      console.error('Erreur lors de l\'exécution du script:', e)
      process.exit(1)
    })
}

// Exporter la fonction pour pouvoir l'utiliser ailleurs (ex: après import de fichier)
export { updateGroupNames } 