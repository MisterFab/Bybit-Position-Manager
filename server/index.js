const express = require('express');
const cors = require('cors');
const axios = require("axios");
const app = express();

app.use(cors());
app.use(express.json());

const customers = require('./routes/api/customers');
const apiUrl = "https://api.bytick.com";
const reqTimeout = 8000;

app.use('/api/customers', customers);

const port = 3000;

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})

 app.post('/api/btcbalance', async (req, res) => {
    const btcBalance = await getBtcBalance(req.body.shortKey, req.body.sign, req.body.expires, req.body.recv_window);
    res.json({
        btcBalance
    })
})

app.post('/api/bybitPosition', async (req, res) => {
    const bybitPosition = await getBybitPosition(req.body.shortKey, req.body.sign, req.body.expires, req.body.recv_window);
    res.json({
        bybitPosition
    })
});

app.post('/api/bybitSetTp', async (req, res) => {
    const bybitTPResult = await setCustomerTP(req.body.shortKey, req.body.sign, req.body.expires, req.body.takeProfitPrice, req.body.recv_window);
    res.json({
        bybitTPResult
    })
})

app.post('/api/closePosition', async (req, res) => {
    const bybitClosePos = await closeBybitPosition(req.body.shortKey, req.body.sign, req.body.expires, req.body.orderSide, req.body.qty, req.body.recv_window);
    res.json({
        bybitClosePos
    })
})

app.post('/api/cancelOrders', async  (req, res) => {
    const cancelOrders = await cancelBybitOrders(req.body.shortKey, req.body.sign, req.body.expires, req.body.recv_window);
    res.json({
        cancelOrders
    })
})

app.post('/api/getConditionals', async  (req, res) => {
    const getConditionals = await getBybitConditionals(req.body.shortKey, req.body.sign, req.body.expires, req.body.recv_window);
    res.json({
        getConditionals
    })
})

app.post('/api/buyBybitQuantity', async (req, res) => {
    const bybitBuyQty = await buyBybitQuantity(req.body.cust, req.body.side, req.body.qty, req.body.sign, req.body.expires, req.body.recv_window);
    res.json({
        bybitBuyQty
    })
})

app.get('/api/btcPrice', async (req, res) => {
    const btcPrice = await getBtcPrice();
    res.json({
        btcPrice
    })
})

app.post('/api/getLastTradePnl', async (req, res) => {
    const lastTradePnl = await getLastTradePnl(req.body.cust, req.body.sign, req.body.expires, req.body.recv_window, req.body.page);
    res.json({
        lastTradePnl
    })
});

app.post('/api/gooseUserInfo', async (req, res) => {
    const userInfo = await getBotUser(req.body.customer);
    res.json({
        userInfo
    })
})

app.post('/api/closeBotPosition', async (req, res) => {
    const closeResponse = await closeBotPosition(req.body.customer, req.body.posId);
    res.json({
        closeResponse
    })
})

app.post('/api/setTpPrice', async (req, res) => {
    const setTpResponse = await setBotTpPrice(req.body.customer, req.body.tpPrice);
    res.json({
        setTpResponse
    })
})

app.post('/api/setTpPerc', async (req, res) => {
    const setTpResponse = await setBotTpPerc(req.body.customer, req.body.tpPerc);
    res.json({
        setTpResponse
    })
})

app.post('/api/getBotSettings', async (req, res) => {
    const botSettings = await getBotSettings(req.body.customer);
    res.json({
        botSettings
    })
})

app.post('/api/saveBotSettings', async (req, res) => {
    const botSettingsRes = await saveBotSettings(req.body.customer, req.body.newSettings);
    res.json({
        botSettingsRes
    })
})

async function getBtcPrice() {
    const btcPrice = await axios.get('https://api.bybit.com/v2/public/tickers?symbol=BTCUSD')
    .then((res) => {
        if(res.status == 200) {
            return res.data.result[0]["last_price"];
        }
        throw new Error('Problems fetching current BTC price.')
    }).catch((error) => {
        return error.message;
    });
    return btcPrice;
}

async function cancelBybitOrders(shortKey, sign, expires, recv_window) {
    const marketClosePos = await axios.post(`https://api.bybit.com/v2/private/stop-order/cancelAll`, {
        "api_key": shortKey,
        "symbol": "BTCUSD",
        "timestamp": expires,
        "sign": sign,
        "recv_window": recv_window
    })
    .then(res => {
        if(res.status == 200) {
            return res.data.ret_msg;
        }
        throw new Error('Error canceling Bybit orders.');
    })
    .catch(error => {
        return error.message;
    })

    return marketClosePos;
}

async function getBybitConditionals(shortKey, sign, expires, recv_window) {
    const getConditionals = await axios.get(`${apiUrl}/v2/private/stop-order/list?api_key=${shortKey}&symbol=BTCUSD&timestamp=${expires}&sign=${sign}&recv_window=${recv_window}`)
        .then((res) => {
            if(res.status == 200) {
                //console.log(res);
                return res.data.result;
            }
            throw new Error('Could not retrieve position information');
        })
        .catch((error) => {
            return error.message;
        });
    return getConditionals;
}

async function closeBybitPosition(shortKey, sign, expires, orderSide, qty, recv_window) {   
    const marketClosePos = await axios.post(`${apiUrl}/v2/private/order/create`, {
        "api_key": shortKey,
        "side": orderSide,
        "symbol": "BTCUSD",
        "order_type": "Market",
        "qty": qty,
        "time_in_force": "GoodTillCancel",
        "timestamp": expires,
        "sign": sign,
        "recv_window": recv_window
    })
    .then(res => {
        if(res.status == 200) {
            return res.data.ret_msg;
        }
        throw new Error('Error closing the Bybit position.');
    })
    .catch(error => {
        return error.message;
    })

    return marketClosePos;
}

async function getBybitPosition(shortKey, sign, expires, recv_window) {
    const bybitPosition = await axios.get(`${apiUrl}/v2/private/position/list?api_key=${shortKey}&symbol=BTCUSD&timestamp=${expires}&sign=${sign}&recv_window=${recv_window}`)
        .then((res) => {
            if(res.status == 200) {
                //console.log(res);
                return res.data.result;
            }
            throw new Error('Could not retrieve position information');
        })
        .catch((error) => {
            return error.message;
        });
    return bybitPosition;
}

async function buyBybitQuantity(cust, side, qty, sign, expires, recv_window) {
    const marketBuyQtyResp = await axios.post(`${apiUrl}/v2/private/order/create`, {
        "api_key": cust['bybit'].shortKey,
        "side": side,
        "symbol": "BTCUSD",
        "order_type": "Market",
        "qty": qty,
        "time_in_force": "GoodTillCancel",
        "timestamp": expires,
        "sign": sign,
        "recv_window": recv_window
    })
    .then(res => {
        if(res.status == 200) {
            return res.data.ret_msg;
        }
        throw new Error('Error buying quantity.');
    })
    .catch(error => {
        return error.message;
    })

    return marketBuyQtyResp;
}

async function getBtcBalance(shortKey, sign, expires, recv_window) {
    const btcBalance = await axios.get(`${apiUrl}/v2/private/wallet/balance?api_key=${shortKey}&coin=BTC&timestamp=${expires}&sign=${sign}&recv_window=${recv_window}`)
        .then((res) => {
            if(res.status == 200) {
                if(res.data.ret_msg.includes('invalid request')) {
                    throw new Error(res.data.ret_msg);
                } else {
                    return res.data.result["BTC"].wallet_balance;
                }
            }
            throw new Error("Couldn't get Wallet Balance.");
        })
        .catch((error) => {
            return error.message;
        });
    return btcBalance;
}

async function getLastTradePnl(cust, sign, expires, rec_window, page) {
    const lastTradePnl = await axios.get(`${apiUrl}/v2/private/trade/closed-pnl/list?api_key=${cust['bybit'].shortKey}&symbol=BTCUSD&timestamp=${expires}&sign=${sign}&recv_window=${rec_window}&limit=50&page=${page}`)
    .then((res) => {
        if(res.status == 200) {
            if(res.data.ret_msg == 'OK') {
                console.log(res.data);
                return res.data.result;
            } else {
                return 'Api Error';
            }
        }
    })
    .catch((error) => {
        return error.message;
    })
    return lastTradePnl;
}

// Get Bot User Info
async function getBotUser(cust) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/user?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    if(url.includes('undefined')) {
        return 'No ngrok domain';
    }
    const userInfo = await axios.get(url, {timeout: reqTimeout})
    .then((res) => {
        if(res.status == 200) {
            return res.data.report;
        }
    })
    .catch((error) => {
        console.log(error.message);
        return error.message;
    });

    return userInfo;
}

// Close Bot Position
async function closeBotPosition(cust, posId) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/sell-trade?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    const closeResponse = await axios.post(url, {
        "id": posId
    }).then((res) => {
        if(res.status == 200) {
            return res.data;
        }
        throw new Error("Couldn't close bot position.");
    })
    .catch((error) => {
        return error.message;
    })

    return closeResponse;
}

// Set Bot TP Price
async function setBotTpPrice(cust, tpPrice) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/save-trade-im?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    const setCustTp = await axios.post(url, {
        "profit":tpPrice,
        "trailing":"0.00",
        "stoploss":"0",
        "dynamicTrailing":"0",
        "id":cust['position'].posId
    })
    .then(res => {
        if(res.status == 200) {
            console.log(res);
            return res.data;
        }
        throw new Error("Couldn't set Bot TP");
    })
    .catch(error => {
        return error.message;
    });

    return setCustTp;
}

// Set Bot TP Percentage
async function setBotTpPerc(cust, tpPerc) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/save-trade?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    const setCustTp = await axios.post(url, {
        "profit":tpPerc,
        "trailing":"0.00",
        "stoploss":"0.00",
        "dynamicTrailing":"0.00",
        "id":cust['position'].posId
    })
    .then(res => {
        if(res.status == 200) {
            return res.data;
        }
        throw new Error("Couldn't set Bot TP");
    })
    .catch(error => {
        return error.message;
    });

    return setCustTp;
}


async function saveBotSettings(cust, newSettings) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/settingssave?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    const saveSettings = await axios.post(url, newSettings, {
        'Content-Type' : 'text/plain' 
    })
    .then(res => {
        if(res.status == 200) {
            return res.data;
        }
        throw new Error("Couldn't save bot settings");
    })
    .catch(error => {
        return error.message;
    });

    return saveSettings;
}

async function getBotSettings(cust) {
    const domain = cust['goose'].ngrokDomain;
    const endpoint = '/api/settings?tk=';
    const tk = cust['goose'].botTk;
    const url = domain + endpoint + tk;

    const setCustTp = await axios.get(url)
    .then(res => {
        if(res.status == 200) {
            return res.data;
        }
        throw new Error("Couldn't get Bot Settings");
    })
    .catch(error => {
        return error.message;
    });

    return setCustTp;
}