'use strict';

const murmurhash = require('murmurhash');

const spreadsheet = require('./spreadsheet');
const config = require('./config');

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { JovoDebugger } = require('jovo-plugin-debugger');

const app = new App();

app.use(
    new Alexa(),
    new JovoDebugger(),
);

app.hook(
    'before.router',
    require('./hooks/prepareJwtClient')
);

// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------

app.setHandler({

    async NEW_SESSION() {
        console.log(`NEW_SESSION()`);

        const playerId = getPlayerId(this);
        const playerIndex = await spreadsheet.getPlayerIndex(
            playerId,
            this.$data.jwtClient
        );
        console.log(`Player index: ${playerIndex}`);

        this.setSessionAttribute('playerId', playerId);
        this.setSessionAttribute('playerIndex', playerIndex);
        this.setSessionAttribute('previousHighscore', 0);
        this.setSessionAttribute('previousRank', 999999999);

        this.$speech.t('welcome-new');

        return this.toIntent('_rollDice');
    },

    async YesIntent() {
        console.log(`YesIntent()`);

        this.$speech.t('confirm');

        return this.toIntent('_rollDice');
    },

    async _rollDice() {
        console.log(`_rollDice()`);

        this.$speech
            .t('dice-intro')
            .t('dice-sound');

        let sumOfDice = 0;
        for (let i = 0; i < config.custom.game.numberOfDice; i++) {
            sumOfDice += getDiceRollResult();
        }
        this.$data.sumOfDice = sumOfDice;

        return this.toIntent('_compareResult');
    },

    async _compareResult() {
        console.log(`_compareResult()`);

        const playerId = this.getSessionAttribute('playerId');
        const playerIndex = this.getSessionAttribute('playerIndex');
        const sumOfDice = this.$data.sumOfDice;

        const previousHighscore = this.getSessionAttribute('previousHighscore');
        const previousRank = this.getSessionAttribute('previousRank');

        let soundKey = 'result-sound-negative';
        let speechKey = 'result-lowerScore';

        const currentHighscore = Math.max(sumOfDice, previousHighscore);
        console.time('database.getRank() ');
        const rank = await spreadsheet.getRank(
            playerId,
            currentHighscore,
            this.$data.jwtClient
        );
        console.timeEnd('database.getRank() ');
        console.log(`Rank: ${rank}`);

        if (sumOfDice > previousHighscore) {
            console.time('database.submitScore() ');
            await spreadsheet.updatePlayerScore(
                playerId,
                playerIndex,
                sumOfDice,
                this.$data.jwtClient
            );
            console.timeEnd('database.submitScore() ');

            this.setSessionAttribute('previousHighscore', sumOfDice);
            soundKey = 'result-sound-positive';
            speechKey = 'result-newPersonalHighscore';
        }
        if (rank < previousRank) {
            this.setSessionAttribute('previousRank', rank);
            soundKey = 'result-sound-positive';
            speechKey = 'result-higherRank';
        }
        if (
            rank === 1
            && previousRank !== 1
        ) {
            speechKey = 'result-numberOneRank';
        }

        this.$speech
            .t(
                'result-score',
                {
                    sound: this.speechBuilder().t(soundKey).toString(),
                    score: sumOfDice,
                }
            )
            .t(
                speechKey,
                {
                    rank: rank,
                }
            );

        return this.toIntent('_prompt');
    },

    async _prompt() {
        console.log(`_prompt()`);

        return this.ask(
            this.$speech.t('prompt-short'),
            this.$reprompt.t('prompt-short')
        );
    },

    async END() {
        console.log(`END()`);
        this.$speech.t('goodbye');

        return this.tell(
            this.$speech
        );
    },
});

module.exports.app = app;

function getDiceRollResult() {
    return Math.ceil(
        Math.random() * config.custom.game.sidesPerDice
    );
}

function getPlayerId(jovo) {
    const sessionId = jovo.$request.session.sessionId;
    return murmurhash.v2(sessionId).toString();
}
