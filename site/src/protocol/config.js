export const config = {
	"testnet": {
		"hubble": {
			"abi": require("./abis/testHubble.json"),
			"address": "0x9e769C46b392dF80d5Eb31a69434F38d59f40a5e"
		},
		"xhubble": {
			"abi": require("./abis/xHUBBLE_v2.json"),
			"address": "0x0Caa519B06EcB3B9B72A8f86B9A7aC5a14875169"
		},
		"wl": {
			"abi": require("./abis/whitelist_v2.json"),
			"address": "0x4E231F4B3aaF55940AE6fFce1a50B9CEfE219A81"
		},
		"mc": {
			"abi": require("./abis/MissionControl.json"),
			"address": "0xe37A8fa98963766D3f2965fd433A780F52FcBeD8"
		},
		"vm": {
			"abi": require("./abis/VotingModule.json"),
			"address": "0xa907C5876F9429D3D355d323df84c384Fee3F998"
		},
		"rm": {
			"abi": require("./abis/RewardModule.json"),
			"address": "0xd9eA2B5807a11908be3F4A59578949e03C6A9288" 
		}

	},
	"mainnet": {
		"hubble": {
			"abi": require("./abis/testHubble.json"),
			"address": "0xd441a37aA73fc1DDd2db99FC4c92f233b7d41CBd"
		},
		"xhubble": {
			"abi": require("./abis/xHUBBLE_v2.json"),
			"address": "0x14D1Db2367312Ee3BBA54905b64f3bf0f0D677A8"
		},
		"wl": {
			"abi": require("./abis/whitelist_v2.json"),
			"address": "0xf40B50b8d3467240D09080f993ED1644C41C7D2B"
		},
		"mc": {
			"abi": require("./abis/MissionControl.json"),
			"address": "0x4123a6174270D6a3ffEbd252ac3Ff43e5C26D757"
		},
		"vm": {
			"abi": require("./abis/VotingModule.json"),
			"address": "0xf9Ad65801f4E5257cc3e098d3C61f3AfE228E4a2"
		},
		"rm": {
			"abi": require("./abis/RewardModule.json"),
			"address": "0xE6f3AcBd7d6F1791F5FB54A19E8a8C0a984BbAEE"  
		},
		"genesis": {
			"abi": require("./abis/genesis.json"),
			"address": "0x094606ca700e68e18f6A8Eee2ea4419c662Fd0c7"  
		},
		"exmint": {
			"abi": require("./abis/exmint.json"),
			"address": "0x808D5663680C65eaC27a94fEb4ad33719f56ec05" 
		},
		"sts": {
			"abi": require("./abis/sts.json"),
			"address": "0xE5DA20F15420aD15DE0fa650600aFc998bbE3955" 
		},
		"ex": {
			"abi": require("./abis/ex.json"),
			"address": "0xd4d197F3397C8F28f4BC2C698104CfbCC3e04802" 
		},
		"xex": {
			"abi": require("./abis/xex.json"),
			"address": "0x13a67513c56c9E90D09d4163d233DaD819c2FC87" 
		},
		"ex121": {
			"abi": require("./abis/ex121.json"),
			"address": "0x6fD8c51ecd8E65F89F647c93fa7B1c37120c234C" 
		},
		"mc2":{
			"abi": require("./abis/MCv2.json"),
			"address":"0xd268e36Ea3c1948284D40855cc2C26A71Ad07095"
		},
		"exsts": {
			"abi": require("./abis/ex.json"),
			"address": "0x37be2fF30Efde8c05E8E4A59486Db82AEBC5d892" 
		},
		"exsts3": {
			"abi": require("./abis/RamsesV3.json"),
			"address": "0xc2f202cca8c4ad1a7e1aa8481667b93278d8f89b"
		},
		"husd": {
			"abi": require("./abis/ex.json"),
			"address": "0x9ff1b68f8bedF4665fE358F92C3E9aF386cb295f" 
		},
		"exoracle": {
			"abi": require("./abis/ExOracle.json"),
			"address": "0x4b027fa9d8e0e0863447498150278fc8aa888a83"
		},
		"epochs": {
			"abi": require("./abis/AlphaEpochs.json"),
			"address": "0xacFe02A1Ad557Af0818963eDf48BfccE34f27a62"
		},
		"redeemer": {
			"abi": require("./abis/redeemer.json"),
			"address": "0x3C3cC567b7c8f98e7BD244E575FdE61016ef66B5"
		},
		"minter": {
			"abi": require("./abis/minter.json"),
			"address": "0x82B18a8f57E7791d6DAE4FfCfDbeCf404CEDC698"
		},
		
	}
}


