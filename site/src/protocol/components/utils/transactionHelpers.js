import { web3 } from './web3Instance'

export const getTransactionReceipt = (hash, callback = () => {}) => {
    window.ethereum.request({
        method: "eth_getTransactionReceipt",
        params: [hash]
    }).then((res) => {
        if (res == null) {
            getTransactionReceipt(hash, callback)
        }
        callback(res)
    }).catch((err) => {
        console.log(err)
    })
}

export const estimateGas = (contract, data, address, callback = () => {}) => {
    if (typeof window.ethereum !== 'object') {
        alert("Please open this page in the Metamask browser")
        return
    }
    
    window.ethereum.request({
        method: "eth_estimateGas",
        params: [{
            from: address,
            to: contract,
            value: web3.utils.toHex(0),
            data: data,
        }],
    }).then((gasAmount) => {
        callback(gasAmount)
    }).catch((err) => {
        alert(err.data.message)
    })
}

export const sendRequest = (contract, data, address, setIsPending, setPendingText, callback = () => {}) => {
    estimateGas(contract, data, address, () => {
        setIsPending(true)
        if (typeof window.ethereum !== 'object') return
        
        window.ethereum.request({
            method: "eth_sendTransaction",
            params: [{
                from: address,
                to: contract,
                value: 0,
                data: data,
            }],
        }).then((hash) => {
            getTransactionReceipt(hash, (receipt) => {
                if (receipt != null) {
                    setIsPending(false)
                    callback()
                }
            })
        }).catch((err) => {
            setIsPending(false)
        })
    })
}