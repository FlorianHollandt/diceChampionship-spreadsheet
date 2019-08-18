
const config = require('./../config');

const {google} = require('googleapis');

module.exports = {

    initializeJWT: function() {
        return new Promise(
            (resolve, reject) => {
                try {
                    let key = require(config.custom.spreadsheet.credentialsFile);

                    let jwtClient = new google.auth.JWT(
                        key.client_email,
                        null,
                        key.private_key,
                        ['https://www.googleapis.com/auth/spreadsheets'],
                        null
                    );
                    resolve(jwtClient);
                } catch (error) {
                    reject(error);
                }
            }
        );
    },

    authorizeJWT: function(jwtClient) {
        return new Promise(
            (resolve, reject) => {
                try {
                    jwtClient.authorize(
                        function(errorJwt, tokens) {
                            if (errorJwt) {
                                console.log(
                                    `Error at JWT Client authorization `
                                );
                                reject(errorJwt);
                            };
                            resolve(jwtClient);
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            }
        );
    },

    loadSpreadsheetData: function(jwtClient) {
        return new Promise(
            (resolve, reject) => {
                try {
                    const sheets = google.sheets('v4');
                    sheets.spreadsheets.values.get(
                        {
                            auth: jwtClient,
                            spreadsheetId: config.custom.spreadsheet.id,
                            range: `${
                                config.custom.spreadsheet.scores.sheetName
                            }!${
                                config.custom.spreadsheet.scores.keyColumn
                            }:${
                                config.custom.spreadsheet.scores.valueColumn
                            }`,
                        }, function(errorSheets, response) {
                            if (errorSheets) {
                                console.log(
                                    `Error at retrieving values from Google Spreadsheet: ${errorSheets}`
                                );
                                reject(errorSheets);
                            } else {
                                resolve(response.data.values);
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            }
        );
    },

    getRank: async function(id, score, jwtClient) {
        const promiseArray = [
            module.exports.loadSpreadsheetData(jwtClient),
        ];
        const [rawSpreadsheetData] = await Promise.all(promiseArray);

        const rank = rawSpreadsheetData.filter(
            (item) => {
                return (
                    item[1] >= score
                    && item[0] !== id
                );
            }
        ).length + 1;

        return rank;
    },


    getPlayerIndex: async function(playerId, jwtClient) {
        const promiseArray = [
            module.exports.loadSpreadsheetData(jwtClient),
        ];
        const [rawSpreadsheetData] = await Promise.all(promiseArray);

        let index = rawSpreadsheetData.map(
            (item) => {
                return item[0];
            }
        ).indexOf(playerId) + 1;

        return index || rawSpreadsheetData.length + 1;
    },

    updatePlayerScore: async function(playerId, playerIndex, score, jwtClient) {
        const promiseArray = [
            module.exports.updateSpreadsheetData(
                jwtClient,
                playerIndex,
                playerId,
                score
            ),
        ];
        await Promise.all(promiseArray);

        return;
    },

    updateSpreadsheetData: function(
        jwtClient,
        rowIndex,
        key,
        value
    ) {
        return new Promise(
            (resolve, reject) => {
                try {
                    const sheets = google.sheets('v4');
                    sheets.spreadsheets.values.update(
                        {
                            auth: jwtClient,
                            spreadsheetId: config.custom.spreadsheet.id,
                            range: `${
                                config.custom.spreadsheet.scores.sheetName
                            }!${
                                config.custom.spreadsheet.scores.keyColumn
                            }${
                                rowIndex
                            }:${
                                config.custom.spreadsheet.scores.valueColumn
                            }${
                                rowIndex
                            }`,
                            valueInputOption: 'USER_ENTERED',
                            resource: {
                                values: [
                                    [key, value],
                                ],
                            },
                        }, function(errorSheets, response) {
                            if (errorSheets) {
                                console.log(
                                    `Error at updating values in Google Spreadsheet: ${errorSheets}`
                                );
                                reject(errorSheets);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            }
        );
    },

};
