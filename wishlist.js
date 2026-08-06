import {
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
    auth,
    db
} from "./firebase-config.js";


const wishlistItems =
    document.querySelectorAll(".wishlist-item");

const wishlistStatus =
    document.querySelector("#wishlist-status");

const giftDataById = new Map();

let currentUser = null;


function showWishlistMessage(
    message,
    isError = false
) {
    if (!wishlistStatus) {
        return;
    }

    wishlistStatus.textContent = message;

    wishlistStatus.classList.toggle(
        "is-error",
        isError
    );
}


function getGiftName(item) {
    const heading = item.querySelector("h2");

    return heading
        ? heading.textContent.trim()
        : "Gift";
}


function displayGift(
    item,
    giftData
) {
    const statusText =
        item.querySelector(".gift-status-text");

    const claimButton =
        item.querySelector(".claim-button");

    if (!statusText || !claimButton) {
        return;
    }

    const isClaimed =
        giftData?.claimed === true;

    const isOwnedByCurrentUser =
        Boolean(currentUser) &&
        isClaimed &&
        giftData.claimedBy === currentUser.uid;


    item.classList.toggle(
        "is-claimed",
        isClaimed
    );


    if (!currentUser) {
        statusText.textContent =
            isClaimed
                ? "Claimed"
                : "Available";

        claimButton.textContent =
            "Sign in to manage";

        claimButton.disabled = false;

        claimButton.setAttribute(
            "aria-pressed",
            "false"
        );

        return;
    }


    if (!isClaimed) {
        statusText.textContent = "Available";
        claimButton.textContent = "Claim gift";
        claimButton.disabled = false;

        claimButton.setAttribute(
            "aria-pressed",
            "false"
        );

        return;
    }


    if (isOwnedByCurrentUser) {
        statusText.textContent =
            "Claimed by you";

        claimButton.textContent =
            "Unclaim gift";

        claimButton.disabled = false;

        claimButton.setAttribute(
            "aria-pressed",
            "true"
        );

        return;
    }


    statusText.textContent = "Claimed";

    claimButton.textContent =
        "Already claimed";

    claimButton.disabled = true;

    claimButton.setAttribute(
        "aria-pressed",
        "false"
    );
}


function refreshAllGiftDisplays() {
    wishlistItems.forEach(function (item) {
        const giftId = item.dataset.giftId;

        if (!giftId) {
            return;
        }

        displayGift(
            item,
            giftDataById.get(giftId)
        );
    });
}


onAuthStateChanged(
    auth,

    function (user) {
        currentUser = user;

        refreshAllGiftDisplays();

        if (user) {
            showWishlistMessage(
                "You are signed in and can manage your gift claims."
            );
        } else {
            showWishlistMessage(
                "Sign in or create an account to claim a gift."
            );
        }
    },

    function (error) {
        console.error(
            "Authentication error:",
            error
        );

        showWishlistMessage(
            "Your account status could not be loaded.",
            true
        );
    }
);


wishlistItems.forEach(function (item) {
    const giftId = item.dataset.giftId;

    const statusText =
        item.querySelector(".gift-status-text");

    const claimButton =
        item.querySelector(".claim-button");

    if (
        !giftId ||
        !statusText ||
        !claimButton
    ) {
        return;
    }


    const giftReference =
        doc(db, "gifts", giftId);


    statusText.textContent = "Loading...";

    claimButton.disabled = true;


    onSnapshot(
        giftReference,

        function (snapshot) {
            if (!snapshot.exists()) {
                statusText.textContent =
                    "Not configured";

                claimButton.textContent =
                    "Unavailable";

                claimButton.disabled = true;

                return;
            }

            const giftData = snapshot.data();

            giftDataById.set(
                giftId,
                giftData
            );

            displayGift(
                item,
                giftData
            );
        },

        function (error) {
            console.error(
                `Gift listener error for ${giftId}:`,
                error
            );

            statusText.textContent =
                "Unable to load";

            claimButton.textContent =
                "Unavailable";

            claimButton.disabled = true;

            showWishlistMessage(
                "The wishlist could not be loaded.",
                true
            );
        }
    );


    claimButton.addEventListener(
        "click",

        async function () {
            if (!currentUser) {
                window.location.href =
                    "account.html?return=wishlist.html";

                return;
            }


            claimButton.disabled = true;

            showWishlistMessage("");


            try {
                let actionPerformed = "";

                await runTransaction(
                    db,

                    async function (transaction) {
                        const snapshot =
                            await transaction.get(
                                giftReference
                            );

                        if (!snapshot.exists()) {
                            throw new Error(
                                "This gift was not found."
                            );
                        }

                        const giftData =
                            snapshot.data();

                        const isClaimed =
                            giftData.claimed === true;


                        if (!isClaimed) {
                            transaction.update(
                                giftReference,
                                {
                                    claimed: true,
                                    claimedBy:
                                        currentUser.uid,
                                    claimedAt:
                                        serverTimestamp()
                                }
                            );

                            actionPerformed = "claimed";

                            return;
                        }


                        if (
                            giftData.claimedBy ===
                            currentUser.uid
                        ) {
                            transaction.update(
                                giftReference,
                                {
                                    claimed: false,
                                    claimedBy: null,
                                    claimedAt: null
                                }
                            );

                            actionPerformed =
                                "unclaimed";

                            return;
                        }


                        throw new Error(
                            "This gift has already been claimed by another guest."
                        );
                    }
                );


                const giftName =
                    getGiftName(item);


                if (actionPerformed === "claimed") {
                    showWishlistMessage(
                        `${giftName} has been claimed by you.`
                    );
                }


                if (actionPerformed === "unclaimed") {
                    showWishlistMessage(
                        `${giftName} is available again.`
                    );
                }
            } catch (error) {
                console.error(
                    "Gift transaction error:",
                    error
                );

                showWishlistMessage(
                    error.message ||
                    "The gift could not be updated.",
                    true
                );

                displayGift(
                    item,
                    giftDataById.get(giftId)
                );
            }
        }
    );
});