# Privacy

> How Open Historia handles sign-in identity, private saves, provider requests, and deletion.

Canonical: https://historia.aliveville.com/privacy

[← Open Historia](https://historia.aliveville.com/)

# Privacy

Last updated: 2026-09-29.

## What we store

- Google OAuth identity (id, name, email, avatar) when you sign in.

- Cloud saves you create — game state, command history, story-so-far.

- An encrypted copy of any API key you save in settings.

- Anonymous website analytics through App Health: page paths, referring hostname, coarse browser/device/country categories, and a project-scoped visitor identifier held in first-party local storage for up to 90 days. The tracker does not store raw IP addresses or user-agent strings and does not set analytics cookies.

- When server endpoint monitoring is enabled, API requests send their method, normalized route template, response status, duration, and declared response byte count to App Health. Request bodies, headers, query values, concrete route parameters, and identity are not included.

## What we don't

- No remarketing tags.

- No sharing of your saves or commands with anyone.

- Guests can play without signing in; nothing is stored server-side.

## LLM provider

When you take a turn the entire game state (you can inspect the JSON payload in your browser's network tab) is sent to whichever provider you've picked on setup. Their privacy policy applies.

## Deletion

Delete individual saves from the timeline panel, or revoke the Google OAuth grant in your account settings to disconnect.
