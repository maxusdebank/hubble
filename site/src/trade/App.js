import React, { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { ArrowDown, Check, LoaderCircle, Plus, Repeat2, ShieldCheck } from 'lucide-react';
import './trade.css';
import './liquidity.css';

const ROUTER = '0x1D368773735ee1E678950B7A97bcA2CafB330CDc';
const TOKENS = {
  EX: { symbol:'EX', name:'Exchange token', address:'0xd4d197F3397C8F28f4BC2C698104CfbCC3e04802', icon:'/imgs/ex.png', decimals:18 },
  stS: { symbol:'stS', name:'Beets Staked S', address:'0xE5DA20F15420aD15DE0fa650600aFc998bbE3955', icon:'/imgs/sts.webp', decimals:18 },
  USDC: { symbol:'USDC', name:'USD Coin', address:'0x29219dd400f2Bf60E5a23d13Be72B486D4038894', icon:'/imgs/usdc.png', decimals:6 },
  HUBBLE: { symbol:'HUBBLE', name:'Hubble Protocol', address:'0xd441a37aA73fc1DDd2db99FC4c92f233b7d41CBd', icon:'/imgs/h-icon.png', decimals:18 },
};
const CHOICES = [
  { id:'ex-sts', label:'EX → stS', from:'EX', to:'stS' },
  { id:'sts-ex', label:'stS → EX', from:'stS', to:'EX' },
  { id:'buy-hubble', label:'Buy HUBBLE', from:'USDC', to:'HUBBLE' },
];
const POOLS = [
  { id:'ex-sts-lp', label:'EX / stS', a:'EX', b:'stS', address:'0x37be2fF30Efde8c05E8E4A59486Db82AEBC5d892' },
  { id:'hubble-usdc-lp', label:'HUBBLE / USDC', a:'HUBBLE', b:'USDC', address:'0x9ff1b68f8bedF4665fE358F92C3E9aF386cb295f' },
];
const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, tuple(address from,address to,bool stable)[] routes) view returns (uint256[] amounts)',
  'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,tuple(address from,address to,bool stable)[] routes,address to,uint256 deadline) returns (uint256[] amounts)',
  'function addLiquidity(address tokenA,address tokenB,bool stable,uint256 amountADesired,uint256 amountBDesired,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline) returns (uint256 amountA,uint256 amountB,uint256 liquidity)',
];
const ERC20_ABI = ['function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)'];
const POOL_ABI = [
  'function token0() view returns(address)',
  'function getReserves() view returns(uint256 reserve0,uint256 reserve1,uint256 blockTimestampLast)'
];

function Token({ token }) {
  return <div className="trade-token"><span className="trade-token-icon"><img src={token.icon} alt="" /></span><span><b>{token.symbol}</b><small>{token.name}</small></span></div>;
}

export default function TradeApp() {
  const [mode, setMode] = useState('swap');
  const [selected, setSelected] = useState(CHOICES[0]);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedPool, setSelectedPool] = useState(POOLS[0]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lastEdited, setLastEdited] = useState('a');
  const [lpStatus, setLpStatus] = useState('');
  const from = TOKENS[selected.from];
  const to = TOKENS[selected.to];
  const route = useMemo(() => [{ from:from.address, to:to.address, stable:false }], [from, to]);
  const poolTokenA = TOKENS[selectedPool.a];
  const poolTokenB = TOKENS[selectedPool.b];
  const sourceAmount = lastEdited === 'a' ? amountA : amountB;

  useEffect(() => {
    setQuote(''); setStatus('');
    if (!amount || Number(amount) <= 0) return;
    const timer = setTimeout(async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://rpc.soniclabs.com');
        const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);
        const result = await router.getAmountsOut(ethers.parseUnits(amount, from.decimals), route);
        setQuote(ethers.formatUnits(result[result.length - 1], to.decimals));
      } catch { setStatus('No live quote is available for this amount.'); }
    }, 350);
    return () => clearTimeout(timer);
  }, [amount, from, to, route]);

  useEffect(() => {
    if (mode !== 'liquidity') return;
    if (!sourceAmount || Number(sourceAmount) <= 0) {
      if (lastEdited === 'a') setAmountB(''); else setAmountA('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLpStatus('Reading live pool ratio…');
        const provider = new ethers.JsonRpcProvider('https://rpc.soniclabs.com');
        const pool = new ethers.Contract(selectedPool.address, POOL_ABI, provider);
        const [token0, reserves] = await Promise.all([pool.token0(), pool.getReserves()]);
        const inputToken = lastEdited === 'a' ? poolTokenA : poolTokenB;
        const outputToken = lastEdited === 'a' ? poolTokenB : poolTokenA;
        const inputIsToken0 = token0.toLowerCase() === inputToken.address.toLowerCase();
        const reserveIn = inputIsToken0 ? reserves[0] : reserves[1];
        const reserveOut = inputIsToken0 ? reserves[1] : reserves[0];
        const inputRaw = ethers.parseUnits(sourceAmount, inputToken.decimals);
        const outputRaw = inputRaw * reserveOut / reserveIn;
        const formatted = Number(ethers.formatUnits(outputRaw, outputToken.decimals)).toLocaleString('en-US', { useGrouping:false, maximumFractionDigits:8 });
        if (lastEdited === 'a') setAmountB(formatted); else setAmountA(formatted);
        setLpStatus('Counterpart amount calculated from live pool reserves.');
      } catch (error) {
        setLpStatus(error?.shortMessage || 'Unable to read the current pool ratio.');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sourceAmount, lastEdited, mode, selectedPool, poolTokenA, poolTokenB]);

  const execute = async () => {
    if (!window.ethereum) return setStatus('Install an EVM wallet to trade.');
    if (!amount || !quote) return setStatus('Enter an amount and wait for a live quote.');
    setBusy(true); setStatus('Checking wallet and allowance…');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 146) await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:'0x92' }] });
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();
      const amountIn = ethers.parseUnits(amount, from.decimals);
      const minimumOut = ethers.parseUnits(quote, to.decimals) * 99n / 100n;
      const token = new ethers.Contract(from.address, ERC20_ABI, signer);
      if (await token.allowance(owner, ROUTER) < amountIn) {
        setStatus(`Approve ${from.symbol} in your wallet…`);
        const approval = await token.approve(ROUTER, amountIn);
        await approval.wait();
      }
      setStatus('Confirm the swap in your wallet…');
      const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
      const tx = await router.swapExactTokensForTokens(amountIn, minimumOut, route, owner, Math.floor(Date.now()/1000)+1200);
      setStatus(`Submitted: ${tx.hash.slice(0,10)}… Waiting for Sonic…`);
      await tx.wait();
      setStatus('Swap complete.'); setAmount(''); setQuote('');
    } catch (error) { setStatus(error?.shortMessage || error?.message || 'Swap cancelled.'); }
    finally { setBusy(false); }
  };

  const addLiquidity = async () => {
    const tokenA = TOKENS[selectedPool.a];
    const tokenB = TOKENS[selectedPool.b];
    if (!window.ethereum) return setLpStatus('Install an EVM wallet to add liquidity.');
    if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) return setLpStatus('Enter both token amounts.');
    setBusy(true); setLpStatus('Checking wallet and allowances…');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 146) await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:'0x92' }] });
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();
      const desiredA = ethers.parseUnits(amountA, tokenA.decimals);
      const desiredB = ethers.parseUnits(amountB, tokenB.decimals);
      for (const [tokenInfo, desired] of [[tokenA, desiredA], [tokenB, desiredB]]) {
        const token = new ethers.Contract(tokenInfo.address, ERC20_ABI, signer);
        if (await token.allowance(owner, ROUTER) < desired) {
          setLpStatus(`Approve ${tokenInfo.symbol} in your wallet…`);
          const approval = await token.approve(ROUTER, desired);
          await approval.wait();
        }
      }
      setLpStatus(`Confirm ${selectedPool.label} liquidity in your wallet…`);
      const router = new ethers.Contract(ROUTER, ROUTER_ABI, signer);
      const tx = await router.addLiquidity(tokenA.address, tokenB.address, false, desiredA, desiredB, desiredA*99n/100n, desiredB*99n/100n, owner, Math.floor(Date.now()/1000)+1200);
      setLpStatus(`Submitted: ${tx.hash.slice(0,10)}… Waiting for Sonic…`);
      await tx.wait();
      setLpStatus('Liquidity added successfully.'); setAmountA(''); setAmountB('');
    } catch (error) { setLpStatus(error?.shortMessage || error?.message || 'Liquidity transaction cancelled.'); }
    finally { setBusy(false); }
  };

  return <main className="trade-page">
    <section className="trade-intro"><p className="trade-kicker">SONIC LIQUIDITY ACCESS</p><h1>{mode==='swap'?'Trade from the':'Build liquidity in the'}<br/><em>Hubble console.</em></h1><p>{mode==='swap'?'Quote, approve and execute through Shadow without leaving Hubble.':'Fund Hubble’s live Shadow pools and receive LP tokens directly in your wallet.'} Your wallet signs every permission and transaction.</p><div className="trade-proof"><ShieldCheck/> Shadow legacy router <span/> 1% slippage guard</div></section>
    <section className="trade-desk">
      <div className="trade-mode"><button className={mode==='swap'?'active':''} onClick={()=>setMode('swap')}><Repeat2/> Swap</button><button className={mode==='liquidity'?'active':''} onClick={()=>setMode('liquidity')}><Plus/> Liquidity</button></div>
      {mode==='swap' ? <>
        <div className="trade-tabs">{CHOICES.map(choice=><button key={choice.id} className={selected.id===choice.id?'active':''} onClick={()=>{setSelected(choice);setAmount('');setQuote('')}}>{choice.label}</button>)}</div>
        <div className="trade-route"><div><small>YOU PAY</small><Token token={from}/><label className="trade-amount"><input aria-label={from.symbol} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.0"/><b>{from.symbol}</b></label></div><span className="trade-arrow"><ArrowDown/></span><div><small>ESTIMATED RECEIVE</small><Token token={to}/><div className="trade-quote">{quote ? Number(quote).toLocaleString(undefined,{maximumFractionDigits:6}) : '—'} <b>{to.symbol}</b></div></div></div>
        <button className="trade-launch" disabled={busy||!quote} onClick={execute}>{busy?<LoaderCircle className="spin"/>:<Check/>}{busy?'Transaction in progress':'Approve & swap on Sonic'}</button>
        <p className={`trade-status ${status==='Swap complete.'?'success':''}`}>{status || 'Live quote from Shadow · minimum received is protected at 1% slippage'}</p>
      </> : <>
        <div className="trade-tabs lp-tabs">{POOLS.map(pool=><button key={pool.id} className={selectedPool.id===pool.id?'active':''} onClick={()=>{setSelectedPool(pool);setAmountA('');setAmountB('');setLastEdited('a');setLpStatus('')}}>{pool.label}</button>)}</div>
        <div className="lp-pair">
          <div><small>DEPOSIT TOKEN A</small><Token token={poolTokenA}/><label className="trade-amount"><input aria-label={`${poolTokenA.symbol} amount`} inputMode="decimal" value={amountA} onChange={e=>{setLastEdited('a');setAmountA(e.target.value.replace(/[^0-9.]/g,''))}} placeholder="0.0"/><b>{poolTokenA.symbol}</b></label></div>
          <span className="lp-plus"><Plus/></span>
          <div><small>DEPOSIT TOKEN B</small><Token token={poolTokenB}/><label className="trade-amount"><input aria-label={`${poolTokenB.symbol} amount`} inputMode="decimal" value={amountB} onChange={e=>{setLastEdited('b');setAmountB(e.target.value.replace(/[^0-9.]/g,''))}} placeholder="0.0"/><b>{poolTokenB.symbol}</b></label></div>
        </div>
        <div className="lp-address"><span>POOL CONTRACT</span><code>{selectedPool.address}</code></div>
        <button className="trade-launch" disabled={busy||!amountA||!amountB} onClick={addLiquidity}>{busy?<LoaderCircle className="spin"/>:<Plus/>}{busy?'Transaction in progress':`Add ${selectedPool.label} liquidity`}</button>
        <p className={`trade-status ${lpStatus==='Liquidity added successfully.'?'success':''}`}>{lpStatus || 'Both tokens are approved separately · LP tokens are sent to your wallet'}</p>
      </>}
    </section>
  </main>;
}
