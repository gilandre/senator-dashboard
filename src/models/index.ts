/**
 * Ce fichier centralise l'importation et l'exportation de tous les modèles
 * pour garantir que tous les modèles sont correctement enregistrés avant d'être utilisés
 */

// Importer tous les modèles
import User from './User';
import Profile from './Profile';
import SecurityIncident from './SecurityIncident';
import Module from './Module';
import Permission from './Permission';
import PasswordHistory from './PasswordHistory';
import SecuritySettings from './SecuritySettings';
import Role from './Role';
import UserActivity from './UserActivity';
import Holiday from './Holiday';
import AttendanceConfig from './AttendanceConfig';
import AccessLog from './AccessLog';
import Employee from './Employee';

// Exporter tous les modèles
export {
  User,
  Profile,
  SecurityIncident,
  Module,
  Permission,
  PasswordHistory,
  SecuritySettings,
  Role,
  UserActivity,
  Holiday,
  AttendanceConfig,
  AccessLog,
  Employee
};

// Exporter un objet avec tous les modèles pour faciliter l'importation
const models = {
  User,
  Profile,
  SecurityIncident,
  Module,
  Permission,
  PasswordHistory,
  SecuritySettings,
  Role,
  UserActivity,
  Holiday,
  AttendanceConfig,
  AccessLog,
  Employee
};

export default models; 