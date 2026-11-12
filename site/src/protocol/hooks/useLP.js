import React from 'react'
import { web3 } from '../components/utils/web3Instance'

export const useLP = (address, contracts) => {
    // LP State
    const [lp_hubble_Balance, set_lp_hubble_Balance] = React.useState(0)
    const [lp_ex_Balance, set_lp_ex_Balance] = React.useState(0)
    const [lp_hubble_price, set_lp_hubble_price] = React.useState(0)
    const [lp_ex_price, set_lp_ex_price] = React.useState(1)
    const [starport_hubble_bal, setStarport_hubble_bal] = React.useState(0)
    const [starport_ex_bal, setStarport_ex_bal] = React.useState(0)
    const [hubbleLP_Info, setHubbleLP_Info] = React.useState({ 
        token: "", 
        totalStake: "0", 
        lastRewardTime: "0", 
        isStarted: true 
    })
    const [exstsLP_Info, setExstsLP_Info] = React.useState({ 
        token: "", 
        totalStake: "0", 
        lastRewardTime: "0", 
        isStarted: true 
    })
    const [lp_hubble_pr, set_lp_hubble_pr] = React.useState(["0", "0", "0", "0", "0"])
    const [lp_ex_pr, set_lp_ex_pr] = React.useState(["0", "0", "0", "0", "0"])

    // Refs for LP operations
    const lp_hubble_StakeRef = React.useRef(null)
    const lp_hubble_UnstakeRef = React.useRef(null)
    const lp_ex_StakeRef = React.useRef(null)
    const lp_ex_UnstakeRef = React.useRef(null)

    // Get LP hubble info
    const get_lp_hubble_Info = React.useCallback((callback = () => { }) => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.poolInfo(2)
            .call({ from: address })
            .then((poolInfo) => {
                setHubbleLP_Info(poolInfo)
                callback(poolInfo)
            })
    }, [address, contracts.MC2])

    // Get LP hubble user info
    const get_lp_hubble_UserInfo = React.useCallback((callback = () => { }) => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.userInfo(2, address)
            .call({ from: address })
            .then((userInfo1) => {
                setStarport_hubble_bal(userInfo1)
                callback(userInfo1)
            })
    }, [address, contracts.MC2])

    // Get pending rewards for LP hubble
    const getPendingRewardsLP_hubble = React.useCallback(() => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.pendingRewards(2, address)
            .call({ from: address })
            .then(set_lp_hubble_pr)
    }, [address, contracts.MC2])

    // Get LP ex info
    const get_lp_ex_Info = React.useCallback((callback = () => { }) => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.poolInfo(3)
            .call({ from: address })
            .then((poolInfo) => {
                setExstsLP_Info(poolInfo)
                callback(poolInfo)
            })
    }, [address, contracts.MC2])

    // Get LP ex user info
    const get_lp_ex_UserInfo = React.useCallback((callback = () => { }) => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.userInfo(3, address)
            .call({ from: address })
            .then((userInfo1) => {
                setStarport_ex_bal(userInfo1)
                callback(userInfo1)
            })
    }, [address, contracts.MC2])

    // Get pending rewards for LP ex
    const getPendingRewardsLP_ex = React.useCallback(() => {
        if (!address || !contracts.MC2) return
        
        contracts.MC2.methods.pendingRewards(3, address)
            .call({ from: address })
            .then(set_lp_ex_pr)
    }, [address, contracts.MC2])

    return {
        // State
        lp_hubble_Balance,
        lp_ex_Balance,
        lp_hubble_price,
        lp_ex_price,
        starport_hubble_bal,
        starport_ex_bal,
        hubbleLP_Info,
        exstsLP_Info,
        lp_hubble_pr,
        lp_ex_pr,
        
        // Setters
        set_lp_hubble_Balance,
        set_lp_ex_Balance,
        set_lp_hubble_price,
        set_lp_ex_price,
        setStarport_hubble_bal,
        setStarport_ex_bal,
        setHubbleLP_Info,
        setExstsLP_Info,
        set_lp_hubble_pr,
        set_lp_ex_pr,
        
        // Refs
        lp_hubble_StakeRef,
        lp_hubble_UnstakeRef,
        lp_ex_StakeRef,
        lp_ex_UnstakeRef,
        
        // Functions
        get_lp_hubble_Info,
        get_lp_hubble_UserInfo,
        getPendingRewardsLP_hubble,
        get_lp_ex_Info,
        get_lp_ex_UserInfo,
        getPendingRewardsLP_ex
    }
}