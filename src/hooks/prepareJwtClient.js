'use strict';

const spreadsheet = require('./../spreadsheet');

module.exports = async function(error, host, jovo) {
    console.log(`hook.prepareJwtClient()`);

    console.time('Initialization of JWT client');
    let jwtClient = await spreadsheet.initializeJWT();
    jwtClient = await spreadsheet.authorizeJWT(jwtClient);
    console.timeEnd('Initialization of JWT client');

    jovo.$data.jwtClient = jwtClient;
};
