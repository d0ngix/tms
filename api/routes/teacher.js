'use strict';
module.exports = function (app) {
    var teacher = require('../controllers/teacher');
    
    app.route('/api/commonstudents').get(teacher.commonstudents);
    app.route('/api/suspend').post(teacher.suspend);
    app.route('/api/retrievefornotifications').post(teacher.retrievefornotifications)
    app.route('/api/register').post(teacher.register)
    
}