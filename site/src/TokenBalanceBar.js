import React from 'react';
import { formatUnits } from 'viem';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { ChevronDown, Wallet } from 'lucide-react';
import { WALLET_TOKENS } from './walletTokens';

const BALANCE_ABI = [{
  type: 'function',
  name: 'balanceOf',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}];

function displayBalance(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0';
  if (amount < 0.0001) return '<0.0001';
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function TokenBalanceBar() {
  const [open, setOpen] = React.useState(false);
  const { address, isConnected } = useAccount();
  const native = useBalance({
    address,
    chainId: 146,
    query: { enabled: Boolean(address), refetchInterval: 15000 },
  });
  const tokens = useReadContracts({
    contracts: WALLET_TOKENS.map((token) => ({
      address: token.address,
      abi: BALANCE_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      chainId: 146,
    })),
    allowFailure: true,
    query: { enabled: Boolean(address), refetchInterval: 15000 },
  });

  const nativeAmount = native.isLoading ? '…' : displayBalance(native.data?.formatted);

  return <aside className={`v2-wallet-float ${open ? 'open' : ''}`} aria-label="Wallet balances">
    {open && <div className="v2-wallet-panel">
      <div className="v2-wallet-panel-head"><span>WALLET BALANCES</span><code>{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'NOT CONNECTED'}</code></div>
      {!isConnected || !address ? <div className="v2-wallet-empty"><Wallet /><b>Connect your wallet from the top bar</b><span>Your Sonic assets will appear here.</span></div> : <div className="v2-wallet-assets">
        <div className="v2-wallet-asset"><i>S</i><span><b>Sonic</b><small>S</small></span><strong>{nativeAmount}</strong></div>
        {WALLET_TOKENS.map((token, index) => {
          const result = tokens.data?.[index];
          const formatted = result?.status === 'success' ? formatUnits(result.result, token.decimals) : null;
          return <div className="v2-wallet-asset" key={token.address}>
            <i><img src={token.icon} alt="" /></i><span><b>{token.name}</b><small>{token.symbol}</small></span>
            <strong>{tokens.isLoading ? '…' : displayBalance(formatted)}</strong>
          </div>;
        })}
      </div>}
    </div>}
    <button className="v2-wallet-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="v2-wallet-trigger-icon"><Wallet /></span>
      <span><small>{isConnected ? 'MY WALLET' : 'WALLET'}</small><b>{isConnected ? `${nativeAmount} S` : 'NOT CONNECTED'}</b></span>
      <ChevronDown className="v2-wallet-chevron" />
    </button>
  </aside>;
}

