# Newsletter & Typography Guide

Welcome! Here is the information you requested regarding your newsletter templates and the fonts used on your site.

## 1. Substack Sci-Fi Aesthetic

Substack doesn't have "themes" in the same way a website does, but you can achieve a "The Radiants" aesthetic using these tips:

### Visual Look
*   **Canva Banners**: Create a banner for your Substack that uses the same colors as your website (`#0F100A` background and `#C9B037` gold accents).
*   **Futuristic Headers**: When you upload images to your posts, use a consistent sci-fi font in those images.
*   **Brand Settings**: In Substack's settings, you can change the "Accent Color" to your brand gold (`#C9B037`).

### Serialization Strategy
Many sci-fi and fantasy authors use Substack to release "Transmissions" or serialized chapters.
*   **The "Welcome" Email**: Make your automated welcome email feel like a mission briefing.
*   **Exclusive Content**: Offer "Found Footage" or "Deleted Scenes" from your world to encourage sign-ups.

---

## 2. Typography & Licensing

### Body Text: `system-ui`
The "normal" text on your website is controlled by a special CSS rule: `system-ui`.
*   **What it is**: It tells the user's computer to use its own native, professionally designed system font.
*   **Why we use it**: It is incredibly readable, loads instantly, and matches the user's device perfectly.
*   **Licensing**: Since it uses fonts already on the user's machine (like Apple's "San Francisco"), you **don't need any licenses** or font files. It is free and legal for commercial use!

### Header Font: `Orbitron`
The sci-fi font used for headings is **Orbitron**, which is a **Google Font**.
*   **License**: It is released under the **Open Font License (OFL)**. This means you can use it for free on your website, in your books, on covers, and for any commercial projects without paying anyone.

---

## 3. How to Use the New Dropdown

I have added a dropdown menu to your "Books" tab. To add a new series in the future:
1. Open `_layouts/default.html`.
2. Find the `<div class="dropdown-content">` section.
3. Add a new `<a href="...">` link with your series name.
