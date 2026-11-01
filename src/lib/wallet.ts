import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";

export const chain = sepolia;
export const config = createConfig({
  chains: [chain],
  multiInjectedProviderDiscovery: true,
  connectors: [injected(), coinbaseWallet({ appName: "Squeek Tales" })],
  transports: {
    [chain.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
});

export const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];
export const isMobileBrowser = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  !("ethereum" in window);
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
