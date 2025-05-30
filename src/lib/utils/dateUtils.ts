export function validateDateFormat(dateStr: string, format: string = 'DD/MM/YYYY HH:mm:ss'): boolean {
  // Accepter deux formats possibles: avec ou sans secondes
  const regexWithSeconds = /^(\d{2}\/(\d{2})\/(\d{4}) \d{2}:\d{2}:\d{2})$/;
  const regexWithoutSeconds = /^(\d{2}\/(\d{2})\/(\d{4}) \d{2}:\d{2})$/;
  
  if (!regexWithSeconds.test(dateStr) && !regexWithoutSeconds.test(dateStr)) {
    return false;
  }

  // Extraire les parties date et heure
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('/');
  
  // Normaliser le format d'heure pour l'analyse
  const normalizedTimePart = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
  const [hours, minutes, seconds] = normalizedTimePart.split(':');
  
  // Créer et vérifier la date
  const date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
  
  return (
    date.getDate() === parseInt(day) &&
    date.getMonth() + 1 === parseInt(month) &&
    date.getFullYear() === parseInt(year)
  );
}

export function parseDate(dateStr: string): Date {
  // Si le format est incorrect, lancer une erreur
  if (!validateDateFormat(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY HH:mm:ss or DD/MM/YYYY HH:mm`);
  }

  // Normaliser le format d'heure
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('/');
  const normalizedTimePart = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
  const [hours, minutes, seconds] = normalizedTimePart.split(':');
  
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
}