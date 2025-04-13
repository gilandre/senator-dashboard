<?php

namespace App\Controllers;

use App\Core\Controller;

class TestController extends Controller {
    
    public function __construct()
    {
        parent::__construct();
        // Définir explicitement le layout à utiliser
        $this->layout = 'app';
    }
    
    public function index() {
        echo "Test controller is working!";
        exit;
    }
    
    public function exportCSV() {
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="test.csv"');
        echo "id,name\n1,test";
        exit;
    }
} 