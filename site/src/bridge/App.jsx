import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Contract addresses
const XHUBBLE_ADDRESS = '0x14D1Db2367312Ee3BBA54905b64f3bf0f0D677A8';
const TXHUB_ADDRESS = '0x6bdF418B62206A215937E816Da37996462C71548'; // Replace with your deployed txHUB contract address

// ABI for xHUBBLE (ERC20 standard functions)
const XHUBBLE_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ABI for txHUB contract
const TXHUB_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalAssets() external view returns (uint256)",
  "function xHUBBLE() external view returns (address)"
];

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [xHubbleBalance, setXHubbleBalance] = useState('0');
  const [txHubBalance, setTxHubBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize provider and connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        
        const web3Signer = await web3Provider.getSigner();
        setSigner(web3Signer);
        
        const userAddress = await web3Signer.getAddress();
        setAccount(userAddress);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            window.location.reload();
          } else {
            setAccount('');
            setProvider(null);
            setSigner(null);
          }
        });
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet: ' + error.message);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Load balances and allowance
  const loadBalances = async () => {
    if (!signer || !account) return;

    try {
      const xHubbleContract = new ethers.Contract(XHUBBLE_ADDRESS, XHUBBLE_ABI, signer);
      const txHubContract = new ethers.Contract(TXHUB_ADDRESS, TXHUB_ABI, signer);

      // Get xHUBBLE balance
      const xBalance = await xHubbleContract.balanceOf(account);
      setXHubbleBalance(ethers.formatUnits(xBalance, 18));

      // Get txHUB balance
      const txBalance = await txHubContract.balanceOf(account);
      setTxHubBalance(ethers.formatUnits(txBalance, 18));

      // Get allowance
      const currentAllowance = await xHubbleContract.allowance(account, TXHUB_ADDRESS);
      setAllowance(ethers.formatUnits(currentAllowance, 18));
      
      // Check if approved for current amount
      if (amount) {
        const amountWei = ethers.parseUnits(amount, 18);
        setIsApproved(currentAllowance >= amountWei);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  // Approve xHUBBLE spending
  const approveSpending = async () => {
    if (!signer || !amount) {
      alert('Please connect wallet and enter an amount');
      return;
    }

    setLoading(true);
    try {
      const xHubbleContract = new ethers.Contract(XHUBBLE_ADDRESS, XHUBBLE_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 18);

      const tx = await xHubbleContract.approve(TXHUB_ADDRESS, amountWei);
      await tx.wait();
      
      alert('Approval successful!');
      await loadBalances();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Error approving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Deposit xHUBBLE
  const deposit = async () => {
    if (!signer || !amount) {
      alert('Please connect wallet and enter an amount');
      return;
    }

    setLoading(true);
    try {
      const txHubContract = new ethers.Contract(TXHUB_ADDRESS, TXHUB_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 18);

      const tx = await txHubContract.deposit(amountWei);
      await tx.wait();
      
      alert('Deposit successful!');
      setAmount('');
      await loadBalances();
    } catch (error) {
      console.error('Error depositing:', error);
      alert('Error depositing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw txHUB
  const withdraw = async () => {
    if (!signer || !amount) {
      alert('Please connect wallet and enter an amount');
      return;
    }

    setLoading(true);
    try {
      const txHubContract = new ethers.Contract(TXHUB_ADDRESS, TXHUB_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 18);

      const tx = await txHubContract.withdraw(amountWei);
      await tx.wait();
      
      alert('Withdrawal successful!');
      setAmount('');
      await loadBalances();
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('Error withdrawing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load balances when account or amount changes
  useEffect(() => {
    loadBalances();
  }, [account, amount]);

  return (
    <div className="App">
      <header className="app-header">
        <h1>txHUB Bridge</h1>
        <p>Convert between xHUBBLE and txHUB</p>
        
        {!account ? (
          <button className="connect-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
            <div className="balances">
              <p>xHUBBLE Balance: {xHubbleBalance}</p>
              <p>txHUB Balance: {txHubBalance}</p>
              <p>Allowance: {allowance}</p>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="tab-container">
          <button 
            className={`tab-btn ${activeTab === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveTab('deposit')}
          >
            Deposit
          </button>
          <button 
            className={`tab-btn ${activeTab === 'withdraw' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdraw')}
          >
            Withdraw
          </button>
        </div>

        <div className="form-container">
          {activeTab === 'deposit' ? (
            <div className="deposit-tab">
              <h2>Deposit xHUBBLE to get txHUB</h2>
              <div className="input-group">
                <label>Amount:</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={loading}
                />
              </div>
              
              <div className="button-group">
                {!isApproved && (
                  <button 
                    className="action-btn approve-btn"
                    onClick={approveSpending}
                    disabled={loading || !amount}
                  >
                    {loading ? 'Approving...' : 'Approve'}
                  </button>
                )}
                <button 
                  className="action-btn deposit-btn"
                  onClick={deposit}
                  disabled={loading || !amount || !isApproved}
                >
                  {loading ? 'Depositing...' : 'Deposit'}
                </button>
              </div>
            </div>
          ) : (
            <div className="withdraw-tab">
              <h2>Withdraw txHUB to get xHUBBLE</h2>
              <div className="input-group">
                <label>Amount:</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={loading}
                />
              </div>
              
              <button 
                className="action-btn withdraw-btn"
                onClick={withdraw}
                disabled={loading || !amount}
              >
                {loading ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
