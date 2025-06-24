document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            !event.target.closest('.sidebar') && 
            !event.target.closest('#sidebar-toggle') && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
    
    // Admin dropdown functionality
    const adminInfo = document.querySelector('.admin-info');
    const adminDropdown = document.querySelector('.admin-dropdown');
    
    if (adminInfo && adminDropdown) {
        adminInfo.addEventListener('click', function(event) {
            event.stopPropagation();
            adminDropdown.style.display = adminDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.admin-info')) {
                adminDropdown.style.display = 'none';
            }
        });
    }
    
    // Add event listeners for action buttons
    const actionButtons = document.querySelectorAll('.action-button');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.classList.contains('edit') ? 'edit' : 
                          this.classList.contains('delete') ? 'delete' : 'view';
            const row = this.closest('tr');
            const id = row.cells[0].textContent;
            
            if (action === 'edit') {
                alert(`Edit item ${id}`);
                // Implement edit functionality
            } else if (action === 'delete') {
                if (confirm(`Are you sure you want to delete ${id}?`)) {
                    alert(`Deleted ${id}`);
                    // Implement delete functionality
                }
            } else if (action === 'view') {
                alert(`View details for ${id}`);
                // Implement view functionality
            }
        });
    });
});








 // Get the modal and button elements
 const modal = document.getElementById("categoryModal");
 const btn = document.getElementById("addCategoryBtn");
 const span = document.getElementsByClassName("close")[0];
 
 // When the user clicks the button, open the modal
 btn.onclick = function() {
     modal.style.display = "block";
 }
 
 // When the user clicks on (x), close the modal
 span.onclick = function() {
     modal.style.display = "none";
 }
 
 // When the user clicks anywhere outside of the modal, close it
 window.onclick = function(event) {
     if (event.target == modal) {
         modal.style.display = "none";
     }
 }
 


  function toggleEditForm(categoryId) {
    const form = document.getElementById(`edit-form-${categoryId}`);
    form.style.display = form.style.display === "none" ? "block" : "none";
  }




      // Open modal
      openModalBtn.addEventListener('click', function() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetForm();
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });


