<template>
  <div>
    <h1>Closing Bot</h1>
    <h6 id="btc-price">
      BTC Price: <b>${{ btcPrice }}</b>
    </h6>

    <div class="content-wrapper mt-5">
      <div class="l-box pure-u-1 pure-u-lg-1-2 mb-5">
        <div
          class="
            table-responsive table-wrapper-scroll-y
            my-custom-scrollbar
            ml-4
          "
        >
          <table class="table table-bordered table-striped mb-0" id="dt">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Balance</th>
                <th>Position</th>
                <th>TP Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <client-component
              v-for="customer in customers"
              :customer="customer"
              :btcPrice="btcPrice"
              :key="customer._id"
              :autoClosePos="autoClosePos"
              @custDeleted="customerDeleted"
              @logMessage="logMessage"
            ></client-component>
          </table>
        </div>
        <br />
        <p>
          Total unrealised Profit: {{ totalPnl.toFixed(6) }} BTC
          <b>(${{ getUsdValue(totalPnl) }})</b><br />
          Total Balance: <b>{{ totalBalance.toFixed(4) }} BTC</b> (${{
            getUsdValue(this.totalBalance)
          }})
        </p>
        <form class="pure-form mt-2" @submit.prevent>
          <fieldset>
            <input
              type="text"
              placeholder="TP Price"
              class="mx-auto"
              v-model="tpPriceAll"
            />
            <button class="pure-button btn-success ml-2" @click="setTpAll">
              Set TP Price
            </button>
            <button class="pure-button btn-success ml-2" @click="mCloseAll">
              Market Close All
            </button>
            <br />
          </fieldset>
          <fieldset>
            <input
              type="text"
              placeholder="Balance %"
              class="mx-auto"
              v-model="qtyPercAll"
            />
            <select name="side" id="qtySide" class="ml-2" v-model="buyQtySide">
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
            <button class="pure-button btn-success ml-2" @click="buyQtyAll">
              Manual Buy %
            </button>
          </fieldset>
          <fieldset>
            <button
              class="pure-button btn-success ml-2"
              @click="showModal = true"
            >
              Edit All Customers Settings
            </button>
          </fieldset>
          <fieldset style="text-align: center">
            <label for="autoclose" class="mr-2">Auto-Close</label>
            <input type="checkbox" id="autoclose" v-model="autoClosePos" />
          </fieldset>
        </form>
      </div>
      <div class="pure-u-1 pure-u-lg-1-2 centered-div">
        <h2 class="mb-4">Add a new Customer</h2>
        <div class="add-customer">
          <form class="pure-form pure-form-aligned" @submit.prevent>
            <div class="pure-control-group">
              <label for="customer-name">Customer Name</label>
              <input
                type="text"
                name=""
                id="customer-name"
                v-model="currCustName"
                placeholder="Name"
                required
              />
            </div>
            <div class="pure-control-group">
              <label for="customer-short-key">Api Short Key</label>
              <input
                type="text"
                name=""
                id="customer-short-key"
                v-model="currCustShortKey"
                placeholder="Short Key"
                required
              />
            </div>
            <div class="pure-control-group">
              <label for="customer-secret-key">Api Secret Key</label>
              <input
                type="text"
                name=""
                id="customer-secret-key"
                v-model="currCustSecretKey"
                placeholder="Secret Key"
                required
              />
            </div>
            <div class="pure-control-group">
              <label for="customer-referral">Referral</label>
              <input
                type="text"
                name=""
                id="customer-referral"
                v-model="currCustReferral"
                placeholder="Referral Name"
              />
            </div>
            <div class="pure-control-group">
              <label for="customer-secret-key">BTC Balance</label>
              <input
                type="text"
                name=""
                id="customer-btc-balance"
                v-model="currCustBTCBalance"
                placeholder="BTC Balance"
              />
            </div>
            <div class="pure-controls">
              <button
                v-on:click="getBtcBalance"
                class="pure-button btn-success mr-2"
              >
                Get BTC Balance
              </button>
            </div>
            <div class="pure-controls">
              <button v-on:click="addCustomer" class="pure-button btn-success">
                Add
              </button>
            </div>
          </form>
          <br />
          <div>
            <h4>Console Log</h4>
            <textarea class="console-log" readonly v-model="consoleLogs">
            </textarea>
          </div>
        </div>
      </div>
    </div>
    <SettingsEditModal
      v-if="showModal"
      @save="saveSettingsAll"
      @close="closeModal"
    >
    </SettingsEditModal>
  </div>
</template>

<script>
import CustomerService from "../CustomerService";
import ClientComponent from "./ClientComponent.vue";
import SettingsEditModal from "./SettingsEditModal.vue";

//import axios from "axios";

export default {
  components: {
    ClientComponent,
    SettingsEditModal,
  },
  name: "CustomerComponent",
  data() {
    return {
      customers: [],
      btcPrice: 0,
      totalBalance: 0,
      consoleLogs: "",
      tpPriceAll: "50000",
      currCustName: "",
      currCustShortKey: "",
      currCustSecretKey: "",
      currCustReferral: "",
      currCustBTCBalance: 0,
      totalPnl: 0,
      qtyPercAll: 0,
      buyQtySide: "Buy",
      autoClosePos: false,
      showModal: false,
    };
  },
  async created() {
    setInterval(async () => {
      this.getBtcPrice();
    }, 5000);

    this.customers = await CustomerService.getCustomers();

    setTimeout(async () => {
      for (var i = 0; i < this.customers.length; i++) {
        if (
          this.customers[i]["bybit"].balance != null &&
          !isNaN(this.customers[i]["bybit"].balance)
        ) {
          this.totalBalance += this.customers[i]["bybit"].balance;
        }
      }
    }, 30000);

    setInterval(async () => {
      this.totalPnl = 0;
      for (var i = 0; i < this.customers.length; i++) {
        if (
          this.customers[i]["position"].pnl != null &&
          !isNaN(this.customers[i]["position"].pnl)
        ) {
          this.totalPnl += Number(this.customers[i]["position"].pnl);
        }
      }
    }, 6000);

    setInterval(async () => {
      this.totalBalance = 0;
      for (var i = 0; i < this.customers.length; i++) {
        if (
          this.customers[i]["bybit"].balance != null &&
          !isNaN(this.customers[i]["bybit"].balance)
        ) {
          this.totalBalance += this.customers[i]["bybit"].balance;
        }
      }
    }, 1860000);
  },
  methods: {
    /**
     * Adds a customer to the Mongo DB with
     * name
     * shortKey
     * secretKey
     * referral : The person who referred the customer
     * startingBalance : BTC balance when the customer has been added
     */
    async addCustomer() {
      if (
        this.currCustName != "" &&
        this.currCustShortKey != "" &&
        this.currCustSecretKey != ""
      ) {
        var customer = {
          name: this.currCustName,
          shortKey: this.currCustShortKey,
          secretKey: this.currCustSecretKey,
          referral: this.currCustReferral,
          startingBalance: this.currCustBTCBalance,
        };

        var resp = await CustomerService.insertCustomer(customer);
        this.customers = await CustomerService.getCustomers();
        if (resp.status == 201) {
          this.consoleLogs += `Customer ${this.currCustName} has been added successfuly.\n`;
        } else {
          this.consoleLogs += `Error adding customer ${this.currCustName}.\n`;
        }
        this.currCustName = "";
        this.currCustShortKey = "";
        this.currCustSecretKey = "";
        this.currCustBTCBalance = 0;
        this.currCustReferral = "";
      } else {
        alert("Please enter valid data for all the entries.");
      }
    },
    /**
     * Deletes customer from the Mongo DB
     */
    async customerDeleted(value) {
      this.customers = await CustomerService.getCustomers();
      this.logMessage(value);
    },
    /**
     * Logs a message to the UI Console Log
     */
    logMessage(value) {
      this.consoleLogs += value + "\n";
    },
    async getBtcBalance() {
      if (this.currCustShortKey != "" && this.currCustSecretKey != "") {
        try {
          var bybit = {
            shortKey: this.currCustShortKey,
            secretKey: this.currCustSecretKey,
          };
          var cust = {
            bybit,
          };
          this.currCustBTCBalance = await CustomerService.getCustomerBalance(
            cust
          );
        } catch (err) {
          console.log(err.message);
        }
      } else {
        alert("Api Keys can't be empty!");
      }
    },
    /**
     * GET BTC PRICE FROM BYBIT
     */
    async getBtcPrice() {
      this.btcPrice = await CustomerService.getBTCPrice();
    },
    getUsdValue(btcValue) {
      return (btcValue * this.btcPrice).toFixed(2);
    },
    buyQtyAll() {
      if (
        confirm(
          `Are you sure you want to buy ${this.qtyPercAll}% Quantity for all customers ?`
        )
      ) {
        this.customers.forEach(async (cust) => {
          await new Promise((r) => setTimeout(r, 200));
          var qty = (
            cust["bybit"].balance *
            (this.qtyPercAll / 100) *
            cust["position"].lev *
            this.btcPrice
          ).toFixed(0);
          const buyQty = await CustomerService.buyBybitQty(
            cust,
            qty,
            this.buyQtySide
          );
          if (buyQty.bybitBuyQty == "OK") {
            var action = "";
            if (this.buyQtySide == "Buy") {
              action = "bought";
            } else if (this.buyQtySide == "Sell") {
              action = "sold";
            }
            this.logMessage(
              `${qty} Quantity has been successfully ${action} for ${cust.name}`
            );
          } else {
            this.logMessage(
              `Something went wrong buying quantity for ${cust.name}`
            );
          }
        });
      }
    },
    setTpAll() {
      if (
        confirm(
          `Are you sure you want to place a TP Price of ${this.tpPriceAll} for all customers?`
        )
      ) {
        if (this.customers[0]["position"].side == "Buy") {
          if (this.tpPriceAll < this.customers[0]["position"].avgPrice) {
            alert("TP Price has to be higher than average price");
            return;
          }
        } else if (this.customers[0]["position"].side == "Sell") {
          if (this.tpPriceAll > this.customers[0]["position"].avgPrice) {
            alert("TP Price has to be lower than average price");
            return;
          }
        }
        this.customers.forEach(async (cust) => {
          await new Promise((r) => setTimeout(r, 200));

          if (
            cust["position"].side != "Sell" &&
            cust["position"].side != "Buy"
          ) {
            return;
          }

          if (
            cust["goose"].ngrokDomain != "" &&
            cust["goose"].ngrokDomain != undefined
          ) {
            if (this.tpPriceAll.includes("%")) {
              const tpPercentage = this.tpPriceAll.replace("%", "");
              const setTp = await CustomerService.setCustomerTpPercentage(
                cust,
                tpPercentage
              );
              if (setTp.setTpResponse.result == "ok") {
                this.logMessage(
                  `TP of ${tpPercentage}% has been successfully set for ${cust.name}`
                );
              } else {
                this.logMessage(
                  `Something went wrong trying to set the TP for ${cust.name}.`
                );
              }
            } else {
              const setTp = await CustomerService.setCustomerTpPrice(
                cust,
                this.tpPriceAll
              );
              if (setTp.setTpResponse.result == "ok") {
                this.logMessage(
                  `TP of ${this.tpPriceAll} has been successfully set for ${cust.name}`
                );
              } else {
                this.logMessage(
                  `Something went wrong trying to set the TP for ${cust.name}.`
                );
              }
            }
          } else {
            cust["position"].tpPrice = this.tpPriceAll;
          }
        });
      }
    },
    mCloseAll() {
      if (
        confirm(
          `Are you sure you want to Market Close the position for all customers?`
        )
      ) {
        this.customers.forEach(async (cust) => {
          await new Promise((r) => setTimeout(r, 200));
          try {
            var marketCloseResp = await CustomerService.closePosition(cust);
            if (
              marketCloseResp.data != undefined &&
              marketCloseResp.data.closeResponse.result == "ok"
            ) {
              this.logMessage(
                `:${cust.name} Market Close ${marketCloseResp.data.closeResponse.result}`
              );
            } else if (marketCloseResp.bybitClosePos == "OK") {
              this.logMessage(`:${cust.name} Market close ok`);
            } else {
              this.logMessage(`:${cust.name} Market close failed`);
            }
          } catch (err) {
            this.logMessage(`:${cust.name} Market Close ${err.message}`);
          }
        });
      }
    },
    async saveSettingsAll(newSettings) {
      this.customers.forEach(async (cust) => {
        if (
          cust["goose"].ngrokDomain != "" &&
          cust["goose"].ngrokDomain != undefined
        ) {
          var currSettings = await CustomerService.getBotSettings(cust);
          var settingsObject = JSON.parse(currSettings);
          var serverUname = settingsObject.serverUsername;
          var serverPass = settingsObject.serverPassword;
          var serverPort = settingsObject.serverPort;
          var apiKey = settingsObject.apiKey;
          var apiSecret = settingsObject.apiSecret;
          var exchange = settingsObject.exchange;
          var userSettings = newSettings
            .replace("<USERNAME>", serverUname)
            .replace("<PASSWORD>", serverPass)
            .replace("<PORT>", serverPort)
            .replace("<APIKEY>", apiKey)
            .replace("<APISECRET>", apiSecret)
            .replace("<EXCHANGE>", exchange);

          var uriSettings = "jsonToSend=" + encodeURI(userSettings) + "&name=";
          const saveSettings = await CustomerService.saveBotSettings(
            cust,
            uriSettings
          );
          if (
            saveSettings.botSettingsRes.result == "Changes saved successfully."
          ) {
            this.logMessage(
              `The new settings have been successfully saved for ${cust.name}`
            );
          } else {
            this.logMessage(
              `Something went wrong trying to save the new settings for ${cust.name}.`
            );
          }
        }
      });
    },
    closeModal() {
      this.showModal = false;
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.centered-div {
  margin: 0 auto;
  width: 50%;
}
.console-log {
  margin: 0 auto;
  text-align: left;
  padding-left: 10px;
  padding-top: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  width: 45%;
  height: 250px;
}

.my-custom-scrollbar {
  position: relative;
  height: 570px;
  overflow: auto;
}
.table-wrapper-scroll-y {
  display: block;
}
</style>
