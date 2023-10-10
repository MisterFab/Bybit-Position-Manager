<template>
  <tbody>
    <tr>
      <td>{{ customer.name }}</td>
      <td>
        <b>{{ customer["bybit"].balance }} BTC</b> (${{
          getUsdValue(customer["bybit"].balance)
        }})
      </td>
      <td>
        {{ customer["position"].pnl }} BTC (
        <b>${{ getUsdValue(customer["position"].pnl) }}</b> )
        <br />
        Avg. Price : <b>{{ customer["position"].avgPrice }}</b> <br />
        Liquidation Price : <b>{{ customer["position"].liqPrice }}</b> <br />
        Side : <b>{{ customer["position"].side }}</b>
      </td>
      <td>{{ customer["position"].tpPrice }}</td>
      <td>
        <a class="close-position" @click="closePosition(customer)"
          >Close Position</a
        >
        <br />
        <a class="close-position" v-on:click="openEditModal(customer)">Edit</a>
        <br />
        <a class="close-position" v-on:click="deleteCustomer(customer)"
          >Delete</a
        >
      </td>
    </tr>
    <CustomerEditModal
      v-if="showModal"
      @close="closeModal"
      :cust="customer"
      @logMessage="logMessage"
    >
    </CustomerEditModal>
  </tbody>
</template>

<script>
import CustomerService from "../CustomerService";
import CustomerEditModal from "./CustomerEditModal";

export default {
  components: {
    CustomerEditModal,
  },
  props: ["customer", "btcPrice", "autoClosePos"],
  data() {
    return {
      showModal: false,
    };
  },
  async created() {
    await new Promise((r) => setTimeout(r, 200));
    this.getBtcBalance();
    setInterval(async () => {
      //this.$forceUpdate();
      this.getBtcBalance();
    }, 1800000);
    setInterval(async () => {
      this.getPosition();
      this.cancelOrders();
      await new Promise((r) => setTimeout(r, 350));
    }, 10000);
  },
  methods: {
    getUsdValue(btcValue) {
      return (btcValue * this.btcPrice).toFixed(2);
    },
    async closePosition(cust) {
      if (confirm("Are you sure you want to close this position?")) {
        this.closePositionHelper(cust);
      }
    },
    async closePositionHelper(cust) {
      var marketCloseResp = await CustomerService.closePosition(cust);
      if (
        marketCloseResp.data != undefined &&
        marketCloseResp.data.closeResponse.result == "ok"
      ) {
        cust["position"].tpPrice = 0;
        this.$emit(
          "logMessage",
          `Position successfully closed for customer ${cust.name}`
        );
      } else if (marketCloseResp.bybitClosePos == "OK") {
        cust["position"].tpPrice = 0;
        this.$emit(
          "logMessage",
          `Position successfully closed for customer ${cust.name}`
        );
      } else {
        this.$emit(
          "logMessage",
          `Something went wrong trying to closing the position for ${cust.name}.`
        );
      }
    },
    async deleteCustomer(cust) {
      if (confirm("Are you sure you want to delete this customer?")) {
        await CustomerService.deleteCustomer(cust._id);
        this.$emit("custDeleted", cust.name);
      }
    },
    async getBtcBalance() {
      try {
        var custBTCBalance = await CustomerService.getCustomerBalance(
          this.customer
        );
        if (
          isNaN(custBTCBalance) &&
          custBTCBalance.includes("invalid request")
        ) {
          this.customer["bybit"].balance = -1;
        } else {
          this.customer["bybit"].balance = custBTCBalance;
        }
      } catch (err) {
        console.log(err.message);
      }
    },
    async cancelOrders() {
      if(this.customer.name == "Zebracodd") {
        var cancelOrders = await CustomerService.cancelOrders(this.customer);
        if(cancelOrders["cancelOrders"] == "OK") {
          console.log("Successfully canceled orders for client " + this.customer.name);
        }
      }
    },
    async getPosition() {
      try {
        var closePercentagesLong = [
          [1, 5],
          [1.5, 14],
          [2, 11],
          [3, 9],
          [4, 8],
          [5, 7],
          [6, 6],
        ];
        /*var closePercentagesShort = [
          [1, 17],
          [1.5, 14],
          [2, 11],
          [3, 9],
          [4, 8],
          [5, 7],
          [6, 6],
        ];*/
        var byBitPosition = await CustomerService.getPosition(this.customer);
        var gooseInfo = await CustomerService.getGooseUser(this.customer);

        if (
          byBitPosition["bybitPosition"] != null &&
          byBitPosition["bybitPosition"] !== undefined
        ) {
          var pnl = (
            byBitPosition["bybitPosition"].unrealised_pnl -
            byBitPosition["bybitPosition"].occ_closing_fee
          ).toFixed(8);
          var positionSide = byBitPosition["bybitPosition"].side;
          var liquidationPrice = byBitPosition["bybitPosition"].liq_price;
          var avgPrice = Number(
            byBitPosition["bybitPosition"].entry_price
          ).toFixed(0);

          var custQty = byBitPosition["bybitPosition"].size;
          var percUsed =
            (custQty /
              10 /
              (byBitPosition["bybitPosition"].wallet_balance * this.btcPrice)) *
            100;

          this.customer.btcPrice = this.btcPrice;

          if (gooseInfo != undefined && gooseInfo != "" && gooseInfo != "R") {
            console.log(gooseInfo);
            const position = {
              pnl: pnl,
              tpPrice: gooseInfo.saleAmount.toFixed(0),
              side: positionSide,
              avgPrice: avgPrice,
              liqPrice: liquidationPrice,
              posId: gooseInfo.idrapporto,
              lev: gooseInfo.leverage,
            };
            this.customer["position"] = position;
          } else {
            const position = {
              pnl: pnl,
              tpPrice: this.customer["position"].tpPrice,
              side: positionSide,
              avgPrice: avgPrice,
              liqPrice: liquidationPrice,
              posId: "",
              lev: byBitPosition["bybitPosition"].leverage,
            };
            this.customer["position"] = position;
          }

          if (
            this.autoClosePos == true &&
            this.customer._id == "60ae78084096fd8524782fed"
          ) {
            console.log(this.customer.name + " perc used " + percUsed);
            if (
              percUsed >= closePercentagesLong[0][0] &&
              percUsed <= closePercentagesLong[1][0]
            ) {
              /* Automatic DCA depending on negative percentage */
              // First Range
              if (this.customer["position"].side == "Buy") {
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[0][1] / 1000)
                );
              } else if (this.customer["position"].side == "Sell") {
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[0][1] / 1000)
                );
                console.log(
                  "TP Price would've been: " +
                    Math.floor(
                      this.customer["position"].avgPrice *
                        (1 - closePercentagesLong[0][1] / 1000)
                    )
                );
              }
            } else if (
              percUsed >= closePercentagesLong[1][0] &&
              percUsed <= closePercentagesLong[2][0]
            ) {
              console.log("I was in second range");
              // Second Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[1][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[1][1] / 1000)
                );
                */
              }
            } else if (
              percUsed >= closePercentagesLong[2][0] &&
              percUsed <= closePercentagesLong[3][0]
            ) {
              // Third Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[2][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[2][1] / 1000)
                );
                */
              }
            } else if (
              percUsed >= closePercentagesLong[3][0] &&
              percUsed <= closePercentagesLong[4][0]
            ) {
              // Fourth Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[3][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[3][1] / 1000)
                );
                */
              }
            } else if (
              percUsed >= closePercentagesLong[4][0] &&
              percUsed <= closePercentagesLong[5][0]
            ) {
              // Fifth Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[4][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[4][1] / 1000)
                );
                */
              }
            } else if (
              percUsed >= closePercentagesLong[5][0] &&
              percUsed <= closePercentagesLong[6][0]
            ) {
              // Sixth Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[5][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[5][1] / 1000)
                );
                */
              }
            } else if (percUsed >= closePercentagesLong[6][0]) {
              // Last Range
              if (this.customer["position"].side == "Buy") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 + closePercentagesLong[6][1] / 1000)
                );
                */
              } else if (this.customer["position"].side == "Sell") {
                /*
                this.customer["position"].tpPrice = Math.floor(
                  this.customer["position"].avgPrice *
                    (1 - closePercentagesLong[6][1] / 1000)
                );
                */
              }
            }
          }

          if (this.customer["position"].side == "Buy") {
            if (
              this.btcPrice > 0 &&
              this.btcPrice != undefined &&
              this.customer["position"].tpPrice > 0 &&
              this.customer["position"].tpPrice <= this.btcPrice
            ) {
              this.closePositionHelper(this.customer);
            }
          } else if (this.customer["position"].side == "Sell") {
            if (
              this.btcPrice > 0 &&
              this.btcPrice != undefined &&
              this.customer["position"].tpPrice > 0 &&
              this.customer["position"].tpPrice >= this.btcPrice
            ) {
              this.closePositionHelper(this.customer);
            }
          }
        } else {
          this.customer["position"].pnl = 0;
          this.customer["position"].tpPrice = 0;
          this.customer["position"].avgPrice = 0;
          this.customer["position"].liqPrice = 0;
          this.customer["position"].side = "None";
        }
      } catch (err) {
        console.log("Get Customer Position Error : " + err.message);
      }
    },
    async openEditModal(customer) {
      if (
        this.customer["goose"].ngrokDomain != "" &&
        this.customer["goose"].ngrokDomain != undefined
      ) {
        const currentBotSettings = await CustomerService.getBotSettings(this.customer);
        this.customer["goose"].botSettings = currentBotSettings;
      }
      const lastTradePnl = await CustomerService.getLastTradePnl(
        this.customer,
        0
      );
      this.customer["bybit"].lastTradePnl =
        lastTradePnl.data[0].closed_pnl +
        ` ($${this.getUsdValue(lastTradePnl.data[0].closed_pnl)})`;
      this.showModal = true;
      this.currCustomer = customer;
    },
    closeModal() {
      this.showModal = false;
    },
    logMessage(value) {
      this.$emit("logMessage", value);
    },
  },
};
</script>

<style>
a {
  color: #42b983;
}
</style>
