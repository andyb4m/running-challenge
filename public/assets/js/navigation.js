// Challenge data structure
const challenges = [
  {
    id: 'running-challenge-2024',
    title: 'Running Challenge 2024',
    description: 'Track your running zones and compete with others in this endurance challenge.',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    participants: 12,
    type: 'running',
    url: '/challenge/running/'
  },
  {
    id: 'cycling-challenge-2024',
    title: 'Cycling Challenge 2024',
    description: 'Log your cycling activities and climb the leaderboard.',
    status: 'upcoming',
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    participants: 0,
    type: 'cycling',
    url: '#'
  },
  {
    id: 'strength-challenge-2023',
    title: 'Strength Challenge 2023',
    description: 'Track your strength training progress.',
    status: 'ended',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    participants: 25,
    type: 'strength',
    url: '#'
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

  challenges.forEach(challenge => {
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

  updateStats();
}

function createChallengeCard(challenge) {
  const card = document.createElement('div');
  card.className = 'challenge-card card';
  
  const statusClass = `status-${challenge.status}`;
  const statusText = challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1);
  
  card.innerHTML = `
    <div class="challenge-status ${statusClass}">${statusText}</div>
    <h3 class="challenge-title">${challenge.title}</h3>
    <p class="challenge-description">${challenge.description}</p>
    <div class="challenge-meta">
      <span class="challenge-participants">👥 ${challenge.participants} participants</span>
      <span class="challenge-date">📅 ${formatDate(challenge.startDate)}</span>
    </div>
    <a href="${challenge.url}" class="btn ${challenge.status === 'upcoming' ? 'btn-disabled' : ''}">
      ${challenge.status === 'active' ? 'Join Challenge' : 
        challenge.status === 'upcoming' ? 'Coming Soon' : 'View Results'}
    </a>
  `;
  
  return card;
}

function updateStats() {
  const totalParticipants = challenges.reduce((sum, challenge) => sum + challenge.participants, 0);
  const activeChallenges = challenges.filter(c => c.status === 'active').length;
  
  const totalParticipantsEl = document.getElementById('total-participants');
  const activeChallengesEl = document.getElementById('active-challenges-count');
  const totalActivitiesEl = document.getElementById('total-activities');
  
  if (totalParticipantsEl) totalParticipantsEl.textContent = totalParticipants;
  if (activeChallengesEl) activeChallengesEl.textContent = activeChallenges;
  if (totalActivitiesEl) totalActivitiesEl.textContent = '150+';
}