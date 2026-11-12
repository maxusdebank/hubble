import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { RefreshCw, Wallet } from 'lucide-react';
import './dashboard.css';
import { WALLET_TOKENS as TOKENS } from '../walletTokens';
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

export default function DashboardApp() {
  const [account, setAccount] = useState('');
  const [positions, setPositions] = useState([]);
  const [nativeBalance, setNativeBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const readPortfolio = useCallback(async (address) => {
    if (!window.ethereum || !address) return;
    setLoading(true); setError('');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 146) throw new Error('Switch your wallet to Sonic mainnet (chain ID 146).');
      const native = await provider.getBalance(address);
      setNativeBalance(ethers.formatEther(native));
      const results = await Promise.all(TOKENS.map(async (token) => {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const [balance, decimals] = await Promise.all([contract.balanceOf(address), contract.decimals()]);
          return { ...token, balance: ethers.formatUnits(balance, decimals), ok: true };
        } catch (readError) {
          return { ...token, balance: '0', ok: false };
        }
      }));
      setPositions(results);
    } catch (readError) { setError(readError.message); }
    finally { setLoading(false); }
  }, []);

  const connect = async () => {
    if (!window.ethereum) { setError('No injected wallet was found. Install MetaMask or another EVM wallet.'); return; }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts[0]) { setAccount(accounts[0]); readPortfolio(accounts[0]); }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts[0]) { setAccount(accounts[0]); readPortfolio(accounts[0]); }
    });
  }, [readPortfolio]);

  return <div className="portfolio-app">
    <header><div><span>LIVE WALLET INDEX</span><h1>Portfolio Dashboard</h1><p>On-chain balances read directly from Sonic mainnet.</p></div>{account && <button onClick={() => readPortfolio(account)} disabled={loading}><RefreshCw className={loading ? 'spin' : ''}/> Refresh</button>}</header>
    {error && <div className="portfolio-error">{error}</div>}
    <section className="portfolio-summary"><div><span>CONNECTED WALLET</span><strong>{account ? `${account.slice(0,8)}…${account.slice(-6)}` : 'Not connected'}</strong></div><div><span>SONIC BALANCE</span><strong>{Number(nativeBalance).toLocaleString(undefined,{maximumFractionDigits:4})} S</strong></div><div><span>INDEXED CONTRACTS</span><strong>{TOKENS.length}</strong></div></section>
    <section className="portfolio-table"><div className="portfolio-row head"><span>Asset</span><span>Contract</span><span>Wallet balance</span><span>Read</span></div>{positions.length ? positions.map((position) => <div className="portfolio-row" key={position.symbol}><span><i><img src={position.icon} alt="" /></i><b>{position.symbol}<small>{position.name}</small></b></span><code>{position.address.slice(0,8)}…{position.address.slice(-6)}</code><strong>{Number(position.balance).toLocaleString(undefined,{maximumFractionDigits:4})}</strong><em className={position.ok ? 'ok' : 'failed'}>{position.ok ? 'LIVE' : 'FAILED'}</em></div>) : <div className="portfolio-empty"><Wallet/><b>Connect your wallet from the top bar</b><span>No sample balances or fabricated USD values are shown.</span></div>}</section>
  </div>;
}
