<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Font Awesome -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<!-- DataTables CSS -->
<link href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css" rel="stylesheet">

<!-- Custom CSS -->
<style>
/* Variables */
:root {
    --primary-color: #2c3e50;
    --secondary-color: #3498db;
    --accent-color: #e74c3c;
    --text-color: #2c3e50;
    --light-bg: #f8f9fa;
    --sidebar-width: 250px;
    --topbar-height: 60px;
    --border-color: #e9ecef;
}

/* Layout */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--light-bg);
    color: var(--text-color);
    margin: 0;
    padding: 0;
    overflow-x: hidden;
}

/* Wrapper */
.wrapper {
    display: flex;
    min-height: 100vh;
}

/* Sidebar */
.sidebar {
    background-color: var(--primary-color);
    width: var(--sidebar-width);
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    padding: 0;
    box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
}

.sidebar.collapsed {
    margin-left: calc(-1 * var(--sidebar-width));
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

/* Main Content */
.main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    transition: all 0.3s ease;
}

.sidebar.collapsed + .main-content {
    margin-left: 0;
}

/* Topbar */
.navbar {
    background-color: white;
    height: var(--topbar-height);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    padding: 0 20px;
}

.navbar-brand img {
    height: 30px;
}

.navbar .nav-link {
    color: var(--text-color);
    padding: 8px 15px;
    margin: 0 5px;
    border-radius: 5px;
    transition: all 0.3s ease;
}

.navbar .nav-link:hover {
    background-color: var(--light-bg);
}

.navbar .nav-link.active {
    background-color: var(--light-bg);
    color: var(--secondary-color);
}

/* Cards */
.card {
    border: none;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.card-header {
    background-color: white;
    border-bottom: 1px solid var(--border-color);
    padding: 15px 20px;
}

.card-body {
    padding: 20px;
}

/* Tables */
.table {
    margin-bottom: 0;
}

.table th {
    border-top: none;
    background-color: var(--light-bg);
    font-weight: 600;
}

.table td {
    vertical-align: middle;
}

/* Forms */
.form-control:focus {
    border-color: var(--secondary-color);
    box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

/* Buttons */
.btn-primary {
    background-color: var(--secondary-color);
    border-color: var(--secondary-color);
}

.btn-primary:hover {
    background-color: #2980b9;
    border-color: #2980b9;
}

.btn-group .btn {
    margin: 0 2px;
}

/* Alerts */
.alert {
    border: none;
    border-radius: 5px;
    margin-bottom: 20px;
}

/* Dropdowns */
.dropdown-menu {
    border: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.dropdown-item {
    padding: 8px 20px;
}

.dropdown-item:hover {
    background-color: var(--light-bg);
}

/* Badges */
.badge {
    padding: 5px 8px;
    font-weight: 500;
}

/* Footer */
.footer {
    background-color: white;
    padding: 20px;
    text-align: center;
    box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
    margin-left: var(--sidebar-width);
    transition: all 0.3s ease;
}

.sidebar.collapsed + .main-content .footer {
    margin-left: 0;
}

/* Responsive */
@media (max-width: 992px) {
    .sidebar {
        transform: translateX(-100%);
    }
    
    .sidebar.active {
        transform: translateX(0);
    }
    
    .main-content {
        margin-left: 0;
    }
    
    .footer {
        margin-left: 0;
    }
}
</style> 