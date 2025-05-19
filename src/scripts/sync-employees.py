#!/usr/bin/env python3

import os
import sys
import logging
from datetime import datetime
import mysql.connector
from mysql.connector import Error
from typing import Dict, List, Optional, Tuple

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/senator/sync-employees.log'),
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

def get_unprocessed_employees(connection: mysql.connector.MySQLConnection) -> List[Dict]:
    """Récupère les employés non traités depuis access_logs."""
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT DISTINCT 
                person_id as badge_number,
                person_name as full_name,
                group_name as department,
                'active' as status
            FROM access_logs 
            WHERE person_type = 'employee' 
            AND processed = 0
            ORDER BY person_id
        """
        cursor.execute(query)
        return cursor.fetchall()
    except Error as e:
        logging.error(f"Erreur lors de la récupération des employés: {e}")
        return []
    finally:
        cursor.close()

def split_full_name(full_name: str) -> Tuple[str, str]:
    """Sépare le nom complet en prénom et nom de famille."""
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return ' '.join(parts[:-1]), parts[-1]
    return full_name, 'N/A'

def insert_or_update_employee(connection: mysql.connector.MySQLConnection, employee: Dict) -> bool:
    """Insère ou met à jour un employé dans la table employees."""
    try:
        cursor = connection.cursor()
        
        # Vérifier si l'employé existe déjà
        check_query = "SELECT id FROM employees WHERE badge_number = %s"
        cursor.execute(check_query, (employee['badge_number'],))
        existing = cursor.fetchone()

        first_name, last_name = split_full_name(employee['full_name'])
        department = employee['department'] if employee['department'] else 'N/A'
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
                    updated_at = NOW()
                WHERE badge_number = %s
            """
            cursor.execute(update_query, (
                first_name,
                last_name,
                department,
                position,
                employee['status'],
                employee['badge_number']
            ))
        else:
            # Insertion
            insert_query = """
                INSERT INTO employees (
                    badge_number, first_name, last_name, 
                    department, position, status, 
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            cursor.execute(insert_query, (
                employee['badge_number'],
                first_name,
                last_name,
                department,
                position,
                employee['status']
            ))

        connection.commit()
        return True
    except Error as e:
        logging.error(f"Erreur lors de l'insertion/mise à jour de l'employé {employee['badge_number']}: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def mark_as_processed(connection: mysql.connector.MySQLConnection, badge_number: str) -> bool:
    """Marque les entrées d'un employé comme traitées dans access_logs."""
    try:
        cursor = connection.cursor()
        update_query = """
            UPDATE access_logs 
            SET processed = 1 
            WHERE person_id = %s AND person_type = 'employee'
        """
        cursor.execute(update_query, (badge_number,))
        connection.commit()
        return True
    except Error as e:
        logging.error(f"Erreur lors du marquage des entrées comme traitées pour {badge_number}: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()

def main():
    """Fonction principale de synchronisation."""
    logging.info("Démarrage de la synchronisation des employés")
    
    connection = get_db_connection()
    if not connection:
        logging.error("Impossible de se connecter à la base de données")
        sys.exit(1)

    try:
        # Récupérer les employés non traités
        employees = get_unprocessed_employees(connection)
        logging.info(f"Nombre d'employés à traiter: {len(employees)}")

        # Traiter chaque employé
        for employee in employees:
            if insert_or_update_employee(connection, employee):
                if mark_as_processed(connection, employee['badge_number']):
                    logging.info(f"Employé {employee['badge_number']} traité avec succès")
                else:
                    logging.error(f"Erreur lors du marquage des entrées pour {employee['badge_number']}")
            else:
                logging.error(f"Erreur lors du traitement de l'employé {employee['badge_number']}")

        logging.info("Synchronisation terminée avec succès")

    except Error as e:
        logging.error(f"Erreur lors de la synchronisation: {e}")
        sys.exit(1)
    finally:
        connection.close()

if __name__ == "__main__":
    main() 