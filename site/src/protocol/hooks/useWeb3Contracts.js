import React from 'react'
import { web3 } from '../components/utils/web3Instance'

export const useWeb3Contracts = (networkConfig) => {
    const contracts = React.useMemo(() => {
        return {
            HUBBLE: new web3.eth.Contract(networkConfig["hubble"]["abi"], networkConfig["hubble"]["address"]),
            xHUBBLE: new web3.eth.Contract(networkConfig["xhubble"]["abi"], networkConfig["xhubble"]["address"]),
            MC: new web3.eth.Contract(networkConfig["mc"]["abi"], networkConfig["mc"]["address"]),
            RewardModule: new web3.eth.Contract(networkConfig["rm"]["abi"], networkConfig["rm"]["address"]),
            STS: new web3.eth.Contract(networkConfig["sts"]["abi"], networkConfig["sts"]["address"]),
            EX: new web3.eth.Contract(networkConfig["ex"]["abi"], networkConfig["ex"]["address"]),
            XEX: new web3.eth.Contract(networkConfig["xex"]["abi"], networkConfig["xex"]["address"]),
            EX121: new web3.eth.Contract(networkConfig["ex121"]["abi"], networkConfig["ex121"]["address"]),
            MC2: new web3.eth.Contract(networkConfig["mc2"]["abi"], networkConfig["mc2"]["address"]),
            oracle: new web3.eth.Contract(networkConfig["exoracle"]["abi"], networkConfig["exoracle"]["address"]),
            epochs: new web3.eth.Contract(networkConfig["epochs"]["abi"], networkConfig["epochs"]["address"]),
            redeemer: new web3.eth.Contract(networkConfig["redeemer"]["abi"], networkConfig["redeemer"]["address"]),
            minter: new web3.eth.Contract(networkConfig["minter"]["abi"], networkConfig["minter"]["address"]),
            lp_hubble: new web3.eth.Contract(networkConfig["husd"]["abi"], networkConfig["husd"]["address"]),
            lp_ex: new web3.eth.Contract(networkConfig["exsts"]["abi"], networkConfig["exsts"]["address"]),
            USDC: new web3.eth.Contract(networkConfig["hubble"]["abi"],"0x29219dd400f2Bf60E5a23d13Be72B486D4038894")
        }
    }, [networkConfig])

    return contracts
}