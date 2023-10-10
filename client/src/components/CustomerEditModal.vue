<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <slot name="header">Edit Customer {{ cust.name }}</slot>
          </div>

          <div class="pure-form">
            <fieldset>
              <label for="lastTradeInfo"><b>Last Trade Profit</b></label>
              <input
                type="text"
                id="lastTradeInfo"
                style="text-align: center; width: 71%"
                readonly
                v-model="tradePnl"
              />
              <input
                type="number"
                class="ml-2"
                style="width: 25%"
                v-model="tradeId"
                min="0"
                max="100"
                @change="getTradeProfit(tradeId)"
              />
              <button
                class="pure-button btn-success mt-2"
                @click="getRangeProfits()"
              >
                Get 30 Days Profits
              </button>
              <button
                class="pure-button btn-success mt-2"
                @click="getConditionals()"
              >
                Get Conditionals
              </button>
            </fieldset>
            <fieldset>
              <label for="buyQuantity" style="width: 100%"
                ><b>Buy Quantity %</b></label
              >
              <input
                type="text"
                id="buyQuantity"
                placeholder="%"
                size="5"
                class="mr-2"
                style="text-align: center"
                v-model="qtyPerc"
              />
              <button
                class="pure-button btn-danger mr-2"
                @click="buyQty('Sell')"
              >
                Short
              </button>
              <button class="pure-button btn-success" @click="buyQty('Buy')">
                Long
              </button>
            </fieldset>
            <fieldset>
              <label for="customerTP" style="width: 100%"><b>Set TP</b></label>
              <input
                type="text"
                id="customerTP"
                placeholder="60000"
                v-model="tpPrice"
                size="8"
                class="ml-2 mr-2"
                style="text-align: center"
              />
              <button class="pure-button btn-success" @click="setTp()">
                SET
              </button>
            </fieldset>
            <fieldset>
              <label for="customerSettings"><b>Change Settings</b></label>
              <textarea
                name="customerSettings"
                id="customerSettings"
                cols="30"
                rows="3"
                class="mb-2"
                v-model="botSettings"
              ></textarea>
              <button class="pure-button btn-success" @click="saveSettings()">
                Save Settings
              </button>
            </fieldset>
          </div>

          <div class="modal-footer" style="margin-right: 29%">
            <slot name="footer">
              <button class="pure-button" @click="onClose()">Close</button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import CustomerService from "../CustomerService";

export default {
  props: ["cust"],
  data() {
    return {
      tpPrice: "50000",
      tradeId: 0,
      tradePnl: 0,
      qtyPerc: 5,
      botSettings: "",
    };
  },
  created() {
    this.tradePnl = this.cust["bybit"].lastTradePnl;
    this.botSettings = this.cust["goose"].botSettings;
  },
  methods: {
    onClose() {
      this.$emit("close");
    },
    async setTp() {
      if (
        confirm(
          "Are you sure you want to set this TP for customer " + this.cust.name
        )
      ) {
        if (this.cust["position"].side == "Buy") {
          if (this.tpPrice < this.cust["position"].avgPrice) {
            alert("TP Price has to be higher than average price");
            return;
          }
        } else if (this.cust["position"].side == "Sell") {
          if (this.tpPrice > this.cust["position"].avgPrice) {
            alert("TP Price has to be lower than average price");
            return;
          }
        } else {
          return;
        }

        if (
          this.cust["goose"].ngrokDomain != "" &&
          this.cust["goose"].ngrokDomain != undefined
        ) {
          if (this.tpPrice.includes("%")) {
            const tpPercentage = this.tpPrice.replace("%", "");
            const setTp = await CustomerService.setBotCustomerTpPercentage(
              this.cust,
              tpPercentage
            );
            if (setTp.setTpResponse.result == "ok") {
              this.$emit(
                "logMessage",
                `TP of ${tpPercentage}% has been successfully set for ${this.cust.name}`
              );
            } else {
              this.$emit(
                "logMessage",
                `Something went wrong trying to set the TP for ${this.cust.name}.`
              );
            }
          } else {
            const setTp = await CustomerService.setBotCustomerTpPrice(
              this.cust,
              this.tpPrice
            );
            if (setTp.setTpResponse.result == "ok") {
              this.$emit(
                "logMessage",
                `TP of ${this.tpPrice} has been successfully set for ${this.cust.name}`
              );
            } else {
              this.$emit(
                "logMessage",
                `Something went wrong trying to set the TP for ${this.cust.name}.`
              );
            }
          }
        } else {
          this.cust["position"].tpPrice = this.tpPrice;
        }
      }
    },
    async buyQty(side) {
      if (
        confirm(
          `Are you sure you want to buy ${this.qtyPerc}% Quantity for customer ${this.cust.name}`
        )
      ) {
        var qty = (
          this.cust["bybit"].balance *
          (this.qtyPerc / 100) *
          this.cust["position"].lev *
          this.cust.btcPrice
        ).toFixed(0);
        const buyQty = await CustomerService.buyBybitQty(this.cust, qty, side);
        if (buyQty.bybitBuyQty == "OK") {
          var action = "";
          if (side == "Buy") {
            action = "bought";
          } else if (side == "Sell") {
            action = "sold";
          }
          this.$emit(
            "logMessage",
            `${qty} Quantity has been successfully ${action} for ${this.cust.name}`
          );
        } else {
          this.$emit(
            "logMessage",
            `Something went wrong buying quantity for ${this.cust.name}`
          );
        }
      }
    },
    async getTradeProfit(tradeId) {
      var page = Math.floor(tradeId / 50) + 1;
      tradeId = tradeId - 50 * (page - 1);
      const tradePnl = await CustomerService.getLastTradePnl(this.cust, page);
      this.tradePnl =
        tradePnl.data[tradeId].closed_pnl +
        ` ($${this.getUsdValue(tradePnl.data[tradeId].closed_pnl)})`;
    },
    async getConditionals() {
      var getConditionals = await CustomerService.getConditionals(this.cust);
      console.log(getConditionals["getConditionals"]);
    },
    async getRangeProfits() {
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      var stopNow = false;
      var rangeProfits = 0;
      var counter = 0;
      var page = 1;
      var tradePnlLog = await CustomerService.getLastTradePnl(this.cust, page);
      console.log(tradePnlLog);

      while (!stopNow) {
        //var page = Math.floor(counter / 50) + 1;
        //counter = counter - 50 * (page - 1);
        if (counter == 50) {
          counter = 0;
          page++;
          tradePnlLog = await CustomerService.getLastTradePnl(this.cust, page);
        }
        if (tradePnlLog != undefined) {
          var tradePnl = tradePnlLog.data[counter];
          if (tradePnl == undefined) {
            stopNow = true;
            break;
          }
          var tradeDate = new Date(tradePnl.created_at * 1000);
          var tradeDateMonth = months[tradeDate.getMonth()];
          if (tradeDateMonth == "Jun") {
            if (tradeDate.getDate() >= 1 && tradeDate.getDate() <= 30) {
              rangeProfits += tradePnl.closed_pnl;
              /*
            console.log(
              `Timestamp is ${
                tradePnl.created_at
              } Month is ${tradeDateMonth} Date is ${tradeDate.getDate()} Total Profit is ${rangeProfits} Counter is ${counter}`
            );*/
            } else {
              stopNow = true;
            }
          } else {
            stopNow = true;
          }

          counter++;
        } else {
          stopNow = true;
        }
      }
      alert(
        `Total profit is ${rangeProfits.toFixed(6)} BTC ($${this.getUsdValue(
          rangeProfits
        )})`
      );
    },
    async saveSettings() {
      var uriSettings = "jsonToSend=" + encodeURI(this.botSettings) + "&name=";
      const saveSettings = await CustomerService.saveBotSettings(
        this.cust,
        uriSettings
      );
      if (saveSettings.botSettingsRes.result == "Changes saved successfully.") {
        this.$emit(
          "logMessage",
          `The new settings have been successfully saved for ${this.cust.name}`
        );
      } else {
        this.$emit(
          "logMessage",
          `Something went wrong trying to save the new settings for ${this.cust.name}.`
        );
      }
    },
    getUsdValue(btcValue) {
      return (btcValue * this.cust.btcPrice).toFixed(2);
    },
  },
};
</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.404);
  display: table;
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 350px;
  margin: 0px auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
  font-family: Helvetica, Arial, sans-serif;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-body {
  margin: 20px 0;
}

.modal-default-button {
  float: right;
}

/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>