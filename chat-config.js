// Crew chat settings. The chat stays switched off until `firebase` below is filled in.
// See CHAT-SETUP.md: create a free Firebase project, turn on Anonymous sign-in and Firestore,
// then paste the web app's config object here. These values are not secrets; the rules in
// firestore.rules are what protect the data.
window.ZR_CHAT = {
  firebase: null,
  // firebase: {
  //   apiKey: "…",
  //   authDomain: "….firebaseapp.com",
  //   projectId: "…",
  //   storageBucket: "….firebasestorage.app",
  //   messagingSenderId: "…",
  //   appId: "…"
  // },

  // One conversation per room. Change it to start a fresh thread for a new job.
  room: 'zero-rd-crew',

  // Firebase JS SDK version loaded from gstatic.
  sdk: '12.18.0'
};
