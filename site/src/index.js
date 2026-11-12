import React from 'react';
import ReactDOM from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { sonic } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './AppShell';
import './shell.css';
import './redesign.css';
import './final-theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const walletConfig = getDefaultConfig({
  appName: 'Hubble Protocol',
  projectId: 'a606fe80de150ee52fc410ba078ae2c0',
  chains: [sonic]
});
const queryClient = new QueryClient();

root.render(
  <WagmiProvider config={walletConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider><AppShell /></RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
