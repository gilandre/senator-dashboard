<?php 
use App\Core\Auth;

$auth = new Auth();

// Configuration des variables pour le layout
$pageTitle = 'Gestion des Utilisateurs';
$currentPage = 'users';

// Le contenu principal de la page
?>

<div class="container-fluid px-4">
    <h1 class="mt-4">Users</h1>
    
    <?php if (isset($_SESSION['success'])): ?>
        <div class="alert alert-success">
            <?php echo $_SESSION['success']; unset($_SESSION['success']); ?>
        </div>
    <?php endif; ?>

    <?php if (isset($_SESSION['error'])): ?>
        <div class="alert alert-danger">
            <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>

    <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <div>
                <i class="fas fa-users me-1"></i>
                User List
            </div>
            <?php if ($auth->hasPermission('user.create')): ?>
                <a href="/users/create" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Add User
                </a>
            <?php endif; ?>
        </div>
        <div class="card-body">
            <table id="usersTable" class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($user['email']); ?></td>
                            <td>
                                <?php 
                                    echo htmlspecialchars(
                                        trim($user['first_name'] . ' ' . $user['last_name'])
                                    ) ?: 'N/A';
                                ?>
                            </td>
                            <td>
                                <span class="badge <?php echo $user['is_active'] ? 'bg-success' : 'bg-danger'; ?>">
                                    <?php echo $user['is_active'] ? 'Active' : 'Inactive'; ?>
                                </span>
                            </td>
                            <td>
                                <span class="badge <?php echo $user['is_admin'] ? 'bg-primary' : 'bg-secondary'; ?>">
                                    <?php echo $user['is_admin'] ? 'Admin' : 'User'; ?>
                                </span>
                            </td>
                            <td><?php echo date('Y-m-d H:i', strtotime($user['created_at'])); ?></td>
                            <td>
                                <div class="btn-group" role="group">
                                    <?php if ($auth->hasPermission('user.edit')): ?>
                                        <a href="/users/edit/<?php echo $user['id']; ?>" 
                                           class="btn btn-sm btn-primary" 
                                           title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                    <?php endif; ?>
                                    
                                    <?php if ($auth->hasPermission('user.delete') && $user['id'] !== $auth->getUserId()): ?>
                                        <a href="/users/delete/<?php echo $user['id']; ?>" 
                                           class="btn btn-sm btn-danger" 
                                           title="Delete"
                                           onclick="return confirm('Are you sure you want to delete this user?')">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
    $(document).ready(function() {
        $('#usersTable').DataTable({
            order: [[4, 'desc']], // Sort by created_at by default
            pageLength: 25,
            language: {
                search: "Search users:"
            }
        });
    });
</script>