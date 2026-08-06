import {
    doc,
    serverTimestamp,
    setDoc
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


const rsvpForm =
    document.querySelector("#rsvp-form");

const rsvpStatus =
    document.querySelector("#rsvp-status");

let currentUser = null;


onAuthStateChanged(
    auth,

    function (user) {
        currentUser = user;
    },

    function (error) {
        console.error(
            "Authentication status error:",
            error
        );
    }
);


function showRsvpMessage(
    message,
    isError = false
) {
    if (!rsvpStatus) {
        return;
    }

    rsvpStatus.textContent = message;

    rsvpStatus.classList.toggle(
        "is-error",
        isError
    );
}


if (rsvpForm && rsvpStatus) {
    rsvpForm.addEventListener(
        "submit",

        async function (event) {
            event.preventDefault();


            if (!currentUser) {
                showRsvpMessage(
                    "Please sign in before sending your RSVP.",
                    true
                );

                window.setTimeout(
                    function () {
                        window.location.href =
                            "account.html?return=details.html%23rsvp";
                    },
                    800
                );

                return;
            }


            if (!rsvpForm.checkValidity()) {
                rsvpForm.reportValidity();
                return;
            }


            const submitButton =
                rsvpForm.querySelector(
                    'button[type="submit"]'
                );

            const formData =
                new FormData(rsvpForm);

            const guestName =
                String(
                    formData.get("guestName") || ""
                ).trim();

            const attendance =
                String(
                    formData.get("attendance") || ""
                );

            const guestMessage =
                String(
                    formData.get("guestMessage") || ""
                ).trim();


            if (!guestName) {
                showRsvpMessage(
                    "Please enter your name.",
                    true
                );

                return;
            }


            if (
                attendance !== "yes" &&
                attendance !== "no"
            ) {
                showRsvpMessage(
                    "Please select whether you will attend.",
                    true
                );

                return;
            }


            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    "Sending...";
            }

            showRsvpMessage("");


            try {
                const rsvpReference =
                    doc(
                        db,
                        "rsvps",
                        currentUser.uid
                    );

                await setDoc(
                    rsvpReference,
                    {
                        guestName,
                        attendance,
                        guestMessage,
                        submittedAt:
                            serverTimestamp()
                    }
                );


                if (attendance === "yes") {
                    showRsvpMessage(
                        `Thanks, ${guestName}! Your RSVP has been recorded.`
                    );
                } else {
                    showRsvpMessage(
                        `Thanks for letting us know, ${guestName}.`
                    );
                }

                rsvpForm.reset();
            } catch (error) {
                console.error(
                    "RSVP submission error:",
                    error
                );

                showRsvpMessage(
                    "Your RSVP could not be sent. Please try again.",
                    true
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Send RSVP";
                }
            }
        }
    );
}