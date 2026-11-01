import { useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { ArrowUpRight, LogOut, Wallet } from "lucide-react";
import { Modal } from "./Modal";
import { chain, isMobileBrowser, OPEN_IN } from "../lib/wallet";

export function WalletSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mobile = isMobileBrowser();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, variables, error, reset } =
    useConnect();
  const { disconnect } = useDisconnect();
  const {
    switchChain,
    isPending: switching,
    error: switchError,
  } = useSwitchChain();
  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ]
    .filter((c) => !(c.id === "injected" && named))
    .filter((c) => !mobile || c.type !== "injected");
  const label = (c: Connector) =>
    c.id === "injected"
      ? "Browser wallet"
      : c.id === "coinbaseWalletSDK"
        ? mobile
          ? "Coinbase Smart Wallet"
          : "Coinbase Wallet"
        : c.name;
  const icon = (c: Connector) =>
    c.icon ||
    (c.id === "coinbaseWalletSDK" ? "./wallets/coinbase.svg" : undefined);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isConnected ? "Your story wallet" : "Connect a wallet"}
      className="wallet-sheet"
    >
      {isConnected && address ? (
        <>
          <p className="wallet-address">{address}</p>
          <p className="muted">
            Your choices stay in this browser. Connecting never sends a
            transaction.
          </p>
          {chainId !== chain.id && (
            <button
              className="primary full"
              disabled={switching}
              onClick={() => switchChain({ chainId: chain.id })}
            >
              {switching ? "Switching…" : "Switch to Sepolia"}
            </button>
          )}
          {switchError && (
            <p role="status" className="error-note">
              Could not switch networks. Open your wallet and choose Sepolia,
              then retry.
            </p>
          )}
          <button
            className="wallet-row"
            onClick={() => {
              disconnect();
              onClose();
            }}
          >
            <LogOut size={20} /> Disconnect wallet
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            Give your tiny adventure a home. No gas, no signature, just your
            story.
          </p>
          <div className="wallet-list">
            {mobile &&
              OPEN_IN.map((w) => (
                <a
                  className="wallet-row"
                  key={w.id}
                  href={w.href(location.href)}
                >
                  <img
                    width="28"
                    height="28"
                    src={`./wallets/${w.id}.svg`}
                    alt=""
                  />
                  <span>Open in {w.name}</span>
                  <ArrowUpRight size={18} />
                </a>
              ))}
            {listed.map((c) => (
              <button
                className="wallet-row"
                key={c.uid}
                disabled={isPending}
                onClick={() => connect({ connector: c })}
              >
                {icon(c) ? (
                  <img width="28" height="28" src={icon(c)} alt="" />
                ) : (
                  <Wallet size={28} />
                )}
                <span>
                  {label(c)}
                  {isPending && variables?.connector === c ? " · opening…" : ""}
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          {error && (
            <p className="error-note" role="status">
              {error.message.toLowerCase().includes("provider")
                ? "No browser wallet found. Install a wallet extension or try Coinbase Wallet."
                : "The wallet did not connect. You can try again or choose another wallet."}
            </p>
          )}
          <p className="fine-print">
            Sepolia testnet · Your funds are never used.
          </p>
        </>
      )}
    </Modal>
  );
}
