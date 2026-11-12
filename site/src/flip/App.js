import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

/*
// Sonic configuration
const SONIC_NETWORK = {
  chainId: '0xDEDE', // 146 in decimal
  chainName: 'Sonic',
  nativeCurrency: {
    name: 'Sonic',
    symbol: 'S',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.blaze.soniclabs.com'],
  blockExplorerUrls: ['https://testnet.soniclabs.com'],
};

// Helper function to check if on Sonic Blaze
const isSonicNetwork = (chainId) => {
  return chainId === SONIC_NETWORK.chainId || chainId === '0xDEDE' || chainId === '0xdede' || chainId === 146;
};

// Contract addresses
const CONTRACT_ADDRESS = "0xeFc9DB4c72be0bA3C2477A72a9364EDF8943ce44";
const STS_ADDRESS = "0xBbe049D0217eC2611a0EAE2f8B57a84ba4390208";
const EX_ADDRESS = "0xf4622B72Cb73EC934d3eBaC36FCcd6D012Db8E96";
const xEX_ADDRESS = "0x56FAfE25daAe245728628c651785AfbC86f262CD";
const WS_ADDRESS = "0xAb0a81a8B6DEc7F0A08542BBF7dc37C34Cbe2215";
const VRF_COORDINATOR = "0x6E3efcB244e74Cb898A7961061fAA43C3cf79691";

*/

const SONIC_NETWORK = {
  chainId: '0x92',
  chainName: 'Sonic',
  nativeCurrency: {
    name: 'Sonic',
    symbol: 'S',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.soniclabs.com'],
  blockExplorerUrls: ['https://sonicscan.org'],
};

// Helper function to check if on Sonic
const isSonicNetwork = (chainId) => {
  return chainId === SONIC_NETWORK.chainId || chainId === '0x92' || chainId === 146;
};

// Contract addresses
const CONTRACT_ADDRESS = "0x1f5D727ca8A796D32F04321D339bF473E9d50f4A";
const STS_ADDRESS = "0xE5DA20F15420aD15DE0fa650600aFc998bbE3955";
const EX_ADDRESS = "0xd4d197F3397C8F28f4BC2C698104CfbCC3e04802";
const xEX_ADDRESS = "0x13a67513c56c9E90D09d4163d233DaD819c2FC87";
const WS_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
const VRF_COORDINATOR = "0x6E3efcB244e74Cb898A7961061fAA43C3cf79691";

// Contract ABI (simplified)
const CONTRACT_ABI = [
  "function flip(uint256 wager, uint256 wagerType, uint256 choice) external payable returns (uint256)",
  "function getRequestPrice() external view returns (uint256)",
  "function getRequestStatus(uint256 requestId) external view returns (bool, bool, address, uint256, address, uint256, uint256, uint256, uint256, uint256, uint256[])",
  "function getMaxAllowedWager(uint256 wagerType) external view returns (uint256)",
  "function getHouseBalance(uint256 wagerType) external view returns (uint256)",
  "function paused() external view returns (bool)",
  "event RandomnessRequested(uint256 indexed requestId, address indexed requester, uint256 numWords, uint256 wager, uint256 wagerType, uint256 choice, uint256 timestamp, bool paidFromContract)",
  "event CoinFlip(uint256 indexed requestId, address indexed requester, uint256 choice, uint256 result, uint256 wager, uint256 wagerType, uint256 payout, bool won)",
  "function MIN_BET() external view returns (uint256)",
  "function WIN_MULTIPLIER() external view returns (uint256)",
  "function MAX_HOUSE_EXPOSURE() external view returns (uint256)",
  "function WAGER_TYPE_NATIVE() external view returns (uint256)",
  "function WAGER_TYPE_stS() external view returns (uint256)",
  "function WAGER_TYPE_wS() external view returns (uint256)",
  "function WAGER_TYPE_EX() external view returns (uint256)",
  "function WAGER_TYPE_xEX() external view returns (uint256)"
];

// Token ABI (ERC20)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Minimum house balance threshold (500 tokens)
const MIN_HOUSE_BALANCE_THRESHOLD = ethers.parseUnits("500", 18);

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [network, setNetwork] = useState('');
  
  // Game state
  const [wagerAmount, setWagerAmount] = useState('0.1');
  const [wagerType, setWagerType] = useState(0);
  const [choice, setChoice] = useState(0);
  const [requestPrice, setRequestPrice] = useState('0');
  const [maxWager, setMaxWager] = useState('0');
  const [houseBalance, setHouseBalance] = useState('0');
  const [isPaused, setIsPaused] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tokenBalances, setTokenBalances] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Market availability state
  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);

  // Token info
  const tokenInfo = {
    0: { name: 'SONIC', address: null, symbol: 'S', decimals: 18 },
    1: { name: 'stS', address: STS_ADDRESS, symbol: 'STS', decimals: 18 },
    2: { name: 'wS', address: WS_ADDRESS, symbol: 'WS', decimals: 18 },
    3: { name: 'EX', address: EX_ADDRESS, symbol: 'EX', decimals: 18 },
    4: { name: 'xEX', address: xEX_ADDRESS, symbol: 'XEX', decimals: 18 }
  };

  // Market reads must work before a wallet is connected. Hydrate wallet state
  // separately so the shared shell button is the only connection control.
  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const readProvider = new ethers.JsonRpcProvider(SONIC_NETWORK.rpcUrls[0]);
      const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
      if (active) {
        setContract(readContract);
        loadContractData(readContract);
      }

      if (!window.ethereum) return;
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      if (active) setProvider(browserProvider);
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts?.[0] && active) {
        setAccount(accounts[0]);
        const walletSigner = await browserProvider.getSigner();
        setSigner(walletSigner);
      }
    };

    const hydrateConnectedWallet = async () => {
      if (!window.ethereum) return;
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts?.[0]) return;
      setProvider(browserProvider);
      setAccount(accounts[0]);
      setSigner(await browserProvider.getSigner());
    };

    initialize().catch((error) => {
      console.error('Failed to initialize Redshift markets:', error);
      setLoadingMarkets(false);
    });
    window.ethereum?.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum?.on?.('chainChanged', handleChainChanged);
    window.addEventListener('hubble:wallet-connected', hydrateConnectedWallet);

    return () => {
      active = false;
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      window.removeEventListener('hubble:wallet-connected', hydrateConnectedWallet);
    };
  }, []);

  // Initialize contract when signer changes
  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(gameContract);
      loadContractData(gameContract);
    }
  }, [signer]);

  // Load user data when account changes
  useEffect(() => {
    if (account && provider) {
      loadUserData();
      loadTokenBalances();
    }
  }, [account, provider]);

  // Monitor network status periodically and on mount
  useEffect(() => {
    if (!window.ethereum || !account) return;

    const checkNetworkStatus = async () => {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Network check - Chain ID:', chainId);
        
        if (isSonicNetwork(chainId)) {
          setNetwork('Sonic');
        } else {
          setNetwork('Wrong Network');
        }
      } catch (error) {
        console.error('Error checking network status:', error);
      }
    };

    // Check immediately
    checkNetworkStatus();

    // Listen for network changes
    const handleChainChanged = (chainId) => {
      console.log('Chain changed detected:', chainId);
      checkNetworkStatus();
      window.location.reload();
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  // Update wager type if current one becomes unavailable
  useEffect(() => {
    if (availableMarkets.length > 0 && !isMarketAvailable(wagerType) && contract) {
      const firstAvailable = availableMarkets.find(m => m.available);
      if (firstAvailable) {
        setWagerType(firstAvailable.type);
        updateMarketData(firstAvailable.type);
        toast.info(`Switched to ${tokenInfo[firstAvailable.type].symbol} market`);
      }
    }
  }, [availableMarkets]);

  const checkNetwork = async () => {
    if (!window.ethereum) {
      console.error('No ethereum provider found');
      return false;
    }
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('checkNetwork - Current chain ID:', chainId);
      
      const isCorrectNetwork = isSonicNetwork(chainId);
      
      if (isCorrectNetwork) {
        setNetwork('Sonic');
        console.log('Network status updated to: Sonic');
      } else {
        setNetwork('Wrong Network');
        console.log('Network status updated to: Wrong Network');
      }
      
      return isCorrectNetwork;
    } catch (error) {
      console.error('Error checking network:', error);
      setNetwork('Error checking network');
      return false;
    }
  };

  const handleChainChanged = (chainId) => {
    window.location.reload();
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount('');
      setSigner(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  // Helper function to check if a market is available
  const isMarketAvailable = (marketType) => {
    const market = availableMarkets.find(m => m.type === marketType);
    return market ? market.available : false;
  };

  // Update market data for a specific wager type
  const updateMarketData = async (type) => {
    if (!contract) return;
    
    try {
      const max = await contract.getMaxAllowedWager(type);
      setMaxWager(ethers.formatEther(max));
      
      const house = await contract.getHouseBalance(type);
      setHouseBalance(ethers.formatEther(house));
    } catch (error) {
      console.error('Error updating market data:', error);
    }
  };

  // Auto-switch to Sonic
  const switchToSonicBlaze = async () => {
    try {
      // Check current network first
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      console.log('Switch - Current chain ID:', currentChainId);
      
      // If already on Sonic Blaze, update state and return true
      if (isSonicNetwork(currentChainId)) {
        console.log('Already on Sonic');
        setNetwork('Sonic');
        return true;
      }
      
      // Try to switch network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SONIC_NETWORK.chainId }],
        });
        console.log('Switched to Sonic');
        setNetwork('Sonic');
        return true;
      } catch (switchError) {
        // Chain not added to wallet (error code 4902)
        if (switchError.code === 4902) {
          try {
            // Add Sonic to wallet
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [SONIC_NETWORK],
            });
            console.log('Sonic added to wallet');
            setNetwork('Sonic');
            return true;
          } catch (addError) {
            console.error('Failed to add Sonic Blaze:', addError);
            toast.error('Failed to add Sonic to wallet. Please add it manually.');
            return false;
          }
        } else if (switchError.code === 4001) {
          console.log('User rejected network switch');
          toast.info('Please switch to Sonic to use this dApp');
          return false;
        } else {
          console.error('Failed to switch network:', switchError);
          return false;
        }
      }
    } catch (error) {
      console.error('Network switch error:', error);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask!');
        return;
      }

      // Request account access first
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        
        // Get provider and signer
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(address);
        
        // Now check and handle network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Current chain ID after connection:', chainId);
        
        // Check if already on Sonic Blaze
        if (isSonicNetwork(chainId)) {
          setNetwork('Sonic');
          toast.success('Wallet connected!');
        } else {
          // Not on Sonic Blaze, try to switch
          const switched = await switchToSonicBlaze();
          if (switched) {
            setNetwork('Sonic');
            toast.success('Wallet connected and network switched!');
          } else {
            // User might have rejected network switch
            setNetwork('Wrong Network');
            toast.warning('Connected but on wrong network. Please switch to Sonic Blaze.');
          }
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Please connect your wallet to continue');
      } else {
        toast.error('Failed to connect wallet');
      }
    }
  };

  const loadContractData = async (contractInstance) => {
    try {
      setLoadingMarkets(true);

      const [price, max, house, paused, ...marketBalances] = await Promise.all([
        contractInstance.getRequestPrice(),
        contractInstance.getMaxAllowedWager(wagerType),
        contractInstance.getHouseBalance(wagerType),
        contractInstance.paused(),
        ...Array.from({ length: 5 }, (_, type) => contractInstance.getHouseBalance(type))
      ]);
      setRequestPrice(ethers.formatEther(price));
      setMaxWager(ethers.formatEther(max));
      setHouseBalance(ethers.formatEther(house));
      setIsPaused(paused);

      const marketStatuses = marketBalances.map((marketBalance, type) => ({
        type,
        available: marketBalance >= MIN_HOUSE_BALANCE_THRESHOLD,
        balance: ethers.formatEther(marketBalance)
      }));
      setAvailableMarkets(marketStatuses);
      
    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const loadUserData = async () => {
    try {
      if (!provider) return;
      
      const balance = await provider.getBalance(account);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTokenBalances = async () => {
    if (!account || !provider) return;
    
    const balances = {};
    
    try {
      for (const [type, info] of Object.entries(tokenInfo)) {
        if (type === '0') continue;
        
        if (info.address) {
          const tokenContract = new ethers.Contract(info.address, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(account);
          const decimals = await tokenContract.decimals();
          balances[type] = ethers.formatUnits(balance, decimals);
        }
      }
      
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error loading token balances:', error);
    }
  };

  const approveToken = async () => {
    if (!signer || wagerType === 0) return;
    
    try {
      setIsApproving(true);
      const token = tokenInfo[wagerType];
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
      
      const amount = ethers.parseEther(wagerAmount);
      
      const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
      
      if (allowance < amount) {
        const tx = await tokenContract.approve(CONTRACT_ADDRESS, amount);
        toast.info('Approving tokens...');
        await tx.wait();
        toast.success('Tokens approved!');
      } else {
        toast.info('Already approved');
      }
    } catch (error) {
      console.error('Error approving token:', error);
      toast.error('Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const flipCoin = async () => {
    // Check network before proceeding
    const isCorrectNetwork = await checkNetwork();
    if (!isCorrectNetwork) {
      toast.error('Please switch to Sonic');
      return;
    }
    
    // Check if current market is available
    if (!isMarketAvailable(wagerType)) {
      toast.error('This market is currently unavailable (insufficient house balance)');
      return;
    }
    
    if (!contract || !signer || isPaused) {
      toast.error('Contract not ready or paused');
      return;
    }
    
    try {
      setIsFlipping(true);
      
      const wagerWei = ethers.parseEther(wagerAmount);
      const priceWei = await contract.getRequestPrice();
      
      // FIX: VRF fee is ALWAYS required in native SONIC
      // For ERC20 tokens, we still need to send the VRF fee as msg.value
      const totalValue = wagerType === 0 ? wagerWei + priceWei : priceWei;
      
      // Additional check for ERC20 tokens
      if (wagerType !== 0) {
        // Verify the user has enough SONIC for the VRF fee
        const userBalanceWei = await provider.getBalance(account);
        if (userBalanceWei < priceWei) {
          toast.error(`Insufficient SONIC for VRF fee. Need ${ethers.formatEther(priceWei)} S`);
          setIsFlipping(false);
          return;
        }
        
        // Verify token allowance (for ERC20 wager)
        const token = tokenInfo[wagerType];
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
        
        if (allowance < wagerWei) {
          toast.error(`Please approve ${token.symbol} tokens first`);
          setIsFlipping(false);
          return;
        }
      }
      
      // For SONIC (wagerType 0), also check user has enough for wager + fee
      if (wagerType === 0) {
        const userBalanceWei = await provider.getBalance(account);
        if (userBalanceWei < totalValue) {
          toast.error(`Insufficient SONIC balance. Need ${ethers.formatEther(totalValue)} S`);
          setIsFlipping(false);
          return;
        }
      }
      
      const tx = await contract.flip(wagerWei, wagerType, choice, {
        value: totalValue  // Always includes VRF fee, plus wager if SONIC
      });
      
      toast.info('Transaction sent. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      let requestId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'RandomnessRequested') {
            requestId = parsedLog.args.requestId;
            break;
          }
        } catch (e) {}
      }
      
      if (requestId) {
        toast.success(`Coin flip requested! Request ID: ${requestId.toString()}`);
        setPendingRequests(prev => [...prev, requestId.toString()]);
        pollRequestStatus(requestId);
      } else {
        toast.success('Coin flip requested! Waiting for VRF...');
      }
      
      await loadContractData(contract);
      await loadUserData();
      await loadTokenBalances();
      
    } catch (error) {
      console.error('Error flipping coin:', error);
      toast.error(error.reason || error.message || 'Transaction failed');
    } finally {
      setIsFlipping(false);
    }
  };

  const pollRequestStatus = async (requestId) => {
    if (!contract) return;
    
    const interval = setInterval(async () => {
      try {
        const status = await contract.getRequestStatus(requestId);
        const [exists, fulfilled, requester, , , , , r] = status;
        
        const result = Number(r)
        console.log("Result:", result, "Choice:", choice); 
        if (fulfilled) {
          clearInterval(interval);
          
          const won = Number(result) === choice;
          
          if (won) {
            toast.success(`🎉 You won! Result: ${result === 0 ? 'Heads' : 'Tails'}`);
          } else {
            toast.error(`😞 You lost. Result: ${result === 0 ? 'Heads' : 'Tails'}`);
          }
          
          setPendingRequests(prev => prev.filter(id => id !== requestId.toString()));
          await updateMarketData(wagerType);
          await loadUserData();
          await loadTokenBalances();
        }
      } catch (error) {
        console.error('Error polling request:', error);
        clearInterval(interval);
      }
    }, 5000);
    
    setTimeout(() => {
      clearInterval(interval);
      setPendingRequests(prev => prev.filter(id => id !== requestId.toString()));
      toast.info('Request polling timeout. Check your request status manually.');
    }, 300000);
  };

  const checkRequestStatus = async (requestId) => {
    if (!contract) return;
    
    try {
      const status = await contract.getRequestStatus(requestId);
      console.log(status)
      const [exists, fulfilled, , , , , , result] = status;
      console.log("exists:", exists);
      if (!exists) {
        toast.error('Request not found');
        return;
      }
      
      if (fulfilled) {
        toast.info(`Request fulfilled. Result: ${result === 0 ? 'Heads' : 'Tails'}`);
      } else {
        toast.info('Request still pending VRF...');
      }
    } catch (error) {
      console.error('Error checking request:', error);
      toast.error('Failed to check request status');
    }
  };

  const handleWagerTypeChange = async (e) => {
    const newType = parseInt(e.target.value);
    
    // Check if this market is available
    const marketInfo = availableMarkets.find(m => m.type === newType);
    if (marketInfo && !marketInfo.available) {
      toast.error(`This market has insufficient house balance (${parseFloat(marketInfo.balance).toFixed(0)} tokens)`);
      return;
    }
    
    setWagerType(newType);
    
    if (contract) {
      await updateMarketData(newType);
    }
  };

  const getTokenBalance = (type) => {
    if (type === 0) {
      return balance;
    }
    return tokenBalances[type] || '0';
  };

  // Manual switch network button handler
  const handleSwitchNetwork = async () => {
    const switched = await switchToSonicBlaze();
    if (switched) {
      await checkNetwork();
    }
  };

  // Count available markets
  const availableMarketsCount = availableMarkets.filter(m => m.available).length;

  return (
    <div className="app">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <header className="header">
        <h1>HubbleRedshift.Flip</h1>
        <div className="wallet-section">
          {account ? (
            <>
              <div className="account-info">
                <span className={`network ${network === 'Wrong Network' ? 'network-warning' : ''}`}>
                  {network}
                </span>
                <button 
                  className="btn small"
                  onClick={checkNetwork}
                  style={{marginLeft: '10px', padding: '5px 10px', fontSize: '12px'}}
                >
                  Check Network
                </button>
                <span className="address">{account.slice(0, 6)}...{account.slice(-4)}</span>
                <span className="balance">{parseFloat(balance).toFixed(4)} S</span>
              </div>
              {network === 'Wrong Network' && (
                <button className="btn switch-network" onClick={handleSwitchNetwork}>
                  Switch to Sonic Blaze
                </button>
              )}
              <button className="btn disconnect" onClick={() => window.location.reload()}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn connect" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {network === 'Wrong Network' && (
          <div className="warning-banner">
            ⚠️ Please switch to Sonic (Chain ID: 146) to use this dApp
          </div>
        )}

        {isPaused && (
          <div className="warning-banner">
            ⚠️ Contract is currently paused. No new flips can be made.
          </div>
        )}

        {loadingMarkets && (
          <div className="info-banner">
            ⏳ Loading market data...
          </div>
        )}

        <div className="game-container">
          <div className="game-card">
            <h2>Flip a Coin</h2>
            
            <div className="form-group">
              <label>Wager Amount:</label>
              <div className="input-group">
                <input
                  type="number"
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(e.target.value)}
                  min="0.1"
                  step="0.1"
                  disabled={isPaused || network === 'Wrong Network' || !isMarketAvailable(wagerType)}
                />
                <span className="token-symbol">{tokenInfo[wagerType].symbol}</span>
              </div>
              <div className="balance-info">
                Your balance: {parseFloat(getTokenBalance(wagerType)).toFixed(4)} {tokenInfo[wagerType].symbol}
              </div>
            </div>

            <div className="form-group">
              <label>Wager Type:</label>
              {loadingMarkets ? (
                <div className="loading-markets">Loading markets...</div>
              ) : (
                <>
                  <select 
                    value={wagerType} 
                    onChange={handleWagerTypeChange}
                    disabled={isPaused || network === 'Wrong Network' || availableMarketsCount === 0}
                  >
                    {availableMarkets.map(market => (
                      market.available ? (
                        <option key={market.type} value={market.type}>
                          {tokenInfo[market.type].symbol} ({parseFloat(market.balance).toFixed(0)} available)
                        </option>
                      ) : null
                    ))}
                  </select>
                  {availableMarketsCount === 0 && (
                    <div className="warning-text">
                      ⚠️ No markets available (all have less than 500 token house balance)
                    </div>
                  )}
                  {availableMarketsCount > 0 && (
                    <div className="market-info">
                      {availableMarketsCount} market{availableMarketsCount !== 1 ? 's' : ''} available
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label>Choose Side:</label>
              <div className="choice-buttons">
                <button 
                  className={`choice-btn ${choice === 0 ? 'active' : ''}`}
                  onClick={() => setChoice(0)}
                  disabled={isPaused || network === 'Wrong Network' || !isMarketAvailable(wagerType)}
                >
                  🪙 Heads
                </button>
                <button 
                  className={`choice-btn ${choice === 1 ? 'active' : ''}`}
                  onClick={() => setChoice(1)}
                  disabled={isPaused || network === 'Wrong Network' || !isMarketAvailable(wagerType)}
                >
                  🪙 Tails
                </button>
              </div>
            </div>

            <div className="info-box">
              <div>VRF Request Fee: {requestPrice} S</div>
              <div>Max Allowed Wager: {parseFloat(maxWager).toFixed(4)} {tokenInfo[wagerType].symbol}</div>
              <div style={{ 
                color: parseFloat(houseBalance) < 500 ? 'orange' : 'inherit',
                fontWeight: parseFloat(houseBalance) < 500 ? 'bold' : 'normal'
              }}>
                House Balance: {parseFloat(houseBalance).toFixed(4)} {tokenInfo[wagerType].symbol}
                {parseFloat(houseBalance) < 500 && ' ⚠️'}
              </div>
              <div>Payout: 2x (minus 1% fee on win)</div>
              {!isMarketAvailable(wagerType) && (
                <div className="market-unavailable">
                  ⚠️ This market has insufficient house balance (&lt; 500 tokens)
                </div>
              )}
            </div>

            <div className="action-buttons">
              {wagerType !== 0 && (
                <button 
                  className="btn approve"
                  onClick={approveToken}
                  disabled={
                    isApproving || 
                    isPaused || 
                    network === 'Wrong Network' || 
                    !isMarketAvailable(wagerType)
                  }
                >
                  {isApproving ? 'Approving...' : `Approve ${tokenInfo[wagerType].symbol}`}
                </button>
              )}
              
              <button 
                className="btn flip"
                onClick={flipCoin}
                disabled={
                  isFlipping || 
                  isPaused || 
                  !account || 
                  network === 'Wrong Network' ||
                  !isMarketAvailable(wagerType)
                }
              >
                {isFlipping ? 'Processing...' : 
                 !isMarketAvailable(wagerType) ? 'Market Unavailable' : 'Flip Coin!'}
              </button>
            </div>
          </div>

          <div className="stats-card">
            <h2>Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <p className="no-requests">No pending requests</p>
            ) : (
              <div className="requests-list">
                {pendingRequests.map(requestId => (
                  <div key={requestId} className="request-item">
                    <span>Request ID: {requestId.slice(0, 10)}...</span>
                    <button 
                      className="btn small"
                      onClick={() => checkRequestStatus(requestId)}
                    >
                      Check Status
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <h2>Token Balances</h2>
            <div className="balances-list">
              {Object.entries(tokenInfo).map(([type, info]) => (
                <div key={type} className="balance-item">
                  <span>{info.symbol}:</span>
                  <span>{(info.symbol == "S") ? parseFloat(balance).toFixed(4): parseFloat(getTokenBalance(type)).toFixed(4)}</span>
                </div>
              ))}
            </div>
              <br/>
            <h2>Market Status</h2>
            <div className="market-status">
              {availableMarkets.map(market => (
                <div key={market.type} className={`market-item ${market.available ? 'available' : 'unavailable'}`}>
                  <span>{tokenInfo[market.type].symbol}:</span>
           
                  <span className="status-indicator">
                    {market.available ? ' Open ✅' : ' Closed ❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="instructions">
          <h3>How to Play:</h3>
          <ol>
            <li>Connect your wallet (will auto-switch to Sonic)</li>
            <li>Select wager amount and token type (only markets with 500+ token house balance are shown)</li>
            <li>Choose Heads or Tails</li>
            <li>Approve token spending (if using ERC20 tokens)</li>
            <li>Click "Flip Coin!" and confirm transaction</li>
            <li>Wait for VRF to generate randomness</li>
            <li>Win/Lose + Roll Again!</li>
          </ol>
          <p className="note">
            Note: Each flip requires payment for Paintswap VRF gas fees.
            House max exposure is 0.5% of house balance per bet.
            Markets with less than 500 token house balance are disabled.
          </p>
        </div>
      </main>

      <footer className="footer">
        <p>Hubble Redshift Coin Flip DApp | Sonic (Chain ID: 146)</p>
        <p>
          Contract Address: {CONTRACT_ADDRESS ? 
            `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}` : 
            'Not deployed yet'}
        </p>
      </footer>
    </div>
  );
}

export default App;
