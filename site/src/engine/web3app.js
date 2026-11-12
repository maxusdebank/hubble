import { ConnectButton } from '@rainbow-me/rainbowkit'
import React from 'react'
import Web3 from 'web3'
import {
	useAccount,
	useChainId,
  	usePrepareTransactionRequest,
  	useSendTransaction,
  	useWaitForTransactionReceipt,
} from 'wagmi'
import { parseEther } from 'viem'
import { config } from './config'

import dd from './imgs/h-icon.png'
import pend from './imgs/pending.gif'
import bg from './imgs/bg.gif'
import planet from './imgs/planet.png'
import { EpochABI } from './EpochAbi.js'

const getTransactionReceipt = (hash, callback= ()=>{}) => {
    console.log(hash)
    window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [hash]
    }).then((res)=>{
      if (res == null) {
        getTransactionReceipt(hash, callback)
      }
      callback(res)
    }).catch((err)=>{
      console.log(err)
    })
  }

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.soniclabs.com'));

// Contract Addresses
const ESC_TOKEN_ADDRESS = '0xa8116b0616e3657696dBDC8D202048f7b93457F7';
const EXCHANGE_CONTRACT_ADDRESS = '0xED3414F25F5E692cC9Ed4B0fd2b9E68D7B9092E5';
const EPOCHS_ADDRESS = '0xacFe02A1Ad557Af0818963eDf48BfccE34f27a62';
const ORACLE_ADDRESS = '0x4B027fA9d8E0e0863447498150278FC8aa888a83';
const MISSION_CONTROL_REWARDS_ADDRESS = '0xEE8bb129469fCaf54F33b118366cD3037f851Ac2';

// Token Addresses
const XEX_TOKEN_ADDRESS = '0x13a67513c56c9e90d09d4163d233dad819c2fc87';
const XHUBBLE_TOKEN_ADDRESS = '0x14D1Db2367312Ee3BBA54905b64f3bf0f0D677A8';

// ERC20 ABI (minimal for balance, allowance, approve)
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "_owner", "type": "address"},
      {"name": "_spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "remaining", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "success", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
];

// ESC Redemption Contract ABI
const ESC_REDEMPTION_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_escTokenAddress", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "FundsDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "FundsWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": false, "internalType": "uint256", "name": "newRate", "type": "uint256"}],
    "name": "ExchangeRateUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "escAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "sonicAmount", "type": "uint256"}
    ],
    "name": "Redeemed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DEAD_ADDRESS",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentExchangeRate",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "escToken",
    "outputs": [{"internalType": "contract IESCToken", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCirculatingSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getESCTotalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "escAmount", "type": "uint256"}],
    "name": "redeem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "depositFunds",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "withdrawFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "tokenAddress", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "recoverERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

export function Web3App (props) {
	const [cost, setCost] = React.useState(100)  
	const [pending, setIsPending] = React.useState(false)
	const [pendingText, setPendingText] = React.useState("Transaction is in process") 
	const { address, isConnected } = useAccount()
	const chainId  = useChainId()

	const [networkConfig, setNetworkConfig] = React.useState(config["mainnet"])
	
	const oracle = new web3.eth.Contract(
		networkConfig["exoracle"]["abi"], 
		networkConfig["exoracle"]["address"])
	const epochs = new web3.eth.Contract(
		EpochABI, 
		EPOCHS_ADDRESS)
	
	// ESC Token and Redemption contracts
	const escToken = new web3.eth.Contract(ERC20_ABI, ESC_TOKEN_ADDRESS);
	const redemptionContract = new web3.eth.Contract(ESC_REDEMPTION_ABI, EXCHANGE_CONTRACT_ADDRESS);
	
	// Token contracts
	const xexToken = new web3.eth.Contract(ERC20_ABI, XEX_TOKEN_ADDRESS);
	const xhubbleToken = new web3.eth.Contract(ERC20_ABI, XHUBBLE_TOKEN_ADDRESS);

	const [activeStep, setActiveStep] = React.useState(1)
	const [isReadyToPull, setIsReadyToPull] = React.useState(false)
	const [isReadyToCalc, setIsReadyToCalc] = React.useState(false)
	const [timeToPull, setTimeToPull] = React.useState(15 * 60)
	const [timeToCalc, setTimeToCalc] = React.useState(15 * 60)
	const [lastPullTimestamp, setLastPullTimestamp] = React.useState(0)
	const [lastCalcTimestamp, setLastCalcTimestamp] = React.useState(0)

	// ESC Token State
	const [escBalance, setEscBalance] = React.useState('0')
	const [escAllowance, setEscAllowance] = React.useState('0')
	const [escAmount, setEscAmount] = React.useState('')
	const [sonicAmount, setSonicAmount] = React.useState('')
	const [exchangeRate, setExchangeRate] = React.useState('0')
	const [contractBalance, setContractBalance] = React.useState('0')
	const [circulatingSupply, setCirculatingSupply] = React.useState('0')

	// Epoch State
	const [currentEpochStartTimestamp, setCurrentEpochStartTimestamp] = React.useState(0)
	const [timeUntilFlip, setTimeUntilFlip] = React.useState(0)
	const [isReadyToFlip, setIsReadyToFlip] = React.useState(false)

	// Balance Check State
	const [epochsSonicBalance, setEpochsSonicBalance] = React.useState('0')
	const [oracleSonicBalance, setOracleSonicBalance] = React.useState('0')
	const [missionControlXexBalance, setMissionControlXexBalance] = React.useState('0')
	const [missionControlXhubbleBalance, setMissionControlXhubbleBalance] = React.useState('0')
	const [xexTokenInfo, setXexTokenInfo] = React.useState({ name: '', symbol: '', decimals: 18 })
	const [xhubbleTokenInfo, setXhubbleTokenInfo] = React.useState({ name: '', symbol: '', decimals: 18 })
	const [isLoadingBalances, setIsLoadingBalances] = React.useState(false)

	  React.useEffect(
	  	() => {
	  		if (isConnected) {
	  			// Load ESC token data when connected
	  			loadEscData();
	  			// Load epoch data
	  			loadEpochData();
	  			// Load balance check data
	  			loadBalanceCheckData();
	  		}
	  	},
	  	[isConnected]
	  	)
	  
	React.useEffect(()=>{
		if (activeStep == 2) {
			
		} else if (activeStep == 4) {
		
		}
		else if (activeStep == 5) {
		
			
		
		
		}
		else if (activeStep == 3) {
	

			
		} else if (activeStep == 1) {
			oracle_lastPullTimestamp(()=>{
				oracle_lastCalcTimestamp(()=>{
					loadEpochData(); // Load epoch data when on step 1
				})
			})
	  		
		} else if (activeStep == 6) {
			// Load ESC data when on the exchange step
			if (isConnected) {
				loadEscData();
			}
		} else if (activeStep == 7) {
			// Load exchange rate when on redemption step
			loadRedemptionData();
		} else if (activeStep == 8) {
			// Load balance check data when on balance check step
			if (isConnected) {
				loadBalanceCheckData();
			}
		}
			
	},[activeStep])
	
	// Update sonic amount when escAmount changes
	React.useEffect(() => {
		if (escAmount && exchangeRate !== '0') {
			calculateSonicAmount();
		} else {
			setSonicAmount('');
		}
	}, [escAmount, exchangeRate]);

const getPullStatus = ()=>{
	if (isConnected) {
		let end = Number(lastPullTimestamp) + 30*60
		let rn = Date.now()/1000
		if (rn >= end) {
			setIsReadyToPull(true)
			setTimeToPull(0)
		}
		else {
			setIsReadyToPull(false)
			setTimeToPull(end - rn)
		}
		
	}
}
React.useEffect(()=>{
	getPullStatus()
},[lastPullTimestamp])


const getCalcStatus = () => {
	if (isConnected) {
		let end = Number(lastCalcTimestamp) + 60*60
		let rn = Date.now()/1000
		if (rn >= end) {
			setIsReadyToCalc(true)
			setTimeToCalc(0)
		}
		else {
			setIsReadyToCalc(false)
			setTimeToCalc(end - rn)
		}
		
	}
}
React.useEffect(()=>{ 
	getCalcStatus()
},[lastCalcTimestamp])

	
	const estimateGas = (contract, data, callback = ()=>{}) => {
		if (typeof window.ethereum !== 'object') {
			alert("Please open this page in the Metamask browser")
		} 
		else {
			window.ethereum.request(
		        {
		          method: "eth_estimateGas",
		          params: [
		            {
		              from: address,
		              to: contract,     
		              value: web3.utils.toHex(0),
		              data: data,
		            },
		          ],
		        }
		      ).then((gasAmount)=>{
		      	console.log(gasAmount)
		        callback(gasAmount)
		      }).catch((err)=>{
		        alert(err.data.message)
		      })
		}
	}
	const sendRequest = (contract, data, callback = ()=>{}) => {
		estimateGas(
			contract,
			data,
			() => {
				setIsPending(true)
				if (typeof window.ethereum !== 'object') { 
				
				} else {
					window.ethereum.request({
						method: "eth_sendTransaction",
						params: [
						  {
						    from: address,
						    to: contract,
						    value: 0,
						    data: data,
						  },
						],}).then((hash)=>{
						  getTransactionReceipt(hash,(receipt)=>{
						    if (receipt != null) {
						      setIsPending(false)
						      callback()
						    }
						  })
						}).catch((err)=>{
						  setIsPending(false)
						})	
					}		
			}
			)
	}

const approve = (contract, spender, amount, callback = ()=>{}) => {
	let data = contract.methods.approve(spender,amount).encodeABI()
	sendRequest(
		contract.options.address,
		data,
		callback)
}

const oracle_lastPullTimestamp = (callback=()=>{})=>{
	oracle.methods.lastPullTimestamp()
		.call({from: address})
		.then((lpt)=>{
			setLastPullTimestamp(lpt)
			callback()
		})
}

const oracle_lastCalcTimestamp = (callback=()=>{})=>{
	oracle.methods.lastHourlyCalcTimestamp()
		.call({from: address})
		.then((lct)=>{
			setLastCalcTimestamp(lct)
			callback()
		})
}

const pull = (callback=()=>{})=>{
	let data = oracle.methods.pull().encodeABI()

	sendRequest(
		oracle.options.address,
		data,
		()=>{
			oracle_lastPullTimestamp()
		}
		)
}

const calc  = (callback=()=>{})=>{
	let data = oracle.methods.pull_hourly().encodeABI()

	sendRequest(
		oracle.options.address,
		data,
		()=>{
			oracle_lastCalcTimestamp()
		}
		)
}

// Epoch Functions
const loadEpochData = () => {
	if (!isConnected) return;
	
	// Get current epoch start timestamp
	epochs.methods.currentEpochStartTimestamp()
		.call({from: address})
		.then((timestamp) => {
			setCurrentEpochStartTimestamp(timestamp);
			calculateFlipTime(timestamp);
		})
		.catch(console.error);
}

const calculateFlipTime = (epochStartTimestamp) => {
	if (!epochStartTimestamp) return;
	
	const epochStart = Number(epochStartTimestamp);
	const epochDuration = 48 * 60 * 60; // 48 hours in seconds
	const epochEnd = epochStart + epochDuration;
	const currentTime = Date.now() / 1000; // Current time in seconds
	
	const timeLeft = epochEnd - currentTime;
	setTimeUntilFlip(timeLeft);
	
	if (timeLeft <= 0) {
		setIsReadyToFlip(true);
	} else {
		setIsReadyToFlip(false);
	}
}

const flipEpoch = () => {
	console.log("attempting flip") 
	setPendingText("Flipping epoch...");
	
	const data = epochs.methods.flipEpoch().encodeABI();
	
	sendRequest(
		EPOCHS_ADDRESS,
		data,
		() => {
			// Reload epoch data after flipping
			loadEpochData();
		}
	);
}

const rfr = () => {
	oracle_lastPullTimestamp(
		()=>{
			oracle_lastCalcTimestamp(() => {
				getPullStatus()
				getCalcStatus()
				loadEpochData(); // Refresh epoch data too
			})
		}
		)
}

// ESC Redemption Functions
const loadEscData = () => {
	if (!isConnected) return;
	
	// Load ESC balance
	escToken.methods.balanceOf(address)
		.call({from: address})
		.then((balance) => {
			setEscBalance(balance);
		})
		.catch(console.error);
	
	// Load ESC allowance for redemption contract
	escToken.methods.allowance(address, EXCHANGE_CONTRACT_ADDRESS)
		.call({from: address})
		.then((allowance) => {
			setEscAllowance(allowance);
		})
		.catch(console.error);
}

const loadRedemptionData = () => {
	if (!isConnected) return;
	
	// Load current exchange rate
	redemptionContract.methods.currentExchangeRate()
		.call({from: address})
		.then((rate) => {
			setExchangeRate(rate);
		})
		.catch(console.error);
	
	// Load contract balance (for information)
	web3.eth.getBalance(EXCHANGE_CONTRACT_ADDRESS)
		.then((balance) => {
			setContractBalance(balance);
		})
		.catch(console.error);
	
	// Load circulating supply
	redemptionContract.methods.getCirculatingSupply()
		.call({from: address})
		.then((supply) => {
			setCirculatingSupply(supply);
		})
		.catch(console.error);
}

const calculateSonicAmount = () => {
	if (!escAmount || exchangeRate === '0') return;
	
	try {
		// Convert ESC amount to wei
		const escAmountWei = web3.utils.toWei(escAmount, 'ether');
		
		// Calculate sonic amount: (escAmountWei * exchangeRate) / 1e18
		const escAmountNum = parseFloat(escAmount);
		const exchangeRateNum = parseFloat(web3.utils.fromWei(exchangeRate, 'ether'));
		const sonicAmountNum = escAmountNum * exchangeRateNum;
		
		setSonicAmount(sonicAmountNum.toString());
	} catch (error) {
		console.error('Error calculating sonic amount:', error);
		setSonicAmount('0');
	}
}

const approveEsc = () => {
	if (!escAmount) {
		alert("Please enter an amount to approve");
		return;
	}
	
	const amountInWei = web3.utils.toWei(escAmount, 'ether');
	setPendingText("Approving ESC tokens...");
	
	// Check if we have sufficient allowance already
	const amountNum = parseFloat(web3.utils.fromWei(amountInWei, 'ether'));
	const allowanceNum = parseFloat(web3.utils.fromWei(escAllowance, 'ether'));
	
	if (allowanceNum >= amountNum) {
		alert("Already approved sufficient amount");
		return;
	}
	
	approve(escToken, EXCHANGE_CONTRACT_ADDRESS, amountInWei, () => {
		loadEscData(); // Refresh data after approval
	});
}

const redeemEsc = () => {
	if (!escAmount) {
		alert("Please enter an amount to redeem");
		return;
	}
	
	const amountInWei = web3.utils.toWei(escAmount, 'ether');
	
	// Check if approved amount is sufficient
	const amountNum = parseFloat(web3.utils.fromWei(amountInWei, 'ether'));
	const allowanceNum = parseFloat(web3.utils.fromWei(escAllowance, 'ether'));
	
	if (allowanceNum < amountNum) {
		alert("Insufficient allowance. Please approve first.");
		return;
	}
	
	setPendingText("Redeeming ESC tokens...");
	
	const data = redemptionContract.methods.redeem(amountInWei).encodeABI();
	
	sendRequest(
		EXCHANGE_CONTRACT_ADDRESS,
		data,
		() => {
			loadEscData(); // Refresh data after redemption
			loadRedemptionData(); // Refresh redemption data
			setEscAmount(''); // Clear input
			setSonicAmount(''); // Clear sonic amount
		}
	);
}

const setMaxAmount = () => {
	setEscAmount(web3.utils.fromWei(escBalance, 'ether'));
}

const refreshRedemptionData = () => {
	loadEscData();
	loadRedemptionData();
}

// Balance Check Functions
const loadBalanceCheckData = async () => {
	if (!isConnected) {
		return;
	}
	
	setIsLoadingBalances(true);
	
	try {
		// Load SONIC balances for Epochs and Oracle contracts
		const [epochsBalance, oracleBalance] = await Promise.all([
			web3.eth.getBalance(EPOCHS_ADDRESS),
			web3.eth.getBalance(ORACLE_ADDRESS)
		]);
		
		setEpochsSonicBalance(epochsBalance);
		setOracleSonicBalance(oracleBalance);
		
		// Load token info for xEX and xHUBBLE
		const [xexName, xexSymbol, xexDecimals, xhubbleName, xhubbleSymbol, xhubbleDecimals] = await Promise.all([
			xexToken.methods.name().call({from: address}).catch(() => 'xEX Token'),
			xexToken.methods.symbol().call({from: address}).catch(() => 'xEX'),
			xexToken.methods.decimals().call({from: address}).catch(() => 18),
			xhubbleToken.methods.name().call({from: address}).catch(() => 'xHUBBLE Token'),
			xhubbleToken.methods.symbol().call({from: address}).catch(() => 'xHUBBLE'),
			xhubbleToken.methods.decimals().call({from: address}).catch(() => 18)
		]);
		
		setXexTokenInfo({
			name: xexName,
			symbol: xexSymbol,
			decimals: Number(xexDecimals)
		});
		
		setXhubbleTokenInfo({
			name: xhubbleName,
			symbol: xhubbleSymbol,
			decimals: Number(xhubbleDecimals)
		});
		
		// Load token balances for Mission Control Rewards
		const [xexBalance, xhubbleBalance] = await Promise.all([
			xexToken.methods.balanceOf(MISSION_CONTROL_REWARDS_ADDRESS).call({from: address}),
			xhubbleToken.methods.balanceOf(MISSION_CONTROL_REWARDS_ADDRESS).call({from: address})
		]);
		
		setMissionControlXexBalance(xexBalance);
		setMissionControlXhubbleBalance(xhubbleBalance);
		
	} catch (error) {
		console.error('Error loading balance check data:', error);
		alert('Error loading balance data. Please check console for details.');
	} finally {
		setIsLoadingBalances(false);
	}
};

const refreshBalanceCheckData = () => {
	loadBalanceCheckData();
};

// Format time remaining function
const formatTimeRemaining = (seconds) => {
	if (seconds <= 0) return "Ready to flip";
	
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	
	return `${hours}h ${minutes}m ${secs}s`;
};

// Format token balance with proper decimals
const formatTokenBalance = (balance, decimals) => {
	if (!balance || balance === '0') return '0';
	const divisor = Math.pow(10, decimals);
	return (parseFloat(balance) / divisor).toFixed(6);
};

  return (
  	<div className={"App App--" + isConnected + " App-chain--" + chainId}>
  		<div className="the-back" style={{backgroundImage: `url(${bg})`}}></div>
  		<div className="the-back cover"></div>
	  	<div className="bg" >
	  		<div className="inner">
	  			<div className="inner-inner">
		  			
		  			<div className={"step step-1 step--"+activeStep}>
		  				<div className="step-title"><img src={planet}/><span>Engine Room</span></div>
		  			<button onClick={rfr} className="engine-refresh">Refresh Data</button>
		  			<div className="engine-controls">
		  				<section className="engine-action-card">
		  					<div className="engine-action-copy">
		  						<span className="engine-action-label">Oracle Pull</span>
		  						<strong>{isReadyToPull ? "Ready" : `${Math.ceil(timeToPull)}s remaining`}</strong>
		  						<small>Last execution: {lastPullTimestamp}</small>
		  					</div>
		  					<div className={"pull pull--"+isReadyToPull}>
		  						<button onClick={pull}>Pull</button>
		  					</div>
		  				</section>
		  				<section className="engine-action-card">
		  					<div className="engine-action-copy">
		  						<span className="engine-action-label">Rate Calculation</span>
		  						<strong>{isReadyToCalc ? "Ready" : `${Math.ceil(timeToCalc)}s remaining`}</strong>
		  						<small>Last execution: {lastCalcTimestamp}</small>
		  					</div>
		  					<div className={"pull pull--"+isReadyToCalc}>
		  						<button onClick={calc}>Calculate</button>
		  					</div>
		  				</section>
		  					
		  					{/* Epoch Flip Section */}
		  					<div className="epoch-section">
		  						<h3>Epoch Management</h3>
		  						<p>Current Epoch Start: {currentEpochStartTimestamp}</p>
		  						<p>Flip available in: {formatTimeRemaining(timeUntilFlip)}</p>
		  						<div className={`flip-epoch flip-epoch--${isReadyToFlip}`}>
		  							<button 
		  								onClick={flipEpoch}
		  								disabled={!isReadyToFlip || !isConnected}
		  							>
		  								Flip Epoch
		  							</button>
		  						</div>
		  						{!isReadyToFlip && timeUntilFlip > 0 && (
		  							<p className="epoch-note">Epoch flip unlocks automatically when the current 48-hour epoch ends.</p>
		  						)}
		  					</div>
		  				</div>
		  			</div>

		  			{/* ESC Redemption Interface */}
		  			<div className={"step step-7 step--"+activeStep}>
		  				<div className="step-title"><img src={planet}/><span>ESC Redemption</span></div>
		  				<div className="esc-redemption-interface">
		  					<button onClick={refreshRedemptionData} className="refresh-button">Refresh Redemption Data</button>
		  					
		  					<div className="redemption-info">
		  						<div className="info-row">
		  							<span>Your ESC Balance:</span>
		  							<span>{web3.utils.fromWei(escBalance, 'ether')} ESC</span>
		  						</div>
		  						<div className="info-row">
		  							<span>Current Allowance:</span>
		  							<span>{web3.utils.fromWei(escAllowance, 'ether')} ESC</span>
		  						</div>
		  						<div className="info-row">
		  							<span>Exchange Rate:</span>
		  							<span>1 ESC = {web3.utils.fromWei(exchangeRate, 'ether')} SONIC</span>
		  						</div>
		  						<div className="info-row">
		  							<span>Contract Balance:</span>
		  							<span>{web3.utils.fromWei(contractBalance, 'ether')} SONIC</span>
		  						</div>
		  						<div className="info-row">
		  							<span>Circulating Supply:</span>
		  							<span>{web3.utils.fromWei(circulatingSupply, 'ether')} ESC</span>
		  						</div>
		  					</div>
		  					
		  					<div className="redemption-input-group">
		  						<label>ESC Amount to Redeem:</label>
		  						<div className="input-with-max">
		  							<input 
		  								type="text" 
		  								value={escAmount}
		  								onChange={(e) => setEscAmount(e.target.value)}
		  								placeholder="0.0"
		  								className="esc-amount-input"
		  							/>
		  							<button onClick={setMaxAmount} className="max-button">MAX</button>
		  						</div>
		  					</div>
		  					
		  					<div className="redemption-preview">
		  						<p>You will receive: <strong>{sonicAmount} SONIC</strong></p>
		  					</div>
		  					
		  					<div className="redemption-actions">
		  						<button 
		  							onClick={approveEsc} 
		  							className="approve-button"
		  							disabled={!escAmount || !isConnected}
		  						>
		  							Approve ESC
		  						</button>
		  						<button 
		  							onClick={redeemEsc} 
		  							className="redeem-button"
		  							disabled={!escAmount || !isConnected}
		  						>
		  							Redeem ESC for SONIC
		  						</button>
		  					</div>
		  					
		  					<div className="redemption-note">
		  						<p><strong>Note:</strong> Redeemed ESC tokens will be burned and sent to the dead address.</p>
		  					</div>
		  				</div>
		  			</div>

		  			{/* Balance Check Interface */}
		  			<div className={"step step-8 step--"+activeStep}>
		  				<div className="step-title"><img src={planet}/><span>Balance Check</span></div>
		  				<div className="balance-check-interface">
		  					<button 
		  						onClick={refreshBalanceCheckData} 
		  						className="refresh-button"
		  						disabled={isLoadingBalances}
		  					>
		  						{isLoadingBalances ? 'Loading...' : 'Refresh Balances'}
		  					</button>
		  					
		  					<div className="balance-info-section">
		  						<h3>SONIC Balances ($S)</h3>
		  						<div className="info-grid">
		  							<div className="info-row">
		  								<span>Epochs Contract:</span>
		  								<span>{web3.utils.fromWei(epochsSonicBalance, 'ether')} SONIC</span>
		  							</div>
		  							<div className="info-row">
		  								<span>Oracle Contract:</span>
		  								<span>{web3.utils.fromWei(oracleSonicBalance, 'ether')} SONIC</span>
		  							</div>
		  						</div>
		  						
		  						<h3>Mission Control Rewards Token Balances</h3>
		  						<div className="info-grid">
		  							<div className="info-row">
		  								<span>{xexTokenInfo.symbol} ({xexTokenInfo.name}):</span>
		  								<span>
		  									{formatTokenBalance(missionControlXexBalance, xexTokenInfo.decimals)} {xexTokenInfo.symbol}
		  								</span>
		  							</div>
		  							<div className="info-row">
		  								<span>{xhubbleTokenInfo.symbol} ({xhubbleTokenInfo.name}):</span>
		  								<span>
		  									{formatTokenBalance(missionControlXhubbleBalance, xhubbleTokenInfo.decimals)} {xhubbleTokenInfo.symbol}
		  								</span>
		  							</div>
		  						</div>
		  						
		  						<div className="addresses-section">
		  							<h3>Contract Addresses</h3>
		  							<div className="address-row">
		  								<span>Epochs:</span>
		  								<code>{EPOCHS_ADDRESS}</code>
		  							</div>
		  							<div className="address-row">
		  								<span>Oracle:</span>
		  								<code>{ORACLE_ADDRESS}</code>
		  							</div>
		  							<div className="address-row">
		  								<span>Mission Control Rewards:</span>
		  								<code>{MISSION_CONTROL_REWARDS_ADDRESS}</code>
		  							</div>
		  							<div className="address-row">
		  								<span>{xexTokenInfo.symbol} Token:</span>
		  								<code>{XEX_TOKEN_ADDRESS}</code>
		  							</div>
		  							<div className="address-row">
		  								<span>{xhubbleTokenInfo.symbol} Token:</span>
		  								<code>{XHUBBLE_TOKEN_ADDRESS}</code>
		  							</div>
		  						</div>
		  					</div>
		  				</div>
		  			</div>

	       			<div className="nav">
			       		<div className="link" onClick={()=>{
			       			setActiveStep(1)
			       		}}>Engine Room</div>
			       		<div className="link" onClick={()=>{
			       			setActiveStep(7)
			       		}}>ESC Redemption</div>
			       		<div className="link" onClick={()=>{
			       			setActiveStep(8)
			       		}}>Balance Check</div>
	       			</div>
	       		</div>
	       	</div>

        	<div className="dd"><img src={dd} /></div>	  		
	        <div className="connect-button">
	  			<div className="inliner"><ConnectButton /></div>
	  		</div>
	  		
	    
	        <div className={"pending pending--" + pending}>
	  			<p className="pending-title">Transaction Pending</p>
	  			<p className="pending-text">{pendingText}</p>
	  			<div className="pending-animation">
	  				<div className="animation"><img src={pend}/></div>
	  			</div>
	  		</div>
			</div>
		</div>
  	)
};
