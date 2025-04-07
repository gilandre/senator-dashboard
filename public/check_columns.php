<?php
// Script simple pour vérifier les colonnes de la table access_logs

// Se connecter à la base de données SQLite
try {
    $db = new PDO('sqlite:' . __DIR__ . '/../database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Obtenir la structure de la table
    $stmt = $db->query("PRAGMA table_info(access_logs)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Afficher les colonnes
    echo "<h1>Colonnes de la table access_logs</h1>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>Name</th><th>Type</th><th>Not Null</th><th>Default</th></tr>";
    
    foreach ($columns as $column) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($column['name']) . "</td>";
        echo "<td>" . htmlspecialchars($column['type']) . "</td>";
        echo "<td>" . ($column['notnull'] ? 'YES' : 'NO') . "</td>";
        echo "<td>" . htmlspecialchars($column['dflt_value'] ?? 'NULL') . "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
    
    // Compter le nombre d'enregistrements
    $stmt = $db->query("SELECT COUNT(*) FROM access_logs");
    $count = $stmt->fetchColumn();
    echo "<p>Nombre d'enregistrements: " . $count . "</p>";
    
    // Afficher un exemple de données
    $stmt = $db->query("SELECT * FROM access_logs LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($row) {
        echo "<h2>Exemple d'enregistrement</h2>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr>";
        foreach ($row as $key => $value) {
            echo "<th>" . htmlspecialchars($key) . "</th>";
        }
        echo "</tr>";
        echo "<tr>";
        foreach ($row as $value) {
            echo "<td>" . htmlspecialchars($value ?? 'NULL') . "</td>";
        }
        echo "</tr>";
        echo "</table>";
    } else {
        echo "<p>Aucun enregistrement trouvé.</p>";
    }
    
    // Tester l'insertion d'un enregistrement
    echo "<h2>Test d'insertion</h2>";
    
    try {
        $stmt = $db->prepare("
            INSERT INTO access_logs (
                event_date, 
                event_time, 
                badge_number, 
                event_type, 
                central, 
                group_name
            ) VALUES (
                :event_date, 
                :event_time, 
                :badge_number, 
                :event_type, 
                :central, 
                :group_name
            )
        ");
        
        $result = $stmt->execute([
            ':event_date' => date('Y-m-d'),
            ':event_time' => date('H:i:s'),
            ':badge_number' => 'TEST002',
            ':event_type' => 'Test Check',
            ':central' => 'Test Central',
            ':group_name' => 'Test Group'
        ]);
        
        if ($result) {
            echo "<p style='color:green'>✓ Insertion réussie</p>";
            $lastId = $db->lastInsertId();
            echo "<p>ID du nouvel enregistrement: " . $lastId . "</p>";
            
            // Vérifier l'enregistrement inséré
            $stmt = $db->prepare("SELECT * FROM access_logs WHERE id = :id");
            $stmt->bindValue(':id', $lastId);
            $stmt->execute();
            $inserted = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($inserted) {
                echo "<h3>Données insérées:</h3>";
                echo "<table border='1' cellpadding='5'>";
                echo "<tr>";
                foreach ($inserted as $key => $value) {
                    echo "<th>" . htmlspecialchars($key) . "</th>";
                }
                echo "</tr>";
                echo "<tr>";
                foreach ($inserted as $value) {
                    echo "<td>" . htmlspecialchars($value ?? 'NULL') . "</td>";
                }
                echo "</tr>";
                echo "</table>";
            }
        } else {
            echo "<p style='color:red'>✗ Échec de l'insertion</p>";
        }
    } catch (PDOException $e) {
        echo "<p style='color:red'>Erreur lors de l'insertion: " . $e->getMessage() . "</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color:red'>Erreur de connexion à la base de données: " . $e->getMessage() . "</p>";
} 