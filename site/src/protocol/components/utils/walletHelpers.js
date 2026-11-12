// Wallet balance helper functions
export const getBal = (contract, address, callback = () => {}) => {
    contract.methods.balanceOf(address)
        .call({ from: address })
        .then(callback)
}

export const checkAllowance = (contract, spender, amount, address, callback = () => {}) => {
    contract.methods.allowance(address, spender)
        .call({ from: address })
        .then(callback)
}

export const getBalOf = (contract, of, address, callback = () => {}) => {
    console.log("Getting Bal of",contract,of,address)
    contract.methods.balanceOf(of)
        .call({ from: address })
        .then(callback)
}

export const _xhubble = (xHUBBLE, setXHubbleBalance, address) => {
    getBal(xHUBBLE, address, (a) => { setXHubbleBalance(a) })
}

export const _bal_lp_ex = (lp_ex, set_lp_ex_Balance, address) => {
    getBal(lp_ex, address, (b) => { set_lp_ex_Balance(b) })
}

export const _bal_lp_hubble = (lp_hubble, set_lp_hubble_Balance, address) => {
    getBal(lp_hubble, address, (b) => { set_lp_hubble_Balance(b) })
}

export const _lp_hubble = (lp_hubble, set_lp_hubble_Balance, xHUBBLE, setXHubbleBalance, address) => {
    _bal_lp_hubble(lp_hubble, set_lp_hubble_Balance, address)
    _xhubble(xHUBBLE, setXHubbleBalance, address)
}

export const _lp_ex = (lp_ex, set_lp_ex_Balance, xHUBBLE, setXHubbleBalance, address) => {
    _bal_lp_ex(lp_ex, set_lp_ex_Balance, address)
    _xhubble(xHUBBLE, setXHubbleBalance, address)
}

export const getExAndXhubbleBal = (xHUBBLE, setXHubbleBalance, XEX, setXexBalance, address) => {
    getBal(xHUBBLE, address, setXHubbleBalance)
    getBal(XEX, address, setXexBalance)
}