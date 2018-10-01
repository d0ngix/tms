var express = require('express'), 
      app = express(),
      bodyParser = require('body-parser');
var mysql = require('mysql');
var router = express.Router();
const connection = mysql.createConnection({
  host      : 'localhost',
  user      : 'root',
  password  : 'd0ngix777',
  database  : 'tms'
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
// app.use('/api', [routes]);



app.listen(3000, function(){  
  console.log("Server is up and listening on 3000...");
})