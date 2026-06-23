// ── Firebase Configuration ─────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBxJmz3HJYpBGF4o_CkAIUs0SvzxJtM_B4",
  authDomain: "t1npay.firebaseapp.com",
  databaseURL: "https://t1npay-default-rtdb.firebaseio.com",
  projectId: "t1npay",
  storageBucket: "t1npay.firebasestorage.app",
  messagingSenderId: "1047026760648",
  appId: "1:1047026760648:web:158c24f2df3cb63b87defd",
  measurementId: "G-23CKCNXCJT"
};

// Inicializar Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
}
