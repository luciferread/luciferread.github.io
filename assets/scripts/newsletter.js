// <!-- NEWSLETTER -->

// Kit (formerly ConvertKit) public form endpoint — no API key needed,
// this is the same endpoint Kit's own embed widget posts to.
const KIT_FORM_ACTION =
    "https://app.kit.com/forms/9715220/subscriptions";

// Must match the key in the form's embed HTML: name="fields[...]".
// Currently the signup_source field.
const KIT_SOURCE_FIELD = "signup_source";

// Tidy a ?ref= value before storing it: lowercase, letters/numbers/-/_ only,
// max 40 characters. Anything empty falls back to null.
function cleanSource(value) {
    if (!value) return null;
    const cleaned = value
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 40);
    return cleaned || null;
}

// Source priority: ?ref= in the URL, then a ref remembered earlier in this
// visit (so it survives clicking to another page), then the default.
function getSignupSource() {
    const fromUrl = cleanSource(
        new URLSearchParams(window.location.search).get("ref")
    );

    if (fromUrl) {
        try { sessionStorage.setItem("lr_ref", fromUrl); } catch (e) {}
        return fromUrl;
    }

    try {
        const stored = cleanSource(sessionStorage.getItem("lr_ref"));
        if (stored) return stored;
    } catch (e) {}

    return "generic_website";
}

// Kit's spam guard can "quarantine" a signup until the visitor completes a
// short verification step. Kit's own embed script shows that step in a
// pop-up; since we post the form ourselves, we show it here instead.
function openKitGuard(guardUrl) {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
        "position:fixed;inset:0;z-index:10000;display:flex;" +
        "align-items:center;justify-content:center;padding:1rem;" +
        "background:rgba(0,0,0,0.75);";

    const box = document.createElement("div");
    box.style.cssText =
        "position:relative;width:100%;max-width:440px;" +
        "background:var(--color-bg, #0F100A);" +
        "border:1px solid var(--color-border, #333);" +
        "padding:1rem;text-align:center;";

    const frame = document.createElement("iframe");
    frame.src = guardUrl;
    frame.title = "Verify your subscription";
    frame.style.cssText =
        "width:100%;height:340px;border:0;background:#fff;";

    const note = document.createElement("p");
    note.style.cssText =
        "margin:0.75rem 0 0;font-size:0.8rem;" +
        "color:var(--color-text-muted, #aaa);";
    note.innerHTML =
        `Not loading? <a href="${guardUrl}" target="_blank" rel="noopener">` +
        `Open the verification in a new tab</a>.`;

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.className = "btn btn-dim";
    close.style.marginTop = "0.75rem";
    close.addEventListener("click", () => overlay.remove());

    box.append(frame, note, close);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.addEventListener("DOMContentLoaded", () => {

const urlSource = getSignupSource();

const widgets = document.querySelectorAll(
    ".newsletter-widget"
);

widgets.forEach((widget, index) => {
    const uid = `newsletter-${index}`;

    // A widget can pin its own source (e.g. the paperback page uses
    // data-source="paperback"), which wins over the URL.
    const signupSourceValue =
        cleanSource(widget.dataset.source) || urlSource;

    // Optional per-widget copy, e.g. for readers who already own the book.
    const heading =
        widget.dataset.heading || "Join the newsletter";
    const description =
        widget.dataset.description ||
        "Receive a free preview of <em>The Radiants</em>";

    widget.innerHTML = `
        <section class="newsletter">

            <h2>${heading}</h2>

            <p class="newsletter-description">
                ${description}
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
                <a href="/privacy/"> Privacy Policy</a>
            </p>

        </section>
    `;

    initialiseNewsletter(uid, signupSourceValue);

});

});

function initialiseNewsletter(uid, signupSourceValue) {

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

            // FormData (multipart) is what Kit's own embed posts, and it
            // avoids a CORS preflight. Custom fields use fields[key].
            const formData = new FormData();
            formData.append(
                "email_address",
                emailInput.value
            );
            formData.append(
                `fields[${KIT_SOURCE_FIELD}]`,
                signupSourceValue
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

            // Handy while testing: see exactly what Kit answered.
            console.info("Kit response:", response.status, result);

            // Held by Kit's spam guard: the visitor must complete a short
            // verification before the subscription is created.
            if (result.status === "quarantined" && result.url) {
                openKitGuard(result.url);

                button.textContent =
                    "Verify to finish";

                success.textContent =
                    "Almost there: complete the verification step to finish subscribing.";
                success.classList.add(
                    "show"
                );

                return;
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
                    ) &&
                    button.textContent !== "Verify to finish"
                ) {

                    button.textContent =
                        "Subscribe";

                }

            }, 1000);

        }

    }
);

}