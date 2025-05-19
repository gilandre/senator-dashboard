#!/bin/bash

# Test de l'upload d'un fichier CSV
echo "Test de l'upload du fichier CSV..."
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "csvFile=@Exportation 12.csv" \
  http://localhost:3000/api/import/csv/upload)

echo "Réponse de l'API Upload:"
echo $UPLOAD_RESPONSE | jq

# Extraction du filePath pour l'API de traitement
FILE_PATH=$(echo $UPLOAD_RESPONSE | jq -r '.filePath')

if [ "$FILE_PATH" != "null" ] && [ "$FILE_PATH" != "" ]; then
  echo "Le fichier a été uploadé avec succès. FilePath: $FILE_PATH"
  
  # Test du traitement du fichier
  echo "Test du traitement du fichier CSV..."
  PROCESS_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"filePath\": \"$FILE_PATH\"}" \
    http://localhost:3000/api/import/csv/process)
  
  echo "Réponse de l'API Process:"
  echo $PROCESS_RESPONSE | jq
  
  # Vérification des données d'attendance
  echo "Vérification des données d'attendance..."
  ATTENDANCE_RESPONSE=$(curl -s -X GET \
    -H "Content-Type: application/json" \
    "http://localhost:3000/api/attendance?start=$(date -v-14d +%Y-%m-%dT00:00:00Z)&end=$(date +%Y-%m-%dT23:59:59Z)")
  
  echo "Nombre d'enregistrements de pointage:"
  echo $ATTENDANCE_RESPONSE | jq '. | length'
  
  # Vérification du résumé
  echo "Vérification du résumé des données..."
  SUMMARY_RESPONSE=$(curl -s -X GET \
    -H "Content-Type: application/json" \
    http://localhost:3000/api/attendance/summary)
  
  echo "Résumé des données:"
  echo $SUMMARY_RESPONSE | jq
else
  echo "Erreur: Le fichier n'a pas pu être uploadé"
fi 