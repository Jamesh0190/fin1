// Populate friends grid
function populateFriendsGrid() {
    const friendsGrid = document.getElementById('friendsGrid');
    friendsGrid.innerHTML = '';
    
    friends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        friendCard.dataset.type = friend.type;
        
        friendCard.innerHTML = `
            <span class="friend-emoji">${friend.emoji}</span>
            <div class="friend-name">${friend.name}</div>
            <div class="friend-type">${friend.type.charAt(0).toUpperCase() + friend.type.slice(1)}</div>
            <div class="friend-description">${friend.description}</div>
            <div class="friend-traits">
                ${friend.traits.map(trait => `<span class="trait">${trait}</span>`).join('')}
            </div>
            <button class="select-friend-btn" data-id="${friend.id}">Select ${friend.name}</button>
        `;
        
        friendsGrid.appendChild(friendCard);
    });
}

// Filter friends by type
function filterFriends(type) {
    const friendsGrid = document.getElementById('friendsGrid');
    const friendCards = friendsGrid.querySelectorAll('.friend-card');
    
    friendCards.forEach(card => {
        if (type === 'all' || card.dataset.type === type) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    populateFriendsGrid();
    
    // Set up filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter friends
            const filterType = button.dataset.filter;
            filterFriends(filterType);
        });
    });
    
    // Set up select friend buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('select-friend-btn')) {
            const friendId = e.target.dataset.id;
            const friend = friends.find(f => f.id == friendId);
            alert(`You selected ${friend.name}! ${friend.welcomeMessage}`);
        }
    });
    
    // Signup button
    document.getElementById('signupBtn').addEventListener('click', () => {
        alert('Welcome to FriendiNeed! Sign up to start chatting with your AI friends.');
    });
});