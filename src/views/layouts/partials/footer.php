<!-- Footer -->
<footer class="footer mt-auto py-3 bg-white">
    <div class="container-fluid">
        <div class="row">
            <div class="col-md-6">
                <p class="mb-0">&copy; <?php echo date('Y'); ?> SENATOR. Tous droits réservés.</p>
            </div>
            <div class="col-md-6 text-end">
                <p class="mb-0">Version 1.0.0</p>
            </div>
        </div>
    </div>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- DataTables JS -->
<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>

<!-- Custom JS -->
<script>
// Initialisation de DataTables
$(document).ready(function() {
    $('.datatable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/fr_fr.json'
        }
    });
});
</script>
</body>
</html> 