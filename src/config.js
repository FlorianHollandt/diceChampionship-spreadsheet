// ------------------------------------------------------------------
// APP CONFIGURATION
// ------------------------------------------------------------------

require('dotenv').config();

module.exports = {
    logging: {
        request: true,
        requestObjects: [
            'request',
        ],
        response: true,
        responseObjects: [
            'response.outputSpeech.ssml',
        ],
    },
    intentMap: {
        'AMAZON.StopIntent': 'END',
        'AMAZON.CancelIntent': 'END',
        'AMAZON.NoIntent': 'END',
        'AMAZON.YesIntent': 'YesIntent',
        'AMAZON.HelpIntent': 'YesIntent',
    },
    custom: {
        spreadsheet: {
            id: process.env.SPREADSHEET_ID,
            credentialsFile: './credentials.json',
            scores: {
                sheetName: 'scores',
                keyColumn: 'A',
                valueColumn: 'B',
            },
        },
        game: {
            numberOfDice: 10,
            sidesPerDice: 6,
        },
    },
};
