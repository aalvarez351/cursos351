const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, clientData } = req.body;
    let clientId = null;
    if (role === 'client' && clientData) {
      const client = new Client(clientData);
      await client.save();
      clientId = client._id;
    }
    const user = new User({ username, password, role, clientId });
    await user.save();
    const token = jwt.sign({ id: user._id }, 'secretkey');
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).send({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, 'secretkey');
    res.send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

// Get profile
router.get('/me', auth, async (req, res) => {
  res.send(req.user);
});

module.exports = router;