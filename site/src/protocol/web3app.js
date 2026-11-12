import { ConnectButton } from '@rainbow-me/rainbowkit'
import React from 'react'
import Web3 from 'web3'
import { useAccount, useChainId } from 'wagmi'

import { config } from './config'

import { IMAGES } from './components/constants/images'

import { 
    EX_LP_CL, 
    EX_LP_V2, 
    USDC,
    NEUTRAL_RATES, 
    LIGHT_RATES, 
    SUBS_RATES 
  } from './components/constants/contracts'
 
import { web3 } from './components/utils/web3Instance'
import { fetchPrice, setRefToThis } from './components/utils/basicHelpers'
import { getTransactionReceipt, estimateGas, sendRequest } from './components/utils/transactionHelpers'
import { useWeb3Contracts } from './hooks/useWeb3Contracts'

import { 
    getBal, 
    checkAllowance, 
    getBalOf, 
    _xhubble, 
    _bal_lp_ex, 
    _bal_lp_hubble, 
    _lp_hubble, 
    _lp_ex, 
    getExAndXhubbleBal 
} from './components/utils/walletHelpers'
import { useHubble } from './hooks/useHubble'
import { useEx } from './hooks/useEx'
import { useLP } from './hooks/useLP'
import { useApp } from './hooks/useApp'

// Function to calculate EX/stS LP token value in USD
export const getEXSTS_LPValue = async (contracts, lpContract, exContract, address) => {
    try {
        // Get LP contract address
        const lpAddress = lpContract.options.address;
        
        // Get EX balance in LP pool
        const exBalance = await exContract.methods.balanceOf(lpAddress).call({ from: address });
        
        // Get total supply of LP tokens
        const totalSupply = await lpContract.methods.totalSupply().call({ from: address });
        
        console.log("=== EX/stS LP Value Debug ===");
        console.log("EX balance in LP:", exBalance);
        console.log("LP total supply:", totalSupply);
        
        if (Number(totalSupply) === 0) {
            console.error("LP total supply is zero!");
            return null;
        }
        
        // Convert EX balance to proper units (EX has 18 decimals)
        const exAmount = Number(web3.utils.fromWei(exBalance, 'ether'));
        
        console.log(`EX amount in pool: ${exAmount} EX`);
        
        // Note: For EX/stS LP, the pool has EX and stS
        // Since we want USD value, we need EX price in USD
        // We can use the ex_price that should already be calculated
        
        // IMPORTANT: You need to have ex.ex_price available
        // You can either pass it as parameter or calculate it here
        
        // First, let's try to get EX price if it's not available
        let exPriceUSD;
        
        // Check if ex_price exists in your state
        // If not, you might need to call getEXPrice function
        
        // For now, I'll assume we need to fetch it
        const exPrice = await getEXPriceFromPairs(contracts, address);
        
        if (exPrice === null || exPrice <= 0) {
            console.error("Could not get valid EX price!");
            return null;
        }
        
        console.log(`EX Price: $${exPrice}`);
        
        // For EX/stS LP:
        // - The pool contains EX and stS
        // - stS is pegged to S token which is pegged to USDC
        // - So stS ≈ $1 (but we should calculate it properly)
        
        // Get STS rate to calculate stS price
        const rate = await contracts.STS.methods.getRate().call({ from: address });
        const rateNum = Number(web3.utils.fromWei(rate, 'ether'));
        
        // Get S/USDC pair price (S price in USDC)
        const S_USDC_PAIR = "0x23EfA8092dab315Fa519bd9880597AF56C5a9B12";
        const S_TOKEN = "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
        
        // Get USDC balance of the S/USDC pair
        const usdcBalance = await contracts.USDC.methods.balanceOf(S_USDC_PAIR).call({ from: address });
        
        // Create S token contract if not exists
        let sContract;
        if (contracts.S) {
            sContract = contracts.S;
        } else {
            const S_ABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];
            sContract = new web3.eth.Contract(S_ABI, S_TOKEN);
        }
        
        const sBalance = await sContract.methods.balanceOf(S_USDC_PAIR).call({ from: address });
        
        // Convert to proper units
        const usdcAmount = Number(web3.utils.fromWei(usdcBalance, 'mwei'));
        const sAmount = Number(web3.utils.fromWei(sBalance, 'ether'));
        
        if (sAmount === 0) {
            console.error("S balance is zero!");
            return null;
        }
        
        // Calculate S price: (USDC in pool) / (S in pool)
        const sPrice = usdcAmount / sAmount;
        
        // Calculate stS price: rate * priceOfS
        const stsPrice = rateNum * sPrice;
        
        console.log(`stS Price: ${stsPrice} USDC per stS`);
        
        // Now we have:
        // - EX price in USD: exPrice
        // - stS price in USD: stsPrice (should be very close to $1)
        
        // Get stS balance in LP pool
        const stsBalance = await contracts.STS.methods.balanceOf(lpAddress).call({ from: address });
        const stsAmount = Number(web3.utils.fromWei(stsBalance, 'ether'));
        
        console.log(`stS amount in pool: ${stsAmount} stS`);
        
        // Calculate total value in pool
        const exValue = exAmount * exPrice;
        const stsValue = stsAmount * stsPrice;
        const totalPoolValue = exValue + stsValue;
        
        console.log(`EX value in pool: $${exValue}`);
        console.log(`stS value in pool: $${stsValue}`);
        console.log(`Total pool value: $${totalPoolValue}`);
        
        // Calculate LP token value
        const lpTokenValue = totalPoolValue / Number(web3.utils.fromWei(totalSupply, 'ether'));
        
        console.log(`LP value per token: $${lpTokenValue}`);
        
        return lpTokenValue;
        
    } catch (error) {
        console.error("Error calculating EX/stS LP value:", error);
        return null;
    }
};

// Simplified version if you already have EX price
export const getEXSTS_LPValueSimple = async (contracts, lpContract, exPriceUSD, address) => {
    try {
        // Get LP contract address
        const lpAddress = lpContract.options.address;
        
        // Get EX balance in LP pool
        const exBalance = await contracts.EX.methods.balanceOf(lpAddress).call({ from: address });
        
        // Get stS balance in LP pool
        const stsBalance = await contracts.STS.methods.balanceOf(lpAddress).call({ from: address });
        
        // Get total supply of LP tokens
        const totalSupply = await lpContract.methods.totalSupply().call({ from: address });
        
        console.log("=== EX/stS LP Value (Simple) ===");
        console.log("EX balance in LP:", exBalance);
        console.log("stS balance in LP:", stsBalance);
        console.log("LP total supply:", totalSupply);
        
        if (Number(totalSupply) === 0) {
            console.error("LP total supply is zero!");
            return null;
        }
        
        // Convert balances to proper units
        const exAmount = Number(web3.utils.fromWei(exBalance, 'ether'));
        const stsAmount = Number(web3.utils.fromWei(stsBalance, 'ether'));
        
        console.log(`EX amount in pool: ${exAmount}`);
        console.log(`stS amount in pool: ${stsAmount}`);
        
        // Assuming stS price is approximately $1 (since it's pegged to USDC via S token)
        // For more accuracy, you could fetch the actual price like in the full version
        const stsPriceUSD = 1; // Approximate
        
        // Calculate total value in pool
        const exValue = exAmount * exPriceUSD;
  
        const totalPoolValue = 2*exValue;
        
        console.log(`EX value: $${exValue} (${exAmount} EX × $${exPriceUSD})`);

        console.log(`Total pool value: $${totalPoolValue}`);
        
        // Calculate LP token value
        const lpTokenValue = totalPoolValue / Number(web3.utils.fromWei(totalSupply, 'ether'));
        
        console.log(`LP value per token: $${lpTokenValue}`);
        
        return lpTokenValue;
        
    } catch (error) {
        console.error("Error calculating EX/stS LP value (simple):", error);
        return null;
    }
};

// Function to get EX price from STS and S/USDC pair
export const getEXPriceFromPairs = async (contracts, address) => {
    try {
        // S/USDC pair address
        const S_USDC_PAIR = "0x23EfA8092dab315Fa519bd9880597AF56C5a9B12";
        // S token address
        const S_TOKEN = "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
        
        console.log("S/USDC Pair address:", S_USDC_PAIR);
        console.log("S Token address:", S_TOKEN);
        
        // Step 1: Get S price from S/USDC pair
        // Get USDC balance of the S/USDC pair
        const usdcBalance = await contracts.USDC.methods.balanceOf(S_USDC_PAIR).call({ from: address });
        
        // Get S token contract (create if not exists)
        let sContract;
        if (contracts.S) {
            sContract = contracts.S;
        } else {
            const S_ABI = [
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ];
            sContract = new web3.eth.Contract(S_ABI, S_TOKEN);
        }
        
        const sBalance = await sContract.methods.balanceOf(S_USDC_PAIR).call({ from: address });
        
        console.log("=== S/USDC LP Balances ===");
        console.log("Raw USDC balance:", usdcBalance);
        console.log("Raw S balance:", sBalance);
        
        // Convert to proper units
        // USDC has 6 decimals
        const usdcAmount = Number(web3.utils.fromWei(usdcBalance, 'mwei'));
        // S has 18 decimals
        const sAmount = Number(web3.utils.fromWei(sBalance, 'ether'));
        
        console.log(`USDC amount: ${usdcAmount}`);
        console.log(`S amount: ${sAmount}`);
        
        if (sAmount === 0) {
            console.error("S balance is zero!");
            return null;
        }
        
        // Calculate S price: (USDC in pool) / (S in pool)
        const sPrice = usdcAmount / sAmount;
        
        console.log(`S Price: ${usdcAmount} USDC / ${sAmount} S = ${sPrice} USDC per S`);
        
        // Step 2: Get STS rate
        const rate = await contracts.STS.methods.getRate().call({ from: address });
        const rateNum = Number(web3.utils.fromWei(rate, 'ether'));
        
        console.log("STS rate:", rateNum);
        
        // Calculate stS price: rate * priceOfS
        const stsPrice = rateNum * sPrice;
        
        console.log(`stS Price: ${rateNum} * ${sPrice} = ${stsPrice} USDC per stS`);
        
        // Step 3: Read the live EX/stS pool composition. The reserve ratio is
        // the amount of stS backing one EX at the pool's current spot price.
        const [exBalanceRaw, stsBalanceRaw] = await Promise.all([
            contracts.EX.methods.balanceOf(EX_LP_V2).call({ from: address }),
            contracts.STS.methods.balanceOf(EX_LP_V2).call({ from: address })
        ]);
        const exBalance = Number(web3.utils.fromWei(exBalanceRaw, 'ether'));
        const stsBalance = Number(web3.utils.fromWei(stsBalanceRaw, 'ether'));
        if (exBalance === 0) return null;
        const stsPerEx = stsBalance / exBalance;

        // Step 4: EX/stS ratio × stS/USD.
        const exPrice = stsPerEx * stsPrice;

        console.log(`EX Price: ${stsPerEx} stS per EX * $${stsPrice} per stS = $${exPrice}`);
        console.log(`EX Price: $${exPrice}`);
        
        return exPrice;
        
    } catch (error) {
        console.error("Error getting EX price from pairs:", error);
        return null;
    }
};

// Simplified main function (like getHubblePrice)
export const getEXPrice = (contracts, address, callback) => {
    getEXPriceFromPairs(contracts, address)
        .then(price => {
            if (price !== null && price > 0 && !isNaN(price)) {
                console.log("Successfully got EX price from pairs:", price);
                callback(price);
            } else {
                console.log("Failed to get valid EX price from pairs, using default");
                callback(0);
            }
        })
        .catch(error => {
            console.error("Error in getEXPrice:", error);
            callback(0);
        });
};
export const getHubblePriceFromLPPair = async (contracts, address) => {
    try {
        // Get the LP contract address
        const lpAddress = contracts.lp_hubble.options.address;
        
        console.log("LP Contract address:", lpAddress);
        
        // Get USDC balance of the LP contract
        const usdcBalance = await contracts.USDC.methods.balanceOf(lpAddress).call({ from: address });
        
        // Get Hubble balance of the LP contract  
        const hubbleBalance = await contracts.HUBBLE.methods.balanceOf(lpAddress).call({ from: address });
        
        console.log("=== LP Balances ===");
        console.log("Raw USDC balance:", usdcBalance);
        console.log("Raw Hubble balance:", hubbleBalance);
        
        // Convert to proper units
        // USDC has 6 decimals, so divide by 10^6
        const usdcAmount = Number(web3.utils.fromWei(usdcBalance, 'mwei'));
        // Hubble has 18 decimals, so divide by 10^18
        const hubbleAmount = Number(web3.utils.fromWei(hubbleBalance, 'ether'));
        
        console.log(`USDC amount: ${usdcAmount}`);
        console.log(`Hubble amount: ${hubbleAmount}`);
        
        if (hubbleAmount === 0) {
            console.error("Hubble balance is zero!");
            return null;
        }
        
        // Calculate price: (USDC in pool) / (Hubble in pool)
        // This gives price per Hubble in USDC
        const price = usdcAmount / hubbleAmount;
        
        console.log(`Price: ${usdcAmount} USDC / ${hubbleAmount} Hubble = ${price} USDC per Hubble`);
        console.log(`Price in USD: $${price} (assuming USDC = $1)`);
        
        return price;
        
    } catch (error) {
        console.error("Error getting price from LP balances:", error);
        return null;
    }
};

// Simplified main function
export const getHubblePrice = (contracts, address, callback) => {
    getHubblePriceFromLPPair(contracts, address)
        .then(price => {
            if (price !== null && price > 0 && !isNaN(price)) {
                console.log("Successfully got Hubble price from LP:", price);
                callback(price);
            } else {
                console.log("Failed to get valid price from LP, using default");
                callback(0.01);
            }
        })
        .catch(error => {
            console.error("Error in getHubblePrice:", error);
            callback(0.01);
        });
};

// Function to calculate LP token value in USD
export const getLPValueInUSD = async (contracts, lpContract, tokenContract, tokenDecimals = 18, address) => {
    try {
        // Get LP contract address
        const lpAddress = lpContract.options.address;
        
        // Get token balance in LP pool
        const tokenBalance = await tokenContract.methods.balanceOf(lpAddress).call({ from: address });
        
        // Get total supply of LP tokens
        const totalSupply = await lpContract.methods.totalSupply().call({ from: address });
        
        console.log(`LP Value Debug - ${tokenContract.options.address}:`);
        console.log("Token balance in LP:", tokenBalance);
        console.log("LP total supply:", totalSupply);
        
        if (Number(totalSupply) === 0) {
            console.error("LP total supply is zero!");
            return null;
        }
        
        // Convert token balance to proper units based on decimals
        let tokenAmount;
        if (tokenDecimals === 6) {
            // USDC has 6 decimals
            tokenAmount = Number(web3.utils.fromWei(tokenBalance, 'mwei'));
        } else if (tokenDecimals === 18) {
            // Most tokens have 18 decimals
            tokenAmount = Number(web3.utils.fromWei(tokenBalance, 'ether'));
        } else {
            // For other decimals
            tokenAmount = Number(tokenBalance) / Math.pow(10, tokenDecimals);
        }
        
        // Calculate: (2 * token value in pool) / total LP supply
        // Multiply by 2 because LP has 2 tokens (USDC and Hubble)
        const tokenValueInPool = tokenAmount * 2; // Assuming token price is $1 for USDC
        const lpValue = tokenValueInPool / Number(web3.utils.fromWei(totalSupply, 'ether'));
        
        console.log(`Token amount in pool: ${tokenAmount}`);
        console.log(`Total token value in pool (2x): ${tokenValueInPool}`);
        console.log(`LP value per token: ${lpValue} USD`);
        
        return lpValue;
        
    } catch (error) {
        console.error("Error calculating LP value:", error);
        return null;
    }
};

// Specific functions for your LPs
export const getHubbleLPValue = async (contracts, address) => {
    // For Hubble/USDC LP: use USDC balance (since USDC = $1)
    return getLPValueInUSD(contracts, contracts.lp_hubble, contracts.USDC, 6, address);
};




export function Web3App(props) {
    // Wallet & Connection State
    const { address, isConnected } = useAccount()
    const chainId = useChainId()
    const [networkConfig] = React.useState(config["mainnet"])
    const contracts = useWeb3Contracts(networkConfig)
    const hubble = useHubble(address, contracts)
    const ex = useEx(address, contracts)
    const lp = useLP(address, contracts)
    const app = useApp()
    
    // App State
    
    
    // Mission Control State
    const [mcBalance, setMcBalance] = React.useState(0)
    const [mc2Bal, setMc2bal] = React.useState(0)
    const [mc2Info, setMc2Info] = React.useState({ 
        token: "", 
        totalStake: "0", 
        lastRewardTime: "0", 
        isStarted: true 
    })
    
    // MC2 Rewards State
    const [pr, setPr] = React.useState(["0", "0", "0", "0", "0"])
    
    // Dark Energy Module State
    const [demBal, setDembal] = React.useState(0)
    const [demInfo, setDemInfo] = React.useState({ 
        token: "", 
        totalStake: "0", 
        lastRewardTime: "0", 
        isStarted: true 
    })
    const [prdem, setPrDem] = React.useState(["0", "0", "0", "0", "0"])
    
    // Protocol State
    const [activePool, setActivePool] = React.useState(999)
    const [activeRates, setActiveRates] = React.useState(NEUTRAL_RATES)
    const [twap, setTwap] = React.useState("1000000000000000000")
    const [twapHourly, setTwapHourly] = React.useState("1000000000000000000")
    const [currentPrice, setCurrentPrice] = React.useState("1000000000000000000")
    const [epoch, setEpoch] = React.useState({ "0": 0, "1": 0, "2": 1744676435, "3": "1000000000000000000" })
    const [dsr, setDsr] = React.useState(10000)

    const [exRate, setExRate] = React.useState(550)
    
    // UI State
    const [isMinting, setIsMinting] = React.useState(false)
    const [isRedeeming, setIsRedeeming] = React.useState(false)
    const [mintingAmount, setMintingAmount] = React.useState(0)

    // Add these with your other state variables
const [tweetModalOpen, setTweetModalOpen] = React.useState(false)
const [tweetContent, setTweetContent] = React.useState("")
const [tweetImageData, setTweetImageData] = React.useState(null)

const [lpEXSTSValue, setLpEXSTSValue] = React.useState(0)
const [walletExpanded, setWalletExpanded] = React.useState(false)
    
    // Refs
    const exMintRef = React.useRef(null)
    const exRedemptionRef = React.useRef(null)
    const stakeRef = React.useRef(null)
    const unstakeRef = React.useRef(null)
    const mc2StakeRef = React.useRef(null)
    const mc2UnstakeRef = React.useRef(null)
    const demStakeRef = React.useRef(null)
    const demUnstakeRef = React.useRef(null)

    // ========== EFFECTS ==========

    // Market-wide values are public chain data and must not depend on a wallet
    // connection. Keeping this separate from the account-data effect below also
    // makes the dashboard useful in read-only mode.
    React.useEffect(() => {
        const readAddress = "0x0000000000000000000000000000000000000001"

        getEXPrice(contracts, readAddress, ex.set_ex_price)

        contracts.epochs.methods.circulatingSupplyOfEx()
            .call({ from: readAddress })
            .then(ex.setExSupply)
            .catch((error) => {
                console.warn("Epochs circulating supply unavailable; using EX total supply", error)
                return contracts.EX.methods.totalSupply()
                    .call({ from: readAddress })
                    .then(ex.setExSupply)
                    .catch((fallbackError) => {
                        console.error("Unable to load EX supply", fallbackError)
                        ex.setExSupply("0")
                    })
            })
    }, [contracts, ex.setExSupply, ex.set_ex_price])
    
    React.useEffect(() => {
        if (isConnected) {
            getBal(contracts.HUBBLE, address, (a) => {
                hubble.setHubbleBalance(a)
                getBal(contracts.xHUBBLE, address, (b) => {
                    hubble.setXHubbleBalance(b)
                    app.setActiveStep(1)
                    getNewExData()
                    getFrontData()
                })
                
                // Use the new function for Hubble
                getHubblePrice(contracts, address, (price) => {
                    hubble.set_hubble_price(price)
                })
                getEXPrice(contracts, address, (price) => {
                    ex.set_ex_price(price); // Make sure you have this in your ex state
                });
                
              
            })
        }
    }, [isConnected])
    
    React.useEffect(() => {
        if (app.activeStep === 2) {
            hubble.getVests()
            ex.getXEXVests() // Changed from getVestXEXCount
        } else if (app.activeStep === 4) {
            ex.gexData()
        } else if (app.activeStep === 5) {
            getDEMInfo(getDemUserInfo(getPendingRewardsDEM()))
        } else if (app.activeStep === 3) {
            getMcBalance(getUserInfo(getPendingRewards()))
            getMC2Info()
            getPoolInfo()
        } else if (app.activeStep === 1) {
            getHubblePrice(contracts, address, (price) => {
                hubble.set_hubble_price(price)
            })
            
            getOraclePrice()
        } else if (app.activeStep === 6) {
            // Get Hubble LP value
            getHubbleLPValue(contracts, address)
            .then(lpValue => {
                if (lpValue !== null && lpValue > 0) {
                    console.log("Setting Hubble LP price:", lpValue);
                    lp.set_lp_hubble_price(lpValue);
                } else {
                    console.log("Failed to get Hubble LP value");
                }
            })
            .catch(error => {
                console.error("Error getting Hubble LP value:", error);
            });
            
            // Get EX/stS LP value - using the simple version since you have ex_price
            if (ex.ex_price > 0) {
                getEXSTS_LPValueSimple(contracts, contracts.lp_ex, ex.ex_price, address)
                .then(lpValue => {
                    if (lpValue !== null && lpValue > 0) {
                        console.log("Setting EX/stS LP price:", lpValue);
                        lp.set_lp_ex_price(lpValue); // Make sure you have this setter
                    } else {
                        console.log("Failed to get EX/stS LP value");
                    }
                })
                .catch(error => {
                    console.error("Error getting EX/stS LP value:", error);
                });
            }
            
            lp.get_lp_hubble_Info(lp.get_lp_hubble_UserInfo(lp.getPendingRewardsLP_hubble(_bal_lp_hubble(contracts.lp_hubble, lp.set_lp_hubble_Balance, address))))
            lp.get_lp_ex_Info(lp.get_lp_ex_UserInfo(lp.getPendingRewardsLP_ex(_bal_lp_ex(contracts.lp_ex, lp.set_lp_ex_Balance, address))))
        }
    }, [app.activeStep])

    
    React.useEffect(() => {
        if (isMinting) {
            setMintingAmount(Number(exMintRef.current.value))
        }
    }, [isMinting])
    
    React.useEffect(() => {
        const startPrice = Number(web3.utils.fromWei(epoch["3"], "ether"))
        const relevantSupply = Number(web3.utils.fromWei(ex.exSupply, "ether"))
        console.log("epochType",epoch["1"])
        if (Number(epoch["1"]) === 0) {
           
            setActiveRates(NEUTRAL_RATES)
          
        } else if (Number(epoch["1"]) === 1) {
            setActiveRates(LIGHT_RATES)
           
        } else if (Number(epoch["1"]) === 2) {
            console.log("setting rates to dark epoch")
            setActiveRates(SUBS_RATES)
  
        }
    }, [epoch, ex.exSupply])

    // ========== UTILITY FUNCTIONS ==========
    
    const approve = (contract, spender, amount, callback = () => {}) => {
        const data = contract.methods.approve(spender, amount).encodeABI()
        sendRequest(contract.options.address, data, address, app.setIsPending, app.setPendingText, callback)
    }
    

    // ========== HUBBLE FUNCTIONS ==========
    
    const lock = () => {
        if (Number(hubble.hubbleRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(hubble.hubbleRef.current.value, "ether")
        const data = contracts.xHUBBLE.methods.lock(amt).encodeABI()
        
        checkAllowance(contracts.HUBBLE, contracts.xHUBBLE.options.address, amt, address, (allowance) => {
            const alw = web3.utils.fromWei(allowance, "ether")
            if (alw >= Number(hubble.hubbleRef.current.value)) {
                app.setPendingText("Locking $HUBBLE")
                sendRequest(contracts.xHUBBLE.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                    getBal(contracts.HUBBLE, address, hubble.setHubbleBalance)
                    getBal(contracts.xHUBBLE, address, hubble.setXHubbleBalance)
                })
            } else {
                app.setPendingText("Approving your HUBBLE for use by the xHUBBLE contract.")
                approve(contracts.HUBBLE, contracts.xHUBBLE.options.address, amt, () => {
                    app.setPendingText("Locking $HUBBLE")
                    sendRequest(contracts.xHUBBLE.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                        getBal(contracts.HUBBLE, address, hubble.setHubbleBalance)
                        getBal(contracts.xHUBBLE, address, hubble.setXHubbleBalance)
                    })
                })
            }
        })
    }
    
    const earlyExit = () => {
        if (Number(hubble.unlockRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(hubble.unlockRef.current.value, "ether")
        const data = contracts.xHUBBLE.methods.crash(amt).encodeABI()
        
        app.setPendingText("Crashing out your $xHUBBLE for $HUBBLE!?!!")
        sendRequest(contracts.xHUBBLE.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.HUBBLE, address, hubble.setHubbleBalance)
            getBal(contracts.xHUBBLE, address, hubble.setXHubbleBalance)
        })
    }
    
    const vest = () => {
        if (Number(hubble.vestRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(hubble.vestRef.current.value, "ether")
        const data = contracts.xHUBBLE.methods.createVest(amt).encodeABI()
        
        app.setPendingText("Vesting your $xHUBBLE for $HUBBLE... see you in 180 days!")
        sendRequest(contracts.xHUBBLE.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.HUBBLE, address, hubble.setHubbleBalance)
            getBal(contracts.xHUBBLE, address, (bal) => {
                hubble.setXHubbleBalance(bal)
                hubble.getVests()
            })
        })
    }
    
    // Update exitVest to accept vest ID
    const exitHubbleVest = (vestId, callback = () => { }) => {
        const data = contracts.xHUBBLE.methods.exitVest(vestId).encodeABI()
        
        app.setPendingText("Exiting your Vest. Please be sure you understand what this means!")
        sendRequest(contracts.xHUBBLE.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            callback()
            hubble.getVests()
            getBal(contracts.HUBBLE, address, hubble.setHubbleBalance)
            getBal(contracts.xHUBBLE, address, hubble.setXHubbleBalance)
        })
    }

    // ========== EX FUNCTIONS ==========
    
    const lockEx = () => {
        if (Number(ex.exRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(ex.exRef.current.value, "ether")
        const data = contracts.XEX.methods.lock(amt).encodeABI()
        
        checkAllowance(contracts.EX, contracts.XEX.options.address, amt, address, (allowance) => {
            const alw = web3.utils.fromWei(allowance, "ether")
            if (alw >= Number(ex.exRef.current.value)) {
                app.setPendingText("Locking $EX")
                sendRequest(contracts.XEX.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                    getBal(contracts.EX, address, ex.setExBalance)
                    getBal(contracts.XEX, address, ex.setXexBalance)
                })
            } else {
                app.setPendingText("Approving your $EX for use by the $xEX contract.")
                approve(contracts.EX, contracts.XEX.options.address, amt, () => {
                    app.setPendingText("Locking $EX")
                    sendRequest(contracts.XEX.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                        getBal(contracts.EX, address, ex.setExBalance)
                        getBal(contracts.XEX, address, ex.setXexBalance)
                    })
                })
            }
        })
    }
    
    const earlyExitXEX = () => {
        if (Number(ex.xexRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(ex.xexRef.current.value, "ether")
        const data = contracts.XEX.methods.crash(amt).encodeABI()
        
        app.setPendingText("Crashing out your $xEX for $EX!?!!")
        sendRequest(contracts.XEX.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.EX, address, ex.setExBalance)
            getBal(contracts.XEX, address, ex.setXexBalance)
        })
    }
    
    const vestXEX = () => {
        if (Number(ex.vestXEXRef.current.value) === 0) {
            alert("Enter a nonzero value")
            return
        }
        
        const amt = web3.utils.toWei(ex.vestXEXRef.current.value, "ether")
        const data = contracts.XEX.methods.createVest(amt).encodeABI()
        
        app.setPendingText("Vesting your $xEX for $EX... see you in 14 days!")
        sendRequest(contracts.XEX.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.EX, address, ex.setExBalance)
            getBal(contracts.XEX, address, (bal) => {
                ex.setXexBalance(bal)
                ex.getXEXVests() // Refresh the list
            })
        })
    }
    
    // Update exitVestXEX to accept vest ID
    const exitXEXVest = (vestId, callback = () => { }) => {
        const data = contracts.XEX.methods.exitVest(vestId).encodeABI()
        
        app.setPendingText("Exiting your Vest. Please be sure you understand what this means!")
        sendRequest(contracts.XEX.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            callback()
            ex.getXEXVests() // Refresh the list
            getBal(contracts.EX, address, ex.setExBalance)
            getBal(contracts.XEX, address, ex.setXexBalance)
        })
    }
    
    const getNewExData = () => {
        ex.getExBalances(() => {
            ex.gexData()
        })
    }

    const calculateEarlyExitAmount = (vest, totalVestingDays = 180) => {
        if (!vest || !vest.start || !vest.end) return 0
        
        const now = Date.now() / 1000
        const totalDuration = vest.end - vest.start
        const elapsed = Math.max(0, now - vest.start)
        
        // Calculate proportion of time passed
        const proportion = elapsed / totalDuration
        
        // For Hubble: 180 days total
        // For EX: 14 days total
        // The contract handles this calculation, but we can show an estimate
        return Number(web3.utils.fromWei(vest.amount, "ether")) * Math.min(proportion, 1)
    }
    

    // ========== MISSION CONTROL V1 FUNCTIONS ==========
    
    const getMcBalance = () => {
        contracts.MC.methods.balanceOf(address)
            .call({ from: address })
            .then(setMcBalance)
    }
    
    const unstakeMC = (callback = () => { }) => {
        const data = contracts.MC.methods.withdraw(web3.utils.toWei(unstakeRef.current.value, "ether")).encodeABI()
        app.setPendingText("Unstaking your xHUBBLE")
        
        sendRequest(contracts.MC.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.xHUBBLE, address, (bal) => {
                hubble.setXHubbleBalance(bal)
                getMcBalance()
                callback()
            })
        })
    }

    
    const unstake = () => {
        unstakeMC()
    }
    
  
    

    // ========== MISSION CONTROL V2 FUNCTIONS ==========

    const getPoolInfo = () => {
        contracts.MC2.methods.getPoolInfo(0)
            .call({from: address})
            .then((gpi)=>{
                console.log(24 * 60 * 60 * Number(web3.utils.fromWei(gpi[1][3],"ether")))
                setExRate(24 * 60 * 60 * Number(web3.utils.fromWei(gpi[1][3],"ether")))
            })
    }
    
    const deposit = (amt, pid = 0, callback = () => {}) => {
        const data = contracts.MC2.methods.deposit(pid, amt).encodeABI()
        
        let actionText = ""
        if (pid === 0) actionText = "Depositing your xHUBBLE to Mission Control"
        else if (pid === 1) actionText = "Depositing your xEX to the Dark Energy Module"
        else if (pid === 2) actionText = "Depositing your HUBBLE/USDC to the Captains Lounge"
        else actionText = "Depositing your EX/stS to the Merchant Docks"
        
        app.setPendingText(actionText)
        
        sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            callback()
            if (pid === 0) getMC2Info(getUserInfo(getPendingRewards(getExAndXhubbleBal(contracts.xHUBBLE, hubble.setXHubbleBalance, contracts.XEX, ex.setXexBalance, address))))
            if (pid === 1) getDEMInfo(getDemUserInfo(getPendingRewardsDEM(getExAndXhubbleBal(contracts.xHUBBLE, hubble.setXHubbleBalance, contracts.XEX, ex.setXexBalance, address))))
            if (pid === 2) lp.get_lp_hubble_Info(lp.get_lp_hubble_UserInfo(lp.getPendingRewardsLP_hubble(_lp_hubble(contracts.lp_hubble, lp.set_lp_hubble_Balance, contracts.xHUBBLE, hubble.setXHubbleBalance, address))))
            if (pid === 3) lp.get_lp_ex_Info(lp.get_lp_ex_UserInfo(lp.getPendingRewardsLP_ex(_lp_ex(contracts.lp_ex, lp.set_lp_ex_Balance, contracts.xHUBBLE, hubble.setXHubbleBalance, address))))
        })
    }
    
    const stakeMc2 = () => {
        return () => {
            const amt = web3.utils.toWei(mc2StakeRef.current.value, "ether")
            
            checkAllowance(contracts.xHUBBLE, contracts.MC2.options.address, amt, address, (allowance) => {
                if (web3.utils.fromWei(allowance, "ether") >= mc2StakeRef.current.value) {
                    deposit(amt)
                } else {
                    app.setPendingText("Approving MC2 Contract to spend your xHUBBLE")
                    approve(contracts.xHUBBLE, contracts.MC2.options.address, amt, () => {
                        deposit(amt)
                    })
                }
            })
        }
    }
    
    const unstakeMc2 = () => {
        return () => {
            const amt = web3.utils.toWei(mc2UnstakeRef.current.value, "ether")
            const data = contracts.MC2.methods.withdraw(0, amt).encodeABI()
            
            app.setPendingText("Withdrawing your xHUBBLE")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                getMC2Info(getUserInfo(getPendingRewards()))
                getBal(contracts.xHUBBLE, address, hubble.setXHubbleBalance)
            })
        }
    }
    
    const claimRewardsMc2 = (callback = () => { }) => {
        return () => {
            const data = contracts.MC2.methods.deposit(0, 0).encodeABI()
            
            app.setPendingText("Claiming your Mission Control v2 Rewards")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                getMC2Info(getUserInfo(getPendingRewards(getExAndXhubbleBal(contracts.xHUBBLE, hubble.setXHubbleBalance, contracts.XEX, ex.setXexBalance, address))))
                callback()
            })
        }
    }
    
    const getMC2Info = (callback = () => { }) => {
        contracts.MC2.methods.poolInfo(0)
            .call({ from: address })
            .then((poolInfo) => {
                setMc2Info(poolInfo)
                callback(poolInfo)
            })
    }
    
    const getUserInfo = (callback = () => { }) => {
        contracts.MC2.methods.userInfo(0, address)
            .call({ from: address })
            .then((userInfo) => {
                setMc2bal(userInfo)
                callback(userInfo)
            })
    }
    
    const getPendingRewards = () => {
        contracts.MC2.methods.pendingRewards(0, address)
            .call({ from: address })
            .then(setPr)
    }

    // ========== DARK ENERGY MODULE FUNCTIONS ==========
    
    const stakeDEM = () => {
        return () => {
            const amt = web3.utils.toWei(demStakeRef.current.value, "ether")
            
            checkAllowance(contracts.XEX, contracts.MC2.options.address, amt, address, (allowance) => {
                if (web3.utils.fromWei(allowance, "ether") >= demStakeRef.current.value) {
                    deposit(amt, 1)
                } else {
                    app.setPendingText("Approving MC2 Contract to spend your xEX")
                    approve(contracts.XEX, contracts.MC2.options.address, amt, () => {
                        deposit(amt, 1)
                    })
                }
            })
        }
    }
    
    const unstakeDEM = () => {
        return () => {
            const amt = web3.utils.toWei(demUnstakeRef.current.value, "ether")
            const data = contracts.MC2.methods.withdraw(1, amt).encodeABI()
            
            app.setPendingText("Withdrawing your xEX")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                getDEMInfo(getDemUserInfo(getPendingRewardsDEM()))
                getBal(contracts.XEX, address, ex.setXexBalance)
            })
        }
    }
    
    const claimRewardsDEM = (callback = () => { }) => {
        return () => {
            const data = contracts.MC2.methods.deposit(1, 0).encodeABI()
            
            app.setPendingText("Claiming your Dark Energy Module Rewards")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                getDEMInfo(getDemUserInfo(getPendingRewardsDEM(getExAndXhubbleBal(contracts.xHUBBLE, hubble.setXHubbleBalance, contracts.XEX, ex.setXexBalance, address))))
                callback()
            })
        }
    }
    
    const getDEMInfo = (callback = () => { }) => {
        contracts.MC2.methods.poolInfo(1)
            .call({ from: address })
            .then((poolInfo) => {
                setDemInfo(poolInfo)
                callback(poolInfo)
            })
    }
    
    const getDemUserInfo = (callback = () => { }) => {
        contracts.MC2.methods.userInfo(1, address)
            .call({ from: address })
            .then((userInfo1) => {
                setDembal(userInfo1)
                callback(userInfo1)
            })
    }
    
    const getPendingRewardsDEM = () => {
        contracts.MC2.methods.pendingRewards(1, address)
            .call({ from: address })
            .then(setPrDem)
    }

    // ========== LP FUNCTIONS ==========
    
    const stakeLP_hubble = () => {
        return () => {
            const amt = web3.utils.toWei(lp.lp_hubble_StakeRef.current.value, "ether")
            
            checkAllowance(contracts.lp_hubble, contracts.MC2.options.address, amt, address, (allowance) => {
                if (web3.utils.fromWei(allowance, "ether") >= lp.lp_hubble_StakeRef.current.value) {
                    deposit(amt, 2)
                } else {
                    app.setPendingText("Approving MC2 Contract to spend your HUBBLE LP")
                    approve(contracts.lp_hubble, contracts.MC2.options.address, amt, () => {
                        deposit(amt, 2)
                    })
                }
            })
        }
    }
    
    const unstakeLP_hubble = () => {
        return () => {
            const amt = web3.utils.toWei(lp.lp_hubble_UnstakeRef.current.value, "ether")
            const data = contracts.MC2.methods.withdraw(2, amt).encodeABI()
            
            app.setPendingText("Withdrawing your Hubble LP")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                lp.get_lp_hubble_Info(lp.get_lp_hubble_UserInfo(lp.getPendingRewardsLP_hubble(_xhubble(contracts.xHUBBLE, hubble.setXHubbleBalance, address))))
                getBal(contracts.lp_hubble, lp.set_lp_hubble_Balance)
            })
        }
    }
    
    const claimRewardsLP_hubble = (callback = () => { }) => {
        return () => {
            const data = contracts.MC2.methods.deposit(2, 0).encodeABI()
            
            app.setPendingText("Claiming your Dark Energy Module Rewards")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                lp.getPendingRewardsLP_hubble(_xhubble(contracts.xHUBBLE, hubble.setXHubbleBalance, address))
                callback()
            })
        }
    }
    
    const stakeLP_ex = () => {
        return () => {
            const amt = web3.utils.toWei(lp.lp_ex_StakeRef.current.value, "ether")
            
            checkAllowance(contracts.lp_ex, contracts.MC2.options.address, amt, address, (allowance) => {
                if (web3.utils.fromWei(allowance, "ether") >= lp.lp_ex_StakeRef.current.value) {
                    deposit(amt, 3)
                } else {
                    app.setPendingText("Approving MC2 Contract to spend your EX LP")
                    approve(contracts.lp_ex, contracts.MC2.options.address, amt, () => {
                        deposit(amt, 3)
                    })
                }
            })
        }
    }
    
    const unstakeLP_ex = () => {
        return () => {
            const amt = web3.utils.toWei(lp.lp_ex_UnstakeRef.current.value, "ether")
            const data = contracts.MC2.methods.withdraw(3, amt).encodeABI()
            
            app.setPendingText("Withdrawing your Ex LP")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                lp.get_lp_ex_Info(lp.get_lp_ex_UserInfo(lp.getPendingRewardsLP_ex(_xhubble(contracts.xHUBBLE, hubble.setXHubbleBalance, address))))
                getBal(contracts.lp_ex, lp.set_lp_ex_Balance)
            })
        }
    }
    
    const claimRewardsLP_ex = (callback = () => { }) => {
        return () => {
            const data = contracts.MC2.methods.deposit(3, 0).encodeABI()
            
            app.setPendingText("Claiming your Ex/Sts Rewards")
            sendRequest(contracts.MC2.options.address, data, address, app.setIsPending, app.setPendingText, () => {
                lp.getPendingRewardsLP_ex(_xhubble(contracts.xHUBBLE, hubble.setXHubbleBalance, address))
                callback()
            })
        }
    }

    // ========== PROTOCOL STATE FUNCTIONS ==========
    
    const getFrontData = () => {
        contracts.HUBBLE.methods.balanceOf(contracts.xHUBBLE.options.address)
            .call({ from: address })
            .then((hubbleLocked) => {
                const hubbleLockedNum = Number(web3.utils.fromWei(hubbleLocked, "ether"))
                
                contracts.HUBBLE.methods.balanceOf("0xd5A638a1E6D55Dee90688e65F15BFA3f08d869A1")
                    .call({ from: address })
                    .then((hubbleReserves) => {
                        const hubbleReservesNum = Number(web3.utils.fromWei(hubbleReserves, "ether"))
                        
                        contracts.HUBBLE.methods.balanceOf("0x000000000000000000000000000000000000dEaD")
                            .call({ from: address })
                            .then((hubbleDead) => {
                                const hubbleDeadNum = Number(web3.utils.fromWei(hubbleDead, "ether"))
                                hubble.setHubbleCirculating(200000 - hubbleLockedNum - hubbleReservesNum - hubbleDeadNum)
                                exGets()
                            })
                    })
            })
    }
    
    const exGets = () => {   
        getBalOf(contracts.EX, EX_LP_V2, address, (balv2) => {
            ex.setExV2(balv2)
            getBalOf(contracts.EX, EX_LP_CL,address, (balcl) => {
                ex.setExCL(balcl)
                getBalOf(contracts.EX, contracts.XEX.options.address, address, (balxex) => {
                    ex.setExLocked(balxex)
                    contracts.epochs.methods.circulatingSupplyOfEx()
                        .call({ from: address })
                        .then((supply) => {
                            ex.setExSupply(supply)
                        })
                        .catch((error) => {
                            // Keep supply visible even if the Epochs helper is
                            // temporarily unavailable. totalSupply is read from
                            // the EX token itself as a reliable fallback.
                            contracts.EX.methods.totalSupply()
                                .call({ from: address })
                                .then(ex.setExSupply)
                                .catch(() => ex.setExSupply("0"))
                        })
                })
            })
        })
    }
    
    const getOraclePrice = () => {
        contracts.oracle.methods.currentPrice()
            .call({ from: address })
            .then((cp) => {
                setCurrentPrice(cp)
                getEpochs()
                
                contracts.oracle.methods.twap_hourly()
                    .call({ from: address })
                    .then((twap_hourly) => {
                        setTwapHourly(twap_hourly)
                        contracts.oracle.methods.twap_()
                            .call({ from: address })
                            .then(setTwap)
                            .catch((error) => console.warn("Unable to load oracle TWAP", error))
                    })
                    .catch((error) => console.warn("Unable to load hourly oracle TWAP", error))
            })
            .catch((error) => console.warn("Unable to load current oracle price", error))
    }
    
    const getEpochs = () => {
        contracts.epochs.methods.currentEpoch()
            .call({ from: address })
            .then((epochData) => {
                setEpoch(epochData)
                contracts.epochs.methods.DSR()
                    .call({ from: address })
                    .then((_dsr) => {
                        setDsr(_dsr)
                        
                    })
                    .catch((error) => console.warn("Unable to load epoch DSR", error))
            })
            .catch((error) => console.warn("Unable to load current epoch", error))
    }

    // ========== EX MINTING/REDEEMING FUNCTIONS ==========
    
    const mintPopup = () => {
        setIsMinting(true)
    }
    
    const redemptionPopup = () => {
        setIsRedeeming(true)
    }
    
    const closeMint = () => {
        setIsMinting(false)
    }
    
    const closeRedeem = () => {
        setIsRedeeming(false)
    }
    
    const mintExOnClick = () => {
        const numAmt = Number(exMintRef.current.value)
        const amt = web3.utils.toWei(exMintRef.current.value, "ether")
        
        checkAllowance(contracts.STS, contracts.minter.options.address, web3.utils.toWei(numAmt * 1.0201, "ether"), address, (allowance) => {
            if (web3.utils.fromWei(allowance, "ether") >= numAmt * 1.0201) {
                mintEx(amt)
            } else {
                app.setPendingText("Approving Minter Contract to spend your STS")
                approve(contracts.STS, contracts.minter.options.address, web3.utils.toWei(numAmt * 1.0201, "ether"), () => {
                    mintEx(amt)
                })
            }
        })
    }
    
    const mintEx = (amt) => {
        const data = contracts.minter.methods.mintEX(amt).encodeABI()
        
        app.setPendingText("Minting EX for stS")
        sendRequest(contracts.minter.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.STS, address, ex.setStsBalance)
            getBal(contracts.EX, address, ex.setExBalance)
        })
    }
    
    const redeemPremium = (amt) => {
        const data = contracts.redeemer.methods.redeem(amt).encodeABI()
        
        app.setPendingText("Redeeming EX for stS")
        sendRequest(contracts.redeemer.options.address, data, address, app.setIsPending, app.setPendingText, () => {
            getBal(contracts.STS, address, ex.setStsBalance)
            getBal(contracts.EX, address, ex.setExBalance)
        })
    }
    
    const redeem = () => {
        const amt = web3.utils.toWei(exRedemptionRef.current.value, "ether")
        const redeemerAddress = "0x2dDd8A28f3619E67C149A91CD0Dc96bB788757dA"
        
        checkAllowance(contracts.EX, redeemerAddress, amt, address, (allowance) => {
            if (web3.utils.fromWei(allowance, "ether") >= exRedemptionRef.current.value) {
                redeemPremium(amt)
            } else {
                app.setPendingText("Approving Redeemer Contract to spend your EX")
                approve(contracts.EX, redeemerAddress, amt, () => {
                    redeemPremium(amt)
                })
            }
        })
    }

    // ========== UI FUNCTIONS ==========
    
    const toggleMobileNav = () => {
        app.setNavMobileToggle(!app.navMobileToggle)
    }
    
    const epochType = ["Neutral", "Light", "Dark"]

    // Icon Components
    const HubbleIcon = () => (<div className="icon icon--hubble"><img src={IMAGES.dd} /></div>)
    const XhubbleIcon = () => (<div className="icon icon--xhubble"><img src={IMAGES.xi} /></div>)

    // Function to extract data from step-5 and step-1
const extractTweetData = () => {
    // Extract Dark Energy Module data from step-5
    const darkEnergyAPR = Math.round(100 * (365 * activeRates[1] * hubble.hubble_price) / 
      (web3.utils.fromWei(demInfo.totalStake, "ether") * ex.ex_price))
    
    const xEXStaked = Math.round(web3.utils.fromWei(demInfo.totalStake, "ether"))
    const xEXValue = Math.round(ex.ex_price * xEXStaked)
    
    // Extract Protocol State data from step-1 (first data-tile)
    const epochNumber = epoch["0"]
    const epochTypeName = epochType[epoch["1"]]
    const epochAge = Math.round(100 * (Date.now() / 1000 - Number(epoch["2"])) / (60 * 60)) / 100
    
    const dsrValue = Math.round(1000 * Number(dsr) / 10000) / 1000
    const dsrStatus = (Number(dsr) >= 10000) ? "Fully Backed" :
                     (Number(dsr) >= 9100) ? "Partially Backed" : "Black Hole Imminent"
    
    // EX price data
    const exCurrentPrice = Math.round(1000 * web3.utils.fromWei(currentPrice, "ether")) / 1000
    const exPriceUSD = Math.round(100 * ex.ex_price) / 100
    
    // Hubble data
    const hubblePriceUSD = Math.round(100 * hubble.hubble_price) / 100
    const hubbleCirculating = Math.round(100 * hubble.hubbleCirculating) / 100
    
    return {
      darkEnergyAPR,
      xEXStaked,
      xEXValue,
      epochNumber,
      epochType: epochTypeName,
      epochAge,
      dsrValue,
      dsrStatus,
      exCurrentPrice,
      exPriceUSD,
      hubblePriceUSD,
      hubbleCirculating
    }
  }
  
  // Function to generate tweet text
  const generateTweetText = (data) => {
    return `🌌 Dark Energy Module Analysis\n\n` +
            `🌠 APR: ${data.darkEnergyAPR}%\n` +
           `🔬 Epoch ${data.epochNumber} (${data.epochType})\n` +
           `📊 DSR: ${data.dsrValue} (${data.dsrStatus})\n` +
           `⚡ $EX Price: ${data.exCurrentPrice} stS ($${data.exPriceUSD})\n` +
           ` ⚡$xEX Staked: ${data.xEXStaked}\n` +
           `🪐 Hubble: $${data.hubblePriceUSD}\n\n` +
           `Convert your $stS and earn on @hubble_sonic @SonicLabs @beets_fi`
  }
  
  // Function to generate chart image (simplified version)
  const generateChartImage = async (data) => {
    // This is a simplified version. For a real implementation, you might want to:
    // 1. Use html2canvas to capture a specific element
    // 2. Use a server-side image generation service
    // 3. Use Chart.js to create a chart
    
    // For now, we'll create a simple text-based image using canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    
    const ctx = canvas.getContext('2d')
    
    // Background
    ctx.fillStyle = '#0a0e17'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Dark Energy Analysis', canvas.width / 2, 80)
    
    // Data
    ctx.font = '28px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`Epoch ${data.epochNumber} (${data.epochType})`, 100, 160)
    ctx.fillText(`DSR: ${data.dsrValue}`, 100, 210)
    ctx.fillText(`EX Price: $${data.exPriceUSD}`, 100, 260)
    ctx.fillText(`Dark Energy APR: ${data.darkEnergyAPR}%`, 100, 310)
    ctx.fillText(`xEX Staked: ${data.xEXStaked} ($${data.xEXValue})`, 100, 360)
    ctx.fillText(`Hubble: $${data.hubblePriceUSD}`, 100, 410)
    
    // Footer
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#888888'
    ctx.fillText('Generated via Hubble Protocol', canvas.width / 2, 580)
    ctx.fillText('xhubble.xyz', canvas.width / 2, 610)
    
    return canvas.toDataURL('image/png')
  }
  
  // Main tweet generation function
  const generateTweetFromData = async () => {
    try {
      // Extract data
      const tweetData = extractTweetData()
      
      // Generate tweet text
      const tweetText = generateTweetText(tweetData)
      setTweetContent(tweetText)
      
      // Generate image
      const imageData = await generateChartImage(tweetData)
      setTweetImageData(imageData)
      
      // Open modal
      setTweetModalOpen(true)
      
    } catch (error) {
      console.error("Error generating tweet:", error)
      alert("Failed to generate tweet. Please try again.")
    }
  }
  
  // Function to post to Twitter
  const postToTwitter = () => {
    // Encode the tweet for Twitter URL
    const encodedTweet = encodeURIComponent(tweetContent)
    
    // Create Twitter intent URL
    let twitterUrl = `https://x.com/intent/tweet?text=${encodedTweet}`
    
    // Note: For images, you would need to use Twitter API v2
    // This opens a new window with the tweet pre-filled
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    
    // Close modal
    setTweetModalOpen(false)
  }

    // ========== RENDER ==========
    
    return (
        <div className={"App App--" + isConnected + " App-chain--" + chainId}>
            <div className="the-back" style={{ backgroundImage: `url(${IMAGES.bg})` }}></div>
            <div className="the-back cover"></div>
            <div className="bg">
                <div className="inner">
                    <div className="inner-inner">
                        {/* Protocol State */}
                        <div className={"step step-1 step--" + app.activeStep}>
                            <div className="step-title"><img src={IMAGES.dd} /><span>Protocol State</span></div>
                            <div className="data-tile">
                                <h3>A3 Epoch {epoch["0"]}</h3>
                                <p className="data-focus">{epochType[epoch["1"]]}</p>
                                <p className="data-item">{Math.round(100 * (Date.now() / 1000 - Number(epoch["2"])) / (60 * 60)) / 100} Hours Old</p>
                                <p className="data-item">Start Price: {Math.round(1000 * web3.utils.fromWei(epoch["3"], "ether")) / 1000} stS</p>
                            </div>
                            
                            <div className="data-tile">
                                <h3>Death Spiral Ratio</h3>
                                <p className="data-focus">{Math.round(1000 * Number(dsr) / 10000) / 1000}</p>
                                <p className="data-item">
                                    {(Number(dsr) >= 10000) ? "Fully Backed" :
                                     (Number(dsr) >= 9100) ? "Partially Backed" : "Black Hole Imminent"}
                                </p>
                            </div>
                            
                         
                            
                            <div className="step-title"><img src={IMAGES.ex} /><span>EX</span></div>
                            <div className="data-tile">
                                <h3>$EX</h3>
                                <p className="data-focus">TWAP: {Math.round(1000 * web3.utils.fromWei(twap, "ether")) / 1000} stS</p>
                                <p className="data-item">1 Hour TWAP: {Math.round(1000 * web3.utils.fromWei(twapHourly, "ether")) / 1000} stS</p>
                                <p className="data-item">Current Price: {Math.round(1000 * web3.utils.fromWei(currentPrice, "ether")) / 1000} stS</p>
                                <p className="data-item">$EX: ${Math.round(100 * ex.ex_price) / 100}</p>
                            </div>
                            
                            <div className="data-tile">
                                <h3>EX Supply</h3>
                                <p className="data-focus">{Math.round(web3.utils.fromWei(ex.exSupply, "ether"))} $EX</p>
                                <p className="data-item">Locked: {Math.round(web3.utils.fromWei(ex.exLocked, "ether"))} $EX</p>
                            </div>
                            
                            <div className="data-tile">
                                <h3>EX Circulating</h3>
                                <p className="data-focus">{Math.round(web3.utils.fromWei(ex.exSupply, "ether")) - Math.round(web3.utils.fromWei(ex.exLocked, "ether"))} $EX</p>
                                <p className="data-item">V2 Liquidity: {Math.round(web3.utils.fromWei(ex.exV2, "ether"))} $EX</p>
                                <p className="data-item">CL: {Math.round(web3.utils.fromWei(ex.exCL, "ether"))} $EX</p>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.dd} /><span>Hubble</span></div>
                            <div className="data-tile">
                                <h3>Hubble Price</h3>
                                <p className="data-focus">${Math.round(100 * hubble.hubble_price) / 100}</p>
                            </div>
                            
                            <div className="data-tile">
                                <h3>HUBBLE Circulating</h3>
                                <p className="data-focus">{Math.round(100 * hubble.hubbleCirculating) / 100} $HUBBLE</p>
                                <p className="data-item">${Math.round(100 * hubble.hubble_price * hubble.hubbleCirculating) / 100}</p>
                            </div>
                        </div>
                        
                        {/* Galactic Bank */}
                        <div className={"step step-2 step--" + app.activeStep}>
                            <div className="step-title"><img src={IMAGES.xi} /><span>Galactic Bank: Hubble Desk</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Convert HUBBLE to xHUBBLE</h2>
                                    <p>Convert HUBBLE to xHUBBLE at any time. The process is instant, and the ratio is 1:1.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.dd} /></div>
                                        <div className="icon-text">
                                            <div className="small">Convert</div>
                                            <div className="large">HUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={hubble.hubbleRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(hubble.hubbleBalance, "ether"), hubble.hubbleRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(hubble.hubbleBalance, "ether")}</span>
                                    </div>
                                    <button onClick={lock}>Lock</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Vested Exit</h2>
                                    <p>Redeem xHUBBLE over a 180 day vesting period. You can cancel the vest in the first 14 days.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Vest</div>
                                            <div className="large">xHUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={hubble.vestRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(hubble.xhubbleBalance, "ether"), hubble.vestRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(hubble.xhubbleBalance, "ether")}</span>
                                    </div>
                                    <button onClick={vest}>Vest</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Instant Exit</h2>
                                    <p>Instantly exit to HUBBLE, incurring a 50% penalty. This process cannot be reverted, all forfeited HUBBLE is streamed back to stakers.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Exit</div>
                                            <div className="large">xHUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={hubble.unlockRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(hubble.xhubbleBalance, "ether"), hubble.unlockRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(hubble.xhubbleBalance, "ether")}</span>
                                    </div>
                                    <button onClick={earlyExit}>Exit</button>
                                </div>
                            </div>
                            
                            {/* Hubble Vest List */}
                            <div className="vest-list-container">
                                <h3>Your Hubble Vests ({hubble.vests.length})</h3>
                                
                                {hubble.vestsLoading ? (
                                    <div className="loading-vests">Loading vests...</div>
                                ) : hubble.vests.length === 0 ? (
                                    <div className="no-vests">No active vests</div>
                                ) : (
                                    <div className="vest-list">
                                        {hubble.vests.map(vest => {
                                            const daysRemaining = hubble.getDaysRemaining(vest)
                                            const progress = hubble.getVestProgress(vest)
                                            const status = hubble.getVestStatus(vest)
                                            const isReady = status === 'ready'
                                            
                                            return (
                                                <div key={vest.id} className="vest-item">
                                                    <div className="vest-header">
                                                        <span>Vest #{vest.id + 1}</span>
                                                        <span>{web3.utils.fromWei(vest.amount, "ether")} xHUBBLE</span>
                                                    </div>
                                                    
                                                    <div className="vest-progress">
                                                        <div 
                                                            className="vest-progress-bar" 
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                        <span className="vest-progress-text">
                                                            {status === 'claimed' ? 'Claimed' : 
                                                             status === 'ready' ? 'Ready to claim' : 
                                                             `${daysRemaining} days remaining`}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="vest-details">
                                                        <div className="vest-detail">
                                                            <span>Start:</span>
                                                            <span>{new Date(vest.start * 1000).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="vest-detail">
                                                            <span>End:</span>
                                                            <span>{new Date(vest.end * 1000).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <button 
                                                        className="vest-action-btn"
                                                        onClick={() => exitHubbleVest(vest.vestID)}
                                                    
                                                    >
                                                        {vest.end <= Date.now() / 1000 ? 'Claim Full Amount' : 'Exit Early'}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.ex} /><span>Galactic Bank: EX Desk</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Convert EX to xEX</h2>
                                    <p>Convert EX to xEX at any time. The process is instant, and the ratio is 1:1.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.ex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Convert</div>
                                            <div className="large">EX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={ex.exRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.exBalance, "ether"), ex.exRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(ex.exBalance, "ether")}</span>
                                    </div>
                                    <button onClick={lockEx}>Lock</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Vested Exit</h2>
                                    <p>Redeem xEX over a 14 day vesting period. You can cancel the vest in the first 7 days.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Vest</div>
                                            <div className="large">xEX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={ex.vestXEXRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.xexBalance, "ether"), ex.vestXEXRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(ex.xexBalance, "ether")}</span>
                                    </div>
                                    <button onClick={vestXEX}>Vest</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Instant Exit</h2>
                                    <p>Instantly exit to EX, incurring a 50% penalty. This process cannot be reverted, all forfeited EX is streamed back to stakers.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Exit</div>
                                            <div className="large">xEX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={ex.xexRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.xexBalance, "ether"), ex.xexRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(ex.xexBalance, "ether")}</span>
                                    </div>
                                    <button onClick={earlyExitXEX}>Exit</button>
                                </div>
                            </div>
                            
                            <div className="vest-list-container">
    <h3>Your EX Vests ({ex.xexVests.length})</h3>
    
    {ex.xexVestsLoading ? (
        <div className="loading-vests">Loading vests...</div>
    ) : ex.xexVests.length === 0 ? (
        <div className="no-vests">No active vests</div>
    ) : (
        <div className="vest-list">
            {ex.xexVests.map(vest => {
                const daysRemaining = ex.getXEXDaysRemaining(vest)
                const progress = ex.getXEXVestProgress(vest)
                const status = ex.getXEXVestStatus(vest)
                const isReady = status === 'ready'
                
                return (
                    <div key={vest.id} className="vest-item">
                        <div className="vest-header">
                            <span>Vest #{vest.id + 1}</span>
                            <span>{web3.utils.fromWei(vest.amount, "ether")} xEX</span>
                        </div>
                        
                        <div className="vest-progress">
                            <div 
                                className="vest-progress-bar" 
                                style={{ width: `${progress}%` }}
                            ></div>
                            <span className="vest-progress-text">
                                {status === 'claimed' ? 'Claimed' : 
                                 status === 'ready' ? 'Ready to claim' : 
                                 `${daysRemaining} days remaining`}
                            </span>
                        </div>
                        
                        <div className="vest-details">
                            <div className="vest-detail">
                                <span>Start:</span>
                                <span>{new Date(vest.start * 1000).toLocaleDateString()}</span>
                            </div>
                            <div className="vest-detail">
                                <span>End:</span>
                                <span>{new Date(vest.end * 1000).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <button 
                            className="vest-action-btn"
                            onClick={() => exitXEXVest(vest.vestID)}
                     
                        >
                           {vest.end <= Date.now() / 1000 ? 'Claim Full Amount' : 'Exit Early'}
                        </button>
                    </div>
                )
            })}
        </div>
    )}
</div>
                        </div>
                        
                        {/* Mission Control */}
                        <div className={"step step-3 step--" + app.activeStep}>
                            <div className="data-tile">
                                <h3>Mission Control</h3>
                                <p className="data-focus">
                                    {Math.round(100 * (365 * (activeRates[0] * hubble.hubble_price + exRate * ex.ex_price)) / Math.round(hubble.hubble_price * web3.utils.fromWei(mc2Info.totalStake, "ether")))}% APR
                                </p>
                                <p className="data-item">{Math.round(web3.utils.fromWei(mc2Info.totalStake, "ether"))} $xHUBBLE Staked</p>
                                <p className="data-item">${Math.round(hubble.hubble_price * web3.utils.fromWei(mc2Info.totalStake, "ether"))}</p>
                                <p className="data-item">{Math.round(1000 * exRate)/1000 } $EX generated per day</p>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.mc} /><span>Mission Control v2</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Claim your Rewards</h2>
                                    <p>Claim your Rewards</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Claim</div>
                                            <div className="large">Rewards</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <div>{web3.utils.fromWei(pr[1], "ether")} xHUBBLE</div>
                                        <div>{web3.utils.fromWei(pr[3], "ether")} xEX</div>
                                    </div>
                                    <button onClick={claimRewardsMc2()}>Claim</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Stake your $xHUBBLE</h2>
                                    <p>Stake your $xHUBBLE in Mission Control v2 to earn rewards and participate in governance.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Stake</div>
                                            <div className="large">xHUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={mc2StakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(hubble.xhubbleBalance, "ether"), mc2StakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(hubble.xhubbleBalance, "ether")}</span>
                                    </div>
                                    <button onClick={stakeMc2()}>Stake</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Unstake your $xHUBBLE</h2>
                                    <p>Unstake your $xHUBBLE from Mission Control v2 to stop earning rewards and reset your votes.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Unstake</div>
                                            <div className="large">xHUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={mc2UnstakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(mc2Bal, "ether"), mc2UnstakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(mc2Bal, "ether")}</span>
                                    </div>
                                    <button onClick={unstakeMc2()}>Unstake</button>
                                </div>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.mc} /><span>Mission Control v1</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Unstake your $xHUBBLE</h2>
                                    <p>Unstake your $xHUBBLE from Mission Control to stop earning rewards and reset your votes.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Unstake</div>
                                            <div className="large">xHUBBLE</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={unstakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(mcBalance, "ether"), unstakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(mcBalance, "ether")}</span>
                                    </div>
                                    <button onClick={unstake}>Unstake</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Galactic Exchange */}
                        <div className={"step step-4 step--" + app.activeStep}>
                            <div className="step-title"><img src={IMAGES.ex} /><span>Galactic Exchange: Black Market</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Redeem $EX 1-to-{Math.round(1000 * (Number(dsr) - 10) / 10000) / 1000}</h2>
                                    <p>Redeem 1 liquid $EX for {Math.round(1000 * (Number(dsr) - 10) / 10000) / 1000} $stS.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.ex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Redeem</div>
                                            <div className="large">EX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={exRedemptionRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.exBalance, "ether"), exRedemptionRef)}>MAX</button>
                                    </div>
                                    <button onClick={redemptionPopup}>Redeem</button>
                                </div>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.ex} /><span>Galactic Exchange: Minting Market</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Mint $EX</h2>
                                    <p>Mint 1 liquid $EX for 1.02 $stS.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.ex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Mint</div>
                                            <div className="large">EX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={exMintRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.stsBalance, "ether") / 1.02, exMintRef)}>MAX</button>
                                    </div>
                                    <button onClick={mintPopup}>Mint</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Dark Energy Module */}
                        <div className={"step step-5 step--" + app.activeStep}>
                            <div className="data-tile">
                                <h3>Dark Energy</h3>
                                <p className="data-focus">
                                    {Math.round(100 * (365 * activeRates[1] * hubble.hubble_price) / (web3.utils.fromWei(demInfo.totalStake, "ether") * ex.ex_price))}% APR
                                </p>
                                <p className="data-item">{Math.round(web3.utils.fromWei(demInfo.totalStake, "ether"))} $xEX Staked</p>
                                <p className="data-item">${Math.round(ex.ex_price * web3.utils.fromWei(demInfo.totalStake, "ether"))}</p>
                            </div>
                            {/* Add this after the existing content in step-5 */}
<div className="tweet-generator-section">
  <button 
    className="tweet-generator-btn"
    onClick={() => generateTweetFromData()}
  >
    🐦 Generate & Tweet
  </button>
  
  {/* Add this modal for tweet preview */}
  {tweetModalOpen && (
    <div className="tweet-modal-overlay">
      <div className="tweet-modal">
        <h3>Tweet Preview</h3>
        <div className="tweet-content">
          <p id="tweetTextPreview">{tweetContent}</p>
          
          {/*tweetImageData && (
            <div className="tweet-image-preview">
              <img src={tweetImageData} alt="Dark Energy Chart" />
            </div>
          )*/}
        </div>
        <div className="tweet-actions">
          <button 
            className="tweet-post-btn"
            onClick={() => postToTwitter()}
          >
            Post to Twitter
          </button>
          <button 
            className="tweet-regenerate-btn"
            onClick={() => generateTweetFromData()}
          >
            Regenerate
          </button>
          <button 
            className="tweet-cancel-btn"
            onClick={() => setTweetModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}
</div>
                            
                            <div className="step-title"><img src={IMAGES.xex} /><span>Dark Energy Module</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Claim your Rewards</h2>
                                    <p>Claim your Rewards</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Claim</div>
                                            <div className="large">Rewards</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <div>{web3.utils.fromWei(prdem[1], "ether")} xHUBBLE</div>
                                    </div>
                                    <button onClick={claimRewardsDEM()}>Claim</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Stake your $xEX</h2>
                                    <p>Stake your $xEX in the Dark Energy Module to earn rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Stake</div>
                                            <div className="large">xEX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={demStakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(ex.xexBalance, "ether"), demStakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(ex.xexBalance, "ether")}</span>
                                    </div>
                                    <button onClick={stakeDEM()}>Stake</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Unstake your $xEX</h2>
                                    <p>Unstake your $xEX from the Dark Energy Module to stop earning rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xex} /></div>
                                        <div className="icon-text">
                                            <div className="small">Unstake</div>
                                            <div className="large">xEX</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={demUnstakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(demBal, "ether"), demUnstakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(demBal, "ether")}</span>
                                    </div>
                                    <button onClick={unstakeDEM()}>Unstake</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Starport */}
                        <div className={"step step-6 step--" + app.activeStep}>
                            <div className="data-tile">
                                <h3>Captains Lounge</h3>
                                <p className="data-focus">
                                    {Math.round(100 * (365 * activeRates[2] * hubble.hubble_price) / (web3.utils.fromWei(lp.hubbleLP_Info.totalStake, "ether") * lp.lp_hubble_price))}% APR
                                </p>
                                <p className="data-item">${Math.round(lp.lp_hubble_price * web3.utils.fromWei(lp.hubbleLP_Info.totalStake, "ether"))} HUBBLE/USDC V2 Shadow LP</p>
                            </div>
                            
                            <div className="data-tile">
                                <h3>Merchant Docks</h3>
                                <p className="data-focus">
                                    {Math.round(100 * (365 * activeRates[3] * hubble.hubble_price) / (web3.utils.fromWei(lp.exstsLP_Info.totalStake, "ether") * lp.lp_ex_price))}% APR
                                </p>
                                <p className="data-item">${Math.round(lp.lp_ex_price * web3.utils.fromWei(lp.exstsLP_Info.totalStake, "ether"))} EX/stS V2 Shadow LP</p>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.husd} /><span>Starport: Captains Lounge</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Claim your Rewards</h2>
                                    <p>Claim your Rewards</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Claim</div>
                                            <div className="large">Rewards</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <div>{web3.utils.fromWei(lp.lp_hubble_pr[1], "ether")} xHUBBLE</div>
                                    </div>
                                    <button onClick={claimRewardsLP_hubble()}>Claim</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Stake your HUBBLE/USDC LP</h2>
                                    <p>Stake your HUBBLE/USDC LP in the Starport to earn rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.husd} /></div>
                                        <div className="icon-text">
                                            <div className="small">Stake</div>
                                            <div className="large">HUBBLE/USDC</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={lp.lp_hubble_StakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(lp.lp_hubble_Balance, "ether"), lp.lp_hubble_StakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(lp.lp_hubble_Balance, "ether")}</span>
                                    </div>
                                    <button onClick={stakeLP_hubble()}>Stake</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Unstake your HUBBLE/USDC</h2>
                                    <p>Unstake your HUBBLE/USDC from the Starport to stop earning rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.husd} /></div>
                                        <div className="icon-text">
                                            <div className="small">Unstake</div>
                                            <div className="large">HUBBLE/USDC</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={lp.lp_hubble_UnstakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(lp.starport_hubble_bal, "ether"), lp.lp_hubble_UnstakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(lp.starport_hubble_bal, "ether")}</span>
                                    </div>
                                    <button onClick={unstakeLP_hubble()}>Unstake</button>
                                </div>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.exsts} /><span>Starport: Merchant Docks</span></div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Claim your Rewards</h2>
                                    <p>Claim your Rewards</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.xi} /></div>
                                        <div className="icon-text">
                                            <div className="small">Claim</div>
                                            <div className="large">Rewards</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <div>{web3.utils.fromWei(lp.lp_ex_pr[1], "ether")} xHUBBLE</div>
                                    </div>
                                    <button onClick={claimRewardsLP_ex()}>Claim</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Stake your EX/stS LP</h2>
                                    <p>Stake your EX/stS LP in the Starport to earn rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.exsts} /></div>
                                        <div className="icon-text">
                                            <div className="small">Stake</div>
                                            <div className="large">EX/stS</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={lp.lp_ex_StakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(lp.lp_ex_Balance, "ether"), lp.lp_ex_StakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(lp.lp_ex_Balance, "ether")}</span>
                                    </div>
                                    <button onClick={stakeLP_ex()}>Stake</button>
                                </div>
                            </div>
                            
                            <div className="locker">
                                <div className="locker-text">
                                    <h2>Unstake your EX/stS</h2>
                                    <p>Unstake your EX/stS from the Starport to stop earning rewards.</p>
                                </div>
                                <div className="locker-locker">
                                    <div className="locker-icon">
                                        <div className="hubble-icon"><img src={IMAGES.exsts} /></div>
                                        <div className="icon-text">
                                            <div className="small">Unstake</div>
                                            <div className="large">EX/stS</div>
                                        </div>
                                    </div>
                                    <div className="locker-input">
                                        <input ref={lp.lp_ex_UnstakeRef} placeholder="0" />
                                        <button className="max-button" onClick={setRefToThis(web3.utils.fromWei(lp.starport_ex_bal, "ether"), lp.lp_ex_UnstakeRef)}>MAX</button>
                                        <span>Balance: {web3.utils.fromWei(lp.starport_ex_bal, "ether")}</span>
                                    </div>
                                    <button onClick={unstakeLP_ex()}>Unstake</button>
                                </div>
                            </div>
                            
                            <div className="step-title"><img src={IMAGES.planet} /><span>Starport: Genesis</span></div>
                            <p><a href="https://genesis.xhubble.xyz" target="_blank" rel="noopener noreferrer">Withdraw from Genesis Pools</a></p>
                        </div>
                    </div>
                    
                    <div onClick={toggleMobileNav} className={"nav nav--" + app.navMobileToggle}>
                        <div className="link" onClick={() => app.setActiveStep(1)}>Home</div>
                        <div className="link" onClick={() => app.setActiveStep(2)}>Bank</div>
                        <div className="link" onClick={() => app.setActiveStep(3)}>Mission Control</div>
                        <div className="link" onClick={() => app.setActiveStep(4)}>GEX</div>
                        <div className="link" onClick={() => app.setActiveStep(5)}>Dark Energy</div>
                        <div className="link" onClick={() => app.setActiveStep(6)}>Starport</div>
                    </div>
                    
                    {isConnected && <div className={"wallet-drawer wallet-drawer--" + (walletExpanded ? "open" : "closed")}>
                        <button
                            type="button"
                            className="wallet-drawer-toggle"
                            onClick={() => setWalletExpanded((open) => !open)}
                            aria-expanded={walletExpanded}
                        >
                            <span className="wallet-drawer-title">Token Balances</span>
                            <span className="wallet-drawer-count">5 assets</span>
                            <span className="wallet-drawer-chevron" aria-hidden="true">⌄</span>
                        </button>
                        {walletExpanded && <div className="wallet-drawer-list">
                            <div className="wallet-token-row"><HubbleIcon /><span>HUBBLE</span><strong>{Math.round(web3.utils.fromWei(hubble.hubbleBalance, "ether") * 1000) / 1000}</strong></div>
                            <div className="wallet-token-row"><XhubbleIcon /><span>xHUBBLE</span><strong>{Math.round(web3.utils.fromWei(hubble.xhubbleBalance, "ether") * 1000) / 1000}</strong></div>
                            <div className="wallet-token-row"><div className="icon icon--sts"><img src={IMAGES.sts} alt="stS" /></div><span>stS</span><strong>{Math.round(web3.utils.fromWei(ex.stsBalance, "ether") * 1000) / 1000}</strong></div>
                            <div className="wallet-token-row"><div className="icon icon--ex"><img src={IMAGES.ex} alt="EX" /></div><span>EX</span><strong>{Math.round(web3.utils.fromWei(ex.exBalance, "ether") * 1000) / 1000}</strong></div>
                            <div className="wallet-token-row"><div className="icon icon--xex"><img src={IMAGES.xex} alt="xEX" /></div><span>xEX</span><strong>{Math.round(web3.utils.fromWei(ex.xexBalance, "ether") * 1000) / 1000}</strong></div>
                        </div>}
                    </div>}
                    
                    <div className="dd"><img src={IMAGES.dd} /></div>
                    <div className="connect-button">
                        <div className="inliner"><ConnectButton /></div>
                    </div>
                    
                    {/* Modals */}
                    <div className={"pending pending--" + isMinting}>
                        <p className="pending-title">Minting $EX</p>
                        <p className="pending-text">You will mint {mintingAmount} $EX for {mintingAmount} $stS.</p>
                        <button onClick={mintExOnClick}>MINT</button>
                        <button onClick={closeMint}>BACK</button>
                    </div>
                    
                    <div className={"pending pending--" + isRedeeming}>
                        <p className="pending-title">Redeeming $EX</p>
                        <p className="pending-text">You will redeem $EX for $stS.</p>
                        <button onClick={redeem}>REDEEM</button>
                        <button onClick={closeRedeem}>BACK</button>
                    </div>
                    
                    <div className={"pending pending--" + app.pending}>
                        <p className="pending-title">Transaction Pending</p>
                        <p className="pending-text">{app.pendingText}</p>
                        <div className="pending-animation">
                            <div className="animation"><img src={IMAGES.pend} /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
