require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));
console.log("Serving static files from:", path.join(__dirname, 'public'));


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

app.use((req, res, next) => {
  console.log(`Запрос: ${req.url}`);
  next();
});



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
  email: { type: String, unique: true, required: true },
  password: { type: String, default: null },  // пароль не обязателен
  admin: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
});



const User = mongoose.model('User', userSchema);


// Routes
app.get('/', (req, res) => {
  res.render('login-register', { message: null });
});

/// API для проверки Email
const verifyEmail = async (email) => {
  try {
    const response = await fetch(`https://api.emailvalidation.io/v1/info?apikey=${process.env.EMAIL_API_KEY}&email=${email}`);
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    const data = await response.json();
    console.log(data);
    return data.smtp_check || false;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    return false;
  }
};

// Регистрация
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const emailValid = await verifyEmail(email);
    if (!emailValid) {
      return res.render('login-register', { message: 'Invalid email address' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    req.session.user = newUser; 
    res.redirect('/main'); 
  } catch (error) {
    res.render('login-register', { message: 'Error: Username or email already exists' });
  }
});


const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Настройка Passport для Google OAuth
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = new User({
          username: profile.displayName,
          email: profile.emails[0].value,
          password: null,
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));


// Сериализация пользователя
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Маршруты для входа через Google
app.get('/auth/google', (req, res, next) => {
  if (req.session.user) {
    console.log("User session after Google login:", req.session.user);
    return res.redirect('/main'); 
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login-register',
  }),
  (req, res) => {
    req.session.user = req.user; 
    console.log("User session after Google login:", req.session.user);
    res.redirect('/main'); 
  }
);

// Выход
app.get("/logout", (req, res) => {
  req.logout(() => {});
  req.session.destroy(() => {});
  res.redirect("/");
});


// Установка языка
app.get('/set-language/:lang', (req, res) => {
  const { lang } = req.params;
  req.session.language = lang;
  res.redirect('back');
});

// Middleware для установки языка
app.use((req, res, next) => {
  res.locals.language = req.session.language || 'en';
  next();
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
      const backgrounds = await Background.find();
      const ads = await AdBlock.find();
      res.render('index', { user: req.session.user, backgrounds, ads });
    } catch (error) {
      res.render('login-register', { message: 'An error occurred during login.' });
    }
});
  
app.get("/main", isAuthenticated, async (req, res) => {
  try {
    const backgrounds = await Background.find();
    const ads = await AdBlock.find();
    res.render("index", { user: req.session.user, backgrounds, ads });
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    res.status(500).send("Ошибка загрузки данных");
  }
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
  const backgrounds = await Background.find();
  const ads = await AdBlock.find();
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

// Middleware: Проверяет, залогинен ли пользователь
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  return res.redirect('/'); // Если не залогинен, отправляем на страницу входа
}

// Middleware: Проверяет, является ли пользователь админом
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).send('Access denied. Only admins can access this page.');
}


// Запуск создания админа при старте сервера
createAdmin();

const EncryptedText = require(path.join(__dirname, '../models/EncryptedText'));
app.get('/texts', async (req, res) => {
  const texts = await EncryptedText.find();
  console.log(texts); // Проверяем, что данные реально сохраняются
  res.json(texts);
});
app.post('/admin/add-text', async (req, res) => {
  console.log("Получен запрос:", req.body); // Проверяем, что сервер получает данные
  // ... остальной код
});




// Маршрут для получения данных о погоде
app.get('/api/weather', async (req, res) => {
  const { city } = req.query;

  if (!city) {
      console.log('City not provided in request');
      return res.status(400).send('City is required');
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  console.log('Weather API request URL:', url);

  try {
      const response = await axios.get(url);
      console.log('Weather API response:', response.data);
      res.json(response.data);
  } catch (error) {
      console.error('Error fetching weather data:', error.response?.data || error.message);
      res.status(500).send('Ошибка при получении данных о погоде');
  }
});

// Маршрут для получения курсов валют
app.get('/api/currency', async (req, res) => {
  const base = req.query.base || 'USD'; // Базовая валюта
  const apiKey = process.env.EXCHANGE_RATE_API_KEY; // Ключ из .env
  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;

  try {
      const response = await axios.get(url);
      res.json(response.data.conversion_rates); // Отправляем только курсы
  } catch (error) {
      console.error('Error fetching currency rates:', error.response?.data || error.message);
      res.status(500).send('Ошибка при получении курсов валют');
  }
});


// Маршрут для получения новостей
app.get('/api/news', async (req, res) => {
  const { country } = req.query; // Страна для фильтрации новостей
  const apiKey = process.env.NEWS_API_KEY; // Ключ из .env
  const url = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${apiKey}`;

  try {
      const response = await axios.get(url);
      res.json(response.data.articles); // Отправляем только статьи
  } catch (error) {
      console.error('Error fetching news:', error.response?.data || error.message);
      res.status(500).send('Ошибка при получении новостей');
  }
});


// Маршрут для получения прогноза погоды
app.get('/api/forecast', async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${apiKey}&units=metric`;

  try {
      const response = await axios.get(url);
      res.json(response.data.daily); // Отправляем только ежедневный прогноз
  } catch (error) {
      console.error('Error fetching forecast data:', error.response?.data || error.message);
      res.status(500).send('Ошибка при получении прогноза погоды');
  }
});

const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' }); // Папка для загрузок

app.post('/admin/add-background', upload.single('backgroundImage'), async (req, res) => {
  const { description } = req.body;
  const imageUrl = `/uploads/${req.file.filename}`;

  const background = new Background({ imageUrl, description });
  await background.save();

  res.redirect('/admin');
});

app.post('/admin/delete-background/:id', async (req, res) => {
  await Background.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});

app.post('/admin/add-adblock', upload.single('adImage'), async (req, res) => {
  const { text, link } = req.body;
  const imageUrl = `/uploads/${req.file.filename}`;

  const adBlock = new AdBlock({ imageUrl, text, link });
  await adBlock.save();

  res.redirect('/admin');
});

app.post('/admin/delete-adblock/:id', async (req, res) => {
  await AdBlock.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});



const backgroundSchema = new mongoose.Schema({
  imageUrl: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
});
const Background = mongoose.model('Background', backgroundSchema);

const adBlockSchema = new mongoose.Schema({
  imageUrl: String,
  text: String,
  link: String,
  createdAt: { type: Date, default: Date.now },
});
const AdBlock = mongoose.model('AdBlock', adBlockSchema);




app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
