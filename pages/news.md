---
layout: default
title: News
permalink: /news.html
---

<section style="padding: 4rem 10%;">
    <h1 style="font-family: var(--font-header); color: var(--color-accent); border-bottom: 1px solid var(--color-text-muted); padding-bottom: 1rem; margin-bottom: 3rem;">
        LATEST NEWS
    </h1>

    <div class="news-list" style="max-width: 800px;">
        {% for post in site.posts %}
            <div class="news-item" style="margin-bottom: 3rem;">
                <h2 style="font-family: var(--font-header); margin-bottom: 0.5rem;">
                    <a href="{{ post.url | relative_url }}" style="color: var(--color-text-main); text-decoration: none;">
                        {{ post.title }}
                    </a>
                </h2>
                <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                    {{ post.date | date: "%B %-d, %Y" }}
                </p>
                <div style="margin-bottom: 1rem;">
                    {{ post.excerpt }}
                </div>
                <a href="{{ post.url | relative_url }}" style="color: var(--color-accent); font-weight: bold;">READ POST →</a>
            </div>
        {% endfor %}
    </div>

    <!-- SUBSTACK EMBED -->
        <iframe 
            src="https://luciferread.substack.com/embed" width="100%" height="320" 
            style="border: 1px solid var(--color-accent); background: transparent; max-width: 500px; display: block; margin: 0 auto;" 
            frameborder="0" scrolling="no"></iframe>
</section>
