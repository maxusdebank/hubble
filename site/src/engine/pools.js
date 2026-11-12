import husd from './imgs/husd.png'
import bwg from './imgs/bwg.jpg'
export const pools = [
  {
    name: 'USDC-HUBBLE',
    symbol: 'USDC-HUBBLE',
    address: '0x9ff1b68f8bedF4665fE358F92C3E9aF386cb295f',
    pid: 0,
  },
  {
    name: 'Liquid Staked Sonic',
    symbol: 'stS',
    address: '0xE5DA20F15420aD15DE0fa650600aFc998bbE3955',
    pid: 1,
  },
{
    name: 'Derp Token',
    symbol: 'DERP',
    address: '0xe920d1DA9A4D59126dC35996Ea242d60EFca1304',
    pid: 2,
  },
  {
    name: 'Uppies',
    symbol: 'UPPIES',
    address: '0x9bCeA390ff97e0d3362bf726820776a4dF8AdD9a',
    pid: 3,
  },
  {
    name: 'Whale',
    symbol: 'WHALE',
    address: '0x068e9e009fDa970fA953E1f6a43D982cA991F4bA',
    pid: 4,
  },
  {
    name: 'Sonichu',
    symbol: 'Sonichu',
    address: '0x893A5F9CA92Ca721089b6dAb44949dbd70CbC711',
    pid: 5,
  },
  {
    name: 'SuperSonicSpeedDemon',
    symbol: 'SPEED',
    address: '0x9990dE39Ca46151150E392Ca96EB349d0f549166',
    pid: 6,
  },
  {
    name: 'Poor',
    symbol: 'POOR',
    address: '0xE569821A7b621Cc16C447C19297089b7205a6D30',
    pid: 7,
  },
  {
    name: 'GOGGLES',
    symbol: 'GOGLZ',
    address: '0x9fDbC3f8Abc05Fa8f3Ad3C17D2F806c1230c4564',
    pid: 8,
  },
  {
    name: 'Tin Hat Cat',
    symbol: 'THC',
    address: '0x17Af1Df44444AB9091622e4Aa66dB5BB34E51aD5',
    pid: 9,
  },
  {
    name: 'sDOG',
    symbol: 'sDOG',
    address: '0x50Bc6e1DfF8039A4b967c1BF507ba5eA13fa18B6',
    pid: 10,
  },
  {
    name: 'Candle Token',
    symbol: 'CANDLE',
    address: '0xFFC05D77E021F12878644537398160A54E33B5e4',
    pid: 11,
  },
  {
    name: 'YE On Chain',
    symbol: 'YE',
    address: '0xf2fC4c21F1B69fd4B633b4be532DEDEd6ab68715',
    pid: 12,
  },
  {
    name: 'Shadow Liquid Staking Token',
    symbol: 'x33',
    address: '0x3333111A391cC08fa51353E9195526A70b333333',
    pid: 13,
  },
  {
    name: 'Shrimp Token',
    symbol: 'SHRIMP',
    address: '0x873e509A21b106937472834201d653Ba62951c7E',
    pid: 14,
  },
  {
    name: 'BLACKHOLE',
    symbol: 'BOL',
    address: '0x38628cb4cc74cbDFB6dDD877B17c1F60fCAE7C2C',
    pid: 15,
  },
  {
    name: 'HEDGY the hedgehog',
    symbol: 'HEDGY',
    address: '0x6fB9897896Fe5D05025Eb43306675727887D0B7c',
    pid: 16,
  },
  {
    name: 'Moon Bay',
    symbol: 'MOON',
    address: '0x486B6Fa0419b33a0c7A6e4698c231D7E2f2D5299',
    pid: 17,
  },
  {
    name: 'Solidex Monkey',
    symbol: 'SEX',
    address: '0xbeE65E9AF970ef637a84293D238db4528a53BB47',
    pid: 18,
  },
  {
    name: 'BEARZWIFGUNZ180042069',
    symbol: '180042069',
    address: '0xf1c9b8171Bf3902554e791010CCBCD6bacBA6eFd',
    pid: 19,
  },
  {
    name: 'Paladin Token',
    symbol: 'PAL',
    address: '0xE4A4353CD8F008f1a70f1a564535990479E8ceb7',
    pid: 20,
  },
  {
    name: 'Indi',
    symbol: 'INDI',
    address: '0x4EEC869d847A6d13b0F6D1733C5DEC0d1E741B4f',
    pid: 21,
  },
  {
    name: 'SonicEco',
    symbol: 'ECO',
    address: '0x7A08Bf5304094CA4C7b4132Ef62b5EDc4a3478B7',
    pid: 22,
  },
  {
    name: 'Sonic IndeX',
    symbol: 'fSIX',
    address: '0x94B999e05D1361A802aD6690c1b1aE3426A4e1a6',
    pid: 23,
  },
	
]

export const poolImage = (address) => {
  if (address == "0x9ff1b68f8bedF4665fE358F92C3E9aF386cb295f") return husd
  else if (address == "0xe920d1DA9A4D59126dC35996Ea242d60EFca1304") return `https://raw.githubusercontent.com/Shadow-Exchange/shadow-assets/main/blockchains/sonic/assets/${address}/logo.png`
  else if (address == "0x38628cb4cc74cbDFB6dDD877B17c1F60fCAE7C2C") return `https://raw.githubusercontent.com/Shadow-Exchange/shadow-assets/main/blockchains/sonic/assets/${address}/logo.png`
  else if (address == "0xf1c9b8171Bf3902554e791010CCBCD6bacBA6eFd") return bwg
  else if (address == "0xE4A4353CD8F008f1a70f1a564535990479E8ceb7") return `https://raw.githubusercontent.com/Shadow-Exchange/shadow-assets/main/blockchains/sonic/assets/${address}/logo.png`
	else return `https://dd.dexscreener.com/ds-data/tokens/sonic/${address}.png`
}