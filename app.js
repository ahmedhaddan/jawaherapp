const express = require('express');
const app = express();
const path = require('path');
const route = require('./routes/route');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const upload = require('express-fileupload');
const dotenv = require('dotenv');

dotenv.config({ path: "./config.env" });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Increase file upload size limit
app.use(upload({
  limits: { fileSize: 50 * 1024 * 1024 } , // 50MB file size limit
  useTempFiles: true, // Use temp files for large uploads
  tempFileDir: '/tmp/' // Specify a temporary directory
}));
// Increase the size limit for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use(session({ resave: false, saveUninitialized: true, secret: 'nodedemo' }));
app.use(cookieParser());

app.set('layout', 'partials/layout-vertical');
app.use(expressLayouts);

app.use(express.static(__dirname + '/public'));

app.use('/', route);

app.use((err, req, res, next) => {
  let error = { ...err }
  if (error.name === 'JsonWebTokenError') {
    err.message = "Please login again";
    err.statusCode = 401;
    return res.status(401).redirect('view/login');
  }
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'errors';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

const http = require("http").createServer(app);
http.listen(process.env.PORT , () => console.log(`Server is listening on address http://localhost:`));
