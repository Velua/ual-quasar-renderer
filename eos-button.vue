<template>
  <div>
    <q-btn :label="ButtonLabel" @click="loginToggle"/>
    <q-dialog v-model="prompt">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <div class="text-h6">Login Authenticator</div>
          <q-space/>
          <q-btn icon="close" flat round dense v-close-popup/>
        </q-card-section>

        <q-card-section>
          <q-list bordered>
            <q-item
              clickable
              @click="selectAuth(style.id)"
              v-ripple
              v-for="style in styles"
              :key="style.id"
              v-bind:style="{ backgroundColor: style.background, color: style.textColor }"
            >
              <img v-bind:src="style.icon">
              <q-item-section name="x">{{ style.text }}</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

    <script>
export default {
  data: function() {
    return {
      prompt: false,
      styles: []
    };
  },
  computed: {
    ButtonLabel: function() {
      return this.$eos.data.authed
        ? `Logout ${this.$eos.data.accountName}`
        : "Login";
    }
  },

  methods: {
    getAuthenticators: async function() {
      this.styles = await this.$eos.getAuthenticators();
    },
    selectAuth: async function(index) {
      await this.$eos.selectAuthenticator(index);
      this.prompt = false;
    },
    logout: function() {
      this.$eos.logout();
    },
    loginToggle: async function() {
      if (!this.$eos.data.authed) {
        this.prompt = true;
        this.getAuthenticators();
      } else {
        this.logout();
      }
    }
  }
};
</script>
    <style>
</style>