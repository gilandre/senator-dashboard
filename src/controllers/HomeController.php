<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;

class HomeController extends Controller
{
    protected Auth $auth;

    public function __construct()
    {
        parent::__construct();
        $this->layout = 'app';
        $this->setCurrentPage('home');
        $this->setPageTitle('Accueil');
        $this->auth = new Auth();
    }

    public function index(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
        }
        $this->view('home/index');
    }
} 