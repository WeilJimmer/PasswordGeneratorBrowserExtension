(function() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggle').innerHTML = '☀️';
    } else {
        document.getElementById('themeToggle').innerHTML = '🌙';
    }
    document.getElementById('themeToggle').addEventListener('click', function() {
        document.body.style.transition = 'background-color 0.3s, color 0.3s';
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
            this.innerHTML = '🌙';
        } else {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            this.innerHTML = '☀️';
        }
    });
})();