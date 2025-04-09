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
  const { publicKey } = useWallet();
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

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter valid amount > 0");
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
      alert(`✅ Airdropped ${amount} SOL!`);
    } catch (err) {
      setError("Airdrop failed: " + err.message);
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
      <h2 style={{ color: darkTheme.color }}>
        Balance: {balance !== null ? `${balance.toFixed(2)} SOL` : "N/A"}
      </h2>
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
          disabled={loading || !publicKey}
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
  const { publicKey, sendTransaction } = useWallet();
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
      alert("Recipient address required");
      return;
    }

    let toPublicKey;
    try {
      toPublicKey = new PublicKey(to);
    } catch {
      alert("Invalid recipient address");
      return;
    }

    const amountInput = prompt("Enter amount in SOL:");
    const amount = parseFloat(amountInput);

    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount > 0 required");
      return;
    }

    setLoading(true);
    setError(null);
    let signature;
    let retries = 3;

    try {
      while (retries > 0) {
        try {
          // Get the latest blockhash with context
          const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = 
            await connection.getLatestBlockhashAndContext();
          
          // Create transaction with explicit recentBlockhash
          const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: publicKey,
          }).add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: toPublicKey,
              lamports: amount * LAMPORTS_PER_SOL,
            })
          );

          // Send with minContextSlot to ensure slot consistency
          signature = await sendTransaction(transaction, connection, { minContextSlot });

          // Confirm with all necessary parameters
          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
            minContextSlot, // Include minContextSlot in confirmation
          }, "confirmed");

          if (confirmation.value.err) {
            throw new Error("Transaction confirmation failed");
          }

          alert(`✅ Sent ${amount} SOL to ${to}`);
          return;
        } catch (err) {
          if (err?.message.includes("Blockhash") && retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      let errorMessage = err.message;
      // Handle SendTransactionError specifically
      if (err?.name === "SendTransactionError") {
        errorMessage = [
          `Transaction failed: ${err.message}`,
          ...(err.logs || []),
        ].join('\n');
      }
      setError(errorMessage);
      console.error("Transaction error:", err);
      alert(`❌ Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <button
        onClick={handleSend}
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
        {loading ? "Sending..." : "Send SOL"}
      </button>
      {error && (
        <pre style={{ 
          color: darkTheme.errorColor,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all"
        }}>
          {error}
        </pre>
      )}
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
      alert("Connect wallet first");
      return;
    }

    if (!message.trim()) {
      alert("Enter message to sign");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messageBytes = new TextEncoder().encode(message);
      const sig = await signMessage(messageBytes);
      setSignature(Buffer.from(sig).toString("hex"));
    } catch (err) {
      setError("Signing failed: " + err.message);
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
          placeholder="Message to sign"
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
              marginBottom: "30px",
              gap: "10px",
              flexWrap: "wrap"
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
              <h2 style={{ color: darkTheme.linkColor }}>Airdrop SOL (Devnet)</h2>
              <AirdropSection />
            </div>
            
            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <h2 style={{ color: darkTheme.linkColor }}>Transfer SOL</h2>
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