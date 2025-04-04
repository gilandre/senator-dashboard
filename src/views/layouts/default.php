<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SENATOR Dashboard</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- DataTables CSS -->
    <link href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Custom CSS -->
    <style>
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #3498db;
            --accent-color: #e74c3c;
            --text-color: #2c3e50;
            --light-bg: #f8f9fa;
            --sidebar-width: 250px;
            --topbar-height: 60px;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--light-bg);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }
        
        /* Sidebar Styles */
        .sidebar {
            background-color: var(--primary-color);
            width: var(--sidebar-width);
            height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            z-index: 1000;
            padding: 0;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        
        .sidebar .logo {
            text-align: center;
            padding: 15px 0;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar .logo img {
            max-width: 120px;
            height: auto;
        }
        
        .sidebar .nav-link {
            color: rgba(255,255,255,0.8);
            padding: 12px 20px;
            margin: 5px 0;
            border-radius: 0;
            transition: all 0.3s ease;
        }
        
        .sidebar .nav-link:hover {
            background-color: rgba(255,255,255,0.1);
            color: white;
        }
        
        .sidebar .nav-link.active {
            background-color: var(--secondary-color);
            color: white;
            border-left: 4px solid white;
        }
        
        .sidebar .nav-link i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }
        
        /* Topbar Styles */
        .topbar {
            background-color: white;
            height: var(--topbar-height);
            position: fixed;
            top: 0;
            right: 0;
            left: var(--sidebar-width);
            z-index: 999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            padding: 0 20px;
            transition: all 0.3s ease;
        }
        
        .topbar .navbar-brand {
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .topbar .nav-link {
            color: var(--text-color);
            padding: 8px 15px;
            margin: 0 5px;
            border-radius: 5px;
            transition: all 0.3s ease;
        }
        
        .topbar .nav-link:hover {
            background-color: var(--light-bg);
        }
        
        .topbar .nav-link.active {
            background-color: var(--light-bg);
            color: var(--secondary-color);
        }
        
        .topbar .user-info {
            display: flex;
            align-items: center;
            margin-left: auto;
        }
        
        .topbar .user-info img {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        /* Main Content Styles */
        .main-content {
            margin-left: var(--sidebar-width);
            margin-top: var(--topbar-height);
            padding: 20px;
            min-height: calc(100vh - var(--topbar-height));
            transition: all 0.3s ease;
        }
        
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .card-header {
            background-color: white;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            padding: 15px 20px;
        }
        
        .card-body {
            padding: 20px;
        }
        
        .btn-primary {
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }
        
        .btn-primary:hover {
            background-color: #2980b9;
            border-color: #2980b9;
        }
        
        .alert {
            border-radius: 5px;
            border: none;
        }
        
        /* Responsive Styles */
        @media (max-width: 992px) {
            .sidebar {
                transform: translateX(-100%);
            }
            
            .sidebar.active {
                transform: translateX(0);
            }
            
            .topbar {
                left: 0;
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .toggle-sidebar {
                display: block;
            }
        }
        
        .toggle-sidebar {
            display: none;
            background: none;
            border: none;
            color: var(--primary-color);
            font-size: 1.5rem;
            cursor: pointer;
            margin-right: 15px;
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="logo">
            <img src="/assets/images/logo.svg" alt="SENATOR Logo">
        </div>
        <nav class="nav flex-column">
            <a class="nav-link <?php echo $currentPage === 'dashboard' ? 'active' : ''; ?>" href="/">
                <i class="fas fa-home"></i> Dashboard
            </a>
            <a class="nav-link <?php echo $currentPage === 'import' ? 'active' : ''; ?>" href="/import">
                <i class="fas fa-file-import"></i> Import
            </a>
            <a class="nav-link <?php echo $currentPage === 'reports' ? 'active' : ''; ?>" href="/reports">
                <i class="fas fa-chart-bar"></i> Rapports
            </a>
            <a class="nav-link <?php echo $currentPage === 'users' ? 'active' : ''; ?>" href="/users">
                <i class="fas fa-users"></i> Utilisateurs
            </a>
            <a class="nav-link <?php echo $currentPage === 'settings' ? 'active' : ''; ?>" href="/settings">
                <i class="fas fa-cog"></i> Paramètres
            </a>
        </nav>
    </div>
    
    <!-- Topbar -->
    <div class="topbar">
        <button class="toggle-sidebar">
            <i class="fas fa-bars"></i>
        </button>
        <span class="navbar-brand">SENATOR Dashboard</span>
        <div class="user-info">
            <span class="me-2"><?php echo $_SESSION['user']['username'] ?? 'Utilisateur'; ?></span>
            <a href="/logout" class="btn btn-sm btn-outline-danger">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
            </a>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <?php if (isset($_SESSION['success'])): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <?php 
                    echo $_SESSION['success'];
                    unset($_SESSION['success']);
                ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        
        <?php if (isset($_SESSION['error'])): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <?php 
                    echo $_SESSION['error'];
                    unset($_SESSION['error']);
                ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>
        
        <?php echo $content; ?>
    </div>

    <!-- Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- DataTables -->
    <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
    
    <!-- Custom JS -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Toggle sidebar on mobile
            const toggleSidebar = document.querySelector('.toggle-sidebar');
            const sidebar = document.querySelector('.sidebar');
            
            if (toggleSidebar) {
                toggleSidebar.addEventListener('click', function() {
                    sidebar.classList.toggle('active');
                });
            }
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(event) {
                if (window.innerWidth < 992) {
                    if (!sidebar.contains(event.target) && !toggleSidebar.contains(event.target)) {
                        sidebar.classList.remove('active');
                    }
                }
            });
        });
    </script>
</body>
</html> 