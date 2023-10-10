import axios from 'axios';
const crypto = require("crypto");

const url = 'http://localhost:3000/api/customers/';
const recv_window = 30000;


class CustomerService {
    // Get Customers
    static getCustomers() {
        return new Promise((resolve) => {
            axios.get(url).then((res) => {
                const data = res.data;
                resolve(
                    data.map(customer => ({
                        ...customer,
                    }))
                );
            })
                .catch((err) => {
                    //reject(err);
                    console.log(err.message);
                })

        });
    }
    // Create Customer
    static insertCustomer(custObj) {
        return axios.post(url, {
            name: custObj.name,
            shortKey: custObj.shortKey,
            secretKey: custObj.secretKey,
            referral: custObj.referral,
            joinedAt: new Date()
        });
    }

    // Delete Customer
    static deleteCustomer(id) {
        return axios.delete(`${url}${id}`)
    }


    /** 
        **** Bybit Functions **** 
    */

    // Cancel Orders
    static async cancelOrders(cust) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "symbol": "BTCUSD",
            "timestamp": expires,
            "recv_window": recv_window
        };
        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const cancelOrdersResp = await axios.post('http://localhost:3000/api/cancelOrders/', {
            shortKey: cust['bybit'].shortKey,
            sign: sign,
            expires: expires,
            recv_window: recv_window
        }).then((res) => {
            return res.data;
        }).catch((error) => {
            console.log(error);
        });

        return cancelOrdersResp;
    }

    // Get Conditional Orders
    static async getConditionals(cust) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "symbol": "BTCUSD",
            "timestamp": expires,
            "recv_window": recv_window
        };
        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const getConditionals = await axios.post('http://localhost:3000/api/getConditionals/', {
            shortKey: cust['bybit'].shortKey,
            sign: sign,
            expires: expires,
            recv_window: recv_window
        }).then((res) => {
            return res.data;
        }).catch((error) => {
            console.log(error);
        });

        return getConditionals;
    }

    // Buy Bybit Quantity
    static async buyBybitQty(cust, qty, side) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "side": side,
            "symbol": "BTCUSD",
            "order_type": "Market",
            "qty": qty,
            "time_in_force": "GoodTillCancel",
            "timestamp": expires,
            "recv_window": recv_window
        };

        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const buyQty = await axios.post('http://localhost:3000/api/buyBybitQuantity/', {
            cust: cust,
            side: side,
            qty: qty,
            sign: sign,
            expires: expires,
            recv_window: recv_window
        }).then((res) => {
            return res.data;
        }).catch((error) => {
            console.log(error);
        });

        return buyQty;
    }

    // Get Bybit Last Trade PNL 
    static async getLastTradePnl(cust, page) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "symbol": "BTCUSD",
            "timestamp": expires,
            "limit": 50,
            "page": page,
            "recv_window": recv_window
        };
        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const btcBalance = await axios.post('http://localhost:3000/api/getLastTradePnl/', {
            cust: cust,
            expires: expires,
            sign: sign,
            recv_window: recv_window,
            page: page
        }).then((res) => {
            return res.data.lastTradePnl;
        }).catch((error) => {
            return error.message;
        });

        return btcBalance;
    }

    // Get Bybit Customer Balance
    static async getCustomerBalance(cust) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "coin": "BTC",
            "timestamp": expires,
            "recv_window": recv_window
        };
        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const btcBalance = await axios.post('http://localhost:3000/api/btcbalance/', {
            shortKey: cust['bybit'].shortKey,
            expires: expires,
            sign: sign,
            recv_window: recv_window
        }).then((res) => {
            return res.data.btcBalance;
        }).catch((error) => {
            return error.message;
        });

        return btcBalance;
    }

    // Get Bybit Customer Position
    static async getPosition(cust) {
        var expires = Date.now() + 1000;
        var params = {
            "api_key": cust['bybit'].shortKey,
            "symbol": "BTCUSD",
            "timestamp": expires,
            "recv_window": recv_window
        };
        var sign = this.getSignature(params, cust['bybit'].secretKey);

        const bybitPosition = await axios.post('http://localhost:3000/api/bybitPosition/', {
            shortKey: cust['bybit'].shortKey,
            expires: expires,
            sign: sign,
            recv_window: recv_window
        }).then((res) => {
            return res.data;
        }).catch((error) => {
            console.log(error);
        });
        return bybitPosition;
    }

    // Get Bybit BTC Price
    static async getBTCPrice() {
        const btcPrice = await axios.get('http://localhost:3000/api/btcPrice');
        return btcPrice.data.btcPrice;
    }

    // Helper Method for Bybit
    static getSignature(params, secret) {
        var orderedParams = "";
        Object.keys(params).sort().forEach(function (key) {
            orderedParams += key + "=" + params[key] + "&";
        });
        orderedParams = orderedParams.substring(0, orderedParams.length - 1);

        return crypto.createHmac('sha256', secret).update(orderedParams).digest('hex');
    }

    /** 
        **** END Bybit Functions **** 
    */


    /** 
        **** Goose Bot Functions **** 
    */

    // Close Customer Position In Bot
    static async closePosition(cust) {
        if (cust['goose'].ngrokDomain == '' || cust["goose"].ngrokDomain == undefined) {
            var expires = Date.now() + 1000;
            var params = {
                "api_key": cust['bybit'].shortKey,
                "symbol": "BTCUSD",
                "timestamp": expires,
                "recv_window": recv_window
            };
            var sign = this.getSignature(params, cust['bybit'].secretKey);

            const currentPosition = await axios.post('http://localhost:3000/api/bybitPosition/', {
                shortKey: cust['bybit'].shortKey,
                expires: expires,
                sign: sign,
                recv_window: recv_window
            }).then((res) => {
                return res.data;
            }).catch((error) => {
                console.log(error);
            });

            var qty = currentPosition["bybitPosition"].size;
            var posSide = currentPosition["bybitPosition"].side;
            var orderSide = "";

            if (posSide == "Buy") {
                orderSide = "Sell";
            } else if (posSide == "Sell") {
                orderSide = "Buy";
            }

            expires = Date.now() + 1000;
            params = {
                "api_key": cust['bybit'].shortKey,
                "side": orderSide,
                "symbol": "BTCUSD",
                "order_type": "Market",
                "qty": qty,
                "time_in_force": "GoodTillCancel",
                "timestamp": expires,
                "recv_window": recv_window
            };

            sign = this.getSignature(params, cust['bybit'].secretKey);

            const closePosition = await axios.post('http://localhost:3000/api/closePosition/', {
                shortKey: cust['bybit'].shortKey,
                expires: expires,
                sign: sign,
                orderSide: orderSide,
                qty: qty,
                recv_window: recv_window
            }).then((res) => {
                return res.data;
            }).catch((error) => {
                console.log(error);
            });

            return closePosition;
        } else {
            const closePosition = await axios.post('http://localhost:3000/api/closeBotPosition/', {
                customer: cust,
                posId: cust['position'].posId
            });

            return closePosition;
        }
    }

    // Get Goose Info
    static async getGooseUser(cust) {
        const userInfo = await axios.post('http://localhost:3000/api/gooseUserInfo/', {
            customer: cust
        }).then((res) => {
            if (res.data.userInfo == 'No ngrok domain') {
                return undefined;
            }
            return res.data.userInfo[0];
        }).catch((error) => {
            console.log(error);
        });

        return userInfo;
    }

    // Customer Set TP Price
    static async setBotCustomerTpPrice(cust, takeProfitPrice) {

        const setTp = await axios.post('http://localhost:3000/api/setTpPrice', {
            customer: cust,
            tpPrice: takeProfitPrice
        })
        return setTp.data;
    }

    // Customer Set TP Perc
    static async setBotCustomerTpPercentage(cust, takeProfitPerc) {
        const setTp = await axios.post('http://localhost:3000/api/setTpPerc', {
            customer: cust,
            tpPerc: takeProfitPerc
        })
        return setTp.data;
    }

    static async getBotSettings(cust) {
        const botSettings = await axios.post('http://localhost:3000/api/getBotSettings/', {
            customer: cust
        }).then((res) => {
            return JSON.stringify(res.data.botSettings);
        }).catch((error) => {
            console.log(error);
        });

        return botSettings;
    }
    
    static async saveBotSettings(cust, newSettings) {
        const saveBotSettings = await axios.post('http://localhost:3000/api/saveBotSettings/', {
            customer: cust,
            newSettings
        });

        return saveBotSettings.data;
    }
}

export default CustomerService;