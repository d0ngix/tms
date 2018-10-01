require('dotenv').config()
var express = require('express'), 
      app = express(),
      bodyParser = require('body-parser');
var mysql = require('mysql');
var router = express.Router();
const connection = mysql.createConnection({
  host      : process.env.DB_HOST,
  user      : process.env.DB_USER,
  password  : process.env.DB_PASSWORD,
  database  : process.env.DB_DATEBASE
});


connection.connect(function(err){
  if (!err) {
    console.log("DB connected!");
  } else {
    console.log("DB connection Error!");
  }
});

// parse application/json
app.use(bodyParser.json())

var routes = require('./api/routes/teacher');
routes(app);

app.listen(3000, function(){  
  console.log("Server is up and listening on 3000...");
})