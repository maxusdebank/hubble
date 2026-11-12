import React from 'react'
import { web3 } from '../components/utils/web3Instance'
import { getBal } from '../components/utils/walletHelpers'

export const useEx = (address, contracts) => {
    // EX State
    const [stsBalance, setStsBalance] = React.useState(0)
    const [exBalance, setExBalance] = React.useState(0)
    const [xexBalance, setXexBalance] = React.useState(0)
    const [ex_price, set_ex_price] = React.useState(0.5)
    const [exMints, setExMints] = React.useState(0)
    const [remainingMints, setRemainingMints] = React.useState(0)
    const [exSupply, setExSupply] = React.useState(0)
    const [exLocked, setExLocked] = React.useState(0)
    const [exV2, setExV2] = React.useState(0)
    const [exCL, setExCL] = React.useState(0)
    
    // Vesting State - Updated for list view
    const [xexVests, setXexVests] = React.useState([]) // Array of all vests
    const [xexVestsLoading, setXexVestsLoading] = React.useState(false)
    const [activeXEXVest, setActiveXEXVest] = React.useState(0) // Keep for compatibility

    // Refs for EX operations
    const exRef = React.useRef(null)
    const xexRef = React.useRef(null)
    const vestXEXRef = React.useRef(null)

    // Get EX balances
    const getExBalances = React.useCallback((callback = () => {}) => {
        if (!address || !contracts.EX || !contracts.XEX) return
        
        getBal(contracts.STS, address, (stsBal) => {
            setStsBalance(stsBal)
            getBal(contracts.EX, address, (exBal) => {
                setExBalance(exBal)
                getBal(contracts.XEX, address, (xexBal) => {
                    setXexBalance(xexBal)
                    callback()
                })
            })
        })
    }, [address, contracts.STS, contracts.EX, contracts.XEX])

    // Get all EX vests - Updated to fetch all vests at once
    const getXEXVests = React.useCallback(() => {
        if (!address || !contracts.XEX) return
        
        setXexVestsLoading(true)
        
        // First get total vest count
        contracts.XEX.methods.usersTotalVests(address)
            .call({ from: address })
            .then(count => {
                const vestCount = Number(count)
                
                if (vestCount === 0) {
                    setXexVests([])
                    setXexVestsLoading(false)
                    return
                }
                
                // Fetch all vests in parallel
                const vestPromises = []
                for (let i = 0; i < vestCount; i++) {
                    vestPromises.push(
                        contracts.XEX.methods.vestInfo(address, i)
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
                        
                        setXexVests(validVests)
                        setXexVestsLoading(false)
                    })
                    .catch(error => {
                        console.error('Error fetching EX vests:', error)
                        setXexVestsLoading(false)
                    })
            })
            .catch(error => {
                console.error('Error fetching EX vest count:', error)
                setXexVestsLoading(false)
            })
    }, [address, contracts.XEX])

    // Get single vest info (for compatibility with existing code)
    const getVestXEXInfo = React.useCallback((index) => {
        if (!address || !contracts.XEX || index >= xexVests.length) return
        
        if (xexVests[index]) {
            setActiveXEXVest(index)
            // The vest info is already in xexVests array
        }
    }, [address, contracts.XEX, xexVests])

    // Navigation for vests (keep for compatibility if needed)
    const prevVestXEX = React.useCallback(() => {
        if (activeXEXVest > 0) {
            setActiveXEXVest(activeXEXVest - 1)
        }
    }, [activeXEXVest])

    const nextVestXEX = React.useCallback(() => {
        if (activeXEXVest < xexVests.length - 1) {
            setActiveXEXVest(activeXEXVest + 1)
        }
    }, [activeXEXVest, xexVests.length])

    // Get EX data (mints, remaining mints)
    const gexData = React.useCallback(() => {
        if (!address || !contracts.EX121) return
        
        contracts.EX121.methods.remainingMints(address)
            .call({ from: address })
            .then((rm) => {
                setRemainingMints(rm)
                contracts.EX121.methods.mints(address)
                    .call({ from: address })
                    .then(setExMints)
            })
    }, [address, contracts.EX121])

    // Helper functions for vest calculations
    const getXEXVestProgress = React.useCallback((vest) => {
        if (!vest || !vest.start || !vest.end) return 0
        
        const now = Date.now() / 1000
        const totalDuration = vest.end - vest.start
        const elapsed = Math.max(0, now - vest.start)
        
        return Math.min(100, (elapsed / totalDuration) * 100)
    }, [])

    const getXEXDaysRemaining = React.useCallback((vest) => {
        if (!vest || !vest.end) return 0
        
        const now = Date.now() / 1000
        const secondsRemaining = Math.max(0, vest.end - now)
        
        return Math.ceil(secondsRemaining / (60 * 60 * 24))
    }, [])

    const getXEXVestStatus = React.useCallback((vest) => {
        if (!vest) return 'unknown'
        
        const now = Date.now() / 1000
        const daysRemaining = getXEXDaysRemaining(vest)
        
        if (vest.withdrawn > 0) {
            return 'claimed'
        } else if (daysRemaining <= 0) {
            return 'ready'
        } else {
            return 'vesting'
        }
    }, [getXEXDaysRemaining])

    // Get total vested amount
    const getTotalXEXVested = React.useCallback(() => {
        return xexVests.reduce((total, vest) => {
            return total + (Number(vest.withdrawn) > 0 ? 0 : Number(vest.amount))
        }, 0)
    }, [xexVests])

    // Get claimable amount
    const getXEXClaimableAmount = React.useCallback(() => {
        return xexVests.reduce((total, vest) => {
            const now = Date.now() / 1000
            if (Number(vest.withdrawn) === 0 && vest.end <= now) {
                return total + Number(vest.amount)
            }
            return total
        }, 0)
    }, [xexVests])

    // Get active (vesting) vests
    const getActiveXEXVests = React.useCallback(() => {
        return xexVests.filter(vest => {
            const status = getXEXVestStatus(vest)
            return status === 'vesting' || status === 'ready'
        })
    }, [xexVests, getXEXVestStatus])

    // For backward compatibility - get vest count
    const getVestXEXCount = React.useCallback(() => {
        getXEXVests()
    }, [getXEXVests])

    return {
        // State
        stsBalance,
        exBalance,
        xexBalance,
        ex_price,
        exMints,
        remainingMints,
        exSupply,
        exLocked,
        exV2,
        exCL,
        xexVests, // New: array of vests
        xexVestsLoading,
        vestXEXCount: xexVests.length, // For compatibility
        activeXEXVest,
        vestXEXInfo: xexVests[activeXEXVest] || { amt: 0, end: 0, id: 0, start: 0 }, // For compatibility
        
        // Setters
        setStsBalance,
        setExBalance,
        setXexBalance,
        set_ex_price,
        setExMints,
        setRemainingMints,
        setExSupply,
        setExLocked,
        setExV2,
        setExCL,
        setActiveXEXVest,
        
        // Refs
        exRef,
        xexRef,
        vestXEXRef,
        
        // Functions
        getExBalances,
        getXEXVests, // New: get all vests
        getVestXEXCount, // For backward compatibility
        getVestXEXInfo, // For backward compatibility
        prevVestXEX,
        nextVestXEX,
        gexData,
        
        // New helper functions
        getXEXVestProgress,
        getXEXDaysRemaining,
        getXEXVestStatus,
        getTotalXEXVested,
        getXEXClaimableAmount,
        getActiveXEXVests
    }
}