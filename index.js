import { Loading, QSpinnerGears } from 'quasar'
import { UAL } from 'universal-authenticator-library'

class Custom {
    constructor(chains, name, authenticators, Vue,  Notify, openURL) {
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
            }
        } catch (e) {
            console.log(e.message)
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
        }
        Loading.hide()


    }

    get state() {
        return this.authed;
    }
}

export default  {
    Store: Custom,
    install(Vue, options) {
        Vue.mixin({
            beforeCreate() {
                this.$eos = options.eosStore
            }
        })
        Vue.component('eosio-button', require('./eos-button.vue').default)
    }
}