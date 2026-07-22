// <!-- NEWSLETTER -->

// Kit (formerly ConvertKit) public form endpoint — no API key needed,
// this is the same endpoint Kit's own embed widget posts to.
const KIT_FORM_ACTION =
    "https://app.kit.com/forms/9715220/subscriptions";

document.addEventListener("DOMContentLoaded", () => {

const widgets = document.querySelectorAll(
    ".newsletter-widget"
);

widgets.forEach((widget, index) => {
    const uid = `newsletter-${index}`;

    widget.innerHTML = `
        <section class="newsletter">

            <h2>Join the newsletter</h2>

            <p class="newsletter-description">
                Updates from the <em>Heliopaides</em> saga and <em>Éskhatos Kósmos</em>
            </p>

            <form id="${uid}-form">
                <input
                    type="email"
                    id="${uid}-email"
                    class="email"
                    placeholder="Enter your email"
                    required>

                <input
                    type="text"
                    id="${uid}-honeypot"
                    class="honeypot"
                    tabindex="-1"
                    autocomplete="off">

                <button
                    type="submit"
                    id="${uid}-button"
                    class="btn btn-primary subscribe-btn">
                    Subscribe
                </button>
            </form>

            <div
                id="${uid}-success"
                class="success-message">
                ✓ Thank you for subscribing! Please check your email to confirm your subscription.
            </div>

            <p class="privacy-text">
                Unsubscribe anytime.
                <a href="/privacy.html"> Privacy Policy</a>
            </p>

        </section>
    `;

    initialiseNewsletter(uid);

});

});

function initialiseNewsletter(uid) {

const form =
    document.getElementById(
        `${uid}-form`
    );

const emailInput =
    document.getElementById(
        `${uid}-email`
    );

const honeypotInput =
    document.getElementById(
        `${uid}-honeypot`
    );

const button =
    document.getElementById(
        `${uid}-button`
    );

const success =
    document.getElementById(
        `${uid}-success`
    );

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        // Honeypot check stays client-side only — Kit's endpoint
        // has no concept of this field, so a filled honeypot just
        // quietly stops the request from going out at all.
        if (honeypotInput.value) {
            return;
        }

        button.disabled = true;

        button.textContent =
            "Subscribing...";

        try {

            const formData = new FormData();
            formData.append(
                "email_address",
                emailInput.value
            );

            const response =
                await fetch(
                    KIT_FORM_ACTION,
                    {
                        method: "POST",
                        headers: {
                            Accept: "application/json"
                        },
                        body: formData
                    }
                );

            let result = {};
            try {
                result = await response.json();
            } catch (parseError) {
                // Endpoint didn't return JSON — fall back to
                // treating a 2xx HTTP status as success.
                result = {};
            }

            const failed =
                result.error === true ||
                (!response.ok && Object.keys(result).length === 0);

            if (failed) {
                throw new Error(
                    result.message ||
                    "Subscription failed"
                );
            }

            form.reset();

            button.textContent =
                "Subscribed";

            button.classList.add(
                "success"
            );

            success.classList.add(
                "show"
            );

        } catch (error) {

            console.error(error);

            button.textContent =
                "Try Again";

            alert(
                "Unable to subscribe right now."
            );

        } finally {

            setTimeout(() => {

                button.disabled =
                    false;

                if (
                    !button.classList.contains(
                        "success"
                    )
                ) {

                    button.textContent =
                        "Subscribe";

                }

            }, 1000);

        }

    }
);

}