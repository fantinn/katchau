// ── App Controller ─────────────────────────────────────
const App = (() => {
  let currentView = 'dashboard';

  const views = {
    dashboard: Dashboard,
    income: Income,
    expenses: Expenses,
  };

  const init = async () => {
    // Show splash
    document.getElementById('splash').classList.remove('hidden');
    document.getElementById('main').classList.add('hidden');

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));

    // Hide splash, show main
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');

    // Initialize current view
    const container = document.getElementById(`view-${currentView}`);
    if (views[currentView]) {
      views[currentView].init(container);
    }

    // Setup navigation
    setupNavigation();
  };

  const setupNavigation = () => {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        navigate(view);
      });
    });
  };

  const navigate = (view) => {
    if (!views[view]) return;

    // Update nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });
    document.getElementById(`view-${view}`).classList.add('active');

    // Initialize new view
    const container = document.getElementById(`view-${view}`);
    views[view].init(container);

    currentView = view;
  };

  const openModal = (content) => {
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    box.innerHTML = content;
    overlay.classList.remove('hidden');
  };

  const closeModal = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  };

  const toast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return { init, navigate, openModal, closeModal, toast };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
