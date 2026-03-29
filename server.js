const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3040;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Service worker registration
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// PWA manifest
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve index.html at root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ensure data directory exists with proper permissions
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to initialize data file with proper structure
function initializeDataFile() {
  const initialData = {
    announcement: "Welcome to Aura Tracker!",
    users: [
      { 
        username: "Max", 
        password: "crocs13", 
        aura: 100, 
        role: "admin", 
        netDailyAura: {},
        totalGiven: 0,
        totalReceived: 0,
        achievements: []
      },
      { 
        username: "Gigi", 
        password: "1234", 
        aura: 100, 
        role: "user", 
        netDailyAura: {},
        totalGiven: 0,
        totalReceived: 0,
        achievements: []
      },
      { 
        username: "Marco", 
        password: "1234", 
        aura: 100, 
        role: "user", 
        netDailyAura: {},
        totalGiven: 0,
        totalReceived: 0,
        achievements: []
      },
      { 
        username: "Dezi", 
        password: "1234", 
        aura: 100, 
        role: "user", 
        netDailyAura: {},
        totalGiven: 0,
        totalReceived: 0,
        achievements: []
      },
      { 
        username: "Sevi", 
        password: "1234", 
        aura: 100, 
        role: "user", 
        netDailyAura: {},
        totalGiven: 0,
        totalReceived: 0,
        achievements: []
      }
    ]
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  console.log('Created new data file with default users');
}

// Function to wait for data file with retry logic (for Docker volumes)
function waitForDataFile(maxRetries = 10, delay = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    function checkFile() {
      if (fs.existsSync(DATA_FILE)) {
        try {
          // Try to read and parse the file to ensure it's valid
          const data = fs.readFileSync(DATA_FILE, 'utf8');
          JSON.parse(data); // Validate JSON
          console.log('Data file found and is valid');
          resolve();
        } catch (error) {
          console.error('Data file exists but is corrupted:', error);
          if (retries < maxRetries) {
            retries++;
            console.log(`Retrying (${retries}/${maxRetries})...`);
            setTimeout(checkFile, delay);
          } else {
            reject(error);
          }
        }
      } else {
        if (retries < maxRetries) {
          retries++;
          console.log(`Data file not found, retrying (${retries}/${maxRetries})...`);
          setTimeout(checkFile, delay);
        } else {
          console.log('Data file not found after retries, creating new one');
          initializeDataFile();
          resolve();
        }
      }
    }
    
    checkFile();
  });
}

// Initialize data file with retry logic for Docker environments
if (process.env.NODE_ENV === 'production') {
  // In production (Docker), wait for volume to be ready
  waitForDataFile().catch(error => {
    console.error('Failed to initialize data file:', error);
    process.exit(1);
  });
} else {
  // In development, create file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    initializeDataFile();
  }
}

// Achievement definitions
const ACHIEVEMENTS = [
  // Gaining Aura achievements (50)
  { id: 'who_even_are_you', name: 'Who Even Are You', description: 'Reach 25 aura', type: 'current', requirement: 25 },
  { id: 'slightly_known', name: 'Slightly Known', description: 'Reach 50 aura', type: 'current', requirement: 50 },
  { id: 'lowkey_cool', name: 'Lowkey Cool', description: 'Reach 75 aura', type: 'current', requirement: 75 },
  { id: 'getting_noticed', name: 'Getting Noticed', description: 'Reach 100 aura', type: 'current', requirement: 100 },
  { id: 'kinda_him', name: 'Kinda Him', description: 'Reach 150 aura', type: 'current', requirement: 150 },
  { id: 'respectable', name: 'Respectable', description: 'Reach 200 aura', type: 'current', requirement: 200 },
  { id: 'solid_reputation', name: 'Solid Reputation', description: 'Reach 300 aura', type: 'current', requirement: 300 },
  { id: 'rising_star', name: 'Rising Star', description: 'Reach 400 aura', type: 'current', requirement: 400 },
  { id: 'main_character_loading', name: 'Main Character Loading', description: 'Reach 500 aura', type: 'current', requirement: 500 },
  { id: 'certified_him', name: 'Certified Him', description: 'Reach 750 aura', type: 'current', requirement: 750 },
  { id: 'big_w_energy', name: 'Big W Energy', description: 'Reach 1,000 aura', type: 'current', requirement: 1000 },
  { id: 'aura_legend', name: 'Aura Legend', description: 'Reach 1,500 aura', type: 'current', requirement: 1500 },
  { id: 'mythical_status', name: 'Mythical Status', description: 'Reach 2,000 aura', type: 'current', requirement: 2000 },
  { id: 'transcendent', name: 'Transcendent', description: 'Reach 5,000 aura', type: 'current', requirement: 5000 },
  { id: 'god_tier', name: 'God Tier', description: 'Reach 10,000 aura', type: 'current', requirement: 10000 },
  // Giving Aura achievements (50)
  { id: 'first_gift', name: 'First Gift', description: 'Give 25 total aura', type: 'given', requirement: 25 },
  { id: 'generous', name: 'Generous', description: 'Give 50 total aura', type: 'given', requirement: 50 },
  { id: 'super_generous', name: 'Super Generous', description: 'Give 100 total aura', type: 'given', requirement: 100 },
  { id: 'mega_generous', name: 'Mega Generous', description: 'Give 250 total aura', type: 'given', requirement: 250 },
  { id: 'ultra_generous', name: 'Ultra Generous', description: 'Give 500 total aura', type: 'given', requirement: 500 },
  { id: 'philanthropist', name: 'Philanthropist', description: 'Give 1,000 total aura', type: 'given', requirement: 1000 },
  { id: 'mega_philanthropist', name: 'Mega Philanthropist', description: 'Give 2,500 total aura', type: 'given', requirement: 2500 },
  { id: 'aura_bank', name: 'Aura Bank', description: 'Give 5,000 total aura', type: 'given', requirement: 5000 },
  { id: 'walking_charity', name: 'Walking Charity', description: 'Give 10,000 total aura', type: 'given', requirement: 10000 },
  { id: 'legendary_giver', name: 'Legendary Giver', description: 'Give 25,000 total aura', type: 'given', requirement: 25000 },
  { id: 'mythical_giver', name: 'Mythical Giver', description: 'Give 50,000 total aura', type: 'given', requirement: 50000 },
  { id: 'divine_generosity', name: 'Divine Generosity', description: 'Give 100,000 total aura', type: 'given', requirement: 100000 },
  // Receiving Aura achievements (50)
  { id: 'first_receive', name: 'First Receive', description: 'Receive 25 total aura', type: 'received', requirement: 25 },
  { id: 'well_liked', name: 'Well Liked', description: 'Receive 50 total aura', type: 'received', requirement: 50 },
  { id: 'super_liked', name: 'Super Liked', description: 'Receive 100 total aura', type: 'received', requirement: 100 },
  { id: 'mega_liked', name: 'Mega Liked', description: 'Receive 250 total aura', type: 'received', requirement: 250 },
  { id: 'ultra_liked', name: 'Ultra Liked', description: 'Receive 500 total aura', type: 'received', requirement: 500 },
  { id: 'fan_favorite', name: 'Fan Favorite', description: 'Receive 1,000 total aura', type: 'received', requirement: 1000 },
  { id: 'mega_favorite', name: 'Mega Favorite', description: 'Receive 2,500 total aura', type: 'received', requirement: 2500 },
  { id: 'aura_magnet', name: 'Aura Magnet', description: 'Receive 5,000 total aura', type: 'received', requirement: 5000 },
  { id: 'people_person', name: 'People Person', description: 'Receive 10,000 total aura', type: 'received', requirement: 10000 },
  { id: 'beloved', name: 'Beloved', description: 'Receive 25,000 total aura', type: 'received', requirement: 25000 },
  { id: 'mythical_receiver', name: 'Mythical Receiver', description: 'Receive 50,000 total aura', type: 'received', requirement: 50000 },
  { id: 'divine_charisma', name: 'Divine Charisma', description: 'Receive 100,000 total aura', type: 'received', requirement: 100000 }
];

// Check and unlock retroactive achievements for existing users
function checkRetroactiveAchievements() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    let hasChanges = false;
    
    data.users.forEach(user => {
      if (!user.achievements) user.achievements = [];
      
      // Check all achievement types for retroactive unlocking
      const currentAuraAchievements = checkCurrentAuraAchievements(user);
      const totalGivenAchievements = checkTotalGivenAchievements(user);
      const totalReceivedAchievements = checkTotalReceivedAchievements(user);
      
      if (currentAuraAchievements.length > 0 || totalGivenAchievements.length > 0 || totalReceivedAchievements.length > 0) {
        hasChanges = true;
        console.log(`Unlocked retroactive achievements for ${user.username}`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log('Updated retroactive achievements');
    }
  } catch (error) {
    console.error('Error checking retroactive achievements:', error);
  }
}

// Run retroactive check on server start
checkRetroactiveAchievements();

// Check achievements for a user
function checkAchievements(user) {
  const newAchievements = [];
  
  // Sort achievements by requirement to check in order
  const sortedAchievements = ACHIEVEMENTS.sort((a, b) => a.requirement - b.requirement);
  
  sortedAchievements.forEach(achievement => {
    // Skip if already unlocked
    if (user.achievements && user.achievements.includes(achievement.id)) {
      return;
    }
    
    let unlocked = false;
    
    switch (achievement.type) {
      case 'totalGiven':
        unlocked = (user.totalGiven || 0) >= achievement.requirement;
        break;
      case 'totalReceived':
        unlocked = (user.totalReceived || 0) >= achievement.requirement;
        break;
      case 'current':
        unlocked = user.aura >= achievement.requirement;
        break;
    }
    
    if (unlocked) {
      if (!user.achievements) user.achievements = [];
      user.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// Check only totalGiven achievements
function checkTotalGivenAchievements(user) {
  const newAchievements = [];
  
  // Filter and sort only totalGiven achievements by requirement
  const totalGivenAchievements = ACHIEVEMENTS
    .filter(a => a.type === 'totalGiven')
    .sort((a, b) => a.requirement - b.requirement);
  
  totalGivenAchievements.forEach(achievement => {
    // Skip if already unlocked
    if (user.achievements && user.achievements.includes(achievement.id)) {
      return;
    }
    
    // Check if user meets the requirement
    if ((user.totalGiven || 0) >= achievement.requirement) {
      if (!user.achievements) user.achievements = [];
      user.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// Check only totalReceived achievements
function checkTotalReceivedAchievements(user) {
  const newAchievements = [];
  
  // Filter and sort only totalReceived achievements by requirement
  const totalReceivedAchievements = ACHIEVEMENTS
    .filter(a => a.type === 'totalReceived')
    .sort((a, b) => a.requirement - b.requirement);
  
  totalReceivedAchievements.forEach(achievement => {
    // Skip if already unlocked
    if (user.achievements && user.achievements.includes(achievement.id)) {
      return;
    }
    
    // Check if user meets the requirement
    if ((user.totalReceived || 0) >= achievement.requirement) {
      if (!user.achievements) user.achievements = [];
      user.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// Check only current aura achievements
function checkCurrentAuraAchievements(user) {
  const newAchievements = [];
  
  // Filter and sort only current achievements by requirement
  const currentAchievements = ACHIEVEMENTS
    .filter(a => a.type === 'current')
    .sort((a, b) => a.requirement - b.requirement);
  
  currentAchievements.forEach(achievement => {
    // Skip if already unlocked
    if (user.achievements && user.achievements.includes(achievement.id)) {
      return;
    }
    
    // Check if user meets the requirement
    if (user.aura >= achievement.requirement) {
      if (!user.achievements) user.achievements = [];
      user.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// API Routes

// GET /api/users - Return all users
app.get('/api/users', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    res.json(parsed);
  } catch (error) {
    console.error('Error reading users:', error);
    res.status(500).json({ error: 'Failed to read users data' });
  }
});

// POST /api/users - Save updated users array
app.post('/api/users', (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Invalid users data' });
    }
    
    // Ensure all users have achievement tracking fields
    users.forEach(user => {
      if (!user.totalGiven) user.totalGiven = 0;
      if (!user.totalReceived) user.totalReceived = 0;
      if (!user.achievements) user.achievements = [];
    });
    
    // Read existing data to preserve announcement
    const existingData = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
    const data = { 
      ...existingData,
      users 
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Users data saved successfully' });
  } catch (error) {
    console.error('Error saving users:', error);
    res.status(500).json({ error: 'Failed to save users data' });
  }
});

// GET /api/announcement - Get current announcement
app.get('/api/announcement', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    res.json({ announcement: parsed.announcement || '' });
  } catch (error) {
    console.error('Error reading announcement:', error);
    res.status(500).json({ error: 'Failed to read announcement' });
  }
});

// POST /api/announcement - Update announcement
app.post('/api/announcement', (req, res) => {
  try {
    const { announcement } = req.body;
    
    if (typeof announcement !== 'string') {
      return res.status(400).json({ error: 'Invalid announcement data' });
    }
    
    // Read existing data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.announcement = announcement;
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// GET /api/achievements - Return all achievement definitions
app.get('/api/achievements', (req, res) => {
  try {
    res.json({ achievements: ACHIEVEMENTS });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// POST /api/give-aura - Handle giving aura with achievement tracking
app.post('/api/give-aura', (req, res) => {
  try {
    const { giverUsername, receiverUsername, amount } = req.body;
    
    if (!giverUsername || !receiverUsername || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Read current data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const giver = data.users.find(u => u.username === giverUsername);
    const receiver = data.users.find(u => u.username === receiverUsername);
    
    if (!giver || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize netDailyAura and achievements if needed
    if (!giver.netDailyAura) giver.netDailyAura = {};
    if (!giver.netDailyAura[receiverUsername]) giver.netDailyAura[receiverUsername] = 0;
    if (!giver.achievements) giver.achievements = [];
    if (!receiver.achievements) receiver.achievements = [];
    
    // Check daily limit for positive direction (+500)
    const currentNetAmount = giver.netDailyAura[receiverUsername];
    if (currentNetAmount + amount > 500) {
      return res.status(400).json({ error: `Daily +500 aura limit reached! Current net: ${currentNetAmount}. Try removing some aura first.` });
    }
    
    // Update aura and tracking
    receiver.aura += amount;
    receiver.totalReceived = (receiver.totalReceived || 0) + amount;
    giver.totalGiven = (giver.totalGiven || 0) + amount;
    giver.netDailyAura[receiverUsername] += amount;
    
    // Check achievements only for users whose stats changed
    const giverNewAchievements = checkTotalGivenAchievements(giver); // giver's totalGiven changed
    const receiverCurrentAuraAchievements = checkCurrentAuraAchievements(receiver); // receiver's current aura changed
    const receiverNewAchievements = receiverCurrentAuraAchievements;
    
    // Save updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    // Broadcast real-time update to all connected clients
    io.emit('auraUpdate', {
      type: 'give',
      giver: {
        username: giver.username,
        aura: giver.aura,
        totalGiven: giver.totalGiven
      },
      receiver: {
        username: receiver.username,
        aura: receiver.aura,
        totalReceived: receiver.totalReceived
      },
      amount: amount,
      message: `${giver.username} gave ${amount} aura to ${receiver.username}!`,
      newAchievements: {
        giver: giverNewAchievements,
        receiver: receiverNewAchievements
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Aura given successfully',
      newAchievements: {
        giver: giverNewAchievements,
        receiver: receiverNewAchievements
      }
    });
  } catch (error) {
    console.error('Error giving aura:', error);
    res.status(500).json({ error: 'Failed to give aura' });
  }
});

// POST /api/remove-aura - Handle removing aura with achievement tracking
app.post('/api/remove-aura', (req, res) => {
  try {
    const { removerUsername, targetUsername, amount } = req.body;
    
    if (!removerUsername || !targetUsername || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Read current data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const remover = data.users.find(u => u.username === removerUsername);
    const target = data.users.find(u => u.username === targetUsername);
    
    if (!remover || !target) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize netDailyAura and achievements if needed
    if (!remover.netDailyAura) remover.netDailyAura = {};
    if (!remover.netDailyAura[targetUsername]) remover.netDailyAura[targetUsername] = 0;
    if (!remover.achievements) remover.achievements = [];
    if (!target.achievements) target.achievements = [];
    
    // Check daily limit for negative direction (-500)
    const currentNetAmount = remover.netDailyAura[targetUsername];
    if (currentNetAmount - amount < -500) {
      return res.status(400).json({ error: `Daily -500 aura limit reached! Current net: ${currentNetAmount}. Try giving some aura first.` });
    }
    
    // Update aura and tracking
    target.aura -= amount;
    target.totalReceived = Math.max(0, (target.totalReceived || 0) - amount);
    remover.totalGiven = Math.max(0, (remover.totalGiven || 0) - amount);
    remover.netDailyAura[targetUsername] -= amount;
    
    // Check achievements only for users whose stats changed
    const removerNewAchievements = []; // remover's totalGiven decreased, no new achievements
    const targetCurrentAuraAchievements = checkCurrentAuraAchievements(target); // target's current aura changed
    const targetNewAchievements = targetCurrentAuraAchievements;
    
    // Save updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    
    // Broadcast real-time update to all connected clients
    io.emit('auraUpdate', {
      type: 'remove',
      remover: {
        username: remover.username,
        aura: remover.aura,
        totalGiven: remover.totalGiven
      },
      target: {
        username: target.username,
        aura: target.aura,
        totalReceived: target.totalReceived
      },
      amount: amount,
      message: `${remover.username} removed ${amount} aura from ${target.username}!`,
      newAchievements: {
        remover: removerNewAchievements,
        target: targetNewAchievements
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Aura removed successfully',
      newAchievements: {
        remover: removerNewAchievements,
        target: targetNewAchievements
      }
    });
  } catch (error) {
    console.error('Error removing aura:', error);
    res.status(500).json({ error: 'Failed to remove aura' });
  }
});

// POST /api/reset-achievements - Reset all achievements for all users
app.post('/api/reset-achievements', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Reset achievements and stats for all users
    data.users.forEach(user => {
      user.achievements = [];
      user.aura = 0;        // Reset to 0 aura
      user.totalGiven = 0;  // Reset giving progress  
      user.totalReceived = 0; // Reset receiving progress
      // Keep netDailyAura as is since it's for daily limits
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({ 
      success: true, 
      message: 'All achievements have been reset for all users'
    });
  } catch (error) {
    console.error('Error resetting achievements:', error);
    res.status(500).json({ error: 'Failed to reset achievements' });
  }
});

// POST /api/reset-all-aura - Set everyone to 100 aura
app.post('/api/reset-all-aura', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Set aura to 100 for all users
    data.users.forEach(user => {
      user.aura = 100;
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({ 
      success: true, 
      message: 'All users have been set to 100 aura'
    });
  } catch (error) {
    console.error('Error resetting all aura:', error);
    res.status(500).json({ error: 'Failed to reset aura' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Aura Tracker server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'public')}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});
