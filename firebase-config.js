import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyD4f7y4jndsSK-1s3_h2UJsrs_CyBOpIC4",
    authDomain: "bday-droo.firebaseapp.com",
    projectId: "bday-droo",
    storageBucket: "bday-droo.firebasestorage.app",
    messagingSenderId: "922044937518",
    appId: "1:922044937518:web:1a4bf10c0bbeaf5934f6bf",
    measurementId: "G-QC9X0F12MT"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


export {
    auth,
    db
};