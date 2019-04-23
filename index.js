import { Loading, QSpinnerGears } from 'quasar'
import { UAL } from 'universal-authenticator-library'

class Custom {
    constructor(chains, name, authenticators, Vue, Notify, openURL) {
        this.ual = new UAL(chains, name, authenticators);
        this.authed = false;
        this.accountName = ''
        this.data = new Vue({ data: { authed: false, accountName: '' } })
        if (Notify && openURL) {
            this.Notify = Notify
            this.openURL = openURL
            this.popUpsEnabled = true;
        } else {
            this.popUpsEnabled = false;
        }
    }

    async getAuthenticators() {
        const {
            availableAuthenticators,
            autoLoginAuthenticator
        } = this.ual.getAuthenticators();
        this.authenticators = availableAuthenticators;

        return availableAuthenticators.map((auth, index) => ({
            ...auth.getStyle(),
            id: index
        }));

    }

    async selectAuthenticator(index) {
        this.authenticator = this.authenticators[index]
        const users = await this.authenticator.login();
        this.data.accountName = await users[0].getAccountName()
        this.authed = true;
        this.data.authed = true
        this.user = users[users.length - 1]
        return users;
    }

    logout() {
        this.authenticator.logout();
        this.data.authed = false;
        this.data.accountName = ''
    }

    async tx(transaction, config = { broadcast: true, blocksBehind: 10, expireSeconds: 60 }) {
        Loading.show({
            delay: 400, // ms
            spinner: QSpinnerGears,
            message: 'Waiting for authenticator...'
        })

        try {
            const result = await this.user.signTransaction(transaction, config)
            console.log(result.transactionId)
            if (this.popUpsEnabled) {

                this.Notify.create({
                    message: "Transaction success",
                    position: "bottom-right",
                    color: "positive",
                    icon: "done",
                    actions: [
                        {
                            label: "Explorer",
                            color: 'white',
                            handler: () => {
                                this.openURL(`https://eosflare.io/tx/${result.transactionId}`)
                            }
                        }
                    ]
                })
                Loading.hide()
            }
        } catch (e) {
            console.log(JSON.stringify(e), 'was from thing')
            if (this.popUpsEnabled) {
                this.Notify.create({
                    message: e.message,
                    position: "bottom-right",
                    color: "negative",
                    actions: [
                        {
                            label: "Try again",
                            handler: () => {
                                this.tx(transaction, config)
                            },
                            color: 'red',
                            icon: 'error'
                        }
                    ]
                })
            }
            Loading.hide()
            throw new Error(e)
        }


    }

    get state() {
        return this.authed;
    }
}

export default {
    Store: Custom,
    install(Vue, options) {
        Vue.mixin({
            beforeCreate() {
                this.$eosio = options.eosStore
            }
        })
        Vue.component('eosio-button', require('./eos-button.vue').default)

        Vue.prototype.$eos = new Vue({
            data: { contract: options.extras.defaultContract },
            methods: {
                async tx(name, data, contract = this.contract) {
                    return this.$eosio.tx({
                        actions: [
                            {
                                account: contract,
                                name: name,
                                authorization: [
                                    {
                                        actor: this.$eosio.data.accountName,
                                        permission: "active"
                                    }
                                ],
                                data
                            }
                        ]
                    });
                },
                async transfer(to, quantity, memo = "", contract = 'eosio.token') {
                    return this.$eos.tx('transfer', {
                        from: this.$eosio.data.accountName,
                        to,
                        quantity: this.isValidTokenString(quantity) ? quantity : `${quantity.toFixed(4)} EOS`,
                        memo
                    }, contract)

                },
                isPrecision(input) {
                    return Number(input) >= 0 && Number(input) <= 8;
                },
                isName(input) {
                    return (
                        new RegExp("^[a-z][a-z1-5.]{0,10}([a-z1-5]|^.)[a-j1-5]?$").test(
                            input
                        ) ||
                        "Name must only contain characters a-z 1-5 and . No greater than 12 in length."
                    );
                },
                parseTokenString(tokenString) {
                    const [stringAmount, symbol] = tokenString.split(" ");
                    const amount = Number(stringAmount);
                    return { amount, symbol };
                },
                isValidTokenString(tokenString) {
                    return !!this.parseTokenString(tokenString).symbol
                },
                async getBalance(account, symbol = 'EOS', contract = 'eosio.token') {
                    const currencyArray = await this.$rpc.get_currency_balance(
                        contract,
                        account,
                        symbol
                    )
                    if (currencyArray.length == 0) return 0;
                    return this.parseTokenString(currencyArray[0]).amount
                },
                async getTable(tableName, scope = this.contract, account = this.contract) {
                    return await this.$rpc.get_table_rows({
                        json: true,
                        code: account,
                        scope,
                        table: tableName,
                        lower_bound: 0,
                        upper_bound: -1,
                        limit: 9999,
                        index_position: 1
                      });
                }

            }
        })
    }
}