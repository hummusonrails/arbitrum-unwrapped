# Farcaster + Arbitrum Mini-App Starter

<p align="center">
  <img src="frontend/public/miniapp-example.gif" alt="Farcaster Arbitrum Mini-App Example" width="500" />
</p>

<p align="center">
  <a href="https://github.com/your-org/your-repo/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT" />
  </a>
  <a href="https://vitejs.dev/">
    <img src="https://img.shields.io/badge/Built%20with-Vite-646CFF.svg?logo=vite&logoColor=white" alt="Vite" />
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/Frontend-React-61DAFB.svg?logo=react&logoColor=white" alt="React" />
  </a>
  <a href="https://arbitrum.io/stylus">
    <img src="https://img.shields.io/badge/Arbitrum-Stylus-28A0F0.svg?logo=arbitrum&logoColor=white" alt="Arbitrum Stylus" />
  </a>
</p>

A modern, full-stack starter template for building your own [Farcaster Mini-App](https://docs.farcaster.xyz/) with [Arbitrum Stylus](https://arbitrum.io/stylus) smart contracts, TypeScript React frontend, and seamless wallet/NFT integration.

## ✨ Features

- **Minimal, production-ready React (Vite + Tailwind) frontend**
- **Wallet connection** (wagmi + viem) with support for Farcaster Frame and browser wallets
- **Arbitrum Stylus NFT contract** (Rust, OpenZeppelin crate, ERC721)
- **Easy contract ABI/address injection**
- **Farcaster manifest and frame meta integration**
- **Simple UI:** Connect wallet, mint NFT, view NFT gallery, share to Farcaster

## ⚡ Quick Start

```bash
# 1. Clone this template
git clone https://github.com/hummusonrails/farcaster-arbitrum-miniapp-starter.git
cd farcaster-arbitrum-miniapp-starter

# 2. Install dependencies
pnpm install

# 3. Run the frontend locally
pnpm --filter frontend dev

# 4. Deploy the template contract (Arbitrum Stylus)
pnpm --filter contract-template deploy:local

# 5. (Optional) Run other contract scripts, e.g.:
pnpm --filter contract-template check
# 6. Update the contract address in frontend/src/App.tsx
CONTRACT_ADDRESS = "PUT_YOUR_CONTRACT_ADDRESS_HERE"
```

## 🧪 Testing Your Miniapp on Farcaster (with ngrok)

You can preview and test your Farcaster Mini-App using the official [Farcaster Mini-App Previewer](https://farcaster.xyz/~/developers/mini-apps/preview). To make your local app accessible, use [ngrok](https://ngrok.com/docs/) to tunnel both your frontend and devnode:

**Sample `ngrok.yml` config:**

```yaml
tunnels:
  web5173:
    proto: http
    addr: 5173
  web8547:
    proto: http
    addr: 8547
```

- Start your tunnels with `ngrok start --all`.
- Update your `frontend/src/viemChains.ts` to use the HTTPS ngrok URL (e.g. `https://YOUR_NGROK_ID.ngrok.app`) for the RPC URLs.
- Make sure your browser wallet (e.g. MetaMask) is also using the ngrok URL as the RPC endpoint for your dev chain.
- [Read the ngrok docs](https://ngrok.com/docs/) for setup instructions.

Once both tunnels are running, paste your ngrok frontend URL into the Farcaster Mini-App Previewer to test your app from anywhere!


## 💰 Test Wallets & Funding

> [!IMPORTANT]  
> Use separate wallets for deployment vs. user interaction.

### Deployer Account

* Address: `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`
* Private Key: `0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659`

### Test Users

| Index  | Address | Private Key |
| ------------- | ------------- | ----------- |
| 0  | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 |
| 1  | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d |
| 2  | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a |
| 3  | 0x90F79bf6EB2c4f870365E785982E1f101E93b906 | 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6 |
| 4  | 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 | 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a |
| 5  | 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc | 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba |
| 6  | 0x976EA74026E726554dB657fA54763abd0C3a0aa9 | 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e |
| 7  | 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 | 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356 |
| 8  | 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f | 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 |
| 9  | 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 | 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 |

### Fund User Wallets

```bash
pnpm --filter scripts fund
```

### Contract (Rust, Stylus)

- All contract commands are run using pnpm workspace filtering.
- Example: `pnpm --filter contract-template build`
- See `contracts/template/package.json` for available scripts.

### Frontend (Vite + React)

- All frontend commands are run from the root or using pnpm workspace filtering.
- Example: `pnpm dev` to run the frontend locally

## 🛠️ How to Use This Template

### 1. **Customize and Deploy Your Stylus Contract**

- Edit `contracts/template/src/lib.rs` for your NFT or app logic (uses OpenZeppelin ERC721).
- Build and deploy to Arbitrum local devnode, or Arbitrum's testnet/mainnet.
- Export your contract’s ABI (see below).

### 2. **Update the Frontend**

- Place your contract ABI in `frontend/src/abi/SampleNFT.json`.
- Update the contract address in `frontend/src/App.tsx` (`CONTRACT_ADDRESS`).
- Customize UI in `frontend/src/App.tsx` and other components as needed.

### 3. **Farcaster Integration**

- Edit `public/.well-known/farcaster.json` to describe your miniapp.
- Add your production URL to `<meta name="fc:frame">` in `public/index.html`.
- See [Farcaster Mini-App docs](https://docs.farcaster.xyz/developers/mini-apps/overview) for manifest and frame embed requirements.

## 🧩 File Structure

```
farcaster-arbitrum-miniapp-starter/
├── contracts/                  # Stylus (Rust) smart contracts
│   └── template/
│       ├── src/lib.rs          # NFT contract logic (ERC721)
│       ├── package.json        # Contract workspace package definition
│       └── README.md
├── public/                     # Static assets, Farcaster manifest, NFT images
│   └── .well-known/farcaster.json
├── frontend/src/
│   ├── abi/                    # Contract ABIs (JSON)
│   ├── App.tsx                 # Main React app
│   ├── wagmi.ts                # Wagmi config (chains, connectors)
│   ├── hooks/
│   │   └── usePublicClient.ts  # viem public client
│   ├── viemChains.ts           # Chain definitions (Nitro localhost, Arbitrum, Sepolia)
│   └── package.json            # Frontend workspace package definition
├── pnpm-workspace.yaml         # pnpm monorepo workspace config
├── package.json                # Root package definition (meta)
├── README.md
└── ...
```

## 🧑‍💻 Developer Guide

### ✍️ Contract Development

- Write your Stylus contract in Rust.
- Export the ABI after building:
  ```bash
  cargo stylus export-abi --json
  ```
- Copy the ABI to `frontend/src/abi/SampleNFT.json`.

### ⚛️ Frontend Customization

- Change branding, app name, and icons in `public/` and inside `frontend/src/`.
- Add or remove UI components in `frontend/src/App.tsx`.

### 🔗 Farcaster & Wallet

- Supports both browser wallets and Farcaster Frame connector.
- Add your app to Farcaster via the manifest and meta tags.

## Resources

- [Farcaster Mini-Apps](https://docs.farcaster.xyz/developers/mini-apps/overview)
- [Arbitrum Stylus](https://arbitrum.io/stylus)
- [OpenZeppelin Stylus](https://github.com/OpenZeppelin/openzeppelin-stylus)
- [wagmi](https://wagmi.sh/)
- [viem](https://viem.sh/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ FAQ

**Q: Can I use this for non-NFT contracts?**  
A: Yes! The contract provided is only a template. You can modify it to suit your needs.

**Q: How do I update the contract ABI/address?**  
A: Replace `frontend/src/abi/SampleNFT.json` and update `CONTRACT_ADDRESS` in `frontend/src/App.tsx`.

**Q: How do I serve custom NFT images?**  
A: Place images in `public/` and reference them with a relative path in your contract metadata.

## 🤝 Contributing

PRs and issues welcome! Please open an issue if you have questions or suggestions.

**Happy building on Farcaster + Arbitrum!**

