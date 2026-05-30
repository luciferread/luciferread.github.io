// <!-- NEWSLETTER -->

// Define worker for Cloudflare (which contains relevant APIs)
const WORKER_URL =
    "https://mailerlite-subscribe.lucifer-read.workers.dev/";

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
                    class="subscribe-btn">
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

        button.disabled = true;

        button.textContent =
            "Subscribing...";

        try {

            const response =
                await fetch(
                    WORKER_URL,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            email:
                                emailInput.value,
                            website:
                                honeypotInput.value
                        })
                    }
                );

            const result =
                await response.json();

            if (result.success) {

                form.reset();

                button.textContent =
                    "Subscribed";

                button.classList.add(
                    "success"
                );

                success.classList.add(
                    "show"
                );

            } else {

                throw new Error(
                    result.message ||
                    "Subscription failed"
                );

            }

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

