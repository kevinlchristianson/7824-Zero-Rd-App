// Crew chat settings. The chat stays switched off until `firebase` below is filled in.
// See CHAT-SETUP.md: create a free Firebase project, turn on Anonymous sign-in and Firestore,
// then paste the web app's config object here. These values are not secrets; the rules in
// firestore.rules are what protect the data.
window.ZR_CHAT = {
  firebase: {
    apiKey: "AIzaSyApnTdm8UzcPngDkE1Jg3SxygGiF_PJFQQ",
    authDomain: "zero-rd-reno.firebaseapp.com",
    projectId: "zero-rd-reno",
    storageBucket: "zero-rd-reno.firebasestorage.app",
    messagingSenderId: "389018048005",
    appId: "1:389018048005:web:857972f839636d352dae6c"
  },

  // One conversation per room. Change it to start a fresh thread for a new job.
  room: 'zero-rd-crew',

  // Firebase JS SDK version loaded from gstatic.
  sdk: '12.18.0'
};
