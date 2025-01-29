require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: true,
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Подключение к MongoDB
mongoose.connect('mongodb+srv://pernebekabylaj:vPxecERDKkxNmzFQ@cluster0.ehlo7.mongodb.net/ass3web?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('Подключено к MongoDB Atlas'))
    .catch((error) => {
        console.error('Ошибка подключения к MongoDB Atlas:', error.message);
        console.error('Детали:', error);
    });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  admin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  deletedAt: { type: Date },
});
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  res.render('login-register', { message: null });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.render('login-register', { message: 'Registration successful! Please log in.' });
  } catch (error) {
    res.render('login-register', { message: 'Error: Username already exists.' });
  }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.render('login-register', { message: 'User not found.' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.render('login-register', { message: 'Invalid password.' });
      }
      req.session.user = user;
      res.render('index', { user: req.session.user });
    } catch (error) {
      res.render('login-register', { message: 'An error occurred during login.' });
    }
});
  
app.get('/main', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.render('main', { user: req.session.user });
});

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.render('profile', { user: req.session.user });
});

// Admin Panel Route
app.get('/admin', async (req, res) => {
  if (!req.session.user || !req.session.user.admin) {
    return res.redirect('/');
  }
  const users = await User.find();
  res.render('admin', { users });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/profile');
    }
    res.redirect('/');
  });
});


// Delete User Route
app.post('/admin/delete', async (req, res) => {
  if (!req.session.user || !req.session.user.admin) {
    return res.redirect('/');
  }
  await User.findByIdAndDelete(req.body.userId);
  res.redirect('/admin');
});

// Edit User Route
app.post('/admin/edit', async (req, res) => {
  if (!req.session.user || !req.session.user.admin) {
    return res.redirect('/');
  }
  await User.findByIdAndUpdate(req.body.userId, { username: req.body.username, admin: req.body.admin === 'true' });
  res.redirect('/admin');
});


async function createAdmin() {
  const existingAdmin = await User.findOne({ username: "admin" });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin", 10);
    const adminUser = new User({
      username: "admin",
      password: hashedPassword,
      admin: true
    });
    await adminUser.save();
    console.log("✅ Администратор создан: admin / admin");
  } else {
    console.log("ℹ️ Админ уже существует.");
  }
}

// Запуск создания админа при старте сервера
createAdmin();


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
