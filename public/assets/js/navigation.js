// Updated challenge data - removed yoga, updated completed challenge
const challenges = [
  {
    id: 'running-challenge-2025',
    title: 'Ultimate Running Challenge 2025',
    description: 'Push your limits with our zone challenge 2.0. Track your zones and compete with friends.',
    status: 'ended',
    startDate: '2025-08-01',
    endDate: '2025-09-30',
    participants: 4,
    type: 'running',
    url: '/challenge/running/',
    difficulty: 'All Levels',
    duration: '2 months',
    icon: 'fas fa-running'
  },
  {
    id: 'running-challenge-2025-winteredition',
    title: 'Ending the year with a BANG',
    description: 'Push your running limits. Perfect for hobby runners and professional OCR athletes alike.',
    status: 'active',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    participants: 0,
    type: 'running',
    url: '/challenge/winter-2025/',
    difficulty: 'Intermediate',
    duration: '2 months',
    icon: 'fas fa-fire'
  },
  {
    id: 'running-challenge-zone-2',
    title: 'Running Challenge Zone 2',
    description: 'Completed running challenge focused on zone 2 training and endurance building.',
    status: 'ended',
    startDate: '2025-05-01',
    endDate: '2025-6-30',
    participants: 3,
    type: 'running',
    url: '#',
    difficulty: 'Intermediate',
    duration: '2 months',
    icon: 'fas fa-running'
  }
];

function loadChallenges() {
  const activeContainer = document.getElementById('active-challenges');
  const upcomingContainer = document.getElementById('upcoming-challenges');
  const pastContainer = document.getElementById('past-challenges');

  // Clear containers
  [activeContainer, upcomingContainer, pastContainer].forEach(container => {
    if (container) container.innerHTML = '';
  });

  // Sort challenges by participants (descending) for better display
  const sortedChallenges = [...challenges].sort((a, b) => b.participants - a.participants);

  sortedChallenges.forEach(challenge => {
    const challengeCard = createChallengeCard(challenge);
    
    switch (challenge.status) {
      case 'active':
        if (activeContainer) activeContainer.appendChild(challengeCard);
        break;
      case 'upcoming':
        if (upcomingContainer) upcomingContainer.appendChild(challengeCard);
        break;
      case 'ended':
        if (pastContainer) pastContainer.appendChild(challengeCard);
        break;
    }
  });

  // Load leaderboard
  loadLeaderboard();
  
  // Update category counts
  updateCategoryCounts();
  
  // Update stats
  updateStats();
}

function createChallengeCard(challenge) {
  const card = document.createElement('div');
  card.className = 'challenge-card card';
  
  const statusClass = `status-${challenge.status}`;
  const statusText = challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1);
  
  // Determine button text and style
  let buttonText, buttonClass;
  switch (challenge.status) {
    case 'active':
      buttonText = 'Join Challenge';
      buttonClass = 'btn btn-primary';
      break;
    case 'upcoming':
      buttonText = 'Notify Me';
      buttonClass = 'btn btn-outline';
      break;
    case 'ended':
      buttonText = 'View Results';
      buttonClass = 'btn btn-secondary';
      break;
  }
  
  card.innerHTML = `
    <div class="challenge-status ${statusClass}">${statusText}</div>
    <div class="challenge-header">
      <i class="${challenge.icon}"></i>
      <h3 class="challenge-title">${challenge.title}</h3>
    </div>
    <p class="challenge-description">${challenge.description}</p>
    
    <div class="challenge-details">
      <div class="detail-item">
        <i class="fas fa-users"></i>
        <span>${challenge.participants.toLocaleString()} participants</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-calendar"></i>
        <span>${challenge.duration}</span>
      </div>
      <div class="detail-item">
        <i class="fas fa-signal"></i>
        <span>${challenge.difficulty}</span>
      </div>
    </div>
    
    <div class="challenge-meta">
      <div class="challenge-dates">
        <small>
          ${challenge.status === 'ended' ? 'Completed' : 'Started'}: 
          ${formatDate(challenge.startDate)}
        </small>
      </div>
    </div>
    
    <div class="challenge-actions">
      <a href="${challenge.url}" class="${buttonClass}" onclick="handleChallengeClick('${challenge.id}', '${challenge.status}')">
        ${buttonText}
      </a>
    </div>
  `;
  
  return card;
}

function loadLeaderboard() {
  const leaderboardContainer = document.getElementById('main-leaderboard');
  if (!leaderboardContainer) return;
  
  leaderboardContainer.innerHTML = '';
  
  // Show top 5 from leaderboard
  leaderboardData.slice(0, 5).forEach(player => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    
    item.innerHTML = `
      <div class="leaderboard-rank">${player.rank}</div>
      <div class="leaderboard-info">
        <span class="leaderboard-name">${player.name}</span>
        <span class="leaderboard-score">${player.score.toLocaleString()} pts</span>
      </div>
    `;
    
    leaderboardContainer.appendChild(item);
  });
}

function updateCategoryCounts() {
  const activeChallenges = challenges.filter(c => c.status === 'active').length;
  const upcomingChallenges = challenges.filter(c => c.status === 'upcoming').length;
  const pastChallenges = challenges.filter(c => c.status === 'ended').length;
  
  const activeCountEl = document.getElementById('active-count');
  const upcomingCountEl = document.getElementById('upcoming-count');
  const pastCountEl = document.getElementById('past-count');
  
  if (activeCountEl) activeCountEl.textContent = activeChallenges;
  if (upcomingCountEl) upcomingCountEl.textContent = upcomingChallenges;
  if (pastCountEl) pastCountEl.textContent = pastChallenges;
}

function updateStats() {
  const totalParticipants = challenges.reduce((sum, challenge) => sum + challenge.participants, 0);
  const activeChallenges = challenges.filter(c => c.status === 'active').length;
  const totalActivities = Math.floor(totalParticipants * 12.5); // Estimated activities based on real data
  const totalCalories = Math.floor(totalActivities * 350); // Estimated calories per activity
  
  // Update hero stats
  updateStatElement('hero-participants', totalParticipants);
  updateStatElement('hero-challenges', challenges.length);
  updateStatElement('hero-activities', totalActivities);
  
  // Update main stats section
  updateStatElement('total-participants', totalParticipants);
  updateStatElement('active-challenges-count', activeChallenges);
  updateStatElement('total-activities', totalActivities);
  updateStatElement('total-calories', totalCalories);
}

function updateStatElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = formatStatNumber(value);
  }
}

function formatStatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function handleChallengeClick(challengeId, status) {
  // Analytics or tracking can be added here
  console.log(`Challenge clicked: ${challengeId}, Status: ${status}`);
  
  // For upcoming challenges, show notification signup
  if (status === 'upcoming') {
    showNotificationSignup(challengeId);
    return false;
  }
}

function showNotificationSignup(challengeId) {
  // This would show a modal or form for email notifications
  showToast('Notification signup coming soon!', 'info');
}

function showToast(message, type = 'info') {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease'
  });
  
  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  toast.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

function initializeNavigation() {
  // Set active navigation link based on current section
  updateActiveNavLink();
  
  // Update active nav link on scroll
  window.addEventListener('scroll', updateActiveNavLink);
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  let currentSection = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    const sectionHeight = section.clientHeight;
    
    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      currentSection = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSection}`) {
      link.classList.add('active');
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadChallenges();
  initializeNavigation();
});