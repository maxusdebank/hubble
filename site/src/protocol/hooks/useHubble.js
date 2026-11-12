import React from 'react'
import { web3 } from '../components/utils/web3Instance'
import { getBal } from '../components/utils/walletHelpers'

export const useHubble = (address, contracts) => {
    // Hubble State
    const [hubbleBalance, setHubbleBalance] = React.useState(0)
    const [xhubbleBalance, setXHubbleBalance] = React.useState(0)
    const [hubble_price, set_hubble_price] = React.useState(0)
    const [hubbleCirculating, setHubbleCirculating] = React.useState(7000)
    
    // Vesting State - Updated for list view
    const [vests, setVests] = React.useState([]) // Array of all vests
    const [vestsLoading, setVestsLoading] = React.useState(false)
    const [activeVest, setActiveVest] = React.useState(0) // Keep for compatibility if needed

    // Refs for Hubble operations
    const hubbleRef = React.useRef(null)
    const unlockRef = React.useRef(null)
    const vestRef = React.useRef(null)

    // Get Hubble balances
    const getHubbleBalances = React.useCallback((callback = () => {}) => {
        if (!address || !contracts.HUBBLE || !contracts.xHUBBLE) return
        
        getBal(contracts.HUBBLE, address, (hubbleBal) => {
            setHubbleBalance(hubbleBal)
            getBal(contracts.xHUBBLE, address, (xhubbleBal) => {
                setXHubbleBalance(xhubbleBal)
                callback()
            })
        })
    }, [address, contracts.HUBBLE, contracts.xHUBBLE])

    // Get all vests - Updated to fetch all vests at once
    const getVests = React.useCallback(() => {
        if (!address || !contracts.xHUBBLE) return
        
        setVestsLoading(true)
        
        // First get total vest count
        contracts.xHUBBLE.methods.usersTotalVests(address)
            .call({ from: address })
            .then(count => {
                const vestCount = Number(count)
                
                if (vestCount === 0) {
                    setVests([])
                    setVestsLoading(false)
                    return
                }
                
                // Fetch all vests in parallel
                const vestPromises = []
                for (let i = 0; i < vestCount; i++) {
                    vestPromises.push(
                        contracts.xHUBBLE.methods.vestInfo(address, i)
                            .call({ from: address })
                            .then(output => ({
                                id: i,
                                vestID: Number(output.vestID),
                                amount: output.amount,
                                amt: output.amount, // Alias for compatibility
                                start: Number(output.start),
                                end: Number(output.maxEnd),
                                maxEnd: Number(output.maxEnd),
                                withdrawn: Number(output.withdrawn)
                            }))
                    )
                }
                
                Promise.all(vestPromises)
                    .then(vestsArray => {
                        // Filter out empty vests and sort by ID
                        const validVests = vestsArray
                            .filter(vest => Number(vest.amount) > 0)
                            .sort((a, b) => a.id - b.id)
                        
                        setVests(validVests)
                        setVestsLoading(false)
                    })
                    .catch(error => {
                        console.error('Error fetching vests:', error)
                        setVestsLoading(false)
                    })
            })
            .catch(error => {
                console.error('Error fetching vest count:', error)
                setVestsLoading(false)
            })
    }, [address, contracts.xHUBBLE])

    // Get single vest info (for compatibility with existing code)
    const getVestInfo = React.useCallback((index) => {
        if (!address || !contracts.xHUBBLE || index >= vests.length) return
        
        if (vests[index]) {
            setActiveVest(index)
            // The vest info is already in vests array
        }
    }, [address, contracts.xHUBBLE, vests])

    // Navigation for vests (keep for compatibility if needed)
    const prevVest = React.useCallback(() => {
        if (activeVest > 0) {
            setActiveVest(activeVest - 1)
        }
    }, [activeVest])

    const nextVest = React.useCallback(() => {
        if (activeVest < vests.length - 1) {
            setActiveVest(activeVest + 1)
        }
    }, [activeVest, vests.length])

    // Helper functions for vest calculations
    const getVestProgress = React.useCallback((vest) => {
        if (!vest || !vest.start || !vest.end) return 0
        
        const now = Date.now() / 1000
        const totalDuration = vest.end - vest.start
        const elapsed = Math.max(0, now - vest.start)
        
        return Math.min(100, (elapsed / totalDuration) * 100)
    }, [])

    const getDaysRemaining = React.useCallback((vest) => {
        if (!vest || !vest.end) return 0
        
        const now = Date.now() / 1000
        const secondsRemaining = Math.max(0, vest.end - now)
        
        return Math.ceil(secondsRemaining / (60 * 60 * 24))
    }, [])

    const getVestStatus = React.useCallback((vest) => {
        if (!vest) return 'unknown'
        
        const now = Date.now() / 1000
        const daysRemaining = getDaysRemaining(vest)
        
        if (vest.withdrawn > 0) {
            return 'claimed'
        } else if (daysRemaining <= 0) {
            return 'ready'
        } else {
            return 'vesting'
        }
    }, [getDaysRemaining])

    // Get total vested amount
    const getTotalVested = React.useCallback(() => {
        return vests.reduce((total, vest) => {
            return total + (Number(vest.withdrawn) > 0 ? 0 : Number(vest.amount))
        }, 0)
    }, [vests])

    // Get claimable amount
    const getClaimableAmount = React.useCallback(() => {
        return vests.reduce((total, vest) => {
            const now = Date.now() / 1000
            if (Number(vest.withdrawn) === 0 && vest.end <= now) {
                return total + Number(vest.amount)
            }
            return total
        }, 0)
    }, [vests])

    // Get active (vesting) vests
    const getActiveVests = React.useCallback(() => {
        return vests.filter(vest => {
            const status = getVestStatus(vest)
            return status === 'vesting' || status === 'ready'
        })
    }, [vests, getVestStatus])

    return {
        // State
        hubbleBalance,
        xhubbleBalance,
        hubble_price,
        hubbleCirculating,
        vests, // Changed from vestInfo
        vestsLoading,
        vestCount: vests.length, // For compatibility
        activeVest,
        
        // Setters
        setHubbleBalance,
        setXHubbleBalance,
        set_hubble_price,
        setHubbleCirculating,
        setActiveVest,
        
        // Refs
        hubbleRef,
        unlockRef,
        vestRef,
        
        // Functions
        getHubbleBalances,
        getVests, // Changed from getVestCount
        getVestInfo, // Keep for compatibility
        prevVest,
        nextVest,
        
        // New helper functions
        getVestProgress,
        getDaysRemaining,
        getVestStatus,
        getTotalVested,
        getClaimableAmount,
        getActiveVests
    }
}