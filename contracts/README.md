# Hubble contracts

This directory contains the Solidity source published and verified for Hubble's Sonic deployments. Files are organized by deployed component and preserve the source layout exposed by SonicScan.

The canonical address manifest is [`deployments/sonic.json`](../deployments/sonic.json). Each source bundle can be checked against the deployment's **Contract** tab on [SonicScan](https://sonicscan.org).

## Included verified deployments

| Component | Contract | Sonic address |
|---|---|---|
| HUBBLE | `HubbleShares` | [`0xd441…1CBd`](https://sonicscan.org/address/0xd441a37aA73fc1DDd2db99FC4c92f233b7d41CBd#code) |
| xHUBBLE | `LockedHubble` | [`0x14D1…77A8`](https://sonicscan.org/address/0x14D1Db2367312Ee3BBA54905b64f3bf0f0D677A8#code) |
| Genesis whitelist | `GenesisWhitelist` | [`0xf40B…7D2B`](https://sonicscan.org/address/0xf40B50b8d3467240D09080f993ED1644C41C7D2B#code) |
| Mission Control V1 | `MissionControl` | [`0x4123…D757`](https://sonicscan.org/address/0x4123a6174270D6a3ffEbd252ac3Ff43e5C26D757#code) |
| Voting module | `VotingModule` | [`0xf9Ad…E4a2`](https://sonicscan.org/address/0xf9Ad65801f4E5257cc3e098d3C61f3AfE228E4a2#code) |
| Reward module | `RewardModule` | [`0xE6f3…bAEE`](https://sonicscan.org/address/0xE6f3AcBd7d6F1791F5FB54A19E8a8C0a984BbAEE#code) |
| Genesis pool | `GenesisPool` | [`0x0946…d0c7`](https://sonicscan.org/address/0x094606ca700e68e18f6A8Eee2ea4419c662Fd0c7#code) |
| Legacy EX mint | `ExInitialMintingGame` | [`0x808D…ec05`](https://sonicscan.org/address/0x808D5663680C65eaC27a94fEb4ad33719f56ec05#code) |
| EX | `ExToken` | [`0xd4d1…4802`](https://sonicscan.org/address/0xd4d197F3397C8F28f4BC2C698104CfbCC3e04802#code) |
| xEX | `LockedEx` | [`0x13a6…FC87`](https://sonicscan.org/address/0x13a67513c56c9E90D09d4163d233DaD819c2FC87#code) |
| Mission Control V2 | `MissionControlv3` | [`0xd268…A71A`](https://sonicscan.org/address/0xd268e36Ea3c1948284D40855cc2C26A71Ad07095#code) |
| EX oracle | `ExOracleV2` | [`0x4b02…8a83`](https://sonicscan.org/address/0x4b027fa9d8e0e0863447498150278fc8aa888a83#code) |
| Alpha epochs | `HubbleAlphaEpochs` | [`0xacFe…a62`](https://sonicscan.org/address/0xacFe02A1Ad557Af0818963eDf48BfccE34f27a62#code) |
| Redeemer | `Redeemer` | [`0x3C3c…66B5`](https://sonicscan.org/address/0x3C3cC567b7c8f98e7BD244E575FdE61016ef66B5#code) |
| Redemption pool | `ExRedemptionPool` | [`0x2dDd…57dA`](https://sonicscan.org/address/0x2dDd8A28f3619E67C149A91CD0Dc96bB788757dA#code) |

## Missing source

The frontend configuration references the following deployed contracts, but SonicScan does not currently expose verified Solidity source for them:

| Component | Sonic address | Available locally |
|---|---|---|
| EX121 | [`0x6fD8…234C`](https://sonicscan.org/address/0x6fD8c51ecd8E65F89F647c93fa7B1c37120c234C#code) | ABI only (`ex121.json`) |
| Minter | [`0x82B1…C698`](https://sonicscan.org/address/0x82B18a8f57E7791d6DAE4FfCfDbeCf404CEDC698#code) | ABI only (`minter.json`) |

Those two source files remain the known gap. They should be added only from the original deployment source or after matching a candidate source build to the deployed bytecode.

## External dependencies

stS, USDC, and the DEX liquidity-pool contracts are listed in the deployment manifest but are not copied into this directory because they are maintained by external protocols.

## Provenance

These files mirror public verified-source bundles. Their inclusion here documents deployed code; it does not imply that the repository currently contains a reproducible deployment toolchain or that the contracts have been audited.
