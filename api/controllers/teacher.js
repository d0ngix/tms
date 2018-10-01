//todoList Controller
'use strict';
var mysql = require('mysql');
const connection = mysql.createConnection({
    host      : 'localhost',
    user      : 'root',
    password  : 'd0ngix777',
    database  : 'tms'
});

var execQuery = (sql) => {
    // console.log(sql)
    return new Promise ( (resolve, reject) => {
      // console.log(sql)
      connection.query(sql, (err, result) => {
        if (err) return reject(err)
        resolve(result)
      })
    })
  }

var getStudentsByTeacherId = (id) => {
    var sqlGetAllStudents = "SELECT email FROM teacher_students WHERE teacher_id="+id;
    var resultStuds = []
    return new Promise ( (resolve, reject) => { 
      connection.query( sqlGetAllStudents, (err, result) => {
        if ( err ) return reject( err );
        
        if (result.length) {
          for (var i=0; i <= result.length - 1; i++) {
            // console.log(result1[i].email)
            resultStuds.push(result[i].email)
          }
          resolve({ "stud":resultStuds, "techearId":id })
        } else resolve({"techearId":id})
  
      })//end of sqlGetAllStudents
    });    
  }

/** 2. As a teacher, I want to retrieve a list of students common to a given list of teachers (i.e. retrieve students who are registered to ALL of the given teachers). */
exports.commonstudents = (req, res) => {

    /**
    SELECT t.email, s.email FROM teacher_students ts
    LEFT JOIN students s ON s.id = ts.student_id
    LEFT JOIN teachers t ON t.id = ts.teacher_id
    WHERE t.email IN ('techer1@x.com','teacher2@x.com')
    */
     
   var tEmail = req.query.teacher
   if ( Array.isArray(req.query.teacher)) {
     tEmail = req.query.teacher.join('","')
   }
     
   
   var sql = 'SELECT s.email sEmail FROM teacher_students s '
   sql += 'LEFT JOIN teachers t ON s.teacher_id = t.id '  
   sql += 'WHERE t.email IN ("' + tEmail + '")'
 
   connection.query(sql, (err, result, fields) => {
     
     if (err) res.json(err)
     var arrResult = [], prevId = 0, arr1 = [], jsObj = new Object(), jsArr = []
     for (var i =0; i <= result.length - 1; i++) {
       jsArr.push(result[i].sEmail)
     }
 
     arrResult = jsArr;
 
     //remove the unique element
     if ( Array.isArray(req.query.teacher) ) {
       arrResult = [];
       var sorted_arr = jsArr.slice().sort();    
       for (var i = 0; i < sorted_arr.length - 1; i++) {
           if (sorted_arr[i + 1] == sorted_arr[i]) {
             arrResult.push(sorted_arr[i]);
           }
       }    
     }
     
     res.json({"students":arrResult})
   });
}

/** 3. As a teacher, I want to suspend a specified student. */
exports.suspend = (req, res) => {
    // res.json(req.body.student)
    /** find and update */
    var sql = "UPDATE students SET is_suspended='1' WHERE email="+connection.escape(req.body.student)
    connection.query(sql, (err, result) => {
        // console.log(result)
        if (err) res.status(404)
        res.status(204).json()
    })
}


exports.retrievefornotifications = ( req, res) => {
    /**
    To receive notifications from e.g. 'teacherken@example.com', a student:
    - MUST NOT be suspended,
    - AND MUST fulfill AT LEAST ONE of the following: 
    - - is registered with “teacherken@example.com"
    - - has been @mentioned in the notification

    1. get all students subscribed to the teacher that is not suspended
    2. parse the body.notification to extract the @mentioned
    3. check the @mentioned if not suspended

    SELECT ts.email, s.email, s.is_suspended
    FROM teacher_students ts 
    INNER JOIN students s ON ts.email = s.email
    WHERE s.is_suspended = '0'
    AND ts.teacher_id = 1

    */

    var teacher = req.body.teacher
    var notification = req.body.notification
    var arrMetioned = notification.match(/@[a-z0-9\._%+!$&*=^|~#%'`?{}\-]+@([a-z0-9\-]+\.){1,}([a-z]{2,16})/g)

    var promise = execQuery("SELECT * FROM teachers WHERE email = "+connection.escape(teacher)+" LIMIT 1")
    promise.then( result => {
    if (!result.length) {
        res.json({message:"Teacher does not exist!"})
    }

    // console.log(result[0].id)
    var sql = "SELECT ts.email FROM teacher_students ts INNER JOIN students s ON ts.email = s.email WHERE s.is_suspended = '0' AND ts.teacher_id ="+result[0].id;
    var promise = execQuery(sql)
    promise.then( result => {
        
        //iterate the result
        var arrEmail = []
        for (var i=0; i <= result.length-1; i++) {
            arrEmail.push(result[i].email)  
        }

        //check the @mentioned if exist and not suspended
        if (arrMetioned != null) {

        var sqlStudent = '', arrMetionedClean = [];
        for (var i = 0; i <= arrMetioned.length - 1; i++) {
            sqlStudent += connection.escape(arrMetioned[i].substr(1))+",";
            // arrMetionedClean.push(arrMetioned[i].substr(1))
        }   
        sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)

        //check if student exist and not is_suspended
        sql = "SELECT * FROM students WHERE email IN ("+sqlStudent+") AND is_suspended='0'"
        var promise = execQuery(sql)
        promise.then( result => {
            // console.log(arrEmail)
            if (result.length) {
            for (var i=0; i<=result.length-1; i++) {
                arrEmail.push(result[i].email)
            }
            }

            //remove duplicate
            if (Array.isArray(arrEmail)) {

            var newResultEmail = []
            var newArrEmail = arrEmail.slice().sort()

            for (i=0; i<=newArrEmail.length-1; i++) {
                if (newArrEmail[i+1] != newArrEmail[i])
                newResultEmail.push(newArrEmail[i])
            }
            }
            
            res.json({recipients:newResultEmail})

        }, err => {
            res.status(503).json({message:err.sqlMessage})
        })

        } else {

        res.json({recipients:arrEmail})

        }//end of ifelse block

    }, err => {
        res.status(500).json({message:err.sqlMessage})
    })

    }, err => {
    res.json({message:err.sqlMessage})
    })    
}


exports.register = (req, res) => {
    if(!req.body) return res.sendStatus(400)
    // console.log(req.body.teacher)
  
    //1. find the teacher if exist, add teacher if it doesnt
    //2. get all student that subscribe to the teacher
    var sqlSelectTechear = "SELECT id FROM teachers WHERE email = "+connection.escape(req.body.teacher)+" LIMIT 1";
    
      connection.query(sqlSelectTechear, (err, result, fields) => {
        if (err)  {
          res.status(500);
          res.json({"error":err.sqlMessage});          
        }      
  
        if (!result.length) {
          
          //insert a new teacher
          var promise = execQuery("INSERT INTO teachers (`email`) VALUES ("+connection.escape(req.body.teacher)+")");
          promise.then( result => {
            
            var promise = getStudentsByTeacherId(result.insertId) 
            promise.then( resultStuds => {
  
              var sqlInsertStudent = "INSERT INTO teacher_students (`teacher_id`,`email`) VALUES "
              var sqlStudent = "";              
              
              if (req.body.students.length) {
  
                for (var i = 0; i <= req.body.students.length - 1; i++) {
                  sqlStudent += "("+connection.escape(resultStuds.techearId)+", "+connection.escape(req.body.students[i])+"),";
                }
                
                sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                
                var promise = execQuery(sqlInsertStudent + sqlStudent)
                promise.then( result => {
  
                  //insert students in students table
                  sqlStudent = '';
                  for (var i = 0; i <= req.body.students.length - 1; i++) {
                    sqlStudent += "("+connection.escape(req.body.students[i])+"),";
                  }                
                  sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                  // console.log(sqlStudent);
                  
                  var promise = execQuery("INSERT INTO students (`email`) VALUES " + sqlStudent)
                  promise.then( result => { 
                    // console.log(result);                  
                    res.status(204).json()                  
                  }, err => {
                    // console.log(err)
                    // res.status(503).json({message:err.sqlMessage})
                    res.status(204).json()      
                  })
  
                }, err => {
                    res.status(503).json({message:err.sqlMessage})
                })                    
  
              } else {
                res.status(503).json({message:"student field must not be empty!"})
              }
  
              
              
            }, err => {
                res.status(503).json({message:err.sqlMessage})
            })

          }, err => {
              res.status(503).json({message:err.sqlMessage})
          })
  
        } else {
  
            // for exisitng teacher
          var teacherId = connection.escape(result[0].id)
          var promise = execQuery("SELECT id FROM teachers WHERE id = "+connection.escape(teacherId)+" LIMIT 1")
          promise.then( result => {
            var promise = getStudentsByTeacherId(result[0].id)
            promise.then( resultStuds => {
  
              var sqlInsertStudent = "INSERT INTO teacher_students (`teacher_id`,`email`) VALUES "
              var sqlStudent = "";              
              
              /*** teacher with no students yet. ***/
  
              if (typeof resultStuds.stud === 'undefined') {
  
                for (var i = 0; i <= req.body.students.length - 1; i++) {
                  sqlStudent += "("+connection.escape(resultStuds.techearId)+", "+connection.escape(req.body.students[i])+"),";
                }
                
                sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                // console.log(sqlStudent);
                var promise = execQuery(sqlInsertStudent + sqlStudent)
                promise.then( result => {
                  // console.log(result); 
                  //insert students in students table
                  sqlStudent = '';
                  for (var i = 0; i <= req.body.students.length - 1; i++) {
                    sqlStudent += "("+connection.escape(req.body.students[i])+"),";
                  }                
                  sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                  // console.log(sqlStudent);
                  
                  var promise = execQuery("INSERT INTO students (`email`) VALUES " + sqlStudent)
                  promise.then( result => { 
                    // console.log(result);                  
                    res.status(204).json({});                  
                  }, err => {
                    res.status(503).json(err);
                  })
                }, err => {
                  res.status(500).json({"error":err.sqlMessage});                    
                } )
                      
  
              } else {
  
                /***teacher with existing  students ***/
                var arrStudHaystack = [], arrStudNeedle = [] 
                if ( req.body.students.length >= resultStuds.stud.length ) {
                  arrStudHaystack = resultStuds.stud;
                  arrStudNeedle = req.body.students;
                } else {
                  arrStudHaystack = req.body.students;
                  arrStudNeedle = resultStuds.stud;              
                }
  
                arrStudHaystack = resultStuds.stud;
                arrStudNeedle = req.body.students;                 
  
                //remove duplicate email
                var idx = null
                for (var i=0; i <= arrStudHaystack.length - 1; i++) {
                  if ( (idx = arrStudNeedle.indexOf(arrStudHaystack[i])) >= 0 ) {
                    // arrStudNeedle.splice(idx,1)
                    arrStudNeedle[idx] = null;
                    // console.log(arrStudNeedle);
                  } 
                }
  
                var newStudNeedle = arrStudNeedle.filter((obj) => obj );             
                
                if (!newStudNeedle.length) {
                  res.status(204) 
                } else {
                 
                  for (var i = 0; i <= newStudNeedle.length - 1; i++) {
                    sqlStudent += "("+connection.escape(resultStuds.techearId)+", "+connection.escape(newStudNeedle[i])+"),";
                  }
                  
                  sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                  // console.log(sqlStudent);
                  var promise = execQuery(sqlInsertStudent + sqlStudent)                
                  promise.then( result => {
                    //insert students in students table
                    sqlStudent = '';
                    for (var i = 0; i <= req.body.students.length - 1; i++) {
                      // console.log(req.body.students[i] != null );
                      if(req.body.students[i] != null)
                        sqlStudent += "("+connection.escape(req.body.students[i])+"),";
                    }                
                    sqlStudent = sqlStudent.substr(0,sqlStudent.length - 1)
                    // console.log(sqlStudent);
                    
                    var promise = execQuery("INSERT INTO students (`email`) VALUES " + sqlStudent)
                    promise.then( result => { 
                      // console.log(result);                  
                      res.status(204);                   
                    }, err => {
                        res.status(503).json({message:err.sqlMessage});
                      })
                  }, err => {
                    res.status(503).json({message:err.sqlMessage});
                  })
                  
                }
              }
            }, err => {
                res.status(503).json(err);
              })
          }).then( result => {
            res.status(204).json({});
          }, err => {
            res.status(503).json(err);
          });
        }      
      })//end of sqlSelectTechear    
}