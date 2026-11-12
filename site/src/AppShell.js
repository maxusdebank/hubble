import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Activity, ArrowDownUp, BarChart3, Dices, Gauge, LayoutDashboard, Menu, Repeat2, X } from 'lucide-react';
import ProtocolApp from './protocol/App';
import EngineApp from './engine/App';
import BridgeApp from './bridge/App';
import FlipApp from './flip/App';
import DashboardApp from './dashboard/App';
import TradeApp from './trade/App';
import TokenBalanceBar from './TokenBalanceBar';

const pages = [
  { id: 'protocol', label: 'Protocol', icon: LayoutDashboard, component: ProtocolApp },
  { id: 'portfolio', label: 'Portfolio', icon: BarChart3, component: DashboardApp },
  { id: 'engine', label: 'Engine Room', icon: Gauge, component: EngineApp },
  { id: 'bridge', label: 'txHUB Bridge', icon: ArrowDownUp, component: BridgeApp },
  { id: 'trade', label: 'Trade', icon: Repeat2, component: TradeApp },
  { id: 'flip', label: 'Redshift Flip', icon: Dices, component: FlipApp },
];

export default function AppShell() {
  const [active, setActive] = useState('protocol');
  const [menuOpen, setMenuOpen] = useState(false);
  const page = pages.find((item) => item.id === active) || pages[0];
  const Page = page.component;


  return (
    <div className="v2-shell">
      <header className="v2-topbar">
        <button className="v2-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <button className="v2-brand" onClick={() => setActive('protocol')}>
          <span className="v2-orbit"><img src="/imgs/h-icon.png" alt="Hubble" /></span>
          <span><b>HUBBLE</b><small>PROTOCOL CONSOLE</small></span>
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          {pages.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); setMenuOpen(false); }}>
              <Icon />{label}
            </button>
          ))}
        </nav>
        <div className="v2-network"><span /><Activity /> SONIC · LIVE</div>
        <ConnectButton.Custom>{({ account, openAccountModal, openConnectModal, mounted }) => (
          <button className="v2-wallet" disabled={!mounted} onClick={account ? openAccountModal : openConnectModal}>
            {account ? account.displayName : 'CONNECT WALLET'}
          </button>
        )}</ConnectButton.Custom>
      </header>
      <TokenBalanceBar />
      <div className={`v2-page v2-page-${active}`} key={active}>
        <div className="v2-section-label"><span>HUBBLE / {page.label.toUpperCase()}</span><b>MAINNET · CHAIN 146</b></div>
        <Page />
      </div>
    </div>
  );
}
