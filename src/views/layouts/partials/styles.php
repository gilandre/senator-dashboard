<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Font Awesome -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<!-- DataTables CSS -->
<link href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css" rel="stylesheet">

<!-- Sidebar CSS -->
<link href="/assets/css/sidebar.css" rel="stylesheet">

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

/* Main Content - Gardons uniquement cette partie mais pas les styles du sidebar */
.main-content {
    flex: 1;
    transition: all 0.3s ease;
}

/* Topbar - Style unifié pour toutes les pages */
.navbar {
    background-color: white;
    height: var(--topbar-height);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    padding: 0 20px;
    display: flex;
    align-items: center;
    position: relative;
    z-index: 999;
}

.navbar-brand img {
    height: 30px;
}

/* Page title styles - comme dans le dashboard */
.page-title-display {
    margin: 0 20px;
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.page-title-text {
    background: linear-gradient(135deg, #3a4cb2 0%, #4c8dd6 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    position: relative;
    display: inline-block;
}

.page-title-text::before {
    content: "";
    position: absolute;
    left: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 5px solid #3a4cb2;
}

/* Button de toggle pour le sidebar */
#sidebarCollapse {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--primary-color);
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
}

#sidebarCollapse:hover {
    background-color: rgba(0,0,0,0.05);
}

/* Dropdown utilisateur */
.dropdown-container {
    position: relative;
    z-index: 9999999;
}

.user-icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f8f9fa;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #3a4cb2;
    font-size: 18px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: all 0.2s ease;
}

.user-icon-btn:hover {
    background-color: #e9ecef;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.custom-dropdown-menu {
    display: none;
    position: fixed;
    top: 60px;
    right: 15px;
    background-color: white;
    min-width: 240px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    border-radius: 8px;
    padding: 8px 0 0 0;
    z-index: 9999999;
    border: 1px solid rgba(0,0,0,0.1);
    animation: fadeIn 0.2s ease;
    overflow: hidden;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.custom-dropdown-menu.show {
    display: block;
}

.dropdown-profile-header {
    display: flex;
    align-items: center;
    padding: 15px;
    background: linear-gradient(135deg, #3a4cb2 0%, #4c8dd6 100%);
    border-radius: 8px 8px 0 0;
    margin-top: -8px;
    margin-left: -1px;
    margin-right: -1px;
    width: calc(100% + 2px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.dropdown-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 45px;
    height: 45px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    margin-right: 12px;
    color: white;
    font-size: 24px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.dropdown-user-info {
    display: flex;
    flex-direction: column;
}

.dropdown-username {
    color: white;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 2px;
}

.dropdown-role {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    font-style: italic;
}

.dropdown-divider {
    height: 1px;
    margin: 5px 0;
    background-color: #e9ecef;
}

.custom-dropdown-item {
    padding: 10px 16px;
    display: flex;
    align-items: center;
    color: #333;
    text-decoration: none;
    transition: background-color 0.2s;
}

.custom-dropdown-item:hover {
    background-color: #f0f3f9;
    color: #3a4cb2;
}

.custom-dropdown-item i {
    margin-right: 10px;
    width: 16px;
    text-align: center;
    color: #6c757d;
}

.custom-dropdown-item:hover i {
    color: #3a4cb2;
}

.custom-dropdown-item:last-child {
    border-radius: 0 0 8px 8px;
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
    transition: all 0.3s ease;
}

/* Responsive */
@media (max-width: 992px) {
    .main-content {
        margin-left: 0;
    }
    
    .footer {
        margin-left: 0;
    }
}
</style> 