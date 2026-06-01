importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBMyjQstPcM-rWLxij2suE3c6o_VcIG3pY",
  authDomain: "reservasi-homestay-rep.firebaseapp.com",
  projectId: "reservasi-homestay-rep",
  storageBucket: "reservasi-homestay-rep.firebasestorage.app",
  messagingSenderId: "22298583984",
  appId: "1:22298583984:web:bf7cb02c9e78313a98ac75",
  measurementId: "G-HDT5GQ9N0T"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/images/logo/logorep.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
