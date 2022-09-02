const express = require('express');
const { getAllParlayPicks, 
        getParlayPickById, 
        updateParlayPick, 
        createParlayPick, 
        createWeeklyPick, 
        getGameById, 
        getWeeklyPickById, 
        getWeeklyPickByUsername, 
        updateWeeklyPick, 
        getParlayPicksByParlayNumberAndWeeklyId, 
        getAllActiveWeeklyPicksByWeek, 
        updateUser, 
        getUserByUsername,
        deleteParlay, 
        } = require('../db');
const { requireUser, requireAdmin } = require('./utils');
const parlaysRouter = express.Router();

parlaysRouter.get('/', async (req, res) => {
    const parlayPicks = await getAllParlayPicks();

    res.send({
        parlayPicks
    });
});

parlaysRouter.get('/parlay/id/:parlayId', async (req, res) => {
    const { parlayId } = req.params;
    const parlayPick = await getParlayPickById(parlayId);

    res.send({
        parlayPick
    });
});

parlaysRouter.post('/addParlayPick', requireUser, async (req, res, next) => {
    const { parlaynumber, gameid, type, bet, text } = req.body;
    const weeklyPick = await getWeeklyPickByUsername(req.user.username)

    try {
        if (weeklyPick ) {
            if (parlaynumber == 1) {
                const firstParlayPicks = await getParlayPicksByParlayNumberAndWeeklyId(1, weeklyPick.id);
                const secondParlayPicks = await getParlayPicksByParlayNumberAndWeeklyId(2, weeklyPick.id)
                if (firstParlayPicks.length && secondParlayPicks.length && firstParlayPicks.length >= 2) {
                    next({
                        name: "MaximumPicksReachedError",
                        message: "Since you have 2 parlays, you can only have 2 picks in each."
                    })
                } else if (firstParlayPicks.length && firstParlayPicks.length >= 4) {
                    next({
                        name: "MaximumPicksReachedError",
                        message: "You have already made 4 picks for your parlay."
                    })
                } else {
                    const parlayPick = await createParlayPick({ weeklyid: weeklyPick.id, parlaynumber, gameid, type, bet, text });
                    if (parlayPick) {
                        res.send({ message: 'You have made a parlay pick!', parlayPick});
                    } else {
                        res.send({message: `You have already made a ${type} pick for this game!`, name: "DuplicatePickError"})
                    }
                }
            } else if (parlaynumber == 2) {
                const firstParlayPicks = await getParlayPicksByParlayNumberAndWeeklyId(1, weeklyPick.id);
                const secondParlayPicks = await getParlayPicksByParlayNumberAndWeeklyId(2, weeklyPick.id)
                if (firstParlayPicks && firstParlayPicks.length > 2) {
                    next({
                        name: "IllegalParlayError",
                        message: `Your first parlay had ${firstParlayPicks.length} picks, therefore you cannot make a second parlay.`
                    })
                } else if (secondParlayPicks && secondParlayPicks.length >= 2) {
                    next({
                        name: "IllegalParlayError",
                        message: `You have already made 2 picks for your second parlay.`
                    })
                } else {
                    const parlayPick = await createParlayPick({ weeklyid: weeklyPick.id, parlaynumber, gameid, type, bet, text });
                    if (parlayPick) {
                        res.send({ message: 'You have made a parlay pick!', parlayPick});
                    } else {
                        res.send({message: `You have already made a ${type} pick for this game!`, name: "DuplicatePickError"})
                    }
                }
            }
        } else if (!weeklyPick) {
            const game = await getGameById(gameid)
            const newWeeklyPick = await createWeeklyPick({ username: req.user.username, week: game.week})
            const parlayPick = await createParlayPick({ weeklyid: newWeeklyPick.id, parlaynumber, gameid, type, bet, text })
            res.send({ message: 'You have made a parlay pick!', parlayPick});
        }
    } catch ({ name, message }) {
        next({ name, message })
    }
});

parlaysRouter.patch('/parlay/id/updateParlayPick/:parlayId', requireUser, async (req, res, next) => {
    const { parlayId } = req.params;
    const { parlaynumber, gameid, type, bet, text } = req.body;
    let updateFields = {}

    if (gameid) {
        updateFields.gameid = gameid;
    }

    if (type) {
        updateFields.type = type;
    }
    
    if (bet) {
        updateFields.bet = bet;
    }

    if (text) {
        updateFields.text = text;
    }

    if (parlaynumber) {
        updateFields.parlaynumber = parlaynumber;
    }
    
    try {
        const parlayPick = await getParlayPickById(parlayId);
        const weeklypick = await getWeeklyPickById(parlayPick.weeklyid)
        if (parlayPick && weeklypick.username === req.user.username) {
            let updatedParlayPick = await updateParlayPick(parlayId, updateFields)
            res.send({ parlayPick: updatedParlayPick });
        } else if (parlayPick && weeklypick.username !== req.user.username) {
            next({
                name: 'UnauthorizedUserError',
                message: 'You cannot edit a pick that is not yours'
            })
        } else {
            next({
                name: 'PickNotFoundError',
                message: 'That pick does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

parlaysRouter.patch('/parlay/id/updateWeeklyPick/:weeklyPickId', requireAdmin, async (req, res, next) => {
    const { weeklyPickId } = req.params;
    const { week, active, betscorrect, totalbets, lockscorrect, totallocks, parlayscorrect, totalparlays, totalpoints } = req.body;
    let updateFields = {}

    if (week) {
        updateFields.week = week;
    }

    if (active) {
        updateFields.active = active;
    }
    
    if (betscorrect) {
        updateFields.betscorrect = betscorrect;
    }

    if (totalbets) {
        updateFields.totalbets = totalbets;
    }

    if (lockscorrect) {
        updateFields.lockscorrect = lockscorrect;
    }

    if (totallocks) {
        updateFields.totallocks = totallocks;
    }

    if (totalpoints) {
        updateFields.totalpoints = totalpoints;
    }

    if (parlayscorrect) {
        updateFields.parlayscorrect = parlayscorrect;
    }

    if (totalparlays) {
        updateFields.totalparlays = totalparlays;
    }
    
    try {
        const weeklypick = await getWeeklyPickById(weeklyPickId)
        if (weeklypick) {
            let updatedWeeklyPick = await updateWeeklyPick(weeklyPickId, updateFields)
            res.send({ weeklypick: updatedWeeklyPick });
        } else {
            next({
                name: 'PickNotFoundError',
                message: 'That pick does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

parlaysRouter.patch('/updateResults/parlay1', requireAdmin, async (req, res, next) => {
    const { week } = req.body;

    try {
        const allweeklypicks = await getAllActiveWeeklyPicksByWeek(week)
        if (allweeklypicks) {
            allweeklypicks.forEach(async (weeklyPick) => {
                const user = await getUserByUsername(weeklyPick.username)
                const allParlayOnePicks = await getParlayPicksByParlayNumberAndWeeklyId(1, weeklyPick.id);
                const parlayOnePicks = allParlayOnePicks.filter(parlayPick => parlayPick.statsupdated === false)

                if (parlayOnePicks.length) {
                    let pointsearned = 0;
                    let pointslost = 0
    
                    if (parlayOnePicks.length === 4) {
                        pointsearned = 20
                        pointslost = -4
                    } else if (parlayOnePicks.length === 3) {
                        pointsearned = 10
                        pointslost = -3
                    } else if (parlayOnePicks.length === 2) {
                        pointsearned = 4
                        pointslost = -2
                    }
    
                    let parlayshit = 0;
                    let parlaysmiss = 0;
                    let parlaystbd = 0;
                    let parlayspush = 0;
    
                    parlayOnePicks.forEach(async (parlayPick) => {
                        if (parlayPick.result === "HIT") {
                            parlayshit++;
                        } else if (parlayPick.result === "MISS") {
                            parlaysmiss++;
                        } else if (parlayPick.result === "PUSH") {
                            parlayspush++
                        } else if (parlayPick.result === "tbd") {
                            parlaystbd++
                        }
                    })

                    if (parlaystbd > 0) {
                        return;
                    } else if (parlaysmiss > 0) {
                        parlayOnePicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpoints: weeklyPick.totalpoints + pointslost, totalyparlays: weeklyPick.totalparlays + 1})
                        await updateUser(user.id, {totalpoints: user.totalpoints + pointslost, totalparlays: user.totalparlays + 1})
                    } else if (parlayspush > 0) {
                        parlayOnePicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalparlays: weeklyPick.totalparlays + 1})
                        await updateUser(user.id, {totalparlays: user.totalparlays + 1})
                    } else if (parlayshit === parlayOnePicks.length) {
                        parlayOnePicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpoints: weeklyPick.totalpoints + pointsearned, totalparlays: weeklyPick.totalparlays + 1, parlayscorrect: weeklyPick.parlayscorrect + 1})
                        await updateUser(user.id, {totalpoints: user.totalpoints + pointsearned, parlayscorrect: user.parlayscorrect + 1, totalparlays: user.totalparlays + 1})
                    }
                    
                }
            })
        }

        res.send({message: "Parlay 1 points added!"})
    } catch ({name, message}) {
        next({name, message})
    }
})

parlaysRouter.patch('/updateResults/parlay2', requireAdmin, async (req, res, next) => {
    const { week } = req.body;

    try {
        const allweeklypicks = await getAllActiveWeeklyPicksByWeek(week)
        if (allweeklypicks) {
            allweeklypicks.forEach(async (weeklyPick) => {
                const user = await getUserByUsername(weeklyPick.username)
                const allParlayTwoPicks = await getParlayPicksByParlayNumberAndWeeklyId(2, weeklyPick.id);
                const parlayTwoPicks = allParlayTwoPicks.filter(parlayPick => parlayPick.statsupdated === false)

                if (parlayTwoPicks.length) {
                    let pointsearned = 4;
                    let pointslost = -2;
                    let parlayshit = 0;
                    let parlaysmiss = 0;
                    let parlaystbd = 0;
                    let parlayspush = 0;
    
                    parlayTwoPicks.forEach(async (parlayPick) => {
                        if (parlayPick.result === "HIT") {
                            parlayshit++;
                        } else if (parlayPick.result === "MISS") {
                            parlaysmiss++;
                        } else if (parlayPick.result === "PUSH") {
                            parlayspush++
                        } else if (parlayPick.result === "tbd") {
                            parlaystbd++
                        }
                    })

                    if (parlaystbd > 0) {
                        return;
                    } else if (parlaysmiss > 0) {
                        parlayTwoPicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpoints: weeklyPick.totalpoints + pointslost})
                        await updateUser(user.id, {totalpoints: user.totalpoints + pointslost, totalparlays: user.totalparlays + 1})
                    } else if (parlayspush > 0) {
                        parlayTwoPicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateUser(user.id, {totalparlays: user.totalparlays + 1})
                    } else if (parlayshit === parlayOnePicks.length) {
                        parlayTwoPicks.forEach(async (parlayPick) => {
                            await updateParlayPick(parlayPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpoints: weeklyPick.totalpoints + pointsearned})
                        await updateUser(user.id, {totalpoints: user.totalpoints + pointsearned, parlayscorrect: user.parlayscorrect + 1, totalparlays: user.totalparlays + 1})
                    }
                    
                }
            })
        }

        res.send({message: "Parlay 2 points added!"})
    } catch ({name, message}) {
        next({name, message})
    }
})

parlaysRouter.delete('/deleteParlay/:parlayId', requireUser, async (req, res, next) => {
    const { parlayId } = req.params
    console.log(parlayId)
    const parlay = await getParlayPickById(parlayId)

    console.log(parlay)

    try {
        if (parlay) {
            await deleteParlay(parlayId);
            res.send({message: 'You have deleted your parlay'})
        } else {
            next({
                name: 'ParlayNotFoundError',
                message: 'That parlay does not exist'
            })
        }
    } catch ({name, message}) {
        next({name, message})
    }
})


module.exports = parlaysRouter;