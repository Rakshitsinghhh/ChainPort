import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = "https://api.devnet.solana.com";

function AirdropSection() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      setError("Failed to fetch balance");
      console.error(err);
    }
  }, [connection, publicKey]);

  const requestAirdrop = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    const amountInput = document.getElementById("amount");
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount)) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(signature, "finalized");
      await getBalance();
      alert(`Successfully airdropped ${amount} SOL!`);
    } catch (err) {
      setError("Failed to request airdrop");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBalance();
  }, [publicKey, getBalance]);

  return (
    <div style={{ margin: "20px 0" }}>
      <h2>Balance: {balance !== null ? `${balance} SOL` : "N/A"}</h2>
      <div style={{ margin: "10px 0" }}>
        <input
          id="amount"
          type="number"
          placeholder="Amount"
          step="0.1"
          min="0"
          style={{ padding: "8px", marginRight: "10px" }}
        />
        <button 
          onClick={requestAirdrop} 
          disabled={loading || !connected}
          style={{ padding: "8px 16px" }}
        >
          {loading ? "Processing..." : "Request Airdrop"}
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

function Sender() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    const to = prompt("Enter recipient address:");
    if (!to) {
      alert("Recipient address is required");
      return;
    }

    try {
      // Validate recipient address
      new PublicKey(to);
    } catch {
      alert("Invalid recipient address");
      return;
    }

    const amountInput = prompt("Enter amount in SOL:");
    const amount = parseFloat(amountInput);

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(to),
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Set recent blockhash and fee payer
      transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      alert(`Successfully sent ${amount} SOL to ${to}`);
    } catch (err) {
      setError("Transaction failed");
      console.error(err);
      alert("Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <button 
        onClick={handleSend} 
        disabled={loading || !connected}
        style={{ padding: "10px 20px" }}
      >
        {loading ? "Sending..." : "Send SOL"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

function App() {
  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ 
            maxWidth: "800px", 
            margin: "0 auto", 
            padding: "20px",
            fontFamily: "Arial, sans-serif"
          }}>
            <h1>Solana Wallet Demo</h1>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "30px"
            }}>
              <WalletMultiButton style={{ 
                backgroundColor: "#9945FF",
                color: "white",
                borderRadius: "5px",
                padding: "10px 20px"
              }} />
              <WalletDisconnectButton style={{ 
                backgroundColor: "#FF3E3E",
                color: "white",
                borderRadius: "5px",
                padding: "10px 20px"
              }} />
            </div>
            
            <div style={{ 
              backgroundColor: "#f5f5f5",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              <h2>Airdrop SOL (Devnet Only)</h2>
              <AirdropSection />
            </div>
            
            <div style={{ 
              backgroundColor: "#f5f5f5",
              padding: "20px",
              borderRadius: "8px"
            }}>
              <h2>Send SOL</h2>
              <Sender />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;