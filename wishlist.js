import {
    collection,
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


const wishlistGrid =
    document.querySelector("#wishlist-grid");

const wishlistStatus =
    document.querySelector("#wishlist-status");


const giftsById = new Map();

let currentUser = null;
let hasLoadedWishlist = false;


/* ========================================
   WISHLIST MESSAGES
   ======================================== */

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


function showDefaultWishlistMessage() {
    if (currentUser) {
        showWishlistMessage(
            "You are signed in and can manage your gift claims."
        );
    } else {
        showWishlistMessage(
            "Sign in with Google to claim a gift."
        );
    }
}


/* ========================================
   FIRESTORE VALUE HELPERS
   ======================================== */

function getTextValue(
    value,
    fallback
) {
    if (
        typeof value === "string" &&
        value.trim()
    ) {
        return value.trim();
    }

    return fallback;
}

function formatGiftPrice(
    value,
    currency = "PHP"
) {
    const numericPrice =
        typeof value === "number"
            ? value
            : Number(value);


    if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
    ) {
        return "";
    }


    const currencyCode =
        typeof currency === "string" &&
        currency.trim()
            ? currency.trim().toUpperCase()
            : "PHP";


    try {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(numericPrice);
    } catch (error) {
        return `₱${numericPrice.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;
    }
}


/*
    Allows normal HTTPS/HTTP links and relative
    image paths such as assets/wishlist/book.jpg.

    Unsafe protocols such as javascript: are rejected.
*/

function getSafeUrl(value) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return "";
    }

    try {
        const url = new URL(
            value.trim(),
            window.location.href
        );

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }
    } catch (error) {
        console.warn(
            "Invalid wishlist URL:",
            value
        );
    }

    return "";
}


/* ========================================
   CREATE THE GIFT IMAGE
   ======================================== */

function createGiftImage(
    giftName,
    imageUrl,
    productUrl
) {
    if (!imageUrl) {
        return null;
    }


    const image =
        document.createElement("img");

    image.className = "gift-image";
    image.src = imageUrl;
    image.alt = giftName;
    image.loading = "lazy";


    /*
        When a product URL is available,
        make the image itself clickable.
    */

    if (productUrl) {
        const imageLink =
            document.createElement("a");

        imageLink.className =
            "gift-image-link";

        imageLink.href = productUrl;
        imageLink.target = "_blank";
        imageLink.rel =
            "noopener noreferrer";

        imageLink.setAttribute(
            "aria-label",
            `View ${giftName} product page`
        );

        imageLink.append(image);


        image.addEventListener(
            "error",

            function () {
                imageLink.remove();
            }
        );


        return imageLink;
    }


    const imageFrame =
        document.createElement("div");

    imageFrame.className =
        "gift-image-frame";

    imageFrame.append(image);


    image.addEventListener(
        "error",

        function () {
            imageFrame.remove();
        }
    );


    return imageFrame;
}


/* ========================================
   CREATE ONE WISHLIST CARD
   ======================================== */

function createGiftCard(
    giftId,
    giftData
) {
    const giftName =
        getTextValue(
            giftData.name,
            "Unnamed Gift"
        );

    const giftDescription =
        getTextValue(
            giftData.description,
            "No description has been added."
        );

    const imageUrl =
        getSafeUrl(
            giftData.imageUrl
        );

    const productUrl =
        getSafeUrl(
            giftData.productUrl
        );
    
    const giftPrice =
    formatGiftPrice(
        giftData.price,
        giftData.currency
    );


    const isClaimed =
        giftData.claimed === true;

    const isOwnedByCurrentUser =
        Boolean(currentUser) &&
        isClaimed &&
        giftData.claimedBy === currentUser.uid;


    const item =
        document.createElement("article");

    item.className = "wishlist-item";
    item.dataset.giftId = giftId;

    item.classList.toggle(
        "is-claimed",
        isClaimed
    );


    /*
        Image or clickable image
    */

    const imageElement =
        createGiftImage(
            giftName,
            imageUrl,
            productUrl
        );

    if (imageElement) {
        item.append(imageElement);
    }


    /*
        Gift name
    */

    const heading =
        document.createElement("h2");

    heading.textContent = giftName;

    item.append(heading);


    /*
        Gift description
    */

    const description =
        document.createElement("p");

    description.className =
        "gift-description";

    description.textContent =
        giftDescription;

    item.append(description);

/*
    Gift price
*/

    if (giftPrice) {
        const price =
            document.createElement("p");

        price.className =
            "gift-price";

        price.textContent =
            giftPrice;

        item.append(price);
    }


/*
    Product page link

    This remains visible even when the card
    does not have an image.
*/

    if (productUrl) {
        const productLink =
            document.createElement("a");

        productLink.className =
            "gift-product-link";

        productLink.href = productUrl;
        productLink.target = "_blank";
        productLink.rel =
            "noopener noreferrer";

        productLink.textContent =
            "View gift details ↗";

        item.append(productLink);
    }


    /*
        Claim status
    */

    const status =
        document.createElement("p");

    status.className =
        "gift-status";

    status.append(
        document.createTextNode(
            "Status: "
        )
    );


    const statusText =
        document.createElement("span");

    statusText.className =
        "gift-status-text";

    status.append(statusText);

    item.append(status);


    /*
        Claim/unclaim button
    */

    const claimButton =
        document.createElement("button");

    claimButton.className =
        "button button--primary claim-button";

    claimButton.type = "button";


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
    } else if (!isClaimed) {
        statusText.textContent =
            "Available";

        claimButton.textContent =
            "Claim gift";

        claimButton.disabled = false;

        claimButton.setAttribute(
            "aria-pressed",
            "false"
        );
    } else if (isOwnedByCurrentUser) {
        statusText.textContent =
            "Claimed by you";

        claimButton.textContent =
            "Unclaim gift";

        claimButton.disabled = false;

        claimButton.setAttribute(
            "aria-pressed",
            "true"
        );
    } else {
        statusText.textContent =
            "Claimed";

        claimButton.textContent =
            "Already claimed";

        claimButton.disabled = true;

        claimButton.setAttribute(
            "aria-pressed",
            "false"
        );
    }


    claimButton.addEventListener(
        "click",

        function () {
            handleGiftAction(
                giftId,
                giftName,
                claimButton
            );
        }
    );


    item.append(claimButton);

    return item;
}


/* ========================================
   DISPLAY ALL FIRESTORE GIFTS
   ======================================== */

function renderWishlist() {
    if (!wishlistGrid) {
        return;
    }


    const gifts =
        Array.from(
            giftsById.entries()
        );


    /*
        Sort by the Firestore order field.

        Gifts without an order value are placed
        after the numbered gifts.
    */

    gifts.sort(
        function (
            firstGift,
            secondGift
        ) {
            const firstId =
                firstGift[0];

            const secondId =
                secondGift[0];

            const firstData =
                firstGift[1];

            const secondData =
                secondGift[1];


            const firstOrder =
                typeof firstData.order === "number"
                    ? firstData.order
                    : Number.MAX_SAFE_INTEGER;

            const secondOrder =
                typeof secondData.order === "number"
                    ? secondData.order
                    : Number.MAX_SAFE_INTEGER;


            if (firstOrder !== secondOrder) {
                return firstOrder - secondOrder;
            }


            return firstId.localeCompare(
                secondId,
                undefined,
                {
                    numeric: true
                }
            );
        }
    );


    wishlistGrid.replaceChildren();


    if (gifts.length === 0) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.className =
            "wishlist-empty";

        emptyMessage.textContent =
            "No wishlist items have been added yet.";

        wishlistGrid.append(
            emptyMessage
        );

        return;
    }


    const fragment =
        document.createDocumentFragment();


    gifts.forEach(
        function (
            [giftId, giftData]
        ) {
            const giftCard =
                createGiftCard(
                    giftId,
                    giftData
                );

            fragment.append(
                giftCard
            );
        }
    );


    wishlistGrid.append(
        fragment
    );
}


/* ========================================
   CLAIM OR UNCLAIM A GIFT
   ======================================== */

async function handleGiftAction(
    giftId,
    giftName,
    claimButton
) {
    if (!currentUser) {
        window.location.href =
            "./account.html?return=wishlist.html";

        return;
    }


    claimButton.disabled = true;

    showWishlistMessage("");


    const giftReference =
        doc(
            db,
            "gifts",
            giftId
        );


    try {
        let actionPerformed = "";


        await runTransaction(
            db,

            async function (transaction) {
                const giftSnapshot =
                    await transaction.get(
                        giftReference
                    );


                if (!giftSnapshot.exists()) {
                    throw new Error(
                        "This gift no longer exists."
                    );
                }


                const latestGiftData =
                    giftSnapshot.data();

                const isClaimed =
                    latestGiftData.claimed === true;


                /*
                    Claim an available gift.
                */

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

                    actionPerformed =
                        "claimed";

                    return;
                }


                /*
                    Only the user who claimed the
                    gift may make it available again.
                */

                if (
                    latestGiftData.claimedBy ===
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

        /*
            Restore the button using the most
            recent Firestore information.
        */

        renderWishlist();
    }
}


/* ========================================
   AUTHENTICATION STATUS
   ======================================== */

onAuthStateChanged(
    auth,

    function (user) {
        currentUser = user;

        renderWishlist();
        showDefaultWishlistMessage();
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


/* ========================================
   READ THE FIRESTORE GIFTS COLLECTION
   ======================================== */

if (wishlistGrid) {
    showWishlistMessage(
        "Loading wishlist..."
    );


    const giftsCollection =
        collection(
            db,
            "gifts"
        );


    onSnapshot(
        giftsCollection,

        function (snapshot) {
            const isFirstSnapshot =
                !hasLoadedWishlist;

            giftsById.clear();


            snapshot.forEach(
                function (giftDocument) {
                    giftsById.set(
                        giftDocument.id,
                        giftDocument.data()
                    );
                }
            );


            hasLoadedWishlist = true;

            renderWishlist();


            /*
                Do not replace a successful claim
                message every time Firestore updates.
            */

            if (isFirstSnapshot) {
                showDefaultWishlistMessage();
            }
        },

        function (error) {
            console.error(
                "Wishlist collection error:",
                error
            );

            wishlistGrid.replaceChildren();

            showWishlistMessage(
                "The wishlist could not be loaded from Firebase.",
                true
            );
        }
    );
}