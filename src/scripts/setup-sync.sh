#!/bin/bash

# Créer le répertoire de logs
sudo mkdir -p /var/log/senator
sudo chown -R $USER:$USER /var/log/senator

# Installer les dépendances Python
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# Créer un environnement virtuel
python3 -m venv /opt/senator/venv
source /opt/senator/venv/bin/activate

# Installer les dépendances Python
pip install mysql-connector-python

# Rendre le script exécutable
chmod +x /opt/senator/scripts/sync-data.py

# Créer le service systemd
sudo tee /etc/systemd/system/senator-sync.service << EOF
[Unit]
Description=Senator Data Sync Service
After=network.target mysql.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/opt/senator
Environment=DB_HOST=localhost
Environment=DB_USER=senator
Environment=DB_PASSWORD=your_password_here
Environment=DB_NAME=senator
Environment=DB_PORT=3306
ExecStart=/opt/senator/venv/bin/python /opt/senator/scripts/sync-data.py
Restart=always
RestartSec=3600

[Install]
WantedBy=multi-user.target
EOF

# Recharger systemd et activer le service
sudo systemctl daemon-reload
sudo systemctl enable senator-sync
sudo systemctl start senator-sync

echo "Installation terminée. Le service de synchronisation est configuré pour s'exécuter toutes les heures." 