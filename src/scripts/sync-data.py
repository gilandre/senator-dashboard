#!/usr/bin/env python3

import os
import sys
import logging
from datetime import datetime
import mysql.connector
from mysql.connector import Error
from typing import Dict, List, Optional, Tuple
import re

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/senator/sync-data.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Configuration de la base de données
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'senator'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'senator'),
    'port': int(os.getenv('DB_PORT', '3306'))
}

def get_db_connection() -> Optional[mysql.connector.MySQLConnection]:
    """Établit une connexion à la base de données."""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        logging.error(f"Erreur de connexion à la base de données: {e}")
        return None

def clean_text(text: str) -> str:
    """Nettoie le texte en supprimant les caractères spéciaux et en normalisant les espaces."""
    if not text:
        return 'N/A'
    # Supprimer les caractères spéciaux et les chiffres
    cleaned = re.sub(r'[^a-zA-Z\s]', '', text)
    # Normaliser les espaces
    cleaned = ' '.join(cleaned.split())
    return cleaned if cleaned else 'N/A'

def split_full_name(full_name: str) -> Tuple[str, str]:
    """Sépare le nom complet en prénom et nom de famille."""
    if not full_name or full_name == 'N/A':
        return 'N/A', 'N/A'
    
    parts = full_name.strip().split()
    if len(parts) >= 2:
        # Le dernier mot est le nom de famille
        last_name = parts[-1]
        # Tout le reste est le prénom
        first_name = ' '.join(parts[:-1])
        return clean_text(first_name), clean_text(last_name)
    return clean_text(full_name), 'N/A'

def get_unprocessed_records(connection: mysql.connector.MySQLConnection, person_type: str) -> List[Dict]:
    """Récupère les enregistrements non traités depuis access_logs."""
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT DISTINCT 
                person_id as badge_number,
                person_name as full_name,
                group_name as department,
                'active' as status,
                MIN(event_date) as first_seen,
                MAX(event_date) as last_seen,
                COUNT(*) as access_count
            FROM access_logs 
            WHERE person_type = %s 
            AND processed = 0
            GROUP BY person_id, person_name, group_name
            ORDER BY person_id
        """
        cursor.execute(query, (person_type,))
        return cursor.fetchall()
    except Error as e:
        logging.error(f"Erreur lors de la récupération des {person_type}s: {e}")
        return []
    finally:
        cursor.close()

def get_most_recent_data(connection: mysql.connector.MySQLConnection, badge_number: str, person_type: str) -> Dict:
    """Récupère les données les plus récentes pour un badge donné."""
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                person_name as full_name,
                group_name as department
            FROM access_logs 
            WHERE person_id = %s 
            AND person_type = %s
            ORDER BY event_date DESC, event_time DESC
            LIMIT 1
        """
        cursor.execute(query, (badge_number, person_type))
        return cursor.fetchone() or {}
    except Error as e:
        logging.error(f"Erreur lors de la récupération des données récentes pour {badge_number}: {e}")
        return {}
    finally:
        cursor.close()

def insert_or_update_employee(connection: mysql.connector.MySQLConnection, employee: Dict) -> bool:
    """Insère ou met à jour un employé dans la table employees."""
    try:
        cursor = connection.cursor()
        
        # Vérifier si l'employé existe déjà
        check_query = "SELECT id FROM employees WHERE badge_number = %s"
        cursor.execute(check_query, (employee['badge_number'],))
        existing = cursor.fetchone()

        # Récupérer les données les plus récentes si nécessaire
        if not existing:
            recent_data = get_most_recent_data(connection, employee['badge_number'], 'employee')
            if recent_data:
                employee.update(recent_data)

        first_name, last_name = split_full_name(employee['full_name'])
        department = clean_text(employee['department']) if employee['department'] else 'N/A'
        position = 'N/A'  # Valeur par défaut

        if existing:
            # Mise à jour
            update_query = """
                UPDATE employees 
                SET first_name = %s,
                    last_name = %s,
                    department = %s,
                    position = %s,
                    status = %s,
                    last_seen = %s,
                    access_count = %s,
                    updated_at = NOW()
                WHERE badge_number = %s
            """
            cursor.execute(update_query, (
                first_name,
                last_name,
                department,
                position,
                employee['status'],
                employee['last_seen'],
                employee['access_count'],
                employee['badge_number']
            ))
        else:
            # Insertion
            insert_query = """
                INSERT INTO employees (
                    badge_number, first_name, last_name, 
                    department, position, status,
                    first_seen, last_seen, access_count,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            cursor.execute(insert_query, (
                employee['badge_number'],
                first_name,
                last_name,
                department,
                position,
                employee['status'],
                employee['first_seen'],
                employee['last_seen'],
                employee['access_count']
            ))

        connection.commit()
        return True
    except Error as e:
        logging.error(f"Erreur lors de l'insertion/mise à jour de l'employé {employee['badge_number']}: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def insert_or_update_visitor(connection: mysql.connector.MySQLConnection, visitor: Dict) -> bool:
    """Insère ou met à jour un visiteur dans la table visitors."""
    try:
        cursor = connection.cursor()
        
        # Vérifier si le visiteur existe déjà
        check_query = "SELECT id FROM visitors WHERE badge_number = %s"
        cursor.execute(check_query, (visitor['badge_number'],))
        existing = cursor.fetchone()

        # Récupérer les données les plus récentes si nécessaire
        if not existing:
            recent_data = get_most_recent_data(connection, visitor['badge_number'], 'visitor')
            if recent_data:
                visitor.update(recent_data)

        first_name, last_name = split_full_name(visitor['full_name'])
        company = clean_text(visitor['department']) if visitor['department'] else 'N/A'

        if existing:
            # Mise à jour
            update_query = """
                UPDATE visitors 
                SET first_name = %s,
                    last_name = %s,
                    company = %s,
                    status = %s,
                    last_seen = %s,
                    access_count = %s,
                    updated_at = NOW()
                WHERE badge_number = %s
            """
            cursor.execute(update_query, (
                first_name,
                last_name,
                company,
                visitor['status'],
                visitor['last_seen'],
                visitor['access_count'],
                visitor['badge_number']
            ))
        else:
            # Insertion
            insert_query = """
                INSERT INTO visitors (
                    badge_number, first_name, last_name, 
                    company, status,
                    first_seen, last_seen, access_count,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            cursor.execute(insert_query, (
                visitor['badge_number'],
                first_name,
                last_name,
                company,
                visitor['status'],
                visitor['first_seen'],
                visitor['last_seen'],
                visitor['access_count']
            ))

        connection.commit()
        return True
    except Error as e:
        logging.error(f"Erreur lors de l'insertion/mise à jour du visiteur {visitor['badge_number']}: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def mark_as_processed(connection: mysql.connector.MySQLConnection, badge_number: str, person_type: str) -> bool:
    """Marque les entrées comme traitées dans access_logs."""
    try:
        cursor = connection.cursor()
        update_query = """
            UPDATE access_logs 
            SET processed = 1 
            WHERE person_id = %s AND person_type = %s
        """
        cursor.execute(update_query, (badge_number, person_type))
        connection.commit()
        return True
    except Error as e:
        logging.error(f"Erreur lors du marquage des entrées comme traitées pour {badge_number}: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def sync_data():
    """Fonction principale de synchronisation."""
    logging.info("Démarrage de la synchronisation des données")
    
    connection = get_db_connection()
    if not connection:
        logging.error("Impossible de se connecter à la base de données")
        sys.exit(1)

    try:
        # Synchroniser les employés
        employees = get_unprocessed_records(connection, 'employee')
        logging.info(f"Nombre d'employés à traiter: {len(employees)}")

        for employee in employees:
            if insert_or_update_employee(connection, employee):
                if mark_as_processed(connection, employee['badge_number'], 'employee'):
                    logging.info(f"Employé {employee['badge_number']} traité avec succès")
                else:
                    logging.error(f"Erreur lors du marquage des entrées pour l'employé {employee['badge_number']}")
            else:
                logging.error(f"Erreur lors du traitement de l'employé {employee['badge_number']}")

        # Synchroniser les visiteurs
        visitors = get_unprocessed_records(connection, 'visitor')
        logging.info(f"Nombre de visiteurs à traiter: {len(visitors)}")

        for visitor in visitors:
            if insert_or_update_visitor(connection, visitor):
                if mark_as_processed(connection, visitor['badge_number'], 'visitor'):
                    logging.info(f"Visiteur {visitor['badge_number']} traité avec succès")
                else:
                    logging.error(f"Erreur lors du marquage des entrées pour le visiteur {visitor['badge_number']}")
            else:
                logging.error(f"Erreur lors du traitement du visiteur {visitor['badge_number']}")

        logging.info("Synchronisation terminée avec succès")

    except Error as e:
        logging.error(f"Erreur lors de la synchronisation: {e}")
        sys.exit(1)
    finally:
        connection.close()

if __name__ == "__main__":
    sync_data() 