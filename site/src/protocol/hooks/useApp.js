import React from 'react'

export const useApp = () => {
    // Home is a read-only dashboard. It should render immediately; wallet
    // connection is only required when the user performs an account action.
    const [activeStep, setActiveStep] = React.useState(1)
    const [navMobileToggle, setNavMobileToggle] = React.useState(false)
    const [pending, setIsPending] = React.useState(false)
    const [pendingText, setPendingText] = React.useState("Transaction is in process")
    return {
        activeStep,
        navMobileToggle,
        pending,
        pendingText,
        setActiveStep,
        setNavMobileToggle,
        setIsPending,
        setPendingText
    }
}
