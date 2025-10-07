const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://aalvarez351:Lentesdesol@ianube.furqsl0.mongodb.net/?retryWrites=true&w=majority&appName=ianube', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected');

  // Create default admin user if it doesn't exist
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('Default admin user created: username: admin, password: admin123');
    }
  } catch (err) {
    console.log('Error creating default admin:', err);
  }
})
.catch(err => console.log(err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/client', require('./routes/client'));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Serve the login page as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'examples', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});