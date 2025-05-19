/**
 * Utilitaires pour la gestion des dates et heures
 */

/**
 * Convertit une chaîne de temps en objet Date
 * @param {string} timeStr - Chaîne de temps au format HH:MM:SS
 * @returns {Date} - Objet Date avec uniquement la partie temps
 */
function timeStringToDate(timeStr) {
  console.log('🔄 Conversion de la chaîne de temps en Date:', timeStr);
  
  try {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    console.log('⏰ Composants de temps:', { hours, minutes, seconds });
    
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    
    console.log('✅ Date créée:', date.toISOString());
    return date;
  } catch (error) {
    console.error('❌ Erreur lors de la conversion de la chaîne de temps:', error);
    throw error;
  }
}

/**
 * Convertit un objet Date en chaîne de temps
 * @param {Date} date - Objet Date
 * @returns {string} - Chaîne de temps au format HH:MM:SS
 */
function dateToTimeString(date) {
  console.log('🔄 Conversion de la Date en chaîne de temps:', date);
  
  try {
    const timeString = date.toTimeString().split(' ')[0];
    console.log('✅ Chaîne de temps créée:', timeString);
    return timeString;
  } catch (error) {
    console.error('❌ Erreur lors de la conversion de la Date en chaîne:', error);
    throw error;
  }
}

/**
 * Combine une date et une heure en un objet Date
 * @param {string|Date} date - Date au format YYYY-MM-DD ou objet Date
 * @param {string|Date} time - Heure au format HH:MM:SS ou objet Date
 * @returns {Date} - Objet Date combiné
 */
function combineDateAndTime(date, time) {
  console.log('🔄 Combinaison de la date et de l\'heure:', { date, time });
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    console.log('📅 Date convertie:', dateObj.toISOString());
    
    const timeObj = time instanceof Date ? time : timeStringToDate(time);
    console.log('⏰ Heure convertie:', timeObj.toTimeString());
    
    const result = new Date(dateObj);
    result.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds(), 0);
    
    console.log('✅ Date et heure combinées:', result.toISOString());
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la combinaison de la date et de l\'heure:', error);
    throw error;
  }
}

module.exports = {
  timeStringToDate,
  dateToTimeString,
  combineDateAndTime
}; 