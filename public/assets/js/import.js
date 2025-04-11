document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const csvFileInput = document.getElementById('csvFile');
    const previewBtn = document.getElementById('previewBtn');
    const submitBtn = document.getElementById('submitBtn');
    const importForm = document.getElementById('importForm');
    const csvPreviewCard = document.getElementById('csvPreviewCard');
    const importFormCard = document.getElementById('importFormCard');
    const csvPreviewHeader = document.getElementById('csvPreviewHeader');
    const csvPreviewBody = document.getElementById('csvPreviewBody');
    const csvRowCount = document.getElementById('csvRowCount');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const importButtonsContainer = document.getElementById('importButtonsContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadProgressPercent = document.getElementById('uploadProgressPercent');
    const progressCurrentRows = document.getElementById('progressCurrentRows');
    const progressTotalRows = document.getElementById('progressTotalRows');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');
    const chunkProcessingCheckbox = document.getElementById('chunkProcessing');
    const uploadResultAlert = document.getElementById('uploadResultAlert');
    const uploadResultMessage = document.getElementById('uploadResultMessage');
    
    // Variables de cache et état
    let previewData = null;
    let uploadInProgress = false;
    
    // Gestionnaire d'événement pour fermer la prévisualisation
    closePreviewBtn.addEventListener('click', function() {
        csvPreviewCard.style.display = 'none';
        importFormCard.style.display = 'block';
    });
    
    // Gestionnaire d'événement pour annuler l'importation
    cancelImportBtn.addEventListener('click', function() {
        csvPreviewCard.style.display = 'none';
        importFormCard.style.display = 'block';
    });

    // Gestionnaire pour confirmer l'importation après prévisualisation
    confirmImportBtn.addEventListener('click', function() {
        csvPreviewCard.style.display = 'none';
        importFormCard.style.display = 'block';
        
        // Déclencher automatiquement la soumission du formulaire
        setTimeout(() => submitBtn.click(), 100);
    });
    
    // Gestionnaire d'événement pour la sélection de fichier
    csvFileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            generateQuickPreview();
        }
    });
    
    // Gestionnaires pour les changements d'options qui affectent la prévisualisation
    document.getElementById('separator').addEventListener('change', generateQuickPreview);
    document.getElementById('hasHeader').addEventListener('change', generateQuickPreview);
    
    // Fonction pour générer une prévisualisation rapide
    function generateQuickPreview() {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            return;
        }
        
        const file = csvFileInput.files[0];
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;
        
        // Créer un FormData pour envoyer le fichier
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('separator', separator);
        if (hasHeader) formData.append('has_header', '1');
        formData.append('quick_preview', '1'); // Indication pour un aperçu rapide limité
        
        // Faire une requête AJAX pour la prévisualisation rapide
        fetch('/import/preview', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayQuickPreview(data.data);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la génération de l\'aperçu rapide:', error);
        });
    }
    
    // Afficher une prévisualisation rapide (aperçu à côté du formulaire)
    function displayQuickPreview(data) {
        const quickPreviewCard = document.getElementById('quickPreviewCard');
        const quickPreviewHeader = document.getElementById('quickPreviewHeader');
        const quickPreviewBody = document.getElementById('quickPreviewBody');
        const quickPreviewInfo = document.getElementById('quickPreviewInfo');
        
        // Si la carte d'aperçu rapide n'existe pas, on ne fait rien
        if (!quickPreviewCard) {
            return;
        }
        
        // Vérifier si nous avons des données
        if (!data || !data.headers || !data.rows || data.rows.length === 0) {
            quickPreviewInfo.textContent = 'Aucune donnée disponible pour l\'aperçu';
            return;
        }
        
        // Mettre à jour l'info
        quickPreviewInfo.textContent = `${data.totalRows} lignes détectées`;
        
        // Vider les conteneurs existants
        quickPreviewHeader.innerHTML = '';
        quickPreviewBody.innerHTML = '';
        
        // Créer la ligne d'en-tête (limité à un nombre restreint de colonnes)
        const maxColsToShow = 5; // Limiter le nombre de colonnes affichées
        const displayedHeaders = data.headers.slice(0, maxColsToShow);
        
        displayedHeaders.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.maxWidth = '120px';
            th.style.overflow = 'hidden';
            th.style.textOverflow = 'ellipsis';
            th.style.whiteSpace = 'nowrap';
            quickPreviewHeader.appendChild(th);
        });
        
        if (data.headers.length > maxColsToShow) {
            const th = document.createElement('th');
            th.textContent = `+${data.headers.length - maxColsToShow} colonnes`;
            th.style.width = '100px';
            quickPreviewHeader.appendChild(th);
        }
        
        // Créer les lignes de données (limité à 3 lignes max)
        const rowsToShow = Math.min(data.rows.length, 3);
        for (let i = 0; i < rowsToShow; i++) {
            const row = data.rows[i];
            const tr = document.createElement('tr');
            
            // Afficher uniquement les colonnes visibles
            for (let j = 0; j < Math.min(row.length, maxColsToShow); j++) {
                const td = document.createElement('td');
                td.textContent = row[j];
                td.style.maxWidth = '120px';
                td.style.overflow = 'hidden';
                td.style.textOverflow = 'ellipsis';
                td.style.whiteSpace = 'nowrap';
                tr.appendChild(td);
            }
            
            if (row.length > maxColsToShow) {
                const td = document.createElement('td');
                td.textContent = '...';
                tr.appendChild(td);
            }
            
            quickPreviewBody.appendChild(tr);
        }
        
        // Afficher la carte d'aperçu rapide
        quickPreviewCard.style.display = 'block';
        
        // Stocker les données pour une utilisation ultérieure
        previewData = data;
    }
    
    // Gérer le bouton de prévisualisation complète
    previewBtn.addEventListener('click', function() {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            alert('Veuillez sélectionner un fichier CSV à importer.');
            return;
        }
        
        const file = csvFileInput.files[0];
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;
        
        // Créer un FormData pour envoyer le fichier
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('separator', separator);
        if (hasHeader) formData.append('has_header', '1');
        
        // Afficher un indicateur de chargement
        uploadProgressContainer.style.display = 'block';
        importButtonsContainer.style.display = 'none';
        uploadProgressText.textContent = 'Analyse du fichier en cours...';
        
        // Envoyer la requête au serveur
        fetch('/import/preview', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Masquer l'indicateur de chargement
            uploadProgressContainer.style.display = 'none';
            importButtonsContainer.style.display = 'flex';
            
            if (data.success) {
                // Afficher l'aperçu
                displayServerPreview(data.data);
            } else {
                // Afficher l'erreur
                alert('Erreur lors de l\'analyse du fichier: ' + (data.error || 'Erreur inconnue'));
            }
        })
        .catch(error => {
            console.error('Erreur lors de la prévisualisation:', error);
            uploadProgressContainer.style.display = 'none';
            importButtonsContainer.style.display = 'flex';
            alert('Erreur lors de la communication avec le serveur');
        });
    });
    
    // Afficher l'aperçu à partir des données du serveur
    function displayServerPreview(data) {
        // Vider les conteneurs existants
        csvPreviewHeader.innerHTML = '';
        csvPreviewBody.innerHTML = '';
        
        // Vérifier si nous avons des données
        if (!data || !data.headers || !data.rows) {
            alert('Pas de données disponibles pour l\'aperçu');
            return;
        }
        
        // Mettre à jour le décompte des lignes
        csvRowCount.textContent = `${data.totalRows} lignes détectées`;
        
        // Créer la ligne d'en-tête
        data.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            csvPreviewHeader.appendChild(th);
        });
        
        // Créer les lignes de données
        data.rows.forEach(row => {
            const tr = document.createElement('tr');
            
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            
            csvPreviewBody.appendChild(tr);
        });
        
        // Afficher la carte de prévisualisation et masquer le formulaire
        csvPreviewCard.style.display = 'block';
        importFormCard.style.display = 'none';
    }
    
    // Gestion du formulaire d'import
    importForm.addEventListener('submit', function(e) {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            alert('Veuillez sélectionner un fichier CSV à importer.');
            e.preventDefault();
            return;
        }
        
        if (uploadInProgress) {
            e.preventDefault();
            return;
        }
        
        // Si le traitement par lots est activé pour les fichiers volumineux
        const useChunks = chunkProcessingCheckbox.checked;
        
        if (useChunks) {
            e.preventDefault();
            uploadInProgress = true;
            startChunkedUpload();
        } else {
            // Montrer la barre de progression simple pour l'upload standard
            uploadProgressContainer.style.display = 'block';
            importButtonsContainer.style.display = 'none';
            uploadProgressText.textContent = 'Téléchargement du fichier...';
        }
    });
    
    // Fonction pour démarrer un upload par lots
    function startChunkedUpload() {
        const file = csvFileInput.files[0];
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;
        const skipDuplicates = document.getElementById('skipDuplicates').checked;
        
        // Afficher la barre de progression
        uploadProgressContainer.style.display = 'block';
        importButtonsContainer.style.display = 'none';
        cancelUploadBtn.style.display = 'block';
        
        // Lire le fichier pour compter les lignes
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            // Compter les lignes (pour estimer la progression)
            const lines = content.split(/\r\n|\n/).filter(line => line.trim().length > 0);
            const totalRows = hasHeader ? lines.length - 1 : lines.length;
            
            // Mettre à jour l'affichage de la progression
            progressTotalRows.textContent = totalRows;
            
            // Effectuer l'upload par lots
            uploadFileInChunks(file, separator, hasHeader, skipDuplicates, totalRows);
        };
        
        reader.onerror = function() {
            alert('Erreur lors de la lecture du fichier');
            resetUploadForm();
        };
        
        reader.readAsText(file);
    }
    
    // Fonction pour télécharger le fichier par lots
    function uploadFileInChunks(file, separator, hasHeader, skipDuplicates, totalRows) {
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('separator', separator);
        if (hasHeader) formData.append('has_header', '1');
        if (skipDuplicates) formData.append('skip_duplicates', '1');
        formData.append('chunk_processing', '1');
        
        // Faire une requête AJAX
        const xhr = new XMLHttpRequest();
        let processedRows = 0;
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                
                // Mettre à jour la barre de progression du téléchargement
                uploadProgressBar.style.width = percentComplete + '%';
                uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
                uploadProgressPercent.textContent = percentComplete + '%';
                
                if (percentComplete < 100) {
                    uploadProgressText.textContent = 'Téléchargement du fichier...';
                } else {
                    uploadProgressText.textContent = 'Traitement des données...';
                }
            }
        });
        
        xhr.addEventListener('load', function(e) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    // Vérifier si c'est une mise à jour de progression ou une réponse finale
                    if (response.status === 'processing') {
                        // Mise à jour de progression
                        if (response.progress) {
                            processedRows = response.progress.current;
                            const percentComplete = response.progress.percent || 0;
                            
                            // Mettre à jour les détails de progression
                            uploadProgressBar.style.width = percentComplete + '%';
                            uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
                            uploadProgressPercent.textContent = percentComplete + '%';
                            progressCurrentRows.textContent = processedRows;
                            
                            // Afficher des informations supplémentaires si disponibles
                            let statusText = 'Traitement des données...';
                            if (response.progress.speed) {
                                statusText += ` (${response.progress.speed} lignes/sec)`;
                            }
                            if (response.progress.estimatedTimeRemaining) {
                                const remainingTime = formatTime(response.progress.estimatedTimeRemaining);
                                statusText += ` - Temps restant estimé: ${remainingTime}`;
                            }
                            
                            uploadProgressText.textContent = statusText;
                        }
                        return; // Continuer à attendre d'autres mises à jour
                    }
                    
                    // Si le serveur répond avec succès
                    uploadProgressBar.style.width = '100%';
                    uploadProgressBar.setAttribute('aria-valuenow', 100);
                    uploadProgressPercent.textContent = '100%';
                    progressCurrentRows.textContent = totalRows;
                    
                    if (response.stats && response.stats.speed) {
                        uploadProgressText.textContent = `Import terminé avec succès! (${response.stats.speed} lignes/sec)`;
                    } else {
                        uploadProgressText.textContent = 'Import terminé avec succès!';
                    }
                    
                    // Cacher la barre de progression après un délai
                    setTimeout(function() {
                        uploadProgressContainer.style.display = 'none';
                        importButtonsContainer.style.display = 'flex';
                        resetUploadForm();
                        
                        // Afficher le message de résultat
                        uploadResultAlert.className = 'alert alert-success alert-dismissible fade show';
                        uploadResultMessage.textContent = response.message || `Import terminé avec succès! ${response.stats.inserted} enregistrements importés, ${response.stats.skipped} doublons ignorés.`;
                        uploadResultAlert.style.display = 'block';
                        
                        // Recharger la page si nécessaire pour afficher les résultats
                        if (response.redirect) {
                            window.location.href = response.redirect;
                        }
                    }, 1500);
                } catch (error) {
                    handleUploadError('Erreur de traitement de la réponse du serveur: ' + error.message);
                }
            } else {
                handleUploadError('Erreur lors du téléchargement: ' + xhr.statusText);
            }
        });
        
        xhr.addEventListener('error', function() {
            handleUploadError('Erreur de connexion au serveur.');
        });
        
        xhr.addEventListener('abort', function() {
            handleUploadError('Le téléchargement a été annulé.');
        });
        
        // Annulation de l'upload
        cancelUploadBtn.addEventListener('click', function() {
            xhr.abort();
            resetUploadForm();
            alert('L\'importation a été annulée.');
        });
        
        // Envoyer la requête
        xhr.open('POST', '/import/upload', true);
        xhr.send(formData);
    }
    
    // Formater le temps en secondes en un format lisible
    function formatTime(seconds) {
        if (seconds < 60) {
            return Math.round(seconds) + ' secondes';
        } else if (seconds < 3600) {
            return Math.round(seconds / 60) + ' minutes';
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return hours + ' heures ' + minutes + ' minutes';
        }
    }
    
    // Gérer les erreurs d'upload
    function handleUploadError(message) {
        uploadResultAlert.className = 'alert alert-danger alert-dismissible fade show';
        uploadResultMessage.textContent = message;
        uploadResultAlert.style.display = 'block';
        resetUploadForm();
    }
    
    // Réinitialiser le formulaire d'upload
    function resetUploadForm() {
        uploadInProgress = false;
        uploadProgressContainer.style.display = 'none';
        importButtonsContainer.style.display = 'flex';
        cancelUploadBtn.style.display = 'none';
        uploadProgressBar.style.width = '0%';
        uploadProgressBar.setAttribute('aria-valuenow', 0);
        uploadProgressPercent.textContent = '0%';
        uploadProgressText.textContent = 'Préparation...';
        progressCurrentRows.textContent = '0';
        progressTotalRows.textContent = '0';
    }
}); 