const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/db');

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Login handler
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }
    
    req.session.user = user;
    res.redirect('/');
  });
});

// Register page
router.get('/register', (req, res) => {
  res.render('auth/register');
});

// Register handler
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
    [username, hashedPassword], 
    function(err) {
      if (err) {
        return res.render('auth/register', { error: 'Username already exists' });
      }
      res.redirect('/auth/login');
    }
  );
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;