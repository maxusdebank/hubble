import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  sonic
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import './App.css';
import './step.css';
import './connect-button.css';
import './pending.css'
import './dd.css'
import './icon.css'
import './modal.css'
import './inner.css'
import './nav.css'
import './locker.css'
import './voting.css'
import './pools.css'
import { Web3App } from './web3app.js'

const config = getDefaultConfig({
  appName: 'Derps Mint',
  projectId: 'a606fe80de150ee52fc410ba078ae2c0',
  chains: [sonic]
});
const queryClient = new QueryClient();

const App = () => {
  return <Web3App config={config}/>;
};

export default App;
