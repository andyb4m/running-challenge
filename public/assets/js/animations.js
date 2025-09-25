// Animation and interaction handlers
function initializeAnimations() {
  // Navbar scroll effect
  handleNavbarScroll();
  
  // Intersection Observer for fade-in animations
  setupIntersectionObserver();
  
  // Counter animations
  animateCounters();
  
  // Mobile menu toggle
  setupMobileMenu();
  
  // User menu dropdown
  setupUserMenu();
  
  // Challenge filters
  setupChallengeFilters();
  
  // Smooth scrolling for internal links
  setupSmoothScrolling();
}

function handleNavbarScroll() {
  const navbar = document.getElementById('navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function setupIntersectionObserver() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
      }
    });
  }, observerOptions);
  
  // Observe elements that should animate on scroll
  const animateElements = document.querySelectorAll(
    '.step-card, .challenge-card, .stat-card, .leaderboard-card'
  );
  
  animateElements.forEach(el => observer.observe(el));
}

function animateCounters() {
  const counters = document.querySelectorAll('.stat-number');
  
  const animateCounter = (counter) => {
    const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
    const increment = target / 100;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = formatNumber(target);
        clearInterval(timer);
      } else {
        counter.textContent = formatNumber(Math.floor(current));
      }
    }, 20);
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  });
  
  counters.forEach(counter => observer.observe(counter));
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function setupMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }
}

function setupUserMenu() {
  const userMenu = document.getElementById('user-menu');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenu && userDropdown) {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        userDropdown.style.opacity = '0';
        userDropdown.style.visibility = 'hidden';
      }
    });
  }
}

function setupChallengeFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const challengeCategories = document.querySelectorAll('.challenge-category');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      // Show/hide challenge categories based on filter
      challengeCategories.forEach(category => {
        if (filter === 'all') {
          category.style.display = 'block';
        } else {
          const categoryClass = category.classList.contains(`${filter}-challenges`);
          category.style.display = categoryClass ? 'block' : 'none';
        }
      });
    });
  });
}

function setupSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAnimations);