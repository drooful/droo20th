import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


const googleSigninButton =
    document.querySelector("#google-signin-button");

const signoutButton =
    document.querySelector("#signout-button");

const signedOutView =
    document.querySelector("#signed-out-view");

const signedInView =
    document.querySelector("#signed-in-view");

const accountEmail =
    document.querySelector("#account-email");

const continueLink =
    document.querySelector("#continue-link");

const authStatus =
    document.querySelector("#auth-status");


const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});


function getReturnPage() {
    const parameters =
        new URLSearchParams(window.location.search);

    const requestedPage =
        parameters.get("return");

    const allowedPages = [
        "index.html",
        "details.html",
        "details.html#rsvp",
        "wishlist.html"
    ];

    if (allowedPages.includes(requestedPage)) {
        return requestedPage;
    }

    return "wishlist.html";
}


const returnPage = getReturnPage();

if (continueLink) {
    continueLink.href = returnPage;
}


function showAuthMessage(
    message,
    isError = false
) {
    if (!authStatus) {
        return;
    }

    authStatus.textContent = message;

    authStatus.classList.toggle(
        "is-error",
        isError
    );
}


function getFriendlyAuthError(error) {
    switch (error.code) {
        case "auth/popup-closed-by-user":
            return "Google sign-in was cancelled.";

        case "auth/popup-blocked":
            return "The sign-in window was blocked. Allow pop-ups and try again.";

        case "auth/network-request-failed":
            return "Check your internet connection and try again.";

        case "auth/unauthorized-domain":
            return "This website domain has not been authorized in Firebase.";

        default:
            return "Google sign-in could not be completed.";
    }
}


onAuthStateChanged(
    auth,

    function (user) {
        const isSignedIn = Boolean(user);

        if (signedOutView) {
            signedOutView.hidden = isSignedIn;
        }

        if (signedInView) {
            signedInView.hidden = !isSignedIn;
        }

        if (accountEmail) {
            accountEmail.textContent =
                user?.email || "";
        }

        if (isSignedIn) {
            showAuthMessage(
                "You are signed in and can manage your gift claims."
            );
        } else {
            showAuthMessage(
                "Sign in with Google to manage a gift."
            );
        }
    },

    function (error) {
        console.error(
            "Authentication observer error:",
            error
        );

        showAuthMessage(
            "Your account status could not be loaded.",
            true
        );
    }
);


if (googleSigninButton) {
    googleSigninButton.addEventListener(
        "click",

        async function () {
            googleSigninButton.disabled = true;
            googleSigninButton.textContent =
                "Opening Google...";

            showAuthMessage("");

            try {
                await signInWithPopup(
                    auth,
                    googleProvider
                );

                showAuthMessage(
                    "You have signed in successfully."
                );

                window.setTimeout(
                    function () {
                        window.location.href =
                            returnPage;
                    },
                    600
                );
            } catch (error) {
                console.error(
                    "Google sign-in error:",
                    error
                );

                showAuthMessage(
                    getFriendlyAuthError(error),
                    true
                );
            } finally {
                googleSigninButton.disabled = false;
                googleSigninButton.textContent =
                    "Sign in with Google";
            }
        }
    );
}


if (signoutButton) {
    signoutButton.addEventListener(
        "click",

        async function () {
            signoutButton.disabled = true;

            try {
                await signOut(auth);

                showAuthMessage(
                    "You have signed out."
                );
            } catch (error) {
                console.error(
                    "Sign-out error:",
                    error
                );

                showAuthMessage(
                    "You could not be signed out.",
                    true
                );
            } finally {
                signoutButton.disabled = false;
            }
        }
    );
}