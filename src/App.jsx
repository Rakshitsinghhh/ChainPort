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

// Dark theme styles
const darkTheme = {
  backgroundColor: "#121212",
  color: "#ffffff",
  cardBackground: "#1e1e1e",
  inputBackground: "#2d2d2d",
  buttonPrimary: "#9945FF",
  buttonDanger: "#FF3E3E",
  buttonText: "#ffffff",
  borderColor: "#333333",
  successColor: "#4CAF50",
  errorColor: "#F44336",
  linkColor: "#BB86FC",
};

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
      <h2 style={{ color: darkTheme.color }}>Balance: {balance !== null ? `${balance} SOL` : "N/A"}</h2>
      <div style={{ margin: "10px 0" }}>
        <input
          id="amount"
          type="number"
          placeholder="Amount"
          step="0.1"
          min="0"
          style={{
            padding: "8px",
            marginRight: "10px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
        <button
          onClick={requestAirdrop}
          disabled={loading || !connected}
          style={{
            padding: "8px 16px",
            backgroundColor: darkTheme.buttonPrimary,
            color: darkTheme.buttonText,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {loading ? "Processing..." : "Request Airdrop"}
        </button>
      </div>
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
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
        style={{
          padding: "10px 20px",
          backgroundColor: darkTheme.buttonPrimary,
          color: darkTheme.buttonText,
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {loading ? "Sending..." : "Send SOL"}
      </button>
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
    </div>
  );
}

function MessageSigner() {
  const { publicKey, signMessage } = useWallet();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignMessage = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message to sign");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const signatureHex = Array.from(signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      setSignature(signatureHex);
    } catch (err) {
      setError("Failed to sign message");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <h2 style={{ color: darkTheme.color }}>Sign Message</h2>
      <div style={{ margin: "10px 0" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign"
          style={{
            padding: "8px",
            marginRight: "10px",
            width: "100%",
            minHeight: "100px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
      </div>
      <button
        onClick={handleSignMessage}
        disabled={loading || !publicKey}
        style={{
          padding: "10px 20px",
          backgroundColor: darkTheme.buttonPrimary,
          color: darkTheme.buttonText,
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {loading ? "Signing..." : "Sign Message"}
      </button>
      {signature && (
        <div style={{ marginTop: "10px" }}>
          <h3 style={{ color: darkTheme.color }}>Signature:</h3>
          <div style={{
            wordBreak: "break-all",
            backgroundColor: darkTheme.cardBackground,
            padding: "10px",
            borderRadius: "5px",
            color: darkTheme.color
          }}>
            {signature}
          </div>
        </div>
      )}
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
    </div>
  );
}

function App() {
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
            fontFamily: "Arial, sans-serif",
            backgroundColor: darkTheme.backgroundColor,
            color: darkTheme.color,
            minHeight: "100vh"
          }}>
            <h1 style={{ color: darkTheme.linkColor }}>Solana Wallet Demo</h1>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px"
            }}>
              <WalletMultiButton style={{
                backgroundColor: darkTheme.buttonPrimary,
                color: darkTheme.buttonText,
                borderRadius: "5px",
                padding: "10px 20px",
                height: "auto"
              }} />
              <WalletDisconnectButton style={{
                backgroundColor: darkTheme.buttonDanger,
                color: darkTheme.buttonText,
                borderRadius: "5px",
                padding: "10px 20px",
                height: "auto"
              }} />
            </div>
            
            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <h2 style={{ color: darkTheme.linkColor }}>Airdrop SOL (Devnet Only)</h2>
              <AirdropSection />
            </div>
            
            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <h2 style={{ color: darkTheme.linkColor }}>Send SOL</h2>
              <Sender />
            </div>

            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <MessageSigner />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;