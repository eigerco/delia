# Developing Delia

Delia's stack aims to be straightforward and opinionated,
using Typescript, Vite and Biome as the major development tools
and React & Tailwind for the frontend due to their ubiquity.

## Environment Setup

Delia requires `pnpm`, which you can install in variety of ways:

* [Through the official guide](https://pnpm.io/installation)
* [Using Volta to install it](https://volta.sh/)
* Or, if you're using `nix`; running `nix develop`

### Install dependencies

```bash
pnpm i
# Or, sometimes this may come in handy
pnpm i --frozen-lockfile
```

### Running

You can run the development setup with:

```bash
pnpm run dev
```

And format and lint it with:
```bash
pnpm run fmt && pnpm run lint
```

## Using accounts

Delia will require you to use the Polkadot.js browser extension,
for testing purposes, we recommend you add Alice's account to your wallet,
the seed phrase for it is <sup><a href="https://stackoverflow.com/a/70518514">1</a>,
<a href="https://github.com/polkadot-developers/substrate-developer-hub.github.io/issues/613">2</a></sup>:

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice
```
