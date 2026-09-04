# NxtUpdate website

Static website and documentation for [NxtUpdate](https://github.com/scorpion7slayer/NxtUpdate), a universal package updater for macOS.

## Run locally

```sh
bunx serve .
```

Then open the local address printed in the terminal.

## Validate

```sh
bunx html-validate@latest index.html
```

The site uses plain HTML, CSS, and JavaScript. It has no build step.

## Preview the Docs7 documentation

```sh
bunx @upstash/docs7@latest dev ./docs
```

The Docs7 source lives in [`docs/`](docs/). In production, Docs7 serves it at
[`nxtupdate.nxtaigen.com/docs`](https://nxtupdate.nxtaigen.com/docs), while the
static landing page stays at the domain root.
