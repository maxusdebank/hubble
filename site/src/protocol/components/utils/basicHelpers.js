// Simple utility functions that don't depend on component state
export const fetchPrice = (tokenAddress, callback = () => {}) => {
    const baseUrl = "https://www.hubble-server.xyz:1443/price"
    const url = `${baseUrl}?token=${tokenAddress}`
    
    fetch(url)
        .then((response) => response.json())
        .then(callback)
        .catch(error => {
            console.error("Failed to fetch price:", error);
            callback({ error: true });
        })
}

export const setRefToThis = (setToThis, theRef) => {
    return () => {
        theRef.current.value = setToThis
    }
}