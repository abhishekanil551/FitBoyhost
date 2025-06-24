document.addEventListener('DOMContentLoaded', function() {
    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-nav li');
    const settingsSections = document.querySelectorAll('.settings-section');
    const formContainers = document.querySelectorAll('.form-container');
    const header = document.querySelector('.header h1');
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Handle sidebar navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Update active sidebar link
            sidebarLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-form');
            settingsSections.forEach(section => section.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            
            // Hide all forms
            formContainers.forEach(form => form.classList.remove('active'));
            
            // Update header
            header.textContent = this.textContent.trim();
            
            // Close sidebar on mobile
            if (window.innerWidth <= 992) {
                sidebar.classList.remove('active');
            }
        });
    });
    
    // Handle option card clicks
    const optionCards = document.querySelectorAll('.option-card');
    
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            const formId = this.getAttribute('data-form') + '-form';
            
            // Hide all sections
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Show the selected form
            formContainers.forEach(form => form.classList.remove('active'));
            document.getElementById(formId).classList.add('active');
        });
    });
    
    // Handle back button clicks
    const backButtons = document.querySelectorAll('.back-btn');
    
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Hide all forms
            formContainers.forEach(form => form.classList.remove('active'));
            
            // Show the active section
            const activeLink = document.querySelector('.sidebar-nav li.active');
            const sectionId = activeLink.getAttribute('data-form');
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Form validation
    const emailForm = document.getElementById('change-email-form');
    const passwordForm = document.getElementById('change-password-form');
    
    if (emailForm) {
        const updateEmailBtn = emailForm.querySelector('.action-btn');
        updateEmailBtn.addEventListener('click', function() {
            const newEmail = document.getElementById('new-email').value;
            const confirmEmail = document.getElementById('confirm-email').value;
            const password = document.getElementById('email-password').value;
            
            if (!newEmail || !confirmEmail || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            if (newEmail !== confirmEmail) {
                alert('Emails do not match');
                return;
            }
            
            // Here you would typically send the data to a server
            alert('Email updated successfully!');
            
            // Return to main section
            formContainers.forEach(form => form.classList.remove('active'));
            document.getElementById('account-security').classList.add('active');
        });
    }
    
    if (passwordForm) {
        const updatePasswordBtn = passwordForm.querySelector('.action-btn');
        updatePasswordBtn.addEventListener('click', function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            // Password strength validation
            const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
            if (!passwordRegex.test(newPassword)) {
                alert('Password does not meet requirements');
                return;
            }
            
            // Here you would typically send the data to a server
            alert('Password updated successfully!');
            
            // Return to main section
            formContainers.forEach(form => form.classList.remove('active'));
            document.getElementById('account-security').classList.add('active');
        });
    }
    
    // Responsive adjustments
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
        }
    });
});

















